
import cv2
import time

from datetime import datetime, timezone

from src.analytics.traffic_analyzer import TrafficAnalyzer
from src.analytics.traffic_decision_engine import TrafficDecisionEngine
from src.communication.backend_client import BackendClient


VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)

INTERSECTION_ID = "intersection_01"

# Send analytics to Node.js every 2 seconds.
SEND_INTERVAL_SECONDS = 2.0


def get_congestion_level(waiting_vehicles):

    if waiting_vehicles >= 15:
        return "high"

    elif waiting_vehicles >= 7:
        return "medium"

    return "low"


def build_analytics_payload(statistics, analyzer):

    approaches_data = {}

    for approach, data in statistics.items():

        arrival_rate = analyzer.last_arrival_rates.get(
            approach, 0
        )

        approaches_data[approach] = {
            "total_vehicles": data["total"],
            "waiting_vehicles": data["waiting"],
            "moving_vehicles": data["moving"],
            "arrival_rate": arrival_rate,
            "congestion_level": get_congestion_level(
                data["waiting"]
            )
        }

    return {
        "intersection_id": INTERSECTION_ID,
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "approaches": approaches_data
    }


def main():

    analyzer = TrafficAnalyzer()
    decision_engine = TrafficDecisionEngine()
    backend_client = BackendClient()

    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        raise FileNotFoundError(
            "Could not open traffic video."
        )

    print("BISMILLAH - LIVE TRAFFIC DECISION SIMULATION")
    print("Connecting Python AI Engine to Node.js Backend...")

    last_sent_time = 0.0

    try:

        while True:

            success, frame = cap.read()

            if not success:
                break

            # 1. Analyze actual video frame
            statistics = analyzer.analyze(frame)

            # 2. Prepare input for the existing
            # experimental Python decision engine.
            traffic_data = {}

            for approach, data in statistics.items():

                traffic_data[approach] = {
                    "waiting": data["waiting"],
                    "arrival_rate": analyzer.last_arrival_rates.get(
                        approach, 0
                    )
                }

            # 3. Generate experimental traffic recommendation
            decision = decision_engine.make_decision(
                traffic_data
            )

            # 4. Send actual analytics to Node.js periodically
            current_time = time.monotonic()

            if (
                current_time - last_sent_time
                >= SEND_INTERVAL_SECONDS
            ):

                payload = build_analytics_payload(
                    statistics,
                    analyzer
                )

                response = backend_client.send_analytics(
                    payload
                )

                if response:
                    print(
                        "Traffic analytics sent successfully."
                    )

                last_sent_time = current_time

            # 5. Display approach-wise statistics
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

            for approach, data in statistics.items():

                text = (
                    f"{approach}: "
                    f"Total={data['total']} "
                    f"Waiting={data['waiting']} "
                    f"Moving={data['moving']}"
                )

                cv2.putText(
                    frame,
                    text,
                    (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.42,
                    (255, 255, 255),
                    1,
                )

                y += 25

            # 6. Display experimental signal recommendation
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
                    0.65,
                    (0, 255, 0),
                    2,
                )

                cv2.putText(
                    frame,
                    green_time,
                    (10, 420),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 255),
                    2,
                )

            cv2.imshow("AI Traffic Manager", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:

        cap.release()
        cv2.destroyAllWindows()

        print("\nSimulation completed.")


if __name__ == "__main__":
    main()
