const express = require("express");
const router = express.Router();
const {
  getDashboardAnalytics,
  getDailyStudyAnalytics,
  getWeeklyStudyAnalytics,
  getSubjectWiseAnalytics,
  getTaskAnalytics,
  updateGoals,
} = require("../controllers/analyticsController");
const { protect } = require("../middleware/authMiddleware");

// All analytics endpoints require student JWT authentication
router.use(protect);

// Main dashboard aggregation
router.get("/dashboard", getDashboardAnalytics);
router.get("/daily", getDailyStudyAnalytics);
router.get("/weekly", getWeeklyStudyAnalytics);
router.get("/subjects", getSubjectWiseAnalytics);
router.get("/tasks", getTaskAnalytics);
router.put("/goals", updateGoals);

module.exports = router;
