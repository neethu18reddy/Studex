const {
  getStudentLearningProfile,
  getTopicMastery,
  updateTopicMastery,
  createStudentTask,
  searchStudyMaterials,
  calculateNextBestAction,
  saveMentorMemoryFact,
} = require("../services/mentorToolsService");
const {
  processMentorMessage,
  generateDiagnosticQuiz,
  evaluateQuizSubmission,
} = require("../services/mentorBrainService");
const {
  generatePersonalizedPlan,
  generateTaskBreakdown,
} = require("../services/geminiService");
const DocumentChunk = require("../models/documentChunkModel");
const Task = require("../models/taskModel");

/**
 * 1. Get Complete Learning Profile & Knowledge Radar
 * @route GET /api/ai/profile
 */
async function getLearningProfileHandler(req, res, next) {
  try {
    const profile = await getStudentLearningProfile(req.user._id);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Get Topic Mastery
 * @route GET /api/ai/mastery
 */
async function getTopicMasteryHandler(req, res, next) {
  try {
    const { subject } = req.query;
    const mastery = await getTopicMastery(req.user._id, subject);
    res.status(200).json({ success: true, data: mastery });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Update Topic Mastery
 * @route POST /api/ai/mastery/update
 */
async function updateTopicMasteryHandler(req, res, next) {
  try {
    const { subjectName, topic, scoreDelta, mistake, strength } = req.body;
    const updated = await updateTopicMastery(req.user._id, {
      subjectName,
      topic,
      scoreDelta,
      mistake,
      strength,
    });
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Get Recommended Next-Best-Action
 * @route GET /api/ai/next-action
 */
async function getNextActionHandler(req, res, next) {
  try {
    const nextAction = await calculateNextBestAction(req.user._id);
    res.status(200).json({ success: true, data: nextAction });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Conversational Socratic Mentor Chat
 * @route POST /api/ai/mentor-chat
 */
async function mentorChatHandler(req, res, next) {
  try {
    const { message, currentContext, generationId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const response = await processMentorMessage(
      req.user._id,
      message.trim(),
      currentContext || {},
      { generationId }
    );
    res.status(200).json({ success: response.success, data: response });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. Generate Diagnostic Quiz
 * @route POST /api/ai/quiz/generate
 */
async function generateQuizHandler(req, res, next) {
  try {
    const { subjectName, topic, questionCount, difficulty } = req.body;
    if (!subjectName) {
      return res.status(400).json({ success: false, message: "Subject name is required" });
    }

    const quiz = await generateDiagnosticQuiz(req.user._id, {
      subjectName,
      topic,
      questionCount: questionCount || 3,
      difficulty: difficulty || "adaptive",
    });

    res.status(200).json({ success: true, data: quiz });
  } catch (err) {
    next(err);
  }
}

/**
 * 7. Evaluate Quiz Answers & Update Mastery
 * @route POST /api/ai/quiz/evaluate
 */
async function evaluateQuizHandler(req, res, next) {
  try {
    const { subjectName, topic, answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "Answers array is required" });
    }

    const evaluation = await evaluateQuizSubmission(req.user._id, {
      subjectName,
      topic,
      answers,
    });

    res.status(200).json({ success: true, data: evaluation });
  } catch (err) {
    next(err);
  }
}

/**
 * 8. Generate Context-Aware Personalized Study Plan
 * @route POST /api/ai/plan
 */
async function generateStudyPlan(req, res, next) {
  try {
    const {
      availableTime,
      timeWindow,
      focusGoal,
      customNotes,
      selectedSubject,
      topicsToCover,
      studyMode,
    } = req.body;

    const { getStudentAcademicContext } = require("../services/aiContextService");
    const context = await getStudentAcademicContext(req.user);

    const planResult = await generatePersonalizedPlan(context, {
      availableTime: availableTime || "3 hours",
      timeWindow: timeWindow || "tonight",
      focusGoal: focusGoal || "balanced",
      customNotes: customNotes || "",
      selectedSubject: selectedSubject || "all",
      topicsToCover: topicsToCover || "",
      studyMode: studyMode || "balanced",
    });

    res.status(200).json({
      success: true,
      data: {
        ...planResult,
        liveContext: context,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 9. Upload & Ingest Study Material / Document Chunks (RAG)
 * @route POST /api/ai/rag/upload
 */
async function uploadStudyMaterialChunks(req, res, next) {
  try {
    const { documentTitle, subjectName, textContent } = req.body;
    if (!documentTitle || !textContent) {
      return res.status(400).json({ success: false, message: "Title and text content are required" });
    }

    // Split text into chunks (~800 characters per chunk)
    const rawChunks = textContent.match(/[\s\S]{1,800}(?:\n|$)/g) || [textContent];

    const chunkDocs = rawChunks.map((chunk, idx) => ({
      user: req.user._id,
      documentTitle: documentTitle.trim(),
      subjectName: subjectName || "General Coursework",
      chunkIndex: idx + 1,
      pageNumber: Math.floor(idx / 3) + 1,
      content: chunk.trim(),
      keywords: chunk
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .slice(0, 10),
    }));

    await DocumentChunk.insertMany(chunkDocs);

    res.status(201).json({
      success: true,
      message: `Ingested ${chunkDocs.length} chunks from "${documentTitle}" into Studex RAG Store`,
      data: { chunksCount: chunkDocs.length, documentTitle },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 10. Save AI Subtasks to Task Engine
 * @route POST /api/ai/save-subtasks
 */
async function saveSubtasksToEngine(req, res, next) {
  try {
    const { subtasks, subjectId } = req.body;
    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      return res.status(400).json({ success: false, message: "No subtasks provided" });
    }

    const createdTasks = await Promise.all(
      subtasks.map((st) =>
        Task.create({
          title: st.title,
          description: "Generated by Studex AI Study Mentor",
          subject: subjectId || null,
          priority: st.priority || "medium",
          estimatedDuration: st.estimatedDuration || 30,
          status: "todo",
          user: req.user._id,
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `Added ${createdTasks.length} micro-tasks to your Task Engine`,
      data: createdTasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 11. Legacy Chat Endpoint Alias
 * @route POST /api/ai/chat
 */
async function chatWithAI(req, res, next) {
  return mentorChatHandler(req, res, next);
}

/**
 * 12. Legacy Breakdown Endpoint Alias
 * @route POST /api/ai/breakdown-task
 */
async function breakdownTask(req, res, next) {
  try {
    const { taskTitle, subjectName } = req.body;
    const { getStudentAcademicContext } = require("../services/aiContextService");
    const context = await getStudentAcademicContext(req.user);
    const result = await generateTaskBreakdown(context, taskTitle, subjectName);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

const aiProviderService = require("../services/aiProviderService");
const { streamMentorMessage } = require("../services/mentorBrainService");

/**
 * 13. Streaming AI Mentor Chat (SSE)
 * @route POST /api/ai/chat/stream
 */
async function mentorStreamChatHandler(req, res, next) {
  try {
    const { message, currentContext, generationId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    if (!aiProviderService.isConfigured()) {
      return res.status(200).json({
        success: false,
        isConfigured: false,
        error: {
          code: "AI_CONFIGURATION_ERROR",
          message: "Google Gemini API key is not configured in server/.env.",
          retryable: false,
        },
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    await streamMentorMessage(
      req.user._id,
      message.trim(),
      currentContext || {},
      (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk, generationId })}\n\n`);
      },
      { generationId }
    );

    res.write(`data: ${JSON.stringify({ done: true, generationId })}\n\n`);
    res.end();
  } catch (err) {
    const errorPayload = {
      code: err.code || "AI_TEMPORARY_UNAVAILABLE",
      message: err.message || "Studex AI is temporarily busy. Please try again in a moment.",
      retryable: err.retryable !== false,
    };
    if (!res.headersSent) {
      res.status(200).json({ success: false, error: errorPayload });
    } else {
      res.write(`data: ${JSON.stringify({ error: errorPayload })}\n\n`);
      res.end();
    }
  }
}

/**
 * 14. Get AI Engine Status
 * @route GET /api/ai/status
 */
function getAIStatus(req, res) {
  const providerInfo = aiProviderService.getProviderInfo();
  res.status(200).json({
    success: true,
    data: providerInfo,
  });
}

/**
 * 15. Get Live Context
 * @route GET /api/ai/context
 */
async function getLiveContext(req, res, next) {
  try {
    const { getStudentAcademicContext } = require("../services/aiContextService");
    const context = await getStudentAcademicContext(req.user);
    res.status(200).json({ success: true, data: context });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLearningProfileHandler,
  getTopicMasteryHandler,
  updateTopicMasteryHandler,
  getNextActionHandler,
  mentorChatHandler,
  mentorStreamChatHandler,
  generateQuizHandler,
  evaluateQuizHandler,
  generateStudyPlan,
  uploadStudyMaterialChunks,
  saveSubtasksToEngine,
  chatWithAI,
  breakdownTask,
  getAIStatus,
  getLiveContext,
};
