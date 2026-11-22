
import json
import time

from pathlib import Path

import cv2
import numpy as np

from src.detection.vehicle_detector import VehicleDetector
from src.tracking.vehicle_tracker import VehicleTracker
from src.analytics.arrival_rate_tracker import ArrivalRateTracker


class TrafficAnalyzer:

    def __init__(
        self,
        roi_path="src/config/intersection_rois.json",
        stationary_threshold=2.0,
        stationary_frames=8,
    ):
        with open(roi_path, "r", encoding="utf-8") as file:
            config = json.load(file)

        self.approaches = config["approaches"]

        self.detector = VehicleDetector()
        self.tracker = VehicleTracker(self.detector)

        self.stationary_threshold = stationary_threshold
        self.stationary_frames = stationary_frames

        self.vehicle_history = {}

        # Arrival-rate tracking
        self.arrival_tracker = ArrivalRateTracker(
            window_seconds=60
        )

        self.last_arrival_rates = {}

    def get_center(self, bbox):
        x1, y1, x2, y2 = bbox

        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2
        )

    def get_approach(self, center):
        point = (int(center[0]), int(center[1]))

        for approach in self.approaches:
            polygon = np.array(
                approach["polygon"],
                dtype=np.int32,
            )

            inside = cv2.pointPolygonTest(
                polygon,
                point,
                False,
            )

            if inside >= 0:
                return approach["id"]

        return None

    def update_vehicle_state(self, vehicle):
        track_id = vehicle["track_id"]

        center = self.get_center(vehicle["bbox"])

        previous = self.vehicle_history.get(track_id)

        if previous is None:
            self.vehicle_history[track_id] = {
                "center": center,
                "stationary_count": 0,
            }

            return "moving"

        old_x, old_y = previous["center"]

        displacement = (
            (center[0] - old_x) ** 2
            + (center[1] - old_y) ** 2
        ) ** 0.5

        if displacement < self.stationary_threshold:
            previous["stationary_count"] += 1
        else:
            previous["stationary_count"] = 0

        previous["center"] = center

        if previous["stationary_count"] >= self.stationary_frames:
            return "waiting"

        return "moving"

    def analyze(self, frame):

        # Current video-processing timestamp
        timestamp = time.monotonic()

        # Detect and track vehicles
        vehicles = self.tracker.update(frame)

        statistics = {
            approach["id"]: {
                "total": 0,
                "waiting": 0,
                "moving": 0,
            }
            for approach in self.approaches
        }

        for vehicle in vehicles:

            center = self.get_center(vehicle["bbox"])

            approach_id = self.get_approach(center)

            if approach_id is None:
                continue

            # Record first observation of this track
            # inside its monitored approach.
            self.arrival_tracker.record_arrival(
                approach_id,
                vehicle["track_id"],
                timestamp
            )

            # Classify vehicle movement state
            state = self.update_vehicle_state(vehicle)

            statistics[approach_id]["total"] += 1
            statistics[approach_id][state] += 1

        # Calculate rolling arrival rates
        rates = self.arrival_tracker.calculate(timestamp)

        self.last_arrival_rates = {
            approach["id"]: rates.get(approach["id"], 0)
            for approach in self.approaches
        }

        return statistics
