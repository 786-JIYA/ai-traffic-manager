
const express = require("express");

const {
    receiveTrafficData,
    getTrafficHistory,
    getLatestTraffic
} = require("../controllers/traffic.controller");

const validateTraffic = require("../middleware/validateTraffic");

const router = express.Router();

// Receive and store traffic analytics
router.post(
    "/analytics",
    validateTraffic,
    receiveTrafficData
);

// Retrieve historical traffic analytics
router.get(
    "/history",
    getTrafficHistory
);

router.get("/latest", getLatestTraffic);

module.exports = router;
