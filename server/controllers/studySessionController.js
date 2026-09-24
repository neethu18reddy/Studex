const StudySession = require("../models/studySessionModel");
const Task = require("../models/taskModel");
const Subject = require("../models/subjectModel");
const asyncHandler = require("../middleware/asyncHandler");
const { isDbConnected } = require("../config/db");

// Helper to check DB readiness
const checkDb = (res) => {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      message:
        "Database is currently not connected. Please check your MONGO_URI in server/.env or start MongoDB.",
      data: [],
    });
    return false;
  }
  return true;
};

/**
 * @desc    Record a completed study focus session
 * @route   POST /api/study-sessions
 * @access  Private (Requires JWT Auth)
 */
const recordSession = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const {
    subjectId,
    startTime,
    endTime,
    duration,
    tasksCompleted,
    notes,
  } = req.body;

  // If subject specified, ensure user owns the subject
  if (subjectId) {
    const subjectDoc = await Subject.findOne({
      _id: subjectId,
      user: req.user._id,
    });
    if (!subjectDoc) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or does not belong to the current student",
      });
    }
  }

  // Calculate duration if not explicitly passed
  let finalDuration = duration;
  if (!finalDuration && startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    finalDuration = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
  }

  // If tasks were marked as completed in this session, mark them completed in DB
  if (tasksCompleted && Array.isArray(tasksCompleted) && tasksCompleted.length > 0) {
    await Task.updateMany(
      {
        _id: { $in: tasksCompleted },
        user: req.user._id,
      },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
        },
      }
    );
  }

  const session = await StudySession.create({
    userId: req.user._id,
    subjectId: subjectId || null,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    duration: Number(finalDuration),
    tasksCompleted: tasksCompleted || [],
    notes: notes || "",
  });

  const populatedSession = await StudySession.findById(session._id)
    .populate("subjectId", "name code color")
    .populate("tasksCompleted", "title priority status");

  res.status(201).json({
    success: true,
    message: "Study session recorded successfully",
    data: populatedSession,
  });
});

/**
 * @desc    Get study session history for current student
 * @route   GET /api/study-sessions
 * @access  Private (Requires JWT Auth)
 */
const getStudySessions = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { subjectId, limit } = req.query;
  const filter = { userId: req.user._id };

  if (subjectId) {
    filter.subjectId = subjectId;
  }

  const maxLimit = limit ? Math.min(100, parseInt(limit, 10)) : 50;

  const sessions = await StudySession.find(filter)
    .populate("subjectId", "name code color")
    .populate("tasksCompleted", "title priority status")
    .sort({ startTime: -1 })
    .limit(maxLimit);

  res.status(200).json({
    success: true,
    count: sessions.length,
    data: sessions,
  });
});

/**
 * @desc    Get aggregate study statistics and focus metrics
 * @route   GET /api/study-sessions/stats
 * @access  Private (Requires JWT Auth)
 */
const getStudyStats = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const userId = req.user._id;

  // 1. All sessions for user
  const allSessions = await StudySession.find({ userId }).populate(
    "subjectId",
    "name code color"
  );

  const totalSessions = allSessions.length;
  const totalFocusMinutes = allSessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  // 2. Today's focus minutes
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todaySessions = allSessions.filter(
    (s) => new Date(s.startTime) >= startOfDay && new Date(s.startTime) <= endOfDay
  );
  const todayFocusMinutes = todaySessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  // 3. Past 7 days focus minutes
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const weekSessions = allSessions.filter(
    (s) => new Date(s.startTime) >= sevenDaysAgo
  );
  const weekFocusMinutes = weekSessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  // 4. Tasks completed during focus sessions
  const totalTasksCompleted = allSessions.reduce(
    (acc, s) => acc + (s.tasksCompleted ? s.tasksCompleted.length : 0),
    0
  );

  // 5. Subject breakdown
  const subjectMap = {};
  allSessions.forEach((s) => {
    const key = s.subjectId ? s.subjectId._id.toString() : "general";
    const name = s.subjectId ? s.subjectId.name : "General Study";
    const color = s.subjectId ? s.subjectId.color : "#aa3bff";

    if (!subjectMap[key]) {
      subjectMap[key] = {
        subjectId: s.subjectId ? s.subjectId._id : null,
        subjectName: name,
        color,
        totalMinutes: 0,
        sessionCount: 0,
      };
    }
    subjectMap[key].totalMinutes += s.duration || 0;
    subjectMap[key].sessionCount += 1;
  });

  const subjectBreakdown = Object.values(subjectMap).sort(
    (a, b) => b.totalMinutes - a.totalMinutes
  );

  res.status(200).json({
    success: true,
    data: {
      totalFocusMinutes,
      totalFocusHours: (totalFocusMinutes / 60).toFixed(1),
      totalSessions,
      todayFocusMinutes,
      weekFocusMinutes,
      totalTasksCompletedInFocus: totalTasksCompleted,
      subjectBreakdown,
    },
  });
});

/**
 * @desc    Delete a study session
 * @route   DELETE /api/study-sessions/:id
 * @access  Private (Requires JWT Auth)
 */
const deleteSession = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const session = await StudySession.findById(req.params.id);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: `Study session with id ${req.params.id} not found`,
    });
  }

  // Ensure user owns the session
  if (session.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this study session",
    });
  }

  await StudySession.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Study session deleted successfully",
    data: {},
  });
});

module.exports = {
  recordSession,
  getStudySessions,
  getStudyStats,
  deleteSession,
};
