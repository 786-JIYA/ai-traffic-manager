
import cv2
from src.detection.vehicle_detector import VehicleDetector


def main():
    image_path = "test_data/traffic.jpg"

    image = cv2.imread(image_path)

    if image is None:
        raise FileNotFoundError(
            f"Could not load image: {image_path}"
        )

    detector = VehicleDetector()
    detections = detector.detect(image)

    print(f"\nTotal vehicles detected: {len(detections)}")

    for detection in detections:
        print(detection)

    for detection in detections:
        x1, y1, x2, y2 = map(int, detection["bbox"])

        label = (
            f'{detection["vehicle_type"]} '
            f'{detection["confidence"]:.2f}'
        )

        cv2.rectangle(
            image, (x1, y1), (x2, y2), (0, 255, 0), 2
        )

        cv2.putText(
            image,
            label,
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2,
        )

    cv2.imwrite("test_data/detection_result.jpg", image)

    print("\nResult saved to test_data/detection_result.jpg")


if __name__ == "__main__":
    main()
