
from ultralytics import YOLO


class PedestrianDetector:
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
            classes=[0],
            verbose=False,
        )

        pedestrians = []

        for result in results:
            if result.boxes is None:
                continue

            for box in result.boxes:
                confidence = float(box.conf[0].item())
                coordinates = box.xyxy[0].cpu().tolist()

                pedestrians.append({
                    "class_id": 0,
                    "type": "person",
                    "confidence": round(confidence, 3),
                    "bbox": [
                        round(value, 2)
                        for value in coordinates
                    ],
                })

        return pedestrians
