const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const { connectDb, isDbConnected } = require("./config/db");
const { initSocketServer } = require("./socket/socketServer");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const courseRoutes = require("./routes/courseRoutes");
const taskRoutes = require("./routes/taskRoutes");
const studySessionRoutes = require("./routes/studySessionRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const streakRoutes = require("./routes/streakRoutes");
const calendarRoutes = require("./routes/calendarRoutes");
const aiRoutes = require("./routes/aiRoutes");
const spaceRoutes = require("./routes/spaceRoutes");
const directMessageRoutes = require("./routes/directMessageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io real-time engine
initSocketServer(server);

// Global Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Route
app.get("/", (req, res) => {
  res.json({
    name: "Studex API",
    version: "1.0.0",
    description: "API for Studex Academic Workspace & Student Platform",
    realtime: "Socket.io active (presence, messaging, typing, notifications, task updates)",
    architecture: "Route -> Middleware -> Controller -> Model -> Database",
  });
});

// Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Studex server is healthy",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: isDbConnected() ? "connected" : "disconnected",
    realtime: "Socket.io enabled",
  });
});

// API Route Modules
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/study-sessions", studySessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/streaks", streakRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/dm", directMessageRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = () => {
  // Connect to DB asynchronously so HTTP routes respond immediately
  connectDb();

  server.listen(PORT, () => {
    console.log(`🚀 Studex Server (with Socket.io) running on http://localhost:${PORT}`);
  });

  // Keep event loop active
  const keepAlive = setInterval(() => {}, 60000);
  server.on("close", () => clearInterval(keepAlive));

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server };