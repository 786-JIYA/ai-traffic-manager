require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const healthRoutes = require("./routes/health.routes");
const trafficRoutes = require("./routes/traffic.routes");
const signalRoutes = require("./routes/signal.routes");

const { initializeSocket } = require("./config/socket");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/traffic", trafficRoutes);
app.use("/api/signals", signalRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

server.listen(PORT, () => {
    console.log(`AI Traffic Manager API running on port ${PORT}`);
    console.log("Socket.IO server initialized");
});