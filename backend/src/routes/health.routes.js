const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "AI Traffic Manager backend is running!",
        service: "Backend API",
        timestamp: new Date().toISOString()
    });
});

module.exports = router;