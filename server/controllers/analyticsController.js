const mongoose = require("mongoose");
const StudySession = require("../models/studySessionModel");
const Task = require("../models/taskModel");
const Subject = require("../models/subjectModel");
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

// Helper: generate ASCII progress bar (e.g. ████████████░░)
const generateAsciiProgressBar = (current, total, length = 14) => {
  if (!total || total <= 0) return "░".repeat(length);
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
};

// Helper: get current week Monday 00:00:00 to Sunday 23:59:59
const getCurrentWeekBounds = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  // Calculate difference to Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek, now };
};

/**
 * @desc    Get Comprehensive Analytics Dashboard Data (Phase 9 Milestone 9)
 * @route   GET /api/analytics/dashboard
 * @access  Private (Requires JWT Auth)
 */
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const userId = new mongoose.Types.ObjectId(req.user._id);
  const { startOfWeek, endOfWeek, now } = getCurrentWeekBounds();

  // User goals (default to 15 hrs study, 28 tasks)
  const user = await User.findById(req.user._id);
  const weeklyStudyGoalHours = user?.weeklyStudyGoalHours || 15;
  const weeklyTaskGoal = user?.weeklyTaskGoal || 28;

  // -------------------------------------------------------------
  // 1. MONGODB AGGREGATION: Study Sessions Metrics (Daily, Weekly, Total)
  // -------------------------------------------------------------
  const studySessionAggregation = await StudySession.aggregate([
    { $match: { userId } },
    {
      $facet: {
        // All-time total stats
        allTime: [
          {
            $group: {
              _id: null,
              totalMinutes: { $sum: "$duration" },
              totalSessions: { $sum: 1 },
              tasksCompletedInSessions: {
                $sum: { $size: { $ifNull: ["$tasksCompleted", []] } },
              },
            },
          },
        ],
        // This week's study time
        thisWeek: [
          {
            $match: {
              startTime: { $gte: startOfWeek, $lte: endOfWeek },
            },
          },
          {
            $group: {
              _id: null,
              totalMinutes: { $sum: "$duration" },
              sessionCount: { $sum: 1 },
            },
          },
        ],
        // Today's study time
        today: [
          {
            $match: {
              startTime: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                $lte: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
          },
          {
            $group: {
              _id: null,
              totalMinutes: { $sum: "$duration" },
              sessionCount: { $sum: 1 },
            },
          },
        ],
        // Daily study breakdown for past 7 days (including today)
        dailyTrend: [
          {
            $match: {
              startTime: {
                $gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
              },
            },
          },
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
        ],
        // Distinct active dates for streak calculation
        activeDates: [
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
              },
              totalMinutes: { $sum: "$duration" },
            },
          },
          { $sort: { _id: -1 } },
        ],
      },
    },
  ]);

  // Extract study results
  const allTimeStats = studySessionAggregation[0]?.allTime[0] || {
    totalMinutes: 0,
    totalSessions: 0,
    tasksCompletedInSessions: 0,
  };
  const thisWeekStats = studySessionAggregation[0]?.thisWeek[0] || {
    totalMinutes: 0,
    sessionCount: 0,
  };
  const todayStats = studySessionAggregation[0]?.today[0] || {
    totalMinutes: 0,
    sessionCount: 0,
  };
  const dailyTrendRaw = studySessionAggregation[0]?.dailyTrend || [];
  const activeDatesRaw = studySessionAggregation[0]?.activeDates || [];

  // -------------------------------------------------------------
  // 2. MONGODB AGGREGATION: Subject-Wise Study Time
  // -------------------------------------------------------------
  const subjectWiseStudy = await StudySession.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$subjectId",
        totalMinutes: { $sum: "$duration" },
        sessionCount: { $sum: 1 },
        lastStudied: { $max: "$startTime" },
      },
    },
    {
      $lookup: {
        from: "subjects",
        localField: "_id",
        foreignField: "_id",
        as: "subjectDoc",
      },
    },
    {
      $unwind: {
        path: "$subjectDoc",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        subjectId: "$_id",
        name: { $ifNull: ["$subjectDoc.name", "General Study"] },
        code: { $ifNull: ["$subjectDoc.code", "GEN"] },
        color: { $ifNull: ["$subjectDoc.color", "#aa3bff"] },
        totalMinutes: 1,
        sessionCount: 1,
        lastStudied: 1,
      },
    },
    { $sort: { totalMinutes: -1 } },
  ]);

  // Calculate percentage distribution for subjects
  const totalFocusMinsAllSubjects = Math.max(1, allTimeStats.totalMinutes);
  const subjectBreakdown = subjectWiseStudy.map((sub) => ({
    ...sub,
    totalHours: Number((sub.totalMinutes / 60).toFixed(1)),
    percentage: Math.round((sub.totalMinutes / totalFocusMinsAllSubjects) * 100),
  }));

  // -------------------------------------------------------------
  // 3. MONGODB AGGREGATION: Task Analytics (Completed, Pending, Completion Rate)
  // -------------------------------------------------------------
  const taskAggregation = await Task.aggregate([
    { $match: { user: userId } },
    {
      $facet: {
        // Tasks by status (completed, in_progress, todo)
        statusCounts: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalEstimatedMinutes: { $sum: "$estimatedDuration" },
            },
          },
        ],
        // Tasks by priority (urgent, high, medium, low)
        priorityCounts: [
          {
            $group: {
              _id: "$priority",
              count: { $sum: 1 },
            },
          },
        ],
        // Tasks completed this week
        thisWeekCompleted: [
          {
            $match: {
              status: "completed",
              completedAt: { $gte: startOfWeek, $lte: endOfWeek },
            },
          },
          { $count: "count" },
        ],
        // Total tasks count
        totalCount: [{ $count: "total" }],
      },
    },
  ]);

  // Extract task results
  const statusCounts = taskAggregation[0]?.statusCounts || [];
  let tasksCompleted = 0;
  let tasksInProgress = 0;
  let tasksTodo = 0;

  statusCounts.forEach((sc) => {
    if (sc._id === "completed") tasksCompleted = sc.count;
    else if (sc._id === "in_progress") tasksInProgress = sc.count;
    else if (sc._id === "todo") tasksTodo = sc.count;
  });

  const totalTasks = tasksCompleted + tasksInProgress + tasksTodo;
  const tasksPending = tasksInProgress + tasksTodo;
  const completionRate =
    totalTasks > 0 ? Number(((tasksCompleted / totalTasks) * 100).toFixed(1)) : 0;

  const thisWeekCompletedCount =
    taskAggregation[0]?.thisWeekCompleted[0]?.count || tasksCompleted;

  // -------------------------------------------------------------
  // 4. CONSISTENCY & STREAK CALCULATION (🔥 X days)
  // -------------------------------------------------------------
  const activeDateSet = new Set(activeDatesRaw.map((d) => d._id));
  
  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date();
  
  const formatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayStr = formatDateStr(checkDate);
  const hasStudiedToday = activeDateSet.has(todayStr);

  // If haven't studied today, start streak evaluation from yesterday
  if (!hasStudiedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days backward
  while (true) {
    const dateStr = formatDateStr(checkDate);
    if (activeDateSet.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Generate 7-day consistency status for current week (Mon to Sun)
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekConsistency = [];
  const currMonday = new Date(startOfWeek);

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(currMonday);
    dayDate.setDate(currMonday.getDate() + i);
    const dayStr = formatDateStr(dayDate);
    const dayActive = activeDateSet.has(dayStr);
    
    // Find minutes studied on this specific day
    const dayRecord = activeDatesRaw.find((d) => d._id === dayStr);
    const dayMins = dayRecord ? dayRecord.totalMinutes : 0;

    weekConsistency.push({
      dayName: daysOfWeek[i],
      date: dayStr,
      minutes: dayMins,
      active: dayActive,
      isToday: dayStr === todayStr,
      isFuture: dayDate > now,
    });
  }

  const activeDaysThisWeek = weekConsistency.filter((d) => d.active).length;

  // -------------------------------------------------------------
  // 5. 7-DAY DAILY STUDY TIME TIMELINE (Filled with 0s for missing days)
  // -------------------------------------------------------------
  const dailyStudyTrend = [];
  const trendMap = new Map(dailyTrendRaw.map((d) => [d._id, d]));

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - i);
    const dateStr = formatDateStr(targetDate);
    const dayName = targetDate.toLocaleDateString("en-US", { weekday: "short" });
    const formattedShort = targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const record = trendMap.get(dateStr);
    const minutes = record ? record.totalMinutes : 0;
    const hours = Number((minutes / 60).toFixed(1));

    dailyStudyTrend.push({
      date: dateStr,
      dayName,
      label: formattedShort,
      minutes,
      hours,
      sessionCount: record ? record.sessionCount : 0,
    });
  }

  // -------------------------------------------------------------
  // 6. ASSEMBLE PROGRESS SUMMARY (MILESTONE 9 SPECIFICATION)
  // -------------------------------------------------------------
  const weeklyStudyHours = Number((thisWeekStats.totalMinutes / 60).toFixed(1));
  const dailyStudyHours = Number((todayStats.totalMinutes / 60).toFixed(1));
  
  const studyProgressRatio = Math.min(1, weeklyStudyHours / weeklyStudyGoalHours);
  const studyProgressBarAscii = `${generateAsciiProgressBar(
    weeklyStudyHours,
    weeklyStudyGoalHours,
    14
  )} ${weeklyStudyHours} / ${weeklyStudyGoalHours} hrs`;

  const tasksProgressBarAscii = `${generateAsciiProgressBar(
    tasksCompleted,
    weeklyTaskGoal,
    13
  )} ${tasksCompleted} / ${weeklyTaskGoal}`;

  res.status(200).json({
    success: true,
    data: {
      // Milestone 9 Dashboard Header Overview
      overview: {
        thisWeek: {
          study: {
            currentHours: weeklyStudyHours,
            targetHours: weeklyStudyGoalHours,
            currentMinutes: thisWeekStats.totalMinutes,
            percentage: Math.min(
              100,
              Math.round((weeklyStudyHours / weeklyStudyGoalHours) * 100)
            ),
            formatted: `${weeklyStudyHours} / ${weeklyStudyGoalHours} hrs`,
            asciiBar: studyProgressBarAscii,
          },
          tasks: {
            completed: tasksCompleted,
            target: weeklyTaskGoal,
            pending: tasksPending,
            total: totalTasks,
            completionRate: completionRate,
            formatted: `${tasksCompleted} / ${weeklyTaskGoal}`,
            asciiBar: tasksProgressBarAscii,
          },
          consistency: {
            currentStreak: currentStreak,
            streakLabel: `🔥 ${currentStreak} days`,
            activeDaysThisWeek,
            daysCount: 7,
            score: Math.round((activeDaysThisWeek / 7) * 100),
            weekMatrix: weekConsistency,
          },
        },
      },

      // Key Metrics
      metrics: {
        dailyStudyTime: {
          todayMinutes: todayStats.totalMinutes,
          todayHours: dailyStudyHours,
          todaySessions: todayStats.sessionCount,
        },
        weeklyStudyTime: {
          weekMinutes: thisWeekStats.totalMinutes,
          weekHours: weeklyStudyHours,
          weekSessions: thisWeekStats.sessionCount,
          weeklyGoalHours: weeklyStudyGoalHours,
        },
        allTimeStudyTime: {
          totalMinutes: allTimeStats.totalMinutes,
          totalHours: Number((allTimeStats.totalMinutes / 60).toFixed(1)),
          totalSessions: allTimeStats.totalSessions,
          tasksFinishedInFocus: allTimeStats.tasksCompletedInSessions,
        },
        taskMetrics: {
          completed: tasksCompleted,
          inProgress: tasksInProgress,
          todo: tasksTodo,
          pending: tasksPending,
          total: totalTasks,
          completionRate: completionRate,
          weeklyGoal: weeklyTaskGoal,
        },
      },

      // Daily Study Time Trend (Chart Data)
      dailyStudyTrend,

      // Subject-wise Study Time Distribution
      subjectBreakdown,

      // Weekly Consistency Matrix
      weekConsistency,
    },
  });
});

/**
 * @desc    Get Daily Study Time Breakdown (MongoDB Aggregation)
 * @route   GET /api/analytics/daily
 * @access  Private
 */
const getDailyStudyAnalytics = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const userId = new mongoose.Types.ObjectId(req.user._id);
  const days = Math.min(60, parseInt(req.query.days, 10) || 7);
  const sinceDate = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  sinceDate.setHours(0, 0, 0, 0);

  const dailyData = await StudySession.aggregate([
    {
      $match: {
        userId,
        startTime: { $gte: sinceDate },
      },
    },
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

  res.status(200).json({
    success: true,
    count: dailyData.length,
    data: dailyData.map((d) => ({
      date: d._id,
      totalMinutes: d.totalMinutes,
      totalHours: Number((d.totalMinutes / 60).toFixed(1)),
      sessionCount: d.sessionCount,
    })),
  });
});

/**
 * @desc    Get Weekly Study Time Breakdown & Historical Weeks (MongoDB Aggregation)
 * @route   GET /api/analytics/weekly
 * @access  Private
 */
const getWeeklyStudyAnalytics = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const userId = new mongoose.Types.ObjectId(req.user._id);
  const { startOfWeek, endOfWeek } = getCurrentWeekBounds();

  const user = await User.findById(req.user._id);
  const targetGoal = user?.weeklyStudyGoalHours || 15;

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
        firstSessionDate: { $min: "$startTime" },
      },
    },
    { $sort: { "_id.year": -1, "_id.week": -1 } },
    { $limit: 8 },
  ]);

  res.status(200).json({
    success: true,
    weeklyGoalHours: targetGoal,
    data: weeklyAggregation.map((w) => ({
      year: w._id.year,
      weekNumber: w._id.week,
      totalMinutes: w.totalMinutes,
      totalHours: Number((w.totalMinutes / 60).toFixed(1)),
      sessionCount: w.sessionCount,
      percentageOfGoal: Math.min(
        100,
        Math.round(((w.totalMinutes / 60) / targetGoal) * 100)
      ),
    })),
  });
});

/**
 * @desc    Get Subject-wise Study Time Breakdown (MongoDB Aggregation)
 * @route   GET /api/analytics/subjects
 * @access  Private
 */
const getSubjectWiseAnalytics = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const userId = new mongoose.Types.ObjectId(req.user._id);

  const subjects = await StudySession.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$subjectId",
        totalMinutes: { $sum: "$duration" },
        sessionCount: { $sum: 1 },
        lastStudied: { $max: "$startTime" },
      },
    },
    {
      $lookup: {
        from: "subjects",
        localField: "_id",
        foreignField: "_id",
        as: "subjectDetails",
      },
    },
    {
      $unwind: {
        path: "$subjectDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        subjectId: "$_id",
        name: { $ifNull: ["$subjectDetails.name", "General Study"] },
        code: { $ifNull: ["$subjectDetails.code", "GEN"] },
        color: { $ifNull: ["$subjectDetails.color", "#aa3bff"] },
        totalMinutes: 1,
        sessionCount: 1,
        lastStudied: 1,
      },
    },
    { $sort: { totalMinutes: -1 } },
  ]);

  const grandTotal = subjects.reduce((acc, s) => acc + s.totalMinutes, 0) || 1;

  res.status(200).json({
    success: true,
    totalMinutes: grandTotal,
    totalHours: Number((grandTotal / 60).toFixed(1)),
    data: subjects.map((s) => ({
      ...s,
      totalHours: Number((s.totalMinutes / 60).toFixed(1)),
      percentage: Math.round((s.totalMinutes / grandTotal) * 100),
    })),
  });
});

/**
 * @desc    Get Task Progress and Completion Rate (MongoDB Aggregation)
 * @route   GET /api/analytics/tasks
 * @access  Private
 */
const getTaskAnalytics = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const userId = new mongoose.Types.ObjectId(req.user._id);

  const taskStats = await Task.aggregate([
    { $match: { user: userId } },
    {
      $facet: {
        byStatus: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalEstimatedMinutes: { $sum: "$estimatedDuration" },
            },
          },
        ],
        byPriority: [
          {
            $group: {
              _id: "$priority",
              count: { $sum: 1 },
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const byStatus = taskStats[0]?.byStatus || [];
  let completed = 0;
  let inProgress = 0;
  let todo = 0;

  byStatus.forEach((s) => {
    if (s._id === "completed") completed = s.count;
    else if (s._id === "in_progress") inProgress = s.count;
    else if (s._id === "todo") todo = s.count;
  });

  const total = completed + inProgress + todo;
  const pending = inProgress + todo;
  const completionRate =
    total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

  res.status(200).json({
    success: true,
    data: {
      completed,
      inProgress,
      todo,
      pending,
      total,
      completionRate,
      byPriority: taskStats[0]?.byPriority || [],
    },
  });
});

/**
 * @desc    Update Student Study Goals (Weekly hours & Task target)
 * @route   PUT /api/analytics/goals
 * @access  Private
 */
const updateGoals = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { weeklyStudyGoalHours, weeklyTaskGoal } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (weeklyStudyGoalHours !== undefined) {
    user.weeklyStudyGoalHours = Math.max(1, Number(weeklyStudyGoalHours));
  }

  if (weeklyTaskGoal !== undefined) {
    user.weeklyTaskGoal = Math.max(1, Number(weeklyTaskGoal));
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Study goals updated successfully",
    data: {
      weeklyStudyGoalHours: user.weeklyStudyGoalHours,
      weeklyTaskGoal: user.weeklyTaskGoal,
    },
  });
});

module.exports = {
  getDashboardAnalytics,
  getDailyStudyAnalytics,
  getWeeklyStudyAnalytics,
  getSubjectWiseAnalytics,
  getTaskAnalytics,
  updateGoals,
};
