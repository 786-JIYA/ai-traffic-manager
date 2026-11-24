
import cv2

from src.analytics.traffic_analyzer import TrafficAnalyzer


VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)

analyzer = TrafficAnalyzer()

cap = cv2.VideoCapture(VIDEO_PATH)

if not cap.isOpened():
    raise FileNotFoundError(f"Could not open video: {VIDEO_PATH}")

fps = cap.get(cv2.CAP_PROP_FPS)

if fps <= 0:
    cap.release()
    raise ValueError("Invalid video FPS.")

frame_number = 0
last_printed_second = -5

print(f"Video FPS: {fps}")
print("Starting timestamp validation...\n")

try:
    while True:
        success, frame = cap.read()

        if not success:
            break

        video_timestamp = frame_number / fps
        frame_number += 1

        statistics = analyzer.analyze(
            frame,
            video_timestamp=video_timestamp,
        )

        video_second = int(video_timestamp)

        if video_second >= last_printed_second + 5:
            last_printed_second = video_second

            print(f"\nVideo time: {video_second}s")

            for approach, values in statistics.items():
                assert values["total"] == (
                    values["waiting"] + values["moving"]
                )

                print(
                    f"{approach}: "
                    f"total={values['total']}, "
                    f"waiting={values['waiting']}, "
                    f"moving={values['moving']}, "
                    f"arrivals/min={analyzer.last_arrival_rates.get(approach, 0)}"
                )

    print("\nValidation completed.")
    print(f"Frames processed: {frame_number}")
    print(f"Video duration: {frame_number / fps:.2f}s")

finally:
    cap.release()
