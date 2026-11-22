
import cv2
from pathlib import Path

video_path = r"D:\Desktop\Traffic\Bismillah-Traffic\ai-module\videos\traffic-video-6.mp4"

cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    raise FileNotFoundError(f"Cannot open video: {video_path}")

fps = cap.get(cv2.CAP_PROP_FPS)
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

duration = frame_count / fps if fps else 0

print("Video:", Path(video_path).name)
print("Resolution:", width, "x", height)
print("FPS:", round(fps, 2))
print("Total frames:", frame_count)
print("Duration:", round(duration, 2), "seconds")

# Extract a frame at 5 seconds
cap.set(cv2.CAP_PROP_POS_MSEC, 5000)
success, frame = cap.read()

if success:
    output_path = "videos/test/video6_frame.jpg"
    cv2.imwrite(output_path, frame)
    print("Frame saved:", output_path)
else:
    print("Could not extract frame.")

cap.release()
