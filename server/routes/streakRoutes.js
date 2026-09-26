const express = require("express");
const router = express.Router();
const {
  getStreakGamificationData,
  updateStreakTargets,
} = require("../controllers/streakController");
const { protect } = require("../middleware/authMiddleware");

// All streak & gamification endpoints require JWT Auth
router.use(protect);

router.get("/dashboard", getStreakGamificationData);
router.put("/targets", updateStreakTargets);

module.exports = router;
