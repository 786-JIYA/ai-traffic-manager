
import threading
import time

import cv2
import uvicorn

from fastapi import FastAPI
from fastapi.responses import StreamingResponse


app = FastAPI(title="AI Traffic Video Streaming")

frame_lock = threading.Lock()

latest_original_frame = None
latest_processed_frame = None


def publish_frames(original_frame, processed_frame):
    """
    Receive original and AI-processed frames
    from the existing traffic simulation.
    """

    global latest_original_frame
    global latest_processed_frame

    success_original, original_buffer = cv2.imencode(
        ".jpg",
        original_frame,
        [cv2.IMWRITE_JPEG_QUALITY, 80]
    )

    success_processed, processed_buffer = cv2.imencode(
        ".jpg",
        processed_frame,
        [cv2.IMWRITE_JPEG_QUALITY, 80]
    )

    if not success_original or not success_processed:
        return

    with frame_lock:
        latest_original_frame = original_buffer.tobytes()
        latest_processed_frame = processed_buffer.tobytes()


def generate_frames(frame_type):
    """
    Continuously provide the latest frame
    as an MJPEG stream.
    """

    global latest_original_frame
    global latest_processed_frame

    while True:

        with frame_lock:
            if frame_type == "original":
                frame = latest_original_frame
            else:
                frame = latest_processed_frame

        if frame is None:
            time.sleep(0.1)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame
            + b"\r\n"
        )

        time.sleep(0.04)


@app.get("/video/health")
def video_health():
    return {
        "success": True,
        "original_available": latest_original_frame is not None,
        "processed_available": latest_processed_frame is not None
    }


@app.get("/video/original")
def original_video():
    return StreamingResponse(
        generate_frames("original"),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/video/processed")
def processed_video():
    return StreamingResponse(
        generate_frames("processed"),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


def start_video_stream_server():
    """
    Start FastAPI in a background thread
    without blocking the traffic simulation.
    """

    server_thread = threading.Thread(
        target=uvicorn.run,
        kwargs={
            "app": app,
            "host": "0.0.0.0",
            "port": 8000,
            "log_level": "warning"
        },
        daemon=True
    )

    server_thread.start()

    print("Video streaming server starting on port 8000.")
