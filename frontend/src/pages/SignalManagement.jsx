import { useEffect, useMemo, useState } from "react";
import { Play, Square } from "lucide-react";

import api from "../services/api";
import useSignalUpdates from "../hooks/useSignalUpdates";
import useTrafficUpdates from "../hooks/useTrafficUpdates";
import Intersection3D from "../components/three/Intersection3D";
import { APPROACHES, indexByApproach, normalizeApproaches } from "../utils/traffic";

const INTERSECTION = "intersection_01";
const now = () => new Date().toISOString();

const demoSamples = [
    { state: "ALL_RED", active_phase: null, green_duration: null, elapsed_seconds: 2 },
    { state: "GREEN", active_phase: "bottom_left", green_duration: 15, elapsed_seconds: 5 },
    { state: "YELLOW", active_phase: "bottom_left", green_duration: 15, elapsed_seconds: 2 },
    { state: "ALL_RED", active_phase: null, green_duration: null, elapsed_seconds: 2 },
    { state: "GREEN", active_phase: "right_side", green_duration: 20, elapsed_seconds: 7 },
    { state: "YELLOW", active_phase: "right_side", green_duration: 20, elapsed_seconds: 2 },
    { state: "ALL_RED", active_phase: null, green_duration: null, elapsed_seconds: 2 },
    { state: "GREEN", active_phase: "top_center", green_duration: 18, elapsed_seconds: 6 },
    { state: "YELLOW", active_phase: "top_center", green_duration: 18, elapsed_seconds: 2 },
].map((sample) => ({ ...sample, simulation_mode: true, observed_at: now() }));

// Fixed queues so the 3D junction has something to show while the demo runs.
const demoTraffic = {
    bottom_left: { waiting_vehicles: 7, moving_vehicles: 3, congestion_level: "medium" },
    top_center: { waiting_vehicles: 4, moving_vehicles: 4, congestion_level: "low" },
    left_side: { waiting_vehicles: 9, moving_vehicles: 2, congestion_level: "medium" },
    right_side: { waiting_vehicles: 10, moving_vehicles: 3, congestion_level: "high" },
    bottom_right_slip: { waiting_vehicles: 3, moving_vehicles: 2, congestion_level: "low" },
};

const nameOf = (id) => APPROACHES.find((item) => item.id === id)?.name || "None";
const prettyState = (state) => String(state || "UNKNOWN").replace(/_/g, " ").toLowerCase();

function SignalManagement() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [demoMode, setDemoMode] = useState(false);
    const [demoIndex, setDemoIndex] = useState(0);

    const [initialTraffic, setInitialTraffic] = useState([]);

    const { signalData, setSignalData, setLastUpdated } = useSignalUpdates(INTERSECTION);
    const { trafficData: liveTraffic } = useTrafficUpdates(INTERSECTION);

    useEffect(() => {
        const loadSignalData = async () => {
            try {
                setLoading(true);
                setError("");

                const [latestResponse, historyResponse, trafficResponse] = await Promise.all([
                    api.getLatestSignalState(),
                    api.getSignalHistory(),
                    api.getLatestTraffic().catch(() => null),
                ]);

                if (trafficResponse?.data) {
                    setInitialTraffic(normalizeApproaches(trafficResponse.data));
                }

                if (latestResponse.success && latestResponse.data) {
                    setSignalData(latestResponse.data);
                    setLastUpdated(latestResponse.data.observed_at);
                }

                if (historyResponse.success) {
                    setHistory(historyResponse.data || []);
                }
            } catch (err) {
                setError(err.message || "Unable to load signal information.");
            } finally {
                setLoading(false);
            }
        };

        loadSignalData();
    }, [setSignalData, setLastUpdated]);

    useEffect(() => {
        if (!demoMode) return undefined;

        const interval = setInterval(() => {
            setDemoIndex((previous) => (previous + 1) % demoSamples.length);
        }, 2500);

        return () => clearInterval(interval);
    }, [demoMode]);

    const displayed = demoMode ? demoSamples[demoIndex] : signalData;
    const currentState = displayed?.state || "UNKNOWN";
    const stateClass = currentState.toLowerCase().replace(/_/g, "-");

    const liveTrafficMap = useMemo(() => {
        const live = normalizeApproaches(liveTraffic);
        return indexByApproach(live.length ? live : initialTraffic);
    }, [liveTraffic, initialTraffic]);

    const sceneTraffic = demoMode ? demoTraffic : liveTrafficMap;

    const toggleDemo = () => {
        setDemoIndex(0);
        setDemoMode((value) => !value);
    };

    if (loading) {
        return <div className="page"><div className="notice">Loading signal information…</div></div>;
    }

    const details = [
        { label: "Active approach", value: nameOf(displayed?.active_phase) },
        {
            label: "Green duration",
            value: displayed?.green_duration != null ? `${displayed.green_duration} s` : "N/A",
        },
        {
            label: "Elapsed time",
            value: displayed?.elapsed_seconds != null
                ? `${Number(displayed.elapsed_seconds).toFixed(1)} s`
                : "N/A",
        },
        {
            label: "Last observed",
            value: displayed?.observed_at
                ? new Date(displayed.observed_at).toLocaleTimeString()
                : "N/A",
        },
    ];

    return (
        <div className="page signal-management-page">
            <header className="page-head">
                <div>
                    <h1>Signal management</h1>
                    <p>Follow simulated signal states and transitions at the junction.</p>
                </div>

                <div className="head-actions">
                    <span className={`mode-badge ${demoMode ? "demo" : ""}`}>
                        {demoMode ? "Demo mode" : "Live simulation"}
                    </span>

                    <button
                        type="button"
                        className={`btn ${demoMode ? "btn-stop" : "btn-primary"}`}
                        onClick={toggleDemo}
                    >
                        {demoMode ? <Square size={15} /> : <Play size={15} />}
                        {demoMode ? "Stop demo" : "Start demo"}
                    </button>
                </div>
            </header>

            {error && <div className="notice notice-error" role="alert">{error}</div>}

            <section className="signal-layout">
                <div className="panel signal-state-panel">
                    <div className="panel-head">
                        <div>
                            <h2>Current signal state</h2>
                            <p>Intersection: {INTERSECTION}</p>
                        </div>
                    </div>

                    <div className={`signal-state-badge ${stateClass}`}>
                        {prettyState(currentState)}
                    </div>

                    <div className="traffic-signal-visual">
                        <div className="traffic-signal-housing" role="img" aria-label={`Signal is ${prettyState(currentState)}`}>
                            <div className={`traffic-light red-light ${currentState === "ALL_RED" ? "active" : ""}`}><span /></div>
                            <div className={`traffic-light yellow-light ${currentState === "YELLOW" ? "active" : ""}`}><span /></div>
                            <div className={`traffic-light green-light ${currentState === "GREEN" ? "active" : ""}`}><span /></div>
                        </div>
                        <div className="traffic-signal-pole" />
                    </div>

                    <dl className="signal-details">
                        {details.map(({ label, value }) => (
                            <div className="signal-detail" key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="panel panel-flush">
                    <div className="panel-head panel-head-pad">
                        <div>
                            <h2>Intersection overview</h2>
                            <p>
                                {demoMode
                                    ? "Demo running: the phase changes every 2.5 seconds."
                                    : "The glowing lane has the green. Others are held at the stop line."}
                            </p>
                        </div>
                        <span className="count-pill">{APPROACHES.length} approaches</span>
                    </div>

                    <Intersection3D traffic={sceneTraffic} signal={displayed} height={560} />
                </div>
            </section>

            <section className="panel">
                <div className="panel-head">
                    <div>
                        <h2>Signal transition history</h2>
                        <p>Most recent changes first</p>
                    </div>
                    <span className="count-pill">{history.length} records</span>
                </div>

                {history.length === 0 ? (
                    <p className="table-empty">No signal transitions recorded yet.</p>
                ) : (
                    <ol className="history-list">
                        {history.map((item) => (
                            <li className="history-item" key={item.id}>
                                <span className={`history-dot ${String(item.state).toLowerCase().replace(/_/g, "-")}`} />
                                <div>
                                    <strong>{prettyState(item.state)}</strong>
                                    <p>Approach: {nameOf(item.active_phase)}</p>
                                </div>
                                <time>{new Date(item.observed_at).toLocaleString()}</time>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </div>
    );
}

export default SignalManagement;
