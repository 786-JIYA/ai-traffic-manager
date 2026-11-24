import { useEffect, useMemo, useState } from "react";
import { Activity, CarFront, Clock3, Gauge } from "lucide-react";

import api from "../services/api";
import useTrafficUpdates from "../hooks/useTrafficUpdates";
import useSignalUpdates from "../hooks/useSignalUpdates";
import Intersection3D from "../components/three/Intersection3D";
import ApproachRow from "../components/dashboard/ApproachRow";
import {
    APPROACHES,
    formatClock,
    indexByApproach,
    levelFromWaiting,
    normalizeApproaches,
    percentOf,
    sumBy,
} from "../utils/traffic";

const INTERSECTION = "intersection_01";

const Dashboard = () => {
    const [initialData, setInitialData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState("");

    const {
        trafficData: liveTrafficData,
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
                setApiError("");
            } catch (error) {
                if (!cancelled) setApiError(error.message);
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
        const live = normalizeApproaches(liveTrafficData);
        return live.length ? live : initialData;
    }, [liveTrafficData, initialData]);

    const trafficByApproach = useMemo(() => indexByApproach(rows), [rows]);

    const hasData = rows.length > 0;
    const totalVehicles = sumBy(rows, "total_vehicles");
    const totalWaiting = sumBy(rows, "waiting_vehicles");
    const totalMoving = sumBy(rows, "moving_vehicles");
    const averageWaiting = hasData ? (totalWaiting / rows.length).toFixed(1) : "—";
    const congestion = percentOf(totalWaiting, totalVehicles);
    const congestionLevel = levelFromWaiting(totalWaiting);

    const show = (value) => (loading ? "…" : hasData ? value : "—");

    const kpis = [
        { label: "Vehicles in view", value: show(totalVehicles), note: "Across all approaches", icon: CarFront },
        { label: "Moving", value: show(totalMoving), note: "Currently in motion", icon: Activity },
        { label: "Average waiting", value: show(averageWaiting), note: "Vehicles per approach", icon: Clock3 },
        {
            label: "Congestion",
            value: show(`${congestion}%`),
            note: hasData ? `${congestionLevel} overall` : "Waiting for traffic data",
            icon: Gauge,
            tone: hasData ? congestionLevel : undefined,
        },
    ];

    const snapshotTime = lastUpdated || rows[0]?.observed_at;

    return (
        <div className="page dashboard">
            <header className="page-head">
                <div>
                    <h1>Traffic dashboard</h1>
                    <p>Queues, signal phase and a live 3D model of the junction.</p>
                </div>

                <div className={`live-badge ${isConnected ? "connected" : ""}`}>
                    <span className="live-dot" />
                    {isConnected ? "Live updates connected" : "Live updates disconnected"}
                </div>
            </header>

            {apiError && (
                <div className="notice notice-error" role="alert">
                    Unable to load traffic data: {apiError}
                </div>
            )}

            <section className="kpi-strip" aria-label="Traffic summary">
                {kpis.map(({ label, value, note, icon: Icon, tone }) => (
                    <div className="kpi" key={label} data-tone={tone}>
                        <div className="kpi-label">
                            <Icon size={17} />
                            {label}
                        </div>
                        <strong className="kpi-value">{value}</strong>
                        <span className="kpi-note">{note}</span>
                    </div>
                ))}
            </section>

            <section className="dash-main">
                <div className="panel panel-flush">
                    <div className="panel-head panel-head-pad">
                        <div>
                            <h2>Junction model</h2>
                            <p>Drag to rotate and scroll to zoom. Signals and queues follow live data.</p>
                        </div>
                    </div>
                    <Intersection3D traffic={trafficByApproach} signal={signalData} className="stage-fill" />
                </div>

                <div className="panel approach-panel">
                    <div className="panel-head">
                        <div>
                            <h2>Approaches</h2>
                            <p>Each block is one vehicle</p>
                        </div>
                        <span className="count-pill">{APPROACHES.length} lanes</span>
                    </div>

                    <ul className="approach-list">
                        {APPROACHES.map((approach) => (
                            <ApproachRow
                                key={approach.id}
                                approach={approach}
                                data={trafficByApproach[approach.id]}
                            />
                        ))}
                    </ul>
                </div>
            </section>

            <section className="dash-bottom">
                <div className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>Latest snapshot</h2>
                            <p>What the detection engine last reported</p>
                        </div>
                    </div>

                    <div className="empty-state">
                        <Activity size={28} />
                        <strong>
                            {hasData ? `${totalVehicles} vehicles detected` : "No traffic data yet"}
                        </strong>
                        <span>
                            {snapshotTime
                                ? `${lastUpdated ? "Last live update" : "Latest stored record"}: ${formatClock(snapshotTime)}`
                                : "Start the detection engine to see vehicles here."}
                        </span>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>System health</h2>
                            <p>Connected services</p>
                        </div>
                    </div>

                    <div className="service-row">
                        <span>AI detection engine</span>
                        <span className={hasData ? "service-online" : "service-pending"}>
                            {hasData ? "Data received" : "No data"}
                        </span>
                    </div>

                    <div className="service-row">
                        <span>Backend API</span>
                        <span className={apiError ? "service-down" : loading ? "service-pending" : "service-online"}>
                            {loading ? "Checking…" : apiError ? "Unavailable" : "Connected"}
                        </span>
                    </div>

                    <div className="service-row">
                        <span>Live updates</span>
                        <span className={isConnected ? "service-online" : "service-pending"}>
                            {isConnected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
