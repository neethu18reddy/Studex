const mongoose = require("mongoose");
const StudySession = require("../models/studySessionModel");
const Task = require("../models/taskModel");
const User = require("../models/userModel");
const asyncHandler = require("../middleware/asyncHandler");
const { isDbConnected } = require("../config/db");

// Helper to check DB readiness
const checkDb = (res) => {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      message:
        "Database is currently not connected. Please check your MONGO_URI in server/.env or start MongoDB.",
      data: null,
    });
    return false;
  }
  return true;
};

// Date formatter YYYY-MM-DD
const formatDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Helper: Calculate ISO week and year
const getIsoWeekYear = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
};

// Helper: Get previous ISO week
const getPrevIsoWeek = (year, week) => {
  if (week > 1) {
    return { year, week: week - 1 };
  }
  // Previous year's last week
  const prevYearDec28 = new Date(year - 1, 11, 28);
  return getIsoWeekYear(prevYearDec28);
};

// Compute Badges
const computeBadges = ({ dailyStreak, weeklyStreak, totalFocusHours, tasksCompleted }) => {
  const allBadges = [
    {
      id: "novice_flame",
      title: "Novice Scholar",
      description: "Hit your daily study target for 1 day",
      icon: "🥉",
      category: "daily",
      unlocked: dailyStreak >= 1,
      required: 1,
      current: dailyStreak,
    },
    {
      id: "steady_flame",
      title: "Steady Flame",
      description: "Complete your daily study target 3 days in a row",
      icon: "🥈",
      category: "daily",
      unlocked: dailyStreak >= 3,
      required: 3,
      current: dailyStreak,
    },
    {
      id: "weekly_warrior",
      title: "Weekly Warrior",
      description: "Complete your daily study target 7 days in a row",
      icon: "🥇",
      category: "daily",
      unlocked: dailyStreak >= 7,
      required: 7,
      current: dailyStreak,
    },
    {
      id: "unstoppable_force",
      title: "12-Day Unstoppable",
      description: "Maintain a blistering 12-day study streak",
      icon: "🔥",
      category: "daily",
      unlocked: dailyStreak >= 12,
      required: 12,
      current: dailyStreak,
    },
    {
      id: "supernova_titan",
      title: "Supernova Titan",
      description: "Maintain a legendary 30-day study streak",
      icon: "⚡",
      category: "daily",
      unlocked: dailyStreak >= 30,
      required: 30,
      current: dailyStreak,
    },
    {
      id: "goal_crusher_1w",
      title: "Goal Crusher",
      description: "Reach your 15h weekly study target for 1 week",
      icon: "🏆",
      category: "weekly",
      unlocked: weeklyStreak >= 1,
      required: 1,
      current: weeklyStreak,
    },
    {
      id: "monthly_master_4w",
      title: "4-Week Champion",
      description: "Reach your weekly target 4 weeks in a row",
      icon: "👑",
      category: "weekly",
      unlocked: weeklyStreak >= 4,
      required: 4,
      current: weeklyStreak,
    },
    {
      id: "century_focus",
      title: "Century Club",
      description: "Accumulate 100+ total hours of deep focus study",
      icon: "💎",
      category: "focus",
      unlocked: totalFocusHours >= 100,
      required: 100,
      current: totalFocusHours,
    },
    {
      id: "task_slayer_25",
      title: "Task Slayer",
      description: "Complete 25+ academic tasks",
      icon: "🎯",
      category: "tasks",
      unlocked: tasksCompleted >= 25,
      required: 25,
      current: tasksCompleted,
    },
  ];

  return allBadges;
};

// Compute Level & Rank Title
const computeRankAndXP = ({ totalMinutes, tasksCompleted, dailyStreak, weeklyStreak }) => {
  const xpFromStudy = Math.round(totalMinutes * 2);
  const xpFromTasks = tasksCompleted * 20;
  const xpFromDailyStreak = dailyStreak * 50;
  const xpFromWeeklyStreak = weeklyStreak * 200;

  const totalXP = xpFromStudy + xpFromTasks + xpFromDailyStreak + xpFromWeeklyStreak;
  const level = Math.max(1, Math.floor(Math.sqrt(totalXP / 80)) + 1);

  const currentLevelBaseXP = Math.round(Math.pow(level - 1, 2) * 80);
  const nextLevelXP = Math.round(Math.pow(level, 2) * 80);
  const levelProgress = Math.min(
    100,
    Math.round(((totalXP - currentLevelBaseXP) / Math.max(1, nextLevelXP - currentLevelBaseXP)) * 100)
  );

  let rankTitle = "Novice Scholar";
  if (level >= 30) rankTitle = "Legendary Grandmaster";
  else if (level >= 20) rankTitle = "Grandmaster Scholar";
  else if (level >= 15) rankTitle = "Master Academic";
  else if (level >= 10) rankTitle = "Focus Vanguard";
  else if (level >= 5) rankTitle = "Adept Researcher";
  else if (level >= 2) rankTitle = "Dedicated Student";

  return {
    totalXP,
    level,
    rankTitle,
    levelProgress,
    currentLevelBaseXP,
    nextLevelXP,
  };
};

/**
 * @desc    Get Comprehensive Gamification & Streaks Data (Phase 10 Milestone 10)
 * @route   GET /api/streaks/dashboard
 * @access  Private (Requires JWT Auth)
 */
const getStreakGamificationData = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const userId = new mongoose.Types.ObjectId(req.user._id);
  const user = await User.findById(req.user._id);

  const dailyGoalMinutes = user?.dailyStudyGoalMinutes || 45;
  const weeklyGoalHours = user?.weeklyStudyGoalHours || 15;

  // -------------------------------------------------------------
  // 1. MONGODB AGGREGATION: Daily Study Totals
  // -------------------------------------------------------------
  const dailyAggregation = await StudySession.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
        },
        totalMinutes: { $sum: "$duration" },
        sessionCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dailyMap = new Map(dailyAggregation.map((d) => [d._id, d.totalMinutes]));

  // Today's numbers
  const todayStr = formatDateStr(new Date());
  const todayMinutes = dailyMap.get(todayStr) || 0;
  const isTodayQualified = todayMinutes >= dailyGoalMinutes;

  // -------------------------------------------------------------
  // 2. DAILY STREAK CALCULATION (Based on Daily Study Target)
  // -------------------------------------------------------------
  let dailyStreak = 0;
  let evalDate = new Date();

  // If today hasn't met target yet, start streak evaluation from yesterday
  if (!isTodayQualified) {
    evalDate.setDate(evalDate.getDate() - 1);
  }

  while (true) {
    const dStr = formatDateStr(evalDate);
    const dayMins = dailyMap.get(dStr) || 0;
    if (dayMins >= dailyGoalMinutes) {
      dailyStreak++;
      evalDate.setDate(evalDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate Longest Daily Streak
  let longestDailyStreak = 0;
  let tempStreak = 0;
  let lastDate = null;

  dailyAggregation.forEach((day) => {
    if (day.totalMinutes >= dailyGoalMinutes) {
      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round(
          (new Date(day._id) - new Date(lastDate)) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) tempStreak++;
        else tempStreak = 1;
      }
      longestDailyStreak = Math.max(longestDailyStreak, tempStreak);
      lastDate = day._id;
    }
  });
  longestDailyStreak = Math.max(longestDailyStreak, dailyStreak);

  // -------------------------------------------------------------
  // 3. MONGODB AGGREGATION: Weekly Study Totals
  // -------------------------------------------------------------
  const weeklyAggregation = await StudySession.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$startTime" },
          week: { $isoWeek: "$startTime" },
        },
        totalMinutes: { $sum: "$duration" },
        sessionCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } },
  ]);

  const weeklyMap = new Map();
  weeklyAggregation.forEach((w) => {
    const key = `${w._id.year}-W${String(w._id.week).padStart(2, "0")}`;
    weeklyMap.set(key, w.totalMinutes / 60);
  });

  const now = new Date();
  const currentIso = getIsoWeekYear(now);
  const currentWeekKey = `${currentIso.year}-W${String(currentIso.week).padStart(2, "0")}`;
  const thisWeekHours = Number((weeklyMap.get(currentWeekKey) || 0).toFixed(1));
  const isThisWeekQualified = thisWeekHours >= weeklyGoalHours;

  // -------------------------------------------------------------
  // 4. WEEKLY STREAK CALCULATION (Based on Weekly Study Target)
  // -------------------------------------------------------------
  let weeklyStreak = 0;
  let evalWeek = { ...currentIso };

  // If this week hasn't reached target yet, evaluate from previous week
  if (!isThisWeekQualified) {
    evalWeek = getPrevIsoWeek(evalWeek.year, evalWeek.week);
  }

  while (true) {
    const wKey = `${evalWeek.year}-W${String(evalWeek.week).padStart(2, "0")}`;
    const wHours = weeklyMap.get(wKey) || 0;
    if (wHours >= weeklyGoalHours) {
      weeklyStreak++;
      evalWeek = getPrevIsoWeek(evalWeek.year, evalWeek.week);
    } else {
      break;
    }
  }

  // -------------------------------------------------------------
  // 5. LIFETIME STATS & TASKS
  // -------------------------------------------------------------
  const totalMinutes = dailyAggregation.reduce((acc, d) => acc + d.totalMinutes, 0);
  const totalFocusHours = Number((totalMinutes / 60).toFixed(1));

  const taskStats = await Task.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  let tasksCompleted = 0;
  let totalTasks = 0;
  taskStats.forEach((t) => {
    totalTasks += t.count;
    if (t._id === "completed") tasksCompleted = t.count;
  });
  const completionRate =
    totalTasks > 0 ? Number(((tasksCompleted / totalTasks) * 100).toFixed(1)) : 0;

  // -------------------------------------------------------------
  // 6. GAMIFICATION XP, LEVEL & BADGES
  // -------------------------------------------------------------
  const rankAndXP = computeRankAndXP({
    totalMinutes,
    tasksCompleted,
    dailyStreak,
    weeklyStreak,
  });

  const badges = computeBadges({
    dailyStreak,
    weeklyStreak,
    totalFocusHours,
    tasksCompleted,
  });

  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  // -------------------------------------------------------------
  // 7. SHAREABLE STREAK CARD METADATA
  // -------------------------------------------------------------
  const shareableCard = {
    studentName: user.name,
    studentEmail: user.email,
    college: user.college || "Academic Workspace",
    course: user.course || "Student",
    year: user.year || "Undergraduate",
    avatar: user.profilePicture?.url || "",
    dailyStreak: dailyStreak,
    dailyStreakLabel: `🔥 ${dailyStreak} Day Streak`,
    weeklyStreak: weeklyStreak,
    weeklyStreakLabel: `🏆 ${weeklyStreak} Week Goal Streak`,
    totalFocusHours: totalFocusHours,
    tasksCompleted: tasksCompleted,
    completionRate: completionRate,
    level: rankAndXP.level,
    rankTitle: rankAndXP.rankTitle,
    totalXP: rankAndXP.totalXP,
    verifiedDate: new Date().toISOString(),
    studexBranding: "Studex Academic Workspace & Student Platform",
  };

  res.status(200).json({
    success: true,
    data: {
      dailyStreak: {
        count: dailyStreak,
        label: `🔥 ${dailyStreak} Day Streak`,
        longest: longestDailyStreak,
        targetMinutes: dailyGoalMinutes,
        todayMinutes: todayMinutes,
        isTargetMetToday: isTodayQualified,
        todayPercentage: Math.min(
          100,
          Math.round((todayMinutes / dailyGoalMinutes) * 100)
        ),
        remainingTodayMinutes: Math.max(0, dailyGoalMinutes - todayMinutes),
      },
      weeklyStreak: {
        count: weeklyStreak,
        label: `🏆 ${weeklyStreak} Week Goal Streak`,
        targetHours: weeklyGoalHours,
        thisWeekHours: thisWeekHours,
        isTargetMetThisWeek: isThisWeekQualified,
        thisWeekPercentage: Math.min(
          100,
          Math.round((thisWeekHours / weeklyGoalHours) * 100)
        ),
        remainingThisWeekHours: Math.max(
          0,
          Number((weeklyGoalHours - thisWeekHours).toFixed(1))
        ),
      },
      gamification: {
        ...rankAndXP,
        badges,
        unlockedBadgesCount,
        totalBadgesCount: badges.length,
      },
      shareableCard,
    },
  });
});

/**
 * @desc    Update Daily & Weekly Study Targets for Streaks
 * @route   PUT /api/streaks/targets
 * @access  Private
 */
const updateStreakTargets = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { dailyStudyGoalMinutes, weeklyStudyGoalHours } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (dailyStudyGoalMinutes !== undefined) {
    user.dailyStudyGoalMinutes = Math.max(5, Number(dailyStudyGoalMinutes));
  }

  if (weeklyStudyGoalHours !== undefined) {
    user.weeklyStudyGoalHours = Math.max(1, Number(weeklyStudyGoalHours));
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Streak goals updated successfully",
    data: {
      dailyStudyGoalMinutes: user.dailyStudyGoalMinutes,
      weeklyStudyGoalHours: user.weeklyStudyGoalHours,
    },
  });
});

module.exports = {
  getStreakGamificationData,
  updateStreakTargets,
};
