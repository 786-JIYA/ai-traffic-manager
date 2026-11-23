
import { useEffect, useState } from "react";
import api from "../services/api";
import useSignalUpdates from "../hooks/useSignalUpdates";


const demoSamples = [
    {
        state: "ALL_RED",
        active_phase: null,
        green_duration: null,
        elapsed_seconds: 2,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "GREEN",
        active_phase: "bottom_left",
        green_duration: 15,
        elapsed_seconds: 5,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "YELLOW",
        active_phase: "bottom_left",
        green_duration: 15,
        elapsed_seconds: 2,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "ALL_RED",
        active_phase: null,
        green_duration: null,
        elapsed_seconds: 2,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "GREEN",
        active_phase: "right_side",
        green_duration: 20,
        elapsed_seconds: 7,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "YELLOW",
        active_phase: "right_side",
        green_duration: 20,
        elapsed_seconds: 2,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "ALL_RED",
        active_phase: null,
        green_duration: null,
        elapsed_seconds: 2,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "GREEN",
        active_phase: "top_center",
        green_duration: 18,
        elapsed_seconds: 6,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
    {
        state: "YELLOW",
        active_phase: "top_center",
        green_duration: 18,
        elapsed_seconds: 2,
        simulation_mode: true,
        observed_at: new Date().toISOString(),
    },
];


function SignalManagement() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    const [demoMode, setDemoMode] = useState(false);
    const [demoIndex, setDemoIndex] = useState(0);


    const {
        signalData,
        setSignalData,
        setLastUpdated,
    } = useSignalUpdates();

    useEffect(() => {
        const loadSignalData = async () => {
            try {
                setLoading(true);
                setError("");

                const [latestResponse, historyResponse] = await Promise.all([
                    api.getLatestSignalState(),
                    api.getSignalHistory(),
                ]);

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
        if (!demoMode) return;

        const interval = setInterval(() => {
            setDemoIndex((previousIndex) =>
                (previousIndex + 1) % demoSamples.length
            );
        }, 2500);

        return () => clearInterval(interval);
    }, [demoMode]);


    const displayedSignalData = demoMode
        ? demoSamples[demoIndex]
        : signalData;


    const currentState = displayedSignalData?.state || "UNKNOWN";

    const stateClass = currentState.toLowerCase().replace("_", "-");

    if (loading) {
        return <div className="signal-page-message">Loading signal information...</div>;
    }

    return (
        <div className="signal-management-page">
            <div className="signal-page-header">
                <div>
                    <h1>Signal Management</h1>
                    <p>Monitor simulated traffic signal states and transitions.</p>
                </div>


                <div className="signal-header-actions">
                    <span className="simulation-badge">
                        {demoMode ? "DEMO MODE" : "LIVE SIMULATION"}
                    </span>

                    <button
                        className={`demo-button ${demoMode ? "stop-demo" : ""}`}
                        onClick={() => {
                            if (demoMode) {
                                setDemoMode(false);
                                setDemoIndex(0);
                            } else {
                                setDemoIndex(0);
                                setDemoMode(true);
                            }
                        }}
                    >
                        {demoMode ? "■ Stop Demo" : "▶ Start Demo"}
                    </button>
                </div>

            </div>

            {error && (
                <div className="signal-error">
                    {error}
                </div>
            )}

            <section className="signal-current-card">
                <div className="signal-card-heading">
                    <div>
                        <h2>Current Signal State</h2>
                        <p>Intersection: intersection_01</p>
                    </div>

                    <span className={`signal-state-badge ${stateClass}`}>
                        {currentState.replace("_", " ")}
                    </span>
                </div>


                <div className="traffic-signal-visual">
                    <div className="traffic-signal-housing">
                        <div className={`traffic-light red-light ${currentState === "ALL_RED" ? "active" : ""}`}>
                            <span />
                        </div>

                        <div className={`traffic-light yellow-light ${currentState === "YELLOW" ? "active" : ""}`}>
                            <span />
                        </div>

                        <div className={`traffic-light green-light ${currentState === "GREEN" ? "active" : ""}`}>
                            <span />
                        </div>
                    </div>

                    <div className="traffic-signal-pole" />

                    <p className="traffic-signal-caption">
                        LIVE SIMULATED SIGNAL
                    </p>
                </div>


                <section className="intersection-panel">
                    <div className="intersection-panel-heading">
                        <h3>Intersection Overview</h3>
                        <span>5 APPROACHES</span>
                    </div>

                    <div className="intersection-road-layout">
                        {[
                            { id: "top_center", label: "Top Center", position: "top" },
                            { id: "bottom_left", label: "Bottom Left", position: "bottom-left" },
                            { id: "left_side", label: "Left Side", position: "left" },
                            { id: "right_side", label: "Right Side", position: "right" },
                            { id: "bottom_right_slip", label: "Bottom Right Slip", position: "bottom-right" },
                        ].map((approach) => {
                            const isActive =
                                displayedSignalData?.state === "GREEN" &&
                                displayedSignalData?.active_phase === approach.id

                            return (
                                <div
                                    key={approach.id}
                                    className={`approach-node ${approach.position} ${isActive ? "active" : ""}`}
                                >
                                    <span className="approach-indicator" />
                                    <strong>{approach.label}</strong>
                                    <small>{isActive ? "GREEN ACTIVE" : "NOT ACTIVE"}</small>
                                </div>
                            );
                        })}


                        {demoMode && (
                            <div className="demo-vehicle-layer">
                                <span className="demo-car car-horizontal">🚗</span>
                                <span className="demo-car car-vertical">🚙</span>
                                <span className="demo-car car-diagonal">🚕</span>
                                <span className="demo-car car-reverse">🚗</span>
                            </div>
                        )}


                        <div className="intersection-center">
                            <div className="intersection-center-lines">
                                <span />
                                <span />
                                <span />
                            </div>
                            <strong>INTERSECTION</strong>
                            <small>SIMULATION</small>
                        </div>
                    </div>
                </section>



                <div className="signal-details-grid">
                    <div className="signal-detail">
                        <span>Active Approach</span>
                        <strong>
                            {signalData?.active_phase || "None"}
                        </strong>
                    </div>

                    <div className="signal-detail">
                        <span>Green Duration</span>
                        <strong>
                            {signalData?.green_duration != null
                                ? `${signalData.green_duration} sec`
                                : "N/A"}
                        </strong>
                    </div>

                    <div className="signal-detail">
                        <span>Elapsed Time</span>
                        <strong>
                            {signalData?.elapsed_seconds != null
                                ? `${Number(signalData.elapsed_seconds).toFixed(1)} sec`
                                : "N/A"}
                        </strong>
                    </div>

                    <div className="signal-detail">
                        <span>Last Observed</span>
                        <strong>
                            {signalData?.observed_at
                                ? new Date(signalData.observed_at).toLocaleTimeString()
                                : "N/A"}
                        </strong>
                    </div>
                </div>
            </section>

            <section className="signal-history-section">
                <div className="signal-section-heading">
                    <h2>Signal Transition History</h2>
                    <span>{history.length} records</span>
                </div>

                {history.length === 0 ? (
                    <p className="signal-empty">
                        No signal transition history available yet.
                    </p>
                ) : (
                    <div className="signal-history-list">
                        {history.map((item) => (
                            <div className="signal-history-item" key={item.id}>
                                <div>
                                    <strong>
                                        {item.state.replace("_", " ")}
                                    </strong>
                                    <p>
                                        Approach: {item.active_phase || "None"}
                                    </p>
                                </div>

                                <span>
                                    {new Date(item.observed_at).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default SignalManagement;
