require("dotenv").config();

const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const trafficRoutes = require("./routes/traffic.routes");

const app = express();

const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/health", healthRoutes);
app.use("/api/traffic", trafficRoutes);


// Start server
app.listen(PORT, () => {
    console.log(`AI Traffic Manager API running on port ${PORT}`);
});