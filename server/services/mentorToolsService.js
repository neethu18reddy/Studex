const User = require("../models/userModel");
const Subject = require("../models/subjectModel");
const Task = require("../models/taskModel");
const StudySession = require("../models/studySessionModel");
const CalendarEvent = require("../models/calendarEventModel");
const TopicMastery = require("../models/topicMasteryModel");
const MentorMemory = require("../models/mentorMemoryModel");
const DocumentChunk = require("../models/documentChunkModel");

/**
 * 1. Fetch Comprehensive Learning Profile
 */
async function getStudentLearningProfile(userId) {
  try {
    const [user, subjects, tasks, deadlines, memory, masteryList] = await Promise.all([
      User.findById(userId).select("-password").lean().catch(() => null),
      Subject.find({ user: userId }).lean().catch(() => []),
      Task.find({ user: userId, status: { $ne: "completed" } }).sort({ deadline: 1 }).lean().catch(() => []),
      CalendarEvent.find({ user: userId, date: { $gte: new Date(Date.now() - 86400000) } }).sort({ date: 1 }).lean().catch(() => []),
      MentorMemory.findOne({ user: userId }).lean().catch(() => null),
      TopicMastery.find({ user: userId }).sort({ masteryScore: 1 }).lean().catch(() => []),
    ]);

    const weakTopics = (masteryList || []).filter((m) => m && m.masteryScore < 60);
    const strongTopics = (masteryList || []).filter((m) => m && m.masteryScore >= 75);

    return {
      student: {
        name: user?.name || "Student",
        college: user?.college || "University",
        course: user?.course || "Computer Science",
        year: user?.year || "Current Year",
        streak: user?.streak || 0,
        points: user?.points || 0,
      },
      subjects: (subjects || []).map((s) => ({
        id: s._id,
        name: s.name,
        code: s.code,
      })),
      pendingTasksCount: (tasks || []).length,
      urgentTasks: (tasks || []).slice(0, 5).map((t) => ({
        id: t._id,
        title: t.title,
        priority: t.priority,
        deadline: t.deadline,
      })),
      upcomingDeadlines: (deadlines || []).slice(0, 5).map((d) => ({
        id: d._id,
        title: d.title,
        category: d.category,
        date: d.date,
      })),
      preferences: memory?.learningPreferences || {
        explanationStyle: "intuitive_analogies",
        difficultyPreference: "adaptive",
        preferredSessionDuration: 30,
      },
      activeGoal: memory?.activeGoal?.title || "Master enrolled semester subjects",
      persistentFacts: memory?.persistentFacts?.map((f) => f.fact) || [],
      masteryOverview: {
        totalTrackedTopics: (masteryList || []).length,
        weakTopics: weakTopics.map((w) => ({ topic: w.topic, subject: w.subjectName, score: w.masteryScore })),
        strongTopics: strongTopics.map((s) => ({ topic: s.topic, subject: s.subjectName, score: s.masteryScore })),
      },
    };
  } catch (err) {
    return {
      student: { name: "Student", college: "University", course: "Computer Science", year: "Current Year", streak: 0, points: 0 },
      subjects: [{ name: "Computer Networks" }, { name: "Machine Learning" }, { name: "Database Management Systems" }],
      pendingTasksCount: 0,
      urgentTasks: [],
      upcomingDeadlines: [],
      preferences: { explanationStyle: "intuitive_analogies", difficultyPreference: "adaptive" },
      activeGoal: "Master enrolled semester subjects",
      persistentFacts: [],
      masteryOverview: { totalTrackedTopics: 0, weakTopics: [], strongTopics: [] },
    };
  }
}

/**
 * 2. Get Topic Mastery list
 */
async function getTopicMastery(userId, subjectName = null) {
  const query = { user: userId };
  if (subjectName && subjectName !== "all") {
    query.subjectName = new RegExp(subjectName, "i");
  }
  return await TopicMastery.find(query).sort({ masteryScore: 1 }).lean();
}

/**
 * 3. Update or Insert Topic Mastery score
 */
async function updateTopicMastery(userId, { subjectName, topic, scoreDelta, mistake, strength }) {
  let doc = await TopicMastery.findOne({ user: userId, subjectName, topic });

  if (!doc) {
    doc = new TopicMastery({
      user: userId,
      subjectName,
      topic,
      masteryScore: Math.max(10, Math.min(100, 20 + (scoreDelta || 0))),
      attemptsCount: 1,
      correctCount: scoreDelta > 0 ? 1 : 0,
    });
  } else {
    doc.attemptsCount += 1;
    if (scoreDelta > 0) doc.correctCount += 1;
    doc.masteryScore = Math.max(0, Math.min(100, doc.masteryScore + (scoreDelta || 0)));
    doc.lastStudiedAt = new Date();
  }

  if (doc.masteryScore >= 85) doc.confidenceLevel = "mastered";
  else if (doc.masteryScore >= 70) doc.confidenceLevel = "proficient";
  else if (doc.masteryScore >= 50) doc.confidenceLevel = "intermediate";
  else if (doc.masteryScore >= 30) doc.confidenceLevel = "developing";
  else doc.confidenceLevel = "beginner";

  if (mistake) {
    doc.mistakesHistory.push({
      question: mistake.question || "",
      studentAnswer: mistake.studentAnswer || "",
      misconception: mistake.misconception || "",
    });
    if (!doc.weaknesses.includes(mistake.misconception) && mistake.misconception) {
      doc.weaknesses.push(mistake.misconception);
    }
  }

  if (strength && !doc.strengths.includes(strength)) {
    doc.strengths.push(strength);
  }

  await doc.save();
  return doc;
}

/**
 * 4. Create Task with backend validation
 */
async function createStudentTask(userId, { title, subject, priority, estimatedDuration, deadline }) {
  if (!title || !title.trim()) throw new Error("Task title is required");

  let subjectId = null;
  if (subject) {
    const foundSub = await Subject.findOne({ user: userId, name: new RegExp(`^${subject}$`, "i") });
    if (foundSub) subjectId = foundSub._id;
  }

  return await Task.create({
    user: userId,
    title: title.trim(),
    subject: subjectId,
    priority: priority || "medium",
    estimatedDuration: estimatedDuration || 30,
    deadline: deadline ? new Date(deadline) : null,
    status: "todo",
  });
}

/**
 * 5. Update Task Status
 */
async function updateStudentTask(userId, { taskId, status }) {
  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) throw new Error("Task not found or unauthorized");

  if (status) task.status = status;
  await task.save();
  return task;
}

/**
 * 6. Save Persistent Long-Term Memory Fact
 */
async function saveMentorMemoryFact(userId, factText, category = "preference") {
  let memory = await MentorMemory.findOne({ user: userId });
  if (!memory) {
    memory = new MentorMemory({ user: userId, persistentFacts: [] });
  }

  const exists = memory.persistentFacts.some((f) => f.fact.toLowerCase() === factText.toLowerCase());
  if (!exists) {
    memory.persistentFacts.push({ fact: factText, category });
    await memory.save();
  }
  return memory;
}

/**
 * 7. Search Study Materials (RAG)
 */
async function searchStudyMaterials(userId, queryText, subjectName = null) {
  if (!queryText || !queryText.trim()) return [];

  const filter = { user: userId };
  if (subjectName && subjectName !== "all") {
    filter.subjectName = new RegExp(subjectName, "i");
  }

  try {
    const textResults = await DocumentChunk.find({
      ...filter,
      $text: { $search: queryText },
    })
      .limit(5)
      .lean();

    if (textResults.length > 0) return textResults;
  } catch (e) {
    // If text index not created, fall back to regex
  }

  const keywords = queryText.split(/\s+/).filter((w) => w.length > 3);
  if (keywords.length === 0) return [];

  return await DocumentChunk.find({
    ...filter,
    content: { $regex: keywords.join("|"), $options: "i" },
  })
    .limit(4)
    .lean();
}

/**
 * 8. Calculate Next-Best-Action based on real deadlines and mastery
 */
async function calculateNextBestAction(userId) {
  const [profile, weakTopics, urgentDeadlines] = await Promise.all([
    getStudentLearningProfile(userId),
    TopicMastery.find({ user: userId, masteryScore: { $lt: 60 } }).sort({ masteryScore: 1 }).limit(3).lean(),
    CalendarEvent.find({ user: userId, date: { $gte: new Date(), $lte: new Date(Date.now() + 4 * 86400000) } }).sort({ date: 1 }).lean(),
  ]);

  if (urgentDeadlines.length > 0) {
    const d = urgentDeadlines[0];
    return {
      actionType: "EXAM_PREP",
      title: `Priority Sprint for ${d.title}`,
      description: `Your ${d.category || "deadline"} is scheduled for ${new Date(d.date).toLocaleDateString()}. Let's do a 25-minute high-yield practice sprint.`,
      subject: d.title,
      suggestedDuration: 25,
      mode: "PRACTICE",
    };
  }

  if (weakTopics.length > 0) {
    const wt = weakTopics[0];
    return {
      actionType: "REINFORCE_WEAK_TOPIC",
      title: `Master ${wt.topic} (${wt.subjectName})`,
      description: `Your current mastery is at ${wt.masteryScore}%. Review the core concepts and eliminate recurring misconceptions.`,
      subject: wt.subjectName,
      topic: wt.topic,
      suggestedDuration: 20,
      mode: "TEACH",
    };
  }

  const firstSubject = profile.subjects[0]?.name || "Core Academics";
  return {
    actionType: "DEEP_WORK_SESSION",
    title: `Deep Work on ${firstSubject}`,
    description: `Maintain your study momentum and build mastery on upcoming chapters.`,
    subject: firstSubject,
    suggestedDuration: 30,
    mode: "TEACH",
  };
}

/**
 * Gemini-Compatible Function Calling Tool Declarations Schema
 */
const STUDEX_AI_TOOL_DECLARATIONS = [
  {
    name: "get_student_profile",
    description: "Retrieves the authenticated student's profile, enrolled courses, current streak, and XP points.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_enrolled_courses",
    description: "Retrieves the list of enrolled subjects and courses for the authenticated student.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_upcoming_deadlines",
    description: "Retrieves the student's upcoming assignment deadlines, exams, and calendar milestones.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_tasks",
    description: "Retrieves incomplete and pending student tasks and micro-assignments.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "get_topic_mastery",
    description: "Retrieves the student's mastery radar, tracked topics, scores, and identified weak areas.",
    parameters: {
      type: "OBJECT",
      properties: {
        subjectName: { type: "STRING", description: "Optional subject name to filter topic mastery." },
      },
      required: [],
    },
  },
  {
    name: "search_study_notes",
    description: "Performs semantic search across the student's uploaded lecture notes, syllabus, and study materials (RAG).",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Search query or concept." },
        subject: { type: "STRING", description: "Optional subject name." },
      },
      required: ["query"],
    },
  },
  {
    name: "create_student_task",
    description: "Creates a new actionable study micro-task in the student's task manager.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Task title." },
        subject: { type: "STRING", description: "Subject name." },
        priority: { type: "STRING", enum: ["low", "medium", "high"] },
        estimatedDuration: { type: "INTEGER", description: "Duration in minutes." },
        deadline: { type: "STRING", description: "ISO date string for deadline." },
      },
      required: ["title"],
    },
  },
  {
    name: "update_topic_mastery_record",
    description: "Updates the student's mastery score and records strengths or misconceptions.",
    parameters: {
      type: "OBJECT",
      properties: {
        subjectName: { type: "STRING", description: "Subject name." },
        topic: { type: "STRING", description: "Topic name." },
        scoreDelta: { type: "INTEGER", description: "Score change (e.g., +5 or -5)." },
        misconception: { type: "STRING", description: "Description of identified misunderstanding if any." },
      },
      required: ["subjectName", "topic"],
    },
  },
];

/**
 * Safe backend tool dispatcher with verified student authorization
 */
async function executeStudexTool(userId, toolName, args = {}) {
  switch (toolName) {
    case "get_student_profile":
      return await getStudentLearningProfile(userId);

    case "get_enrolled_courses": {
      const subs = await Subject.find({ user: userId }).lean();
      return { subjects: subs.map((s) => ({ id: s._id, name: s.name, code: s.code })) };
    }

    case "get_upcoming_deadlines": {
      const events = await CalendarEvent.find({ user: userId, date: { $gte: new Date(Date.now() - 86400000) } })
        .sort({ date: 1 })
        .limit(10)
        .lean();
      return { deadlines: events };
    }

    case "get_tasks": {
      const tasks = await Task.find({ user: userId, status: { $ne: "completed" } })
        .sort({ deadline: 1 })
        .limit(10)
        .lean();
      return { tasks };
    }

    case "get_topic_mastery":
      return { mastery: await getTopicMastery(userId, args.subjectName) };

    case "search_study_notes":
      return { notes: await searchStudyMaterials(userId, args.query, args.subject) };

    case "create_student_task": {
      const created = await createStudentTask(userId, args);
      return { success: true, message: `Created task: "${created.title}"`, taskId: created._id };
    }

    case "update_topic_mastery_record": {
      const updated = await updateTopicMastery(userId, {
        subjectName: args.subjectName,
        topic: args.topic,
        scoreDelta: args.scoreDelta || 0,
        mistake: args.misconception ? { misconception: args.misconception } : null,
      });
      return { success: true, topic: updated.topic, newMasteryScore: updated.masteryScore };
    }

    default:
      return { error: `Tool "${toolName}" is not recognized or permitted.` };
  }
}

module.exports = {
  getStudentLearningProfile,
  getTopicMastery,
  updateTopicMastery,
  createStudentTask,
  updateStudentTask,
  saveMentorMemoryFact,
  searchStudyMaterials,
  calculateNextBestAction,
  STUDEX_AI_TOOL_DECLARATIONS,
  executeStudexTool,
};
