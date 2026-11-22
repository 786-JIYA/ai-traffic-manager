
import cv2

from src.detection.pedestrian_detector import PedestrianDetector

VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)


def main():
    cap = cv2.VideoCapture(VIDEO_PATH)
    detector = PedestrianDetector()

    if not cap.isOpened():
        raise FileNotFoundError(VIDEO_PATH)

    frame_count = 0

    try:
        while True:
            success, frame = cap.read()

            if not success:
                break

            frame_count += 1

            pedestrians = detector.detect(frame)

            for person in pedestrians:
                x1, y1, x2, y2 = map(
                    int, person["bbox"]
                )

                label = (
                    f"Person {person['confidence']:.2f}"
                )

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    (255, 0, 0),
                    2,
                )

                cv2.putText(
                    frame,
                    label,
                    (x1, max(y1 - 8, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (255, 0, 0),
                    1,
                )

            cv2.putText(
                frame,
                f"Pedestrians: {len(pedestrians)}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 255),
                2,
            )

            cv2.imshow(
                "AI Traffic Manager - Pedestrian Detection",
                frame,
            )

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        cap.release()
        cv2.destroyAllWindows()

    print("Processed frames:", frame_count)


if __name__ == "__main__":
    main()
