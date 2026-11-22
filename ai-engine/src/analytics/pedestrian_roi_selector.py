
import cv2
import json
import numpy as np
from pathlib import Path

VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)

OUTPUT_PATH = Path("src/config/pedestrian_rois.json")

points = []
waiting_zones = []
crossing_zones = []

current_type = "waiting"
frame = None


def mouse_callback(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        points.append([x, y])

    elif event == cv2.EVENT_RBUTTONDOWN and points:
        points.pop()


def draw_interface():
    display = frame.copy()

    # Completed waiting zones
    for zone in waiting_zones:
        polygon = np.array(zone["polygon"], dtype=np.int32)
        cv2.polylines(
            display, [polygon], True, (0, 255, 0), 2
        )
        x, y = zone["polygon"][0]
        cv2.putText(
            display, zone["id"], (x, max(y - 5, 15)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1
        )

    # Completed crossing zones
    for zone in crossing_zones:
        polygon = np.array(zone["polygon"], dtype=np.int32)
        cv2.polylines(
            display, [polygon], True, (255, 0, 0), 2
        )
        x, y = zone["polygon"][0]
        cv2.putText(
            display, zone["id"], (x, max(y - 5, 15)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1
        )

    # Current polygon
    if points:
        polygon = np.array(points, dtype=np.int32)
        cv2.polylines(
            display, [polygon], False,
            (0, 165, 255), 2
        )

        for point in points:
            cv2.circle(
                display, tuple(point), 4,
                (0, 165, 255), -1
            )

    color = (
        (0, 255, 0)
        if current_type == "waiting"
        else (255, 0, 0)
    )

    cv2.putText(
        display,
        f"Current mode: {current_type.upper()}",
        (10, 25),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        color,
        2,
    )

    cv2.putText(
        display,
        "W: waiting | C: crossing | N: finish polygon",
        (10, 400),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (255, 255, 255),
        1,
    )

    cv2.putText(
        display,
        "Right click: undo | R: reset | S: save | Q: quit",
        (10, 425),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (255, 255, 255),
        1,
    )

    return display


def main():
    global frame, current_type

    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        raise FileNotFoundError(VIDEO_PATH)

    cap.set(cv2.CAP_PROP_POS_MSEC, 5000)
    success, frame = cap.read()
    cap.release()

    if not success:
        raise RuntimeError("Could not extract video frame.")

    cv2.namedWindow("Pedestrian Zone Selector")
    cv2.setMouseCallback(
        "Pedestrian Zone Selector",
        mouse_callback,
    )

    print("BISMILLAH - PEDESTRIAN ZONE SELECTOR")
    print("W = Waiting zone")
    print("C = Crossing zone")
    print("N = Finish current polygon")
    print("S = Save configuration")

    while True:
        cv2.imshow(
            "Pedestrian Zone Selector",
            draw_interface(),
        )

        key = cv2.waitKey(20)

        if key != -1:
         key = key & 0xFF
         print("Key pressed:", key)

        if key == ord("w"):
            current_type = "waiting"
            points.clear()

        elif key == ord("c"):
            current_type = "crossing"
            points.clear()

        elif key == ord("r"):
            points.clear()

        elif key == ord("n"):
            if len(points) < 3:
                print("A polygon needs at least 3 points.")
                continue

            zones = (
                waiting_zones
                if current_type == "waiting"
                else crossing_zones
            )

            zone_id = f"{current_type}_{len(zones) + 1}"

            zones.append({
                "id": zone_id,
                "polygon": points.copy(),
            })

            print("Saved region:", zone_id)
            points.clear()

        elif key == ord("s"):
            if not waiting_zones or not crossing_zones:
                print(
                    "Draw at least one waiting zone "
                    "and one crossing zone."
                )
                continue

            OUTPUT_PATH.parent.mkdir(
                parents=True,
                exist_ok=True,
            )

            config = {
                "resolution": {
                    "width": frame.shape[1],
                    "height": frame.shape[0],
                },
                "waiting_zones": waiting_zones,
                "crossing_zones": crossing_zones,
            }

            with OUTPUT_PATH.open(
                "w", encoding="utf-8"
            ) as file:
                json.dump(config, file, indent=4)

            print("Saved:", OUTPUT_PATH)
            break

        elif key == ord("q"):
            print("Exited without saving.")
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
