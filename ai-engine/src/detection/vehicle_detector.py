
from ultralytics import YOLO


# COCO dataset class IDs
# 2 = car, 3 = motorcycle, 5 = bus, 7 = truck
VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}


class VehicleDetector:
    def __init__(
        self,
        model_path="yolov8n.pt",
        confidence_threshold=0.35,
    ):
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold

    def detect(self, frame):
        results = self.model.predict(
            source=frame,
            conf=self.confidence_threshold,
            classes=list(VEHICLE_CLASSES.keys()),
            verbose=False,
        )

        detections = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                coordinates = box.xyxy[0].cpu().tolist()

                detections.append({
                    "class_id": class_id,
                    "vehicle_type": VEHICLE_CLASSES[class_id],
                    "confidence": round(confidence, 3),
                    "bbox": [
                        round(value, 2)
                        for value in coordinates
                    ],
                })

        return detections
