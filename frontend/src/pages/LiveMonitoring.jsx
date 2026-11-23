
import { useEffect, useState } from "react";
import {
    Radio,
    CarFront,
    Clock3,
    Activity,
    RefreshCw,
} from "lucide-react";

import api from "../services/api";
import useTrafficUpdates from "../hooks/useTrafficUpdates";
import VideoComparison from "../components/traffic/VideoComparison";

const approaches = [
    { id: "bottom_left", name: "Bottom Left", direction: "Approach 01" },
    { id: "top_center", name: "Top Center", direction: "Approach 02" },
    { id: "left_side", name: "Left Side", direction: "Approach 03" },
    { id: "right_side", name: "Right Side", direction: "Approach 04" },
    { id: "bottom_right_slip", name: "Bottom Right Slip", direction: "Approach 05" },
];

const normalizeData = (value) => {
    if (Array.isArray(value)) return value;

    if (value && typeof value === "object") {
        return Object.entries(value).map(([approach, metrics]) => ({
            approach,
            ...metrics,
        }));
    }

    return [];
};

const LiveMonitoring = () => {
    const [initialData, setInitialData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const {
        trafficData: liveData,
        lastUpdated,
        isConnected,
    } = useTrafficUpdates("intersection_01");

    useEffect(() => {
        let cancelled = false;

        const loadTraffic = async () => {
            try {
                const response = await api.getLatestTraffic("intersection_01");

                if (!cancelled) {
                    setInitialData(normalizeData(response.data));
                    setError("");
                }
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadTraffic();

        return () => {
            cancelled = true;
        };
    }, []);

    const rows = normalizeData(liveData ?? initialData);

    const trafficMap = Object.fromEntries(
        rows.map((item) => [item.approach, item])
    );

    const totalVehicles = rows.reduce(
        (sum, item) => sum + Number(item.total_vehicles || 0), 0
    );

    const totalWaiting = rows.reduce(
        (sum, item) => sum + Number(item.waiting_vehicles || 0), 0
    );

    const totalMoving = rows.reduce(
        (sum, item) => sum + Number(item.moving_vehicles || 0), 0
    );

    const formatTime = (time) => {
        if (!time) return "No update received yet";
        return new Date(time).toLocaleString();
    };

    return (
        <div className="monitoring-page">

            <div className="monitoring-heading">
                <div>
                    <p className="section-eyebrow">REAL-TIME OPERATIONS</p>
                    <h1>Live Traffic Monitoring</h1>
                    <p className="dashboard-description">
                        Monitor vehicle movement and congestion at the intersection.
                    </p>
                </div>

                <div className={`connection-badge ${isConnected ? "connected" : ""}`}>
                    <span className="live-dot"></span>
                    {isConnected ? "CONNECTED" : "DISCONNECTED"}
                </div>
            </div>

            {error && (
                <div className="dashboard-error">
                    Unable to load traffic data: {error}
                </div>
            )}

            {/* Original and AI-processed video comparison */}
            <VideoComparison />


            <div className="monitoring-summary">
                <div className="monitoring-stat">
                    <CarFront size={22} />
                    <div>
                        <span>Total Vehicles</span>
                        <strong>{loading ? "..." : rows.length ? totalVehicles : "—"}</strong>
                    </div>
                </div>

                <div className="monitoring-stat">
                    <Clock3 size={22} />
                    <div>
                        <span>Waiting Vehicles</span>
                        <strong>{loading ? "..." : rows.length ? totalWaiting : "—"}</strong>
                    </div>
                </div>

                <div className="monitoring-stat">
                    <Activity size={22} />
                    <div>
                        <span>Moving Vehicles</span>
                        <strong>{loading ? "..." : rows.length ? totalMoving : "—"}</strong>
                    </div>
                </div>

                <div className="monitoring-stat">
                    <Radio size={22} />
                    <div>
                        <span>Monitored Approaches</span>
                        <strong>05</strong>
                    </div>
                </div>
            </div>

            <div className="monitoring-section-heading">
                <div>
                    <h2>Approach Monitoring</h2>
                    <p>Individual traffic conditions</p>
                </div>

                <div className="last-update">
                    <RefreshCw size={14} />
                    <span>
                        {lastUpdated
                            ? formatTime(lastUpdated)
                            : rows.length
                                ? formatTime(rows[0]?.observed_at)
                                : "Waiting for data"}
                    </span>
                </div>
            </div>

            <div className="monitoring-table-wrapper">
                <table className="monitoring-table">
                    <thead>
                        <tr>
                            <th>Approach</th>
                            <th>Total Vehicles</th>
                            <th>Waiting</th>
                            <th>Moving</th>
                            <th>Arrival Rate</th>
                            <th>Congestion</th>
                        </tr>
                    </thead>

                    <tbody>
                        {approaches.map((approach) => {
                            const data = trafficMap[approach.id];

                            return (
                                <tr key={approach.id}>
                                    <td>
                                        <div className="monitoring-approach-name">
                                            <strong>{approach.name}</strong>
                                            <small>{approach.direction}</small>
                                        </div>
                                    </td>

                                    <td>{data ? data.total_vehicles : "—"}</td>
                                    <td>{data ? data.waiting_vehicles : "—"}</td>
                                    <td>{data ? data.moving_vehicles : "—"}</td>
                                    <td>{data ? data.arrival_rate : "—"}</td>

                                    <td>
                                        <span className={`congestion-badge ${data?.congestion_level || "unknown"}`}>
                                            {data?.congestion_level || "No data"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {!loading && rows.length === 0 && (
                    <div className="monitoring-empty">
                        No traffic snapshot is available yet.
                    </div>
                )}
            </div>

            <div className="monitoring-footer">
                <span>
                    Data source: AI Traffic Analytics API
                </span>
                <span>
                    {isConnected ? "Live updates enabled" : "Waiting for Socket.IO connection"}
                </span>
            </div>

        </div>
    );
};

export default LiveMonitoring;
