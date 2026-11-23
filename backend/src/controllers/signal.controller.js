
const pool = require("../config/db");
const { getIO } = require("../config/socket");

const VALID_STATES = ["GREEN", "YELLOW", "ALL_RED"];

const reportSignalState = async (req, res) => {
    try {
        const {
            intersection_id,
            active_phase,
            state,
            green_duration,
            elapsed_seconds,
            observed_at,
            simulation_mode
        } = req.body;

        if (!intersection_id || !VALID_STATES.includes(state)) {
            return res.status(400).json({
                success: false,
                message: "Valid intersection_id and signal state are required."
            });
        }

        if (
            state === "ALL_RED" &&
            active_phase !== null
        ) {
            return res.status(400).json({
                success: false,
                message: "ALL_RED must not have an active phase."
            });
        }

        if (
            ["GREEN", "YELLOW"].includes(state) &&
            !active_phase
        ) {
            return res.status(400).json({
                success: false,
                message: "An active phase is required for GREEN and YELLOW."
            });
        }

        if (
            green_duration != null &&
            (!Number.isInteger(green_duration) ||
                green_duration < 10 ||
                green_duration > 60)
        ) {
            return res.status(400).json({
                success: false,
                message: "Green duration must be between 10 and 60 seconds."
            });
        }

        const elapsed = Number(elapsed_seconds ?? 0);

        if (!Number.isFinite(elapsed) || elapsed < 0) {
            return res.status(400).json({
                success: false,
                message: "Elapsed seconds must be a non-negative number."
            });
        }

        if (simulation_mode !== true) {
            return res.status(400).json({
                success: false,
                message: "Only simulation-mode updates are accepted."
            });
        }

        const timestamp = observed_at || new Date().toISOString();

        const result = await pool.query(
            `
INSERT INTO signal_state_history (
    intersection_id,
    active_approach_id,
    signal_state,
    green_duration_seconds,
    elapsed_seconds,
    simulation_mode,
    observed_at
)
SELECT
    i.id,
    a.id,
    $3::VARCHAR(20),
    $4,
    $5,
    TRUE,
    $6
FROM intersections i
LEFT JOIN approaches a
    ON a.intersection_id = i.id
    AND a.approach_key = $2
WHERE i.intersection_key = $1
  AND (
      ($3::VARCHAR(20) = 'ALL_RED' AND $2::VARCHAR IS NULL)
      OR
      ($3::VARCHAR(20) IN ('GREEN', 'YELLOW') AND a.id IS NOT NULL)
  )
RETURNING *
`,
            [
                intersection_id,
                active_phase,
                state,
                green_duration ?? null,
                elapsed,
                timestamp
            ]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Intersection or active approach was not found."
            });
        }

        const savedState = result.rows[0];

        const io = getIO();

        io.emit("signal:update", {
            intersection_id,
            active_phase,
            state,
            green_duration,
            elapsed_seconds: elapsed,
            simulation_mode: true,
            observed_at: savedState.observed_at
        });


        return res.status(201).json({
            success: true,
            message: "Signal state recorded successfully.",
            data: savedState
        });

    } catch (error) {
        console.error("Signal state error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to record signal state."
        });
    }
};


const getLatestSignalState = async (req, res) => {
    try {
        const { intersection_id } = req.query;

        if (!intersection_id) {
            return res.status(400).json({
                success: false,
                message: "intersection_id is required."
            });
        }

        const result = await pool.query(
            `SELECT
                h.id,
                i.intersection_key AS intersection_id,
                a.approach_key AS active_phase,
                h.signal_state AS state,
                h.green_duration_seconds AS green_duration,
                h.elapsed_seconds,
                h.simulation_mode,
                h.observed_at
            FROM signal_state_history h
            JOIN intersections i
                ON i.id = h.intersection_id
            LEFT JOIN approaches a
                ON a.id = h.active_approach_id
            WHERE i.intersection_key = $1
            ORDER BY h.observed_at DESC, h.id DESC
            LIMIT 1`,
            [intersection_id]
        );

        return res.status(200).json({
            success: true,
            data: result.rows[0] || null
        });

    } catch (error) {
        console.error("Latest signal state error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve signal state."
        });
    }
};


const getSignalHistory = async (req, res) => {
    try {
        const { intersection_id } = req.query;

        if (!intersection_id) {
            return res.status(400).json({
                success: false,
                message: "intersection_id is required."
            });
        }

        const result = await pool.query(
            `SELECT
                h.id,
                i.intersection_key AS intersection_id,
                a.approach_key AS active_phase,
                h.signal_state AS state,
                h.green_duration_seconds AS green_duration,
                h.elapsed_seconds,
                h.simulation_mode,
                h.observed_at
            FROM signal_state_history h
            JOIN intersections i
                ON i.id = h.intersection_id
            LEFT JOIN approaches a
                ON a.id = h.active_approach_id
            WHERE i.intersection_key = $1
            ORDER BY h.observed_at DESC, h.id DESC
            LIMIT 50`,
            [intersection_id]
        );

        return res.status(200).json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });

    } catch (error) {
        console.error("Signal history error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve signal history."
        });
    }
};



module.exports = {
    reportSignalState,
    getLatestSignalState,
    getSignalHistory
};
