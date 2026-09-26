const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const { connectDb, isDbConnected } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const courseRoutes = require("./routes/courseRoutes");
const taskRoutes = require("./routes/taskRoutes");
const studySessionRoutes = require("./routes/studySessionRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

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
    architecture: "Route -> Middleware -> Controller -> Model -> Database",
    endpoints: {
      health: "/api/health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me (Protected)",
      },
      users: {
        getProfile: "GET /api/users/me (Protected)",
        updateProfile: "PUT /api/users/me (Protected)",
        uploadProfilePicture: "POST /api/users/profile-image (Protected, multipart/form-data)",
      },
      subjects: {
        getAll: "GET /api/subjects (Protected)",
        create: "POST /api/subjects (Protected)",
        delete: "DELETE /api/subjects/:id (Protected)",
      },
      resources: {
        getAll: "GET /api/resources (Protected, ?subject=&type=&search=)",
        create: "POST /api/resources (Protected, multipart/form-data or link)",
        delete: "DELETE /api/resources/:id (Protected)",
      },
      tasks: {
        getAll: "GET /api/tasks (Protected, ?status=&priority=&subject=&search=)",
        getToday: "GET /api/tasks/today (Protected)",
        getUpcoming: "GET /api/tasks/upcoming (Protected)",
        create: "POST /api/tasks (Protected)",
        update: "PATCH /api/tasks/:id (Protected)",
        delete: "DELETE /api/tasks/:id (Protected)",
      },
      studySessions: {
        getAll: "GET /api/study-sessions (Protected, ?subjectId=&limit=)",
        getStats: "GET /api/study-sessions/stats (Protected)",
        record: "POST /api/study-sessions (Protected)",
        delete: "DELETE /api/study-sessions/:id (Protected)",
      },
      courses: {
        getAll: "GET /api/courses",
        getById: "GET /api/courses/:id",
        create: "POST /api/courses (Protected)",
        update: "PUT /api/courses/:id (Protected)",
        delete: "DELETE /api/courses/:id (Protected)",
      },
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

// API Route Modules
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/study-sessions", studySessionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/courses", courseRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = () => {
  // Connect to DB asynchronously so HTTP routes respond immediately
  connectDb();

  return app.listen(PORT, () => {
    console.log(`🚀 Studex Server running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;