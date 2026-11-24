
import json
import time

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
        track_timeout_seconds=5.0,):
        with open(roi_path, "r", encoding="utf-8") as file:
            config = json.load(file)

        self.approaches = config["approaches"]

        self.detector = VehicleDetector()
        self.tracker = VehicleTracker(self.detector)

        self.stationary_threshold = stationary_threshold
        self.stationary_frames = stationary_frames
        self.track_timeout_seconds = track_timeout_seconds

        self.first_frame = True

        self.vehicle_history = {}

        self.arrival_tracker = ArrivalRateTracker(
            window_seconds=60,
            track_timeout_seconds=track_timeout_seconds,
        )

        self.last_arrival_rates = {}

        self.last_timestamp = None

    def get_center(self, bbox):
        x1, y1, x2, y2 = bbox

        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2,
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

    def update_vehicle_state(
        self,
        vehicle,
        approach_id,
        timestamp,
    ):
        track_id = vehicle["track_id"]

        # Keep separate movement history for each approach.
        history_key = (approach_id, track_id)

        center = self.get_center(vehicle["bbox"])

        previous = self.vehicle_history.get(history_key)

        if previous is None:
            self.vehicle_history[history_key] = {
                "center": center,
                "stationary_count": 0,
                "last_seen": timestamp,
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
        previous["last_seen"] = timestamp

        if previous["stationary_count"] >= self.stationary_frames:
            return "waiting"

        return "moving"

    def cleanup_vehicle_history(self, current_time):

        expired_tracks = [
            key
            for key, history in self.vehicle_history.items()
            if current_time - history["last_seen"]
            > self.track_timeout_seconds
        ]

        for key in expired_tracks:
            del self.vehicle_history[key]

    def analyze(self, frame, video_timestamp=None):
        """
        Analyze one video frame.

        video_timestamp:
            Timestamp in seconds from the recorded video.

            If omitted, monotonic computer time is used.
            For recorded-video simulation, always provide
            the video timestamp.
        """

        if video_timestamp is None:
            timestamp = time.monotonic()
        else:
            timestamp = float(video_timestamp)

        if self.last_timestamp is not None:
            if timestamp < self.last_timestamp:
                raise ValueError(
                    "Video timestamp cannot move backwards."
                )

        self.last_timestamp = timestamp

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

            if self.first_frame:
                self.arrival_tracker.initialize_track(
                    approach_id,
                    vehicle["track_id"],
                    timestamp,
                )
            else:
                self.arrival_tracker.record_arrival(
                    approach_id,
                    vehicle["track_id"],
                    timestamp,
                )

            state = self.update_vehicle_state(
                vehicle,
                approach_id,
                timestamp,
            )

            statistics[approach_id]["total"] += 1
            statistics[approach_id][state] += 1

        self.first_frame = False

        # Remove stale vehicle movement histories.
        self.cleanup_vehicle_history(timestamp)

        # Calculate rolling arrival rates using the same time basis.
        rates = self.arrival_tracker.calculate(timestamp)

        self.last_arrival_rates = {
            approach["id"]: rates.get(approach["id"], 0)
            for approach in self.approaches
        }

        return statistics
