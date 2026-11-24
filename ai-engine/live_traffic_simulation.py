
import cv2
import time

from datetime import datetime, timezone

from src.analytics.traffic_analyzer import TrafficAnalyzer
from src.analytics.traffic_statistics import TrafficStatistics
from src.analytics.traffic_decision_engine import TrafficDecisionEngine
from src.communication.backend_client import BackendClient
from src.analytics.signal_phase_manager import SignalPhaseManager

# Video streaming imports
from src.communication.video_stream import (
    publish_frames,
    start_video_stream_server,
)


VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)

INTERSECTION_ID = "intersection_01"

# Send analytics to Node.js every 2 seconds.
SEND_INTERVAL_SECONDS = 2.0


def build_analytics_payload(statistics, analyzer, traffic_summary):

    approaches_data = {}

    for approach, data in statistics.items():

        arrival_rate = analyzer.last_arrival_rates.get(
            approach, 0
        )

        approach_summary = traffic_summary["approaches"][approach]

        approaches_data[approach] = {
            "total_vehicles": data["total"],
            "waiting_vehicles": data["waiting"],
            "moving_vehicles": data["moving"],
            "arrival_rate": arrival_rate,
            "congestion_level": approach_summary["congestion_level"],
        }

    return {
        "intersection_id": INTERSECTION_ID,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "approaches": approaches_data,
    }


def main():

    analyzer = TrafficAnalyzer()
    traffic_statistics = TrafficStatistics()

    decision_engine = TrafficDecisionEngine()
    backend_client = BackendClient()

    signal_manager = SignalPhaseManager(
        backend_client=backend_client,
        intersection_id=INTERSECTION_ID
    )

    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        raise FileNotFoundError(
            "Could not open traffic video."
        )

    fps = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        cap.release()
        raise ValueError("Invalid video FPS.")

    frame_number = 0

    print(f"Video FPS: {fps}")

    # Start the video streaming server.
    start_video_stream_server()

    # Report the initial simulated ALL_RED state.
    signal_manager.report_state()

    print("Initial signal state: ALL_RED")

    print("BISMILLAH - LIVE TRAFFIC DECISION SIMULATION")
    print("Connecting Python AI Engine to Node.js Backend...")
    print("Original video stream: http://localhost:8000/video/original")
    print("AI processed stream: http://localhost:8000/video/processed")
    print("Video health: http://localhost:8000/video/health")

    last_sent_time = 0.0

    try:

        while True:

            success, frame = cap.read()

            if not success:
                break

            frame_number += 1

            # Calculate timestamp using recorded video time.
            video_timestamp = frame_number / fps

            original_frame = frame.copy()

            # 1. Analyze detected vehicles.
            statistics = analyzer.analyze(
                frame,
                video_timestamp=video_timestamp,
            )

            # 2. Calculate traffic and congestion statistics.
            traffic_summary = traffic_statistics.calculate(
                statistics
            )

            # 3. Prepare input for the experimental decision engine.
            traffic_data = {}

            for approach, data in statistics.items():

                traffic_data[approach] = {
                    "waiting": data["waiting"],
                    "arrival_rate": analyzer.last_arrival_rates.get(
                        approach, 0
                    )
                }

            # 4. Generate experimental traffic recommendation.
            decision = decision_engine.make_decision(
                traffic_data
            )

            # 5. Send analytics to Node.js periodically.
            current_time = time.monotonic()

            if (
                current_time - last_sent_time
                >= SEND_INTERVAL_SECONDS
            ):

                payload = build_analytics_payload(
                    statistics,
                    analyzer,
                    traffic_summary,
                )

                response = backend_client.send_analytics(
                    payload
                )

                if response:
                    print(
                        "Traffic analytics sent successfully."
                    )

                last_sent_time = current_time

            # 6. Display overall traffic statistics.
            y = 30

            cv2.putText(
                frame,
                "LIVE TRAFFIC ANALYTICS",
                (10, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 255),
                2,
            )

            y += 35

            overall_text = (
                f"Total: {traffic_summary['total_vehicles']} "
                f"Waiting: {traffic_summary['waiting_vehicles']} "
                f"Moving: {traffic_summary['moving_vehicles']}"
            )

            cv2.putText(
                frame,
                overall_text,
                (10, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.43,
                (255, 255, 255),
                1,
            )

            y += 25

            congestion_text = (
                f"Overall Congestion: "
                f"{traffic_summary['congestion_level'].upper()} "
                f"({traffic_summary['congestion_percentage']}%)"
            )

            cv2.putText(
                frame,
                congestion_text,
                (10, y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.43,
                (0, 200, 255),
                1,
            )

            y += 30

            # 7. Display approach-wise statistics.
            for approach, data in traffic_summary["approaches"].items():

                text = (
                    f"{approach}: "
                    f"Total={data['total_vehicles']} "
                    f"Waiting={data['waiting_vehicles']} "
                    f"Moving={data['moving_vehicles']} "
                    f"Congestion={data['congestion_level']} "
                    f"({data['congestion_percentage']}%)"
                )

                cv2.putText(
                    frame,
                    text,
                    (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.35,
                    (255, 255, 255),
                    1,
                )

                y += 24

            # 8. Display experimental signal recommendation.
            if decision:

                recommendation = (
                    f"Recommended: {decision['selected_phase']}"
                )

                green_time = (
                    f"Estimated green: "
                    f"{decision['green_duration']} seconds"
                )

                cv2.putText(
                    frame,
                    recommendation,
                    (10, 390),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    frame,
                    green_time,
                    (10, 420),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 255),
                    2,
                )

            # 9. Publish both frames to FastAPI.
            publish_frames(
                original_frame,
                frame
            )

            # 10. Display the processed frame locally.
            cv2.imshow("AI Traffic Manager", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:

        cap.release()
        cv2.destroyAllWindows()

        print("\nSimulation completed.")


if __name__ == "__main__":
    main()
