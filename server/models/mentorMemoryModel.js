const mongoose = require("mongoose");

const mentorMemorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    learningPreferences: {
      explanationStyle: {
        type: String,
        enum: ["socratic", "intuitive_analogies", "technical_rigorous", "visual_diagrams", "concise"],
        default: "intuitive_analogies",
      },
      difficultyPreference: {
        type: String,
        enum: ["adaptive", "challenging", "gentle"],
        default: "adaptive",
      },
      preferredSessionDuration: {
        type: Number,
        default: 30, // mins
      },
      hintPreference: {
        type: String,
        enum: ["progressive_hints", "direct_hint", "solution_on_request"],
        default: "progressive_hints",
      },
    },
    persistentFacts: [
      {
        fact: { type: String, required: true },
        category: { type: String, enum: ["goal", "background", "misconception", "preference", "exam"], default: "preference" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    activeGoal: {
      title: { type: String, default: "Achieve academic excellence & master core curriculum" },
      targetDate: { type: Date },
      status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
    },
    conversationSession: [
      {
        role: { type: String, enum: ["user", "assistant", "system"], required: true },
        content: { type: String, required: true },
        mode: { type: String, default: "TEACH" },
        timestamp: { type: Date, default: Date.now },
        metadata: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    recentMisconceptions: [
      {
        topic: String,
        summary: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    lastActivityContext: {
      subject: String,
      topic: String,
      page: String,
      timestamp: { type: Date, default: Date.now },
    },
    teachingState: {
      state: {
        type: String,
        enum: [
          "AWAITING_TOPIC_SELECTION",
          "TEACHING",
          "AWAITING_ANSWER",
          "PRACTICE",
          "QUIZ",
          "REVIEW",
          "CLARIFICATION",
          "PLANNING",
          "IDLE",
        ],
        default: "IDLE",
      },
      subject: { type: String, default: null },
      topic: { type: String, default: null },
      topicSource: { type: String, default: null }, // USER_EXPLICIT, CONVERSATION_FOLLOWUP, SCREEN_CONTEXT, AWAITING_SELECTION
      subtopic: { type: String, default: null },
      teachingStage: {
        type: String,
        enum: [
          "FOUNDATION",
          "STRUCTURE",
          "DECISION_PROCESS",
          "CORE_MECHANICS",
          "ADVANCED",
          "IDLE",
        ],
        default: "FOUNDATION",
      },
      difficulty: {
        type: String,
        enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
        default: "BEGINNER",
      },
      lastConcept: { type: String, default: null },
      lastQuestion: { type: String, default: null },
      lastAnswer: { type: String, default: null },
      awaiting: { type: String, default: null },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MentorMemory", mentorMemorySchema);
