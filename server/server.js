const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const { connectDb, isDbConnected } = require("./config/db");
const courseRoutes = require("./routes/courseRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware
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
    description: "API for Studex student learning & social platform",
    endpoints: {
      health: "/api/health",
      courses: "/api/courses",
    },
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
  });
});

// API Routes
app.use("/api/courses", courseRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = () => {
  // Connect to DB asynchronously so HTTP routes respond immediately
  connectDb();

  app.listen(PORT, () => {
    console.log(`🚀 Studex Server running on http://localhost:${PORT}`);
  });
};

startServer();

module.exports = app;