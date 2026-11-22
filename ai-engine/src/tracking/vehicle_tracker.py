
class VehicleTracker:
    def __init__(self, detector):
        self.detector = detector
        self.model = detector.model

    def update(self, frame):
        results = self.model.track(
            source=frame,
            persist=True,
            tracker="bytetrack.yaml",
            conf=self.detector.confidence_threshold,
            classes=[2, 3, 5, 7],
            verbose=False,
        )

        tracked_vehicles = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                if box.id is None:
                    continue

                class_id = int(box.cls[0].item())
                track_id = int(box.id[0].item())
                confidence = float(box.conf[0].item())
                coordinates = box.xyxy[0].cpu().tolist()

                tracked_vehicles.append({
                    "track_id": track_id,
                    "class_id": class_id,
                    "vehicle_type": self.detector.model.names[class_id],
                    "confidence": round(confidence, 3),
                    "bbox": [
                        round(value, 2)
                        for value in coordinates
                    ],
                })

        return tracked_vehicles
