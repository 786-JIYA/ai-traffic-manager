
import cv2
import json
from pathlib import Path

VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)

OUTPUT_PATH = Path("src/config/intersection_rois.json")

APPROACHES = [
    ("bottom_left", "Bottom-left to top-center"),
    ("top_center", "Top-center to intersection"),
    ("left_side", "Left-to-right cross traffic"),
    ("right_side", "Right-to-left cross traffic"),
    ("bottom_right_slip", "Bottom-right curved slip road"),
]

points = []
regions = []
current_index = 0
frame = None
display = None


def mouse_callback(event, x, y, flags, param):
    global points

    if event == cv2.EVENT_LBUTTONDOWN:
        points.append([x, y])

    elif event == cv2.EVENT_RBUTTONDOWN and points:
        points.pop()


def draw_interface():
    global display

    display = frame.copy()

    # Draw completed regions
    for region in regions:
        polygon = region["polygon"]
        pts = __import__("numpy").array(polygon, dtype="int32")
        cv2.polylines(display, [pts], True, (0, 255, 0), 2)

        x, y = polygon[0]
        cv2.putText(
            display,
            region["name"],
            (x, max(y - 8, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 255, 0),
            1,
        )

    # Draw current polygon
    if points:
        pts = __import__("numpy").array(points, dtype="int32")

        for point in points:
            cv2.circle(display, tuple(point), 4, (0, 165, 255), -1)

        if len(points) >= 2:
            cv2.polylines(display, [pts], False, (0, 165, 255), 2)

    approach_id, approach_name = APPROACHES[current_index]

    cv2.putText(
        display,
        f"Region {current_index + 1}/5: {approach_name}",
        (10, 25),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (255, 255, 255),
        2,
    )

    cv2.putText(
        display,
        "Left click: add point | Right click: undo point",
        (10, 405),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (255, 255, 255),
        1,
    )

    cv2.putText(
        display,
        "N: finish region | R: reset | S: save | Q: quit",
        (10, 425),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (255, 255, 255),
        1,
    )


def main():
    global frame, points, current_index

    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        raise FileNotFoundError(VIDEO_PATH)

    cap.set(cv2.CAP_PROP_POS_MSEC, 5000)
    success, frame = cap.read()
    cap.release()

    if not success:
        raise RuntimeError("Could not read video frame.")

    height, width = frame.shape[:2]

    cv2.namedWindow("Intersection ROI Selector")
    cv2.setMouseCallback(
        "Intersection ROI Selector",
        mouse_callback,
    )

    print("\nBISMILLAH - INTERSECTION ROI SELECTOR")
    print("Draw one polygon for each approach.")
    print("Click around the waiting/queue area.")
    print("Do not include the zebra crossing.")
    print("Press N to finish each polygon.\n")

    while True:
        draw_interface()
        cv2.imshow("Intersection ROI Selector", display)

        key = cv2.waitKey(20) & 0xFF

        if key == ord("r"):
            points.clear()
            print("Current polygon reset.")

        elif key == ord("n"):
            if len(points) < 3:
                print("A polygon needs at least 3 points.")
                continue

            approach_id, approach_name = APPROACHES[current_index]

            regions.append({
                "id": approach_id,
                "name": approach_name,
                "polygon": points.copy(),
            })

            print(f"Completed: {approach_name}")
            points.clear()

            if current_index < len(APPROACHES) - 1:
                current_index += 1
            else:
                print("All five regions completed. Press S to save.")

        elif key == ord("s"):
            if len(regions) != len(APPROACHES):
                print("Complete all five regions before saving.")
                continue

            OUTPUT_PATH.parent.mkdir(
                parents=True,
                exist_ok=True,
            )

            configuration = {
                "video": "traffic-video-6.mp4",
                "resolution": {
                    "width": width,
                    "height": height,
                },
                "approaches": regions,
            }

            with OUTPUT_PATH.open("w", encoding="utf-8") as file:
                json.dump(configuration, file, indent=4)

            print(f"Saved configuration: {OUTPUT_PATH}")
            break

        elif key == ord("q"):
            print("Exited without saving.")
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
