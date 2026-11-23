
const express = require("express");

const {
    reportSignalState,
    getLatestSignalState,
    getSignalHistory
} = require("../controllers/signal.controller");

const router = express.Router();

router.post("/state", reportSignalState);
router.get("/latest", getLatestSignalState);
router.get("/history", getSignalHistory);

module.exports = router;
