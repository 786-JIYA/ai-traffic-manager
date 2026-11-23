
import { useEffect, useState } from "react";

import {
    Activity,
    CarFront,
    Clock3,
    Gauge,
    Radio,
    ArrowUpRight,
} from "lucide-react";

import api from "../services/api";
import useTrafficUpdates from "../hooks/useTrafficUpdates";

const approaches = [
    { id: "bottom_left", name: "Bottom Left", direction: "Approach 01" },
    { id: "top_center", name: "Top Center", direction: "Approach 02" },
    { id: "left_side", name: "Left Side", direction: "Approach 03" },
    { id: "right_side", name: "Right Side", direction: "Approach 04" },
    { id: "bottom_right_slip", name: "Bottom Right Slip", direction: "Approach 05" },
];

const normalizeApproaches = (value) => {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === "object") {
        return Object.entries(value).map(([approach, metrics]) => ({
            approach,
            ...metrics,
        }));
    }

    return [];
};

const Dashboard = () => {
    const [initialData, setInitialData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState("");

    const {
        trafficData: liveTrafficData,
        lastUpdated,
        isConnected,
    } = useTrafficUpdates("intersection_01");

    useEffect(() => {
        let cancelled = false;

        const fetchLatestTraffic = async () => {
            try {
                const response = await api.getLatestTraffic("intersection_01");

                if (!cancelled) {
                    setInitialData(normalizeApproaches(response.data));
                    setApiError("");
                }
            } catch (error) {
                if (!cancelled) {
                    setApiError(error.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchLatestTraffic();

        return () => {
            cancelled = true;
        };
    }, []);

    const trafficRows = normalizeApproaches(
        liveTrafficData ?? initialData
    );

    const trafficByApproach = Object.fromEntries(
        trafficRows.map((item) => [item.approach, item])
    );

    const totalVehicles = trafficRows.reduce(
        (sum, item) => sum + Number(item.total_vehicles || 0),
        0
    );

    const totalWaiting = trafficRows.reduce(
        (sum, item) => sum + Number(item.waiting_vehicles || 0),
        0
    );

    const totalMoving = trafficRows.reduce(
        (sum, item) => sum + Number(item.moving_vehicles || 0),
        0
    );

    const averageWaiting = trafficRows.length
        ? (totalWaiting / trafficRows.length).toFixed(1)
        : "—";

    const formatTime = (timestamp) => {
        if (!timestamp) return "Waiting for traffic updates";

        return new Date(timestamp).toLocaleTimeString();
    };

    return (
        <div className="dashboard">

            <div className="dashboard-heading">
                <div>
                    <p className="section-eyebrow">INTERSECTION OVERVIEW</p>
                    <h1>Traffic Dashboard</h1>
                    <p className="dashboard-description">
                        Monitor traffic conditions and intelligent signal operations.
                    </p>
                </div>

                <div className="live-indicator">
                    <span className="live-dot"></span>
                    {isConnected ? "LIVE CONNECTED" : "LIVE DISCONNECTED"}
                </div>
            </div>

            {apiError && (
                <div className="dashboard-error">
                    Unable to load traffic data: {apiError}
                </div>
            )}

            <div className="stats-grid">

                <div className="stat-card">
                    <div className="stat-icon teal">
                        <CarFront size={22} />
                    </div>
                    <p>Total Vehicles</p>
                    <h2>{loading ? "..." : trafficRows.length ? totalVehicles : "—"}</h2>
                    <span>Across all approaches</span>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue">
                        <Activity size={22} />
                    </div>
                    <p>Moving Vehicles</p>
                    <h2>{loading ? "..." : trafficRows.length ? totalMoving : "—"}</h2>
                    <span>Currently moving</span>
                </div>

                <div className="stat-card">
                    <div className="stat-icon amber">
                        <Clock3 size={22} />
                    </div>
                    <p>Average Waiting</p>
                    <h2>{loading ? "..." : averageWaiting}</h2>
                    <span>Vehicles per approach</span>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple">
                        <Gauge size={22} />
                    </div>
                    <p>Signal Status</p>
                    <h2>—</h2>
                    <span>Signal state not connected</span>
                </div>

            </div>

            <div className="dashboard-section">

                <div className="section-heading">
                    <div>
                        <h2>Intersection Approaches</h2>
                        <p>Live traffic conditions across five approaches</p>
                    </div>
                    <span className="section-count">05 APPROACHES</span>
                </div>

                <div className="approach-grid">

                    {approaches.map((approach) => {
                        const data = trafficByApproach[approach.id];

                        return (
                            <div className="approach-card" key={approach.id}>

                                <div className="approach-card-top">
                                    <div className="approach-icon">
                                        <Radio size={20} />
                                    </div>

                                    <span className="approach-status">
                                        <span className="status-dot"></span>
                                        {data?.congestion_level || "No data"}
                                    </span>
                                </div>

                                <p className="approach-label">
                                    {approach.direction}
                                </p>

                                <h3>{approach.name}</h3>

                                <div className="approach-metrics">
                                    <div>
                                        <span>Total</span>
                                        <strong>{data ? data.total_vehicles : "—"}</strong>
                                    </div>

                                    <div>
                                        <span>Waiting</span>
                                        <strong>{data ? data.waiting_vehicles : "—"}</strong>
                                    </div>

                                    <div>
                                        <span>Moving</span>
                                        <strong>{data ? data.moving_vehicles : "—"}</strong>
                                    </div>
                                </div>

                                <div className="approach-footer">
                                    <span>
                                        Arrival rate: {data ? data.arrival_rate : "—"}
                                    </span>
                                    <ArrowUpRight size={16} />
                                </div>

                            </div>
                        );
                    })}

                </div>
            </div>

            <div className="dashboard-bottom">

                <div className="activity-panel">
                    <div className="section-heading">
                        <div>
                            <h2>Traffic Activity</h2>
                            <p>Latest traffic snapshot</p>
                        </div>
                    </div>

                    <div className="empty-state">
                        <Activity size={28} />
                        <strong>
                            {trafficRows.length
                                ? `${totalVehicles} vehicles detected`
                                : "No traffic data available"}
                        </strong>
                        <span>
                            {lastUpdated
                                ? `Last live update: ${formatTime(lastUpdated)}`
                                : trafficRows.length
                                    ? `Latest database record: ${formatTime(trafficRows[0]?.observed_at)}`
                                    : "Waiting for traffic data"}
                        </span>
                    </div>
                </div>

                <div className="system-panel">
                    <div className="section-heading">
                        <div>
                            <h2>System Health</h2>
                            <p>Connected services</p>
                        </div>
                    </div>

                    <div className="service-row">
                        <span>AI Detection Engine</span>
                        <span className="service-pending">
                            {trafficRows.length ? "Data received" : "No data"}
                        </span>
                    </div>

                    <div className="service-row">
                        <span>Backend API</span>
                        <span className={apiError ? "service-pending" : "service-online"}>
                            {loading ? "Checking..." : apiError ? "Unavailable" : "Connected"}
                        </span>
                    </div>

                    <div className="service-row">
                        <span>Live Updates</span>
                        <span className={isConnected ? "service-online" : "service-pending"}>
                            {isConnected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default Dashboard;
