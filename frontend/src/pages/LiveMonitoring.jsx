import { useEffect, useMemo, useState } from "react";
import { Radio, CarFront, Clock3, Activity, RefreshCw } from "lucide-react";

import api from "../services/api";
import useTrafficUpdates from "../hooks/useTrafficUpdates";
import useSignalUpdates from "../hooks/useSignalUpdates";
import VideoComparison from "../components/traffic/VideoComparison";
import Intersection3D from "../components/three/Intersection3D";
import {
    APPROACHES,
    indexByApproach,
    levelFromWaiting,
    normalizeApproaches,
    sumBy,
} from "../utils/traffic";

const INTERSECTION = "intersection_01";
const LEVEL_TEXT = { low: "Low", medium: "Medium", high: "High" };

const LiveMonitoring = () => {
    const [initialData, setInitialData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const {
        trafficData: liveData,
        lastUpdated,
        isConnected,
    } = useTrafficUpdates(INTERSECTION);

    const { signalData, setSignalData } = useSignalUpdates(INTERSECTION);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [traffic, signal] = await Promise.all([
                    api.getLatestTraffic(INTERSECTION),
                    api.getLatestSignalState(INTERSECTION).catch(() => null),
                ]);

                if (cancelled) return;

                setInitialData(normalizeApproaches(traffic.data));
                if (signal?.success && signal.data) setSignalData(signal.data);
                setError("");
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [setSignalData]);

    const rows = useMemo(() => {
        const live = normalizeApproaches(liveData);
        return live.length ? live : initialData;
    }, [liveData, initialData]);

    const trafficMap = useMemo(() => indexByApproach(rows), [rows]);
    const hasData = rows.length > 0;

    const show = (value) => (loading ? "…" : hasData ? value : "—");

    const stats = [
        { label: "Total vehicles", value: show(sumBy(rows, "total_vehicles")), icon: CarFront },
        { label: "Waiting", value: show(sumBy(rows, "waiting_vehicles")), icon: Clock3 },
        { label: "Moving", value: show(sumBy(rows, "moving_vehicles")), icon: Activity },
        { label: "Monitored approaches", value: APPROACHES.length, icon: Radio },
    ];

    const stamp = lastUpdated || rows[0]?.observed_at;

    return (
        <div className="page monitoring-page">
            <header className="page-head">
                <div>
                    <h1>Live monitoring</h1>
                    <p>Watch vehicle movement and congestion at the junction as it happens.</p>
                </div>

                <div className={`live-badge ${isConnected ? "connected" : ""}`}>
                    <span className="live-dot" />
                    {isConnected ? "Connected" : "Disconnected"}
                </div>
            </header>

            {error && (
                <div className="notice notice-error" role="alert">
                    Unable to load traffic data: {error}
                </div>
            )}

            <section className="kpi-strip" aria-label="Live totals">
                {stats.map(({ label, value, icon: Icon }) => (
                    <div className="kpi" key={label}>
                        <div className="kpi-label">
                            <Icon size={17} />
                            {label}
                        </div>
                        <strong className="kpi-value">{value}</strong>
                    </div>
                ))}
            </section>

            {/* Original and AI-processed video comparison */}
            <VideoComparison />

            <section className="monitor-split">
                <div className="panel panel-flush">
                    <div className="panel-head panel-head-pad">
                        <div>
                            <h2>3D junction</h2>
                            <p>Queues build up behind red lights and clear on green.</p>
                        </div>
                    </div>
                    <Intersection3D traffic={trafficMap} signal={signalData} height={420} />
                </div>

                <div className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>Approach monitoring</h2>
                            <p>Individual traffic conditions</p>
                        </div>

                        <div className="last-update">
                            <RefreshCw size={14} />
                            <span>
                                {stamp ? new Date(stamp).toLocaleString() : "Waiting for data"}
                            </span>
                        </div>
                    </div>

                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Approach</th>
                                    <th>Total</th>
                                    <th>Waiting</th>
                                    <th>Moving</th>
                                    <th>Arrival rate</th>
                                    <th>Congestion</th>
                                </tr>
                            </thead>

                            <tbody>
                                {APPROACHES.map((approach) => {
                                    const data = trafficMap[approach.id];
                                    const level = data
                                        ? data.congestion_level ||
                                          levelFromWaiting(Number(data.waiting_vehicles || 0))
                                        : "none";

                                    return (
                                        <tr key={approach.id}>
                                            <td>
                                                <div className="cell-name">
                                                    <strong>{approach.name}</strong>
                                                    <small>{approach.direction}</small>
                                                </div>
                                            </td>
                                            <td>{data ? data.total_vehicles : "—"}</td>
                                            <td>{data ? data.waiting_vehicles : "—"}</td>
                                            <td>{data ? data.moving_vehicles : "—"}</td>
                                            <td>{data ? data.arrival_rate : "—"}</td>
                                            <td>
                                                <span className={`level-chip ${level}`}>
                                                    <span className="level-dot" />
                                                    {LEVEL_TEXT[level] || "No data"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!loading && !hasData && (
                        <div className="table-empty">
                            No traffic snapshot yet. Start the detection engine and this table fills in.
                        </div>
                    )}
                </div>
            </section>

            <footer className="page-foot">
                <span>Source: AI Traffic Analytics API</span>
                <span>{isConnected ? "Live updates on" : "Waiting for the Socket.IO connection"}</span>
            </footer>
        </div>
    );
};

export default LiveMonitoring;
