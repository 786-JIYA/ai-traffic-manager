
const pool = require("../config/db");

const receiveTrafficData = async (req, res) => {
    const { intersection_id, timestamp, approaches } = req.body;

    let client;

    try {
        client = await pool.connect();

        await client.query("BEGIN");

        // Find the registered intersection.
        const intersectionResult = await client.query(
            `SELECT id
             FROM intersections
             WHERE intersection_key = $1`,
            [intersection_id]
        );

        if (intersectionResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Intersection not found"
            });
        }

        const intersectionDbId = intersectionResult.rows[0].id;

        // Save one snapshot for each approach.
        let savedCount = 0;

        for (const [approachKey, data] of Object.entries(approaches)) {

            const approachResult = await client.query(
                `SELECT id
                 FROM approaches
                 WHERE intersection_id = $1
                 AND approach_key = $2`,
                [intersectionDbId, approachKey]
            );

            if (approachResult.rows.length === 0) {
                throw new Error(
                    `Approach not registered: ${approachKey}`
                );
            }

            const approachDbId = approachResult.rows[0].id;

            await client.query(
                `INSERT INTO traffic_snapshots (
                    approach_id,
                    total_vehicles,
                    waiting_vehicles,
                    moving_vehicles,
                    arrival_rate,
                    congestion_level,
                    observed_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    approachDbId,
                    data.total_vehicles,
                    data.waiting_vehicles,
                    data.moving_vehicles,
                    data.arrival_rate,
                    data.congestion_level,
                    timestamp
                ]
            );

            savedCount++;
        }

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Traffic analytics saved successfully",
            saved_approaches: savedCount
        });

    } catch (error) {

        if (client) {
            await client.query("ROLLBACK");
        }

        console.error("Traffic persistence error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to save traffic analytics"
        });

    } finally {

        if (client) {
            client.release();
        }
    }
};


const getTrafficHistory = async (req, res) => {
    const { intersection_id, approach } = req.query;

    const requestedLimit = req.query.limit ?? "50";
    const limit = Number(requestedLimit);

    if (
        typeof intersection_id !== "string" ||
        intersection_id.trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "intersection_id is required"
        });
    }

    if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 500
    ) {
        return res.status(400).json({
            success: false,
            message: "Limit must be between 1 and 500"
        });
    }

    if (
        approach !== undefined &&
        (typeof approach !== "string" || approach.trim() === "")
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid approach"
        });
    }

    try {
        const values = [intersection_id];

        let query = `
            SELECT
                i.intersection_key,
                a.approach_key,
                ts.total_vehicles,
                ts.waiting_vehicles,
                ts.moving_vehicles,
                ts.arrival_rate,
                ts.congestion_level,
                ts.observed_at,
                ts.received_at

            FROM traffic_snapshots ts

            JOIN approaches a
                ON ts.approach_id = a.id

            JOIN intersections i
                ON a.intersection_id = i.id

            WHERE i.intersection_key = $1
        `;

        if (approach !== undefined) {
            values.push(approach);

            query += ` AND a.approach_key = $${values.length}`;
        }

        values.push(limit);

        query += `
            ORDER BY ts.observed_at DESC
            LIMIT $${values.length}
        `;

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Traffic history error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve traffic history"
        });
    }
};


module.exports = {
    receiveTrafficData,
    getTrafficHistory
};
