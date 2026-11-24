
import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    CarFront,
    Clock3,
    Gauge,
    TrendingUp,
    AlertTriangle,
    RefreshCw,
    BarChart3,
    Timer,
} from "lucide-react";

import api from "../services/api";
import CongestionBars3D from "../components/three/CongestionBars3D";
import "./Analytics.css";

const approaches = [
    { id: "bottom_left", name: "Bottom Left" },
    { id: "top_center", name: "Top Center" },
    { id: "left_side", name: "Left Side" },
    { id: "right_side", name: "Right Side" },
    { id: "bottom_right_slip", name: "Bottom Right Slip" },
];

const getCongestionLevel = (percentage) => {
    if (percentage >= 60) return "high";
    if (percentage >= 30) return "medium";
    return "low";
};

const formatTime = (timestamp) => {
    if (!timestamp) return "—";

    return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}m ${remainingSeconds}s`;
};

const Analytics = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchHistory = async () => {
            try {
                const response = await api.getTrafficHistory("intersection_01");

                const rows = Array.isArray(response)
                    ? response
                    : Array.isArray(response.data)
                        ? response.data
                        : Array.isArray(response.data?.data)
                            ? response.data.data
                            : [];

                if (!cancelled) {
                    setHistory(rows);
                    setError("");
                    setLastUpdated(new Date());
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Unable to fetch traffic history.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchHistory();

        const interval = setInterval(fetchHistory, 5000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    // Group all approach records belonging to the same snapshot.
    const snapshots = useMemo(() => {
        const grouped = new Map();

        history.forEach((record) => {
            if (!record.observed_at) return;

            const timestamp = record.observed_at;

            if (!grouped.has(timestamp)) {
                grouped.set(timestamp, []);
            }

            grouped.get(timestamp).push(record);
        });

        return Array.from(grouped.entries())
            .map(([timestamp, records]) => {
                const total = records.reduce(
                    (sum, item) => sum + Number(item.total_vehicles || 0),
                    0
                );

                const waiting = records.reduce(
                    (sum, item) => sum + Number(item.waiting_vehicles || 0),
                    0
                );

                const moving = records.reduce(
                    (sum, item) => sum + Number(item.moving_vehicles || 0),
                    0
                );

                const arrivalRate = records.reduce(
                    (sum, item) => sum + Number(item.arrival_rate || 0),
                    0
                );

                return {
                    timestamp,
                    records,
                    total,
                    waiting,
                    moving,
                    arrivalRate: Number(arrivalRate.toFixed(2)),
                    congestionPercentage: total
                        ? Number(((waiting / total) * 100).toFixed(2))
                        : 0,
                };
            })
            .sort(
                (a, b) =>
                    new Date(a.timestamp) - new Date(b.timestamp)
            );
    }, [history]);

    // Calculate average metrics over the available simulation history.
    const sessionStats = useMemo(() => {
        if (!snapshots.length) return null;

        const count = snapshots.length;

        const average = (key) =>
            snapshots.reduce((sum, item) => sum + item[key], 0) / count;

        const peakSnapshot = snapshots.reduce(
            (peak, item) => item.waiting > peak.waiting ? item : peak,
            snapshots[0]
        );

        const totalVehicles = average("total");
        const averageWaiting = average("waiting");
        const averageMoving = average("moving");

        const totalObserved = snapshots.reduce(
            (sum, item) => sum + item.total,
            0
        );

        const totalWaiting = snapshots.reduce(
            (sum, item) => sum + item.waiting,
            0
        );

        const approachStats = approaches.map((approach) => {
            const records = snapshots.flatMap((snapshot) =>
                snapshot.records.filter(
                    (record) => record.approach_key === approach.id
                )
            );

            const recordCount = records.length;

            const avg = (key) =>
                recordCount
                    ? records.reduce(
                        (sum, record) => sum + Number(record[key] || 0),
                        0
                    ) / recordCount
                    : 0;

            return {
                ...approach,
                averageWaiting: Number(avg("waiting_vehicles").toFixed(2)),
                averageTotal: Number(avg("total_vehicles").toFixed(2)),
                averageArrival: Number(avg("arrival_rate").toFixed(2)),
                congestionPercentage: avg("total_vehicles")
                    ? Number(
                        ((avg("waiting_vehicles") / avg("total_vehicles")) * 100).toFixed(2)
                    )
                    : 0,
            };
        });

        const busiestApproach = [...approachStats].sort(
            (a, b) => b.averageWaiting - a.averageWaiting
        )[0];

        const startTime = new Date(snapshots[0].timestamp);
        const endTime = new Date(snapshots[count - 1].timestamp);

        return {
            snapshotCount: count,
            averageTotal: Number(totalVehicles.toFixed(1)),
            averageWaiting: Number(averageWaiting.toFixed(1)),
            averageMoving: Number(averageMoving.toFixed(1)),
            averageCongestion: totalObserved
                ? Number(((totalWaiting / totalObserved) * 100).toFixed(1))
                : 0,
            averageArrival: Number(average("arrivalRate").toFixed(2)),
            peakWaiting: peakSnapshot.waiting,
            peakTime: peakSnapshot.timestamp,
            peakCongestion: peakSnapshot.congestionPercentage,
            busiestApproach,
            approachStats,
            duration: (endTime - startTime) / 1000,
            startTime,
            endTime,
        };
    }, [snapshots]);

    const maxWaiting = Math.max(
        1,
        ...snapshots.map((snapshot) => snapshot.waiting)
    );

    const maxApproachWaiting = Math.max(
        1,
        ...(sessionStats?.approachStats || []).map(
            (item) => item.averageWaiting
        )
    );

    const recentSnapshots = snapshots.slice(-20);

    if (loading) {
        return (
            <div className="analytics-page">
                <p className="analytics-message">Loading simulation analytics...</p>
            </div>
        );
    }

    if (error && !history.length) {
        return (
            <div className="analytics-page">
                <div className="analytics-error">
                    Unable to load traffic history: {error}
                </div>
            </div>
        );
    }

    if (!sessionStats) {
        return (
            <div className="analytics-page">
                <div className="analytics-heading">
                    <div>
                        <p className="section-eyebrow">Traffic intelligence</p>
                        <h1>Simulation Analytics</h1>
                        <p>Session performance and traffic demand analysis.</p>
                    </div>
                </div>
                <div className="analytics-message">
                    No simulation records are available yet. Start the traffic
                    simulation to collect analytics.
                </div>
            </div>
        );
    }

    return (
        <div className="analytics-page">

            {/* PAGE HEADER */}
            <div className="analytics-heading">
                <div>
                    <p className="section-eyebrow">Traffic intelligence</p>
                    <h1>Simulation Analytics</h1>
                    <p>
                        Understand traffic demand, congestion patterns and
                        intersection performance.
                    </p>
                </div>

                <div className="analytics-session-info">
                    <span className="analytics-live-indicator" />
                    <span>Session analysis</span>
                    <span className="analytics-record-count">
                        {sessionStats.snapshotCount} snapshots
                    </span>
                </div>
            </div>

            {/* SESSION DETAILS */}
            <section className="analytics-session-strip">
                <div>
                    <span>Session start</span>
                    <strong>{formatTime(sessionStats.startTime)}</strong>
                </div>
                <div>
                    <span>Last observation</span>
                    <strong>{formatTime(sessionStats.endTime)}</strong>
                </div>
                <div>
                    <span>Observed duration</span>
                    <strong>{formatDuration(sessionStats.duration)}</strong>
                </div>
                <div>
                    <span>Last refreshed</span>
                    <strong>{lastUpdated?.toLocaleTimeString() || "—"}</strong>
                </div>
            </section>

            {/* SESSION KPI CARDS */}
            <div className="analytics-stats-grid">

                <div className="analytics-stat-card">
                    <div className="analytics-stat-icon teal">
                        <CarFront size={22} />
                    </div>
                    <p>Average Vehicles</p>
                    <h2>{sessionStats.averageTotal}</h2>
                    <span>Average intersection occupancy</span>
                </div>

                <div className="analytics-stat-card">
                    <div className="analytics-stat-icon amber">
                        <Clock3 size={22} />
                    </div>
                    <p>Average Waiting</p>
                    <h2>{sessionStats.averageWaiting}</h2>
                    <span>Vehicles waiting per snapshot</span>
                </div>

                <div className="analytics-stat-card">
                    <div className="analytics-stat-icon blue">
                        <Gauge size={22} />
                    </div>
                    <p>Average Congestion</p>
                    <h2>{sessionStats.averageCongestion}%</h2>
                    <span>
                        {getCongestionLevel(sessionStats.averageCongestion)} congestion
                    </span>
                </div>

                <div className="analytics-stat-card">
                    <div className="analytics-stat-icon purple">
                        <Activity size={22} />
                    </div>
                    <p>Average Arrival Rate</p>
                    <h2>{sessionStats.averageArrival}</h2>
                    <span>Vehicles per minute, summed across approaches</span>
                </div>

            </div>

            {/* PEAK CONGESTION INSIGHT */}
            <section className="analytics-insight-panel">
                <div className="analytics-insight-icon">
                    <AlertTriangle size={22} />
                </div>
                <div>
                    <span>Peak congestion observed</span>
                    <h3>
                        {sessionStats.peakWaiting} waiting vehicles
                    </h3>
                    <p>
                        Recorded at {formatTime(sessionStats.peakTime)}.
                        Congestion was {sessionStats.peakCongestion}% at that snapshot.
                    </p>
                </div>
            </section>

            {/* 3D CONGESTION FIELD */}
            <section className="analytics-panel analytics-panel-3d">
                <div className="analytics-panel-heading">
                    <div>
                        <h2>3D congestion field</h2>
                        <p>
                            Waiting vehicles for every approach across the latest
                            snapshots. Bar height is the queue, colour is the
                            congestion share. Drag to rotate, hover for details.
                        </p>
                    </div>
                    <Gauge size={21} />
                </div>

                <CongestionBars3D snapshots={snapshots} approaches={approaches} />
            </section>

            {/* CONGESTION TREND */}
            <section className="analytics-panel">
                <div className="analytics-panel-heading">
                    <div>
                        <h2>Congestion Trend</h2>
                        <p>
                            Changes in waiting vehicles throughout the available session
                        </p>
                    </div>
                    <TrendingUp size={21} />
                </div>

                <div className="trend-chart">
                    {recentSnapshots.map((snapshot, index) => (
                        <div className="trend-column" key={snapshot.timestamp}>
                            <span className="trend-value">
                                {snapshot.waiting}
                            </span>

                            <div className="trend-bar-container">
                                <div
                                    className="trend-bar"
                                    style={{
                                        height: `${(snapshot.waiting / maxWaiting) * 100}%`,
                                    }}
                                    title={`${snapshot.waiting} waiting vehicles`}
                                />
                            </div>

                            <span className="trend-label">
                                {formatTime(snapshot.timestamp)}
                            </span>
                        </div>
                    ))}
                </div>

                <p className="analytics-note">
                    Showing the latest {recentSnapshots.length} snapshots.
                    Higher bars indicate more waiting vehicles.
                </p>
            </section>

            {/* APPROACH ANALYSIS */}
            <section className="analytics-panel">
                <div className="analytics-panel-heading">
                    <div>
                        <h2>Approach-wise Demand Analysis</h2>
                        <p>
                            Average waiting vehicles across the available session
                        </p>
                    </div>
                    <BarChart3 size={21} />
                </div>

                <div className="approach-comparison">
                    {sessionStats.approachStats
                        .slice()
                        .sort((a, b) => b.averageWaiting - a.averageWaiting)
                        .map((approach) => (
                            <div className="comparison-row" key={approach.id}>
                                <div className="comparison-label">
                                    <span>{approach.name}</span>
                                    <strong>{approach.averageWaiting}</strong>
                                </div>

                                <div className="comparison-track">
                                    <div
                                        className="comparison-fill"
                                        style={{
                                            width: `${(approach.averageWaiting / maxApproachWaiting) * 100}%`,
                                        }}
                                    />
                                </div>

                                <span
                                    className={`comparison-status ${getCongestionLevel(approach.congestionPercentage)}`}
                                >
                                    {getCongestionLevel(approach.congestionPercentage)}
                                </span>
                            </div>
                        ))}
                </div>

                <p className="analytics-note">
                    The busiest approach is determined by average waiting vehicles,
                    not by a single snapshot.
                </p>
            </section>

            {/* ARRIVAL RATE ANALYSIS */}
            <section className="analytics-panel">
                <div className="analytics-panel-heading">
                    <div>
                        <h2>Traffic Arrival Analysis</h2>
                        <p>
                            Average recorded arrival rate for each approach
                        </p>
                    </div>
                    <Timer size={21} />
                </div>

                <div className="arrival-grid">
                    {sessionStats.approachStats.map((approach) => (
                        <div className="arrival-card" key={approach.id}>
                            <span>{approach.name}</span>
                            <strong>{approach.averageArrival}</strong>
                            <small>vehicles / minute</small>
                        </div>
                    ))}
                </div>

                <p className="analytics-note">
                    Arrival rate is based on newly observed vehicle tracks. It is an
                    estimate, not a validated count of vehicles crossing an entry line.
                </p>
            </section>

            {/* RAW RECORDS — SECONDARY */}
            <section className="analytics-panel">
                <div className="analytics-panel-heading">
                    <div>
                        <h2>Detailed Traffic Records</h2>
                        <p>
                            Underlying approach measurements for inspection
                        </p>
                    </div>
                    <span className="analytics-record-count">
                        {history.length} records
                    </span>
                </div>

                <div className="analytics-table-wrapper">
                    <table className="analytics-table">
                        <thead>
                            <tr>
                                <th>Approach</th>
                                <th>Total</th>
                                <th>Waiting</th>
                                <th>Moving</th>
                                <th>Arrival / min</th>
                                <th>Congestion</th>
                                <th>Observed At</th>
                            </tr>
                        </thead>

                        <tbody>
                            {[...history]
                                .sort(
                                    (a, b) =>
                                        new Date(b.observed_at) -
                                        new Date(a.observed_at)
                                )
                                .map((record, index) => (
                                    <tr
                                        key={`${record.approach_key}-${record.observed_at}-${index}`}
                                    >
                                        <td>{record.approach_key}</td>
                                        <td>{record.total_vehicles}</td>
                                        <td>{record.waiting_vehicles}</td>
                                        <td>{record.moving_vehicles}</td>
                                        <td>
                                            {Number(record.arrival_rate || 0).toFixed(2)}
                                        </td>
                                        <td>
                                            <span
                                                className={`comparison-status ${record.congestion_level || "low"}`}
                                            >
                                                {record.congestion_level || "unknown"}
                                            </span>
                                        </td>
                                        <td>{formatTime(record.observed_at)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {error && (
                <div className="analytics-error">
                    Latest refresh failed: {error}. Showing previously loaded data.
                </div>
            )}
        </div>
    );
};

export default Analytics;
