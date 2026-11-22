
from src.detection.video_processor import VideoProcessor


if __name__ == "__main__":
    processor = VideoProcessor("videos/test/traffic.mp4")
    processor.process()
