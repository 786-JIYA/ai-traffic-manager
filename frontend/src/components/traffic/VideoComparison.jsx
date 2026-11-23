
import { useEffect, useState } from "react";

const STREAM_URL =
    import.meta.env.VITE_AI_STREAM_URL || "http://localhost:8000";

const VideoComparison = () => {
    const [originalError, setOriginalError] = useState(false);
    const [processedError, setProcessedError] = useState(false);
    const [isStreamOnline, setIsStreamOnline] = useState(false);

    useEffect(() => {
        let active = true;

        const checkStreamHealth = async () => {
            try {
                const response = await fetch(
                    `${STREAM_URL}/video/health`
                );

                if (!response.ok) {
                    throw new Error("Stream unavailable");
                }

                const data = await response.json();

                if (active) {
                    setIsStreamOnline(
                        data.success &&
                        data.original_available &&
                        data.processed_available
                    );
                }
            } catch {
                if (active) {
                    setIsStreamOnline(false);
                }
            }
        };

        checkStreamHealth();

        const interval = setInterval(checkStreamHealth, 3000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <section className="video-comparison">

            <div className="video-comparison-header">
                <div>
                    <h2>Live Video Monitoring</h2>
                    <p>
                        Compare original footage with AI vehicle detection
                        and traffic analytics.
                    </p>
                </div>

                <span className="video-live-status">
                    <span className="live-dot"></span>
                    {isStreamOnline ? "STREAM ONLINE" : "STREAM OFFLINE"}
                </span>
            </div>

            <div className="video-comparison-grid">

                <div className="video-panel">

                    <div className="video-panel-header">
                        <h3>Original Video</h3>
                        <span>CAMERA FEED</span>
                    </div>

                    {originalError ? (
                        <div className="video-error">
                            Original video stream unavailable.
                        </div>
                    ) : (
                        <img
                            src={`${STREAM_URL}/video/original`}
                            alt="Original traffic video"
                            className="traffic-video"
                            onError={() => setOriginalError(true)}
                        />
                    )}

                </div>

                <div className="video-panel">

                    <div className="video-panel-header">
                        <h3>AI Processed Video</h3>
                        <span>YOLO DETECTION</span>
                    </div>

                    {processedError ? (
                        <div className="video-error">
                            AI processed video stream unavailable.
                        </div>
                    ) : (
                        <img
                            src={`${STREAM_URL}/video/processed`}
                            alt="AI processed traffic video"
                            className="traffic-video"
                            onError={() => setProcessedError(true)}
                        />
                    )}

                </div>

            </div>

        </section>
    );
};

export default VideoComparison;
