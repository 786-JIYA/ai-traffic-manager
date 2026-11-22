
import cv2

from src.detection.vehicle_detector import VehicleDetector
from src.tracking.vehicle_tracker import VehicleTracker


class VideoProcessor:
    def __init__(self, video_path):
        self.video_path = video_path
        self.detector = VehicleDetector()
        self.tracker = VehicleTracker(self.detector)

    def process(self):
        cap = cv2.VideoCapture(self.video_path)

        if not cap.isOpened():
            raise FileNotFoundError(
                f"Could not open video: {self.video_path}"
            )

        frame_count = 0
        unique_vehicle_ids = set()

        try:
            while True:
                success, frame = cap.read()

                if not success:
                    break

                frame_count += 1

                vehicles = self.tracker.update(frame)

                for vehicle in vehicles:
                    track_id = vehicle["track_id"]
                    unique_vehicle_ids.add(track_id)

                    x1, y1, x2, y2 = map(
                        int, vehicle["bbox"]
                    )

                    label = (
                        f'ID: {track_id} '
                        f'{vehicle["vehicle_type"]} '
                        f'{vehicle["confidence"]:.2f}'
                    )

                    cv2.rectangle(
                        frame,
                        (x1, y1),
                        (x2, y2),
                        (0, 255, 0),
                        2,
                    )

                    cv2.putText(
                        frame,
                        label,
                        (x1, max(y1 - 10, 20)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2,
                    )

                cv2.putText(
                    frame,
                    f"Frame: {frame_count}",
                    (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (255, 255, 255),
                    2,
                )

                cv2.putText(
                    frame,
                    f"Unique IDs observed: {len(unique_vehicle_ids)}",
                    (20, 75),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 255),
                    2,
                )

                cv2.imshow(
                    "AI Traffic Manager - Vehicle Tracking",
                    frame,
                )

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

        finally:
            cap.release()
            cv2.destroyAllWindows()

        print(f"Processed frames: {frame_count}")
        print(f"Unique vehicle IDs observed: {len(unique_vehicle_ids)}")


