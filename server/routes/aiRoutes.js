const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// All AI Mentor endpoints are protected by student authentication
router.use(protect);

// 1. Status & Live Profile
router.get("/status", getAIStatus);
router.get("/context", getLiveContext);
router.get("/profile", getLearningProfileHandler);
router.get("/next-action", getNextActionHandler);

// 2. Topic Mastery System
router.get("/mastery", getTopicMasteryHandler);
router.post("/mastery/update", updateTopicMasteryHandler);

// 3. Conversational AI Mentor Chat & Streaming
router.post("/mentor-chat", mentorChatHandler);
router.post("/chat/stream", mentorStreamChatHandler);
router.post("/chat", chatWithAI);

// 4. Diagnostic Quiz Engine
router.post("/quiz/generate", generateQuizHandler);
router.post("/quiz/evaluate", evaluateQuizHandler);

// 5. Adaptive Planner & Tasks
router.post("/plan", generateStudyPlan);
router.post("/breakdown-task", breakdownTask);
router.post("/save-subtasks", saveSubtasksToEngine);

// 6. RAG / Study Materials
router.post("/rag/upload", uploadStudyMaterialChunks);

module.exports = router;
