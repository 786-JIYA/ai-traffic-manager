
import cv2
import json
import numpy as np

from pathlib import Path

VIDEO_PATH = (
    r"D:\Desktop\Traffic\Bismillah-Traffic"
    r"\ai-module\videos\traffic-video-6.mp4"
)

ROI_PATH = Path("src/config/intersection_rois.json")
OUTPUT_PATH = Path("src/config/vehicle_counting_lines.json")

APPROACHES = [
    "bottom_left",
    "top_center",
    "left_side",
    "right_side",
    "bottom_right_slip",
]

approach_index = 0
line_type = "entry"
points = []
lines = {name: [] for name in APPROACHES}


def mouse_callback(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN and len(points) < 2:
        points.append([x, y])

    elif event == cv2.EVENT_RBUTTONDOWN and points:
        points.pop()


def draw_interface(frame):
    display = frame.copy()

    # Draw saved lines
    for approach, approach_lines in lines.items():
        for line in approach_lines:
            start = tuple(line["start"])
            end = tuple(line["end"])

            color = (
                (0, 255, 0)
                if line["event_type"] == "arrival"
                else (255, 0, 0)
            )

            cv2.line(display, start, end, color, 3)

            midpoint = (
                (start[0] + end[0]) // 2,
                (start[1] + end[1]) // 2,
            )

            cv2.putText(
                display,
                f"{approach}:{line['id']}",
                midpoint,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.35,
                color,
                1,
            )

    # Draw current line being selected
    for point in points:
        cv2.circle(
            display,
            tuple(point),
            5,
            (0, 165, 255),
            -1,
        )

    if len(points) == 2:
        cv2.line(
            display,
            tuple(points[0]),
            tuple(points[1]),
            (0, 165, 255),
            2,
        )

    cv2.putText(
        display,
        f"Approach: {APPROACHES[approach_index]}",
        (10, 25),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (255, 255, 255),
        1,
    )

    cv2.putText(
        display,
        f"Current line: {line_type.upper()}",
        (10, 48),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (0, 255, 255),
        1,
    )

    cv2.putText(
        display,
        "1-5: Select approach | E: Entry | X: Exit",
        (10, 395),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (255, 255, 255),
        1,
    )

    cv2.putText(
        display,
        "Click 2 endpoints | N: Finish | R: Reset",
        (10, 412),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (255, 255, 255),
        1,
    )

    cv2.putText(
        display,
        "S: Save | Q: Quit | Right click: Undo",
        (10, 429),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (255, 255, 255),
        1,
    )

    return display


def main():
    global approach_index, line_type

    with ROI_PATH.open("r", encoding="utf-8") as file:
        roi_config = json.load(file)

    configured_approaches = {
        approach["id"]
        for approach in roi_config["approaches"]
    }

    if configured_approaches != set(APPROACHES):
        raise ValueError(
            "Approach IDs do not match intersection_rois.json"
        )

    cap = cv2.VideoCapture(VIDEO_PATH)

    if not cap.isOpened():
        raise FileNotFoundError(VIDEO_PATH)

    cap.set(cv2.CAP_PROP_POS_MSEC, 5000)
    success, frame = cap.read()
    cap.release()

    if not success:
        raise RuntimeError("Could not read video frame.")

    cv2.namedWindow("Vehicle Counting Line Selector")
    cv2.setMouseCallback(
        "Vehicle Counting Line Selector",
        mouse_callback,
    )

    print("\nBISMILLAH - VEHICLE COUNTING LINE SELECTOR")
    print("Select an approach using keys 1-5.")
    print("Press E for entry or X for exit.")
    print("Click exactly two endpoints, then press N.")
    print("Save after configuring all 10 lines.\n")

    while True:
        cv2.imshow(
            "Vehicle Counting Line Selector",
            draw_interface(frame),
        )

        key = cv2.waitKey(20)

        if key == -1:
            continue

        key = key & 0xFF

        if key in [ord(str(i)) for i in range(1, 6)]:
            approach_index = int(chr(key)) - 1
            points.clear()

        elif key == ord("e"):
            line_type = "entry"
            points.clear()

        elif key == ord("x"):
            line_type = "exit"
            points.clear()

        elif key == ord("r"):
            points.clear()

        elif key == ord("n"):
            if len(points) != 2:
                print("Select exactly two endpoints first.")
                continue

            approach = APPROACHES[approach_index]

            if any(
                line["id"] == line_type
                for line in lines[approach]
            ):
                print("This line is already configured.")
                continue

            lines[approach].append({
                "id": line_type,
                "start": points[0],
                "end": points[1],
                "event_type": (
                    "arrival" if line_type == "entry"
                    else "departure"
                ),
            })

            print(f"Saved {line_type} line for {approach}")
            points.clear()

        elif key == ord("s"):
            complete = all(
                {line["id"] for line in lines[approach]}
                == {"entry", "exit"}
                for approach in APPROACHES
            )

            if not complete:
                print("Configure both lines for all five approaches.")
                continue

            OUTPUT_PATH.parent.mkdir(
                parents=True,
                exist_ok=True,
            )

            with OUTPUT_PATH.open(
                "w",
                encoding="utf-8",
            ) as file:
                json.dump(lines, file, indent=4)

            print("Saved configuration:", OUTPUT_PATH)
            break

        elif key == ord("q"):
            print("Exited without saving.")
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
