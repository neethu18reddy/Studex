const Subject = require("../models/subjectModel");
const Task = require("../models/taskModel");
const CalendarEvent = require("../models/calendarEventModel");
const StudySession = require("../models/studySessionModel");
const Resource = require("../models/resourceModel");

/**
 * Aggregates complete live academic context for a student user.
 * This is fed directly to Gemini AI for deeply personalized study planning.
 *
 * @param {Object} user - The authenticated user document
 * @returns {Promise<Object>} Formatted student context summary
 */
async function getStudentAcademicContext(user) {
  const userId = user._id;
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 1. Fetch Enrolled Subjects
  const subjects = await Subject.find({ user: userId }).lean();

  // 2. Fetch Active & Pending Tasks
  const pendingTasks = await Task.find({
    user: userId,
    status: { $in: ["todo", "in_progress"] },
  })
    .populate("subject", "name code color")
    .sort({ priority: -1, deadline: 1 })
    .lean();

  const completedTasksRecently = await Task.find({
    user: userId,
    status: "completed",
    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  }).countDocuments();

  // 3. Fetch Upcoming Calendar Events & Deadlines (Next 30 Days)
  const upcomingEvents = await CalendarEvent.find({
    user: userId,
    date: { $gte: todayStr },
  })
    .sort({ date: 1, isImportant: -1 })
    .limit(15)
    .lean();

  // 4. Fetch Study Sessions & Weekly Velocity (Last 7 Days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = await StudySession.find({
    user: userId,
    createdAt: { $gte: sevenDaysAgo },
  })
    .populate("subject", "name code")
    .lean();

  const totalWeeklyMinutes = recentSessions.reduce(
    (sum, s) => sum + (s.duration || 0),
    0
  );

  // Calculate subject study breakdown in minutes
  const subjectStudyMap = {};
  recentSessions.forEach((s) => {
    const subName = s.subject?.name || "General Study";
    subjectStudyMap[subName] = (subjectStudyMap[subName] || 0) + (s.duration || 0);
  });

  // 5. Fetch Consistency & Active Days
  const activeDaysThisWeek = new Set(
    recentSessions
      .filter((s) => s.startTime)
      .map((s) => new Date(s.startTime).toISOString().split("T")[0])
  ).size;

  // 6. Fetch Uploaded Resources count
  const resourcesCount = await Resource.countDocuments({ user: userId });

  // Format upcoming deadlines with relative day countdowns
  const formattedDeadlines = upcomingEvents.map((ev) => {
    const evDate = new Date(ev.date + "T00:00:00");
    const diffTime = evDate - new Date(todayStr + "T00:00:00");
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let relative = "Today";
    if (diffDays === 1) relative = "Tomorrow";
    else if (diffDays > 1) relative = `In ${diffDays} days`;
    else if (diffDays < 0) relative = `${Math.abs(diffDays)} days ago`;

    return {
      title: ev.title,
      category: ev.category,
      date: ev.date,
      relative,
      isImportant: ev.isImportant,
      description: ev.description,
    };
  });

  // Format pending tasks with urgency
  const formattedTasks = pendingTasks.map((t) => {
    let deadlineRel = "No deadline set";
    if (t.deadline) {
      const d = new Date(t.deadline);
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) deadlineRel = "Due Today!";
      else if (diffDays === 1) deadlineRel = "Due Tomorrow!";
      else if (diffDays > 1) deadlineRel = `Due in ${diffDays} days`;
      else if (diffDays < 0) deadlineRel = `Overdue by ${Math.abs(diffDays)} days!`;
    }

    return {
      id: t._id,
      title: t.title,
      subject: t.subject?.name || "General",
      subjectCode: t.subject?.code || "",
      priority: t.priority,
      status: t.status,
      deadlineRelative: deadlineRel,
      estimatedMinutes: t.estimatedDuration || 30,
      isStarred: t.isStarred || false,
    };
  });

  const weeklyTargetHours = 10; // Default weekly target in hours
  const weeklyTargetMinutes = weeklyTargetHours * 60;
  const targetProgressPercent = Math.min(
    100,
    Math.round((totalWeeklyMinutes / weeklyTargetMinutes) * 100)
  );

  return {
    student: {
      name: user.name || "Student",
      college: user.college || "University",
      course: user.course || "Degree",
      year: user.year || "Undergraduate",
      studentId: user.studentId || user._id.toString().substring(0, 8).toUpperCase(),
    },
    subjects: subjects.map((s) => ({
      id: s._id,
      name: s.name,
      code: s.code,
      color: s.color,
    })),
    tasks: {
      pending: formattedTasks,
      totalPending: formattedTasks.length,
      completedPastWeek: completedTasksRecently,
    },
    deadlines: formattedDeadlines,
    studyStats: {
      weeklyHoursLogged: (totalWeeklyMinutes / 60).toFixed(1),
      weeklyTargetHours,
      targetProgressPercent,
      subjectBreakdownMinutes: subjectStudyMap,
    },
    streak: {
      currentStreakDays: activeDaysThisWeek,
      activeDaysThisWeek,
      level: 1,
    },
    resourcesCount,
  };
}

module.exports = {
  getStudentAcademicContext,
};
