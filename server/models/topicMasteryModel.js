const mongoose = require("mongoose");

const topicMasterySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: false,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    masteryScore: {
      type: Number,
      default: 20, // 0 - 100
      min: 0,
      max: 100,
    },
    confidenceLevel: {
      type: String,
      enum: ["beginner", "developing", "intermediate", "proficient", "mastered"],
      default: "beginner",
    },
    attemptsCount: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    mistakesHistory: [
      {
        question: { type: String },
        studentAnswer: { type: String },
        misconception: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    lastStudiedAt: {
      type: Date,
      default: Date.now,
    },
    nextReviewDue: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per user + subject + topic
topicMasterySchema.index({ user: 1, subjectName: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model("TopicMastery", topicMasterySchema);
