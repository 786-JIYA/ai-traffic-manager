
import cv2

from src.analytics.traffic_analyzer import TrafficAnalyzer

VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)


def main():
    cap = cv2.VideoCapture(VIDEO_PATH)
    analyzer = TrafficAnalyzer()

    if not cap.isOpened():
        raise FileNotFoundError(VIDEO_PATH)

    frame_count = 0

    try:
        while True:
            success, frame = cap.read()

            if not success:
                break

            frame_count += 1
            statistics = analyzer.analyze(frame)

            for index, (approach, data) in enumerate(
                statistics.items()
            ):
                text = (
                    f"{approach}: "
                    f"Total={data['total']} "
                    f"Waiting={data['waiting']} "
                    f"Moving={data['moving']}"
                )

                cv2.putText(
                    frame,
                    text,
                    (10, 25 + index * 25),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.48,
                    (0, 255, 255),
                    1,
                )

            cv2.imshow("AI Traffic Analytics", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        cap.release()
        cv2.destroyAllWindows()

    print("Processed frames:", frame_count)


if __name__ == "__main__":
    main()
