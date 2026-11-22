const EXPECTED_APPROACHES = [
    "bottom_left",
    "top_center",
    "left_side",
    "right_side",
    "bottom_right_slip"
];

const CONGESTION_LEVELS = [
    "low",
    "medium",
    "high"
];

const validateTraffic = (req, res, next) => {
    const { intersection_id, timestamp, approaches } = req.body;

    // Validate intersection ID
    if (
        typeof intersection_id !== "string" ||
        intersection_id.trim() === ""
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid intersection ID"
        });
    }

    // Validate timestamp
    if (
        typeof timestamp !== "string" ||
        Number.isNaN(Date.parse(timestamp))
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid timestamp"
        });
    }

    // Validate approaches object
    if (
        !approaches ||
        typeof approaches !== "object" ||
        Array.isArray(approaches)
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid approaches data"
        });
    }

    // Check that all five approaches exist
    const receivedApproaches = Object.keys(approaches);

    const hasAllApproaches =
        EXPECTED_APPROACHES.every(
            approach => receivedApproaches.includes(approach)
        );

    if (
        !hasAllApproaches ||
        receivedApproaches.length !== EXPECTED_APPROACHES.length
    ) {
        return res.status(400).json({
            success: false,
            message: "All five expected approaches are required"
        });
    }

    // Validate each approach
    for (const approach of EXPECTED_APPROACHES) {

        const data = approaches[approach];

        if (!data || typeof data !== "object") {
            return res.status(400).json({
                success: false,
                message: `Invalid data for ${approach}`
            });
        }

        const {
            total_vehicles,
            waiting_vehicles,
            moving_vehicles,
            arrival_rate,
            congestion_level
        } = data;

        const counts = [
            total_vehicles,
            waiting_vehicles,
            moving_vehicles
        ];

        const validCounts = counts.every(
            value =>
                Number.isInteger(value) &&
                value >= 0
        );

        if (!validCounts) {
            return res.status(400).json({
                success: false,
                message: `Invalid vehicle counts for ${approach}`
            });
        }

        if (
            waiting_vehicles + moving_vehicles !== total_vehicles
        ) {
            return res.status(400).json({
                success: false,
                message: `Vehicle count mismatch for ${approach}`
            });
        }

        if (
            typeof arrival_rate !== "number" ||
            !Number.isFinite(arrival_rate) ||
            arrival_rate < 0
        ) {
            return res.status(400).json({
                success: false,
                message: `Invalid arrival rate for ${approach}`
            });
        }

        if (!CONGESTION_LEVELS.includes(congestion_level)) {
            return res.status(400).json({
                success: false,
                message: `Invalid congestion level for ${approach}`
            });
        }
    }

    next();
};

module.exports = validateTraffic;