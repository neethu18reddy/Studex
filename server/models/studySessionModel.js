const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Study session must belong to a user"],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    startTime: {
      type: Date,
      required: [true, "Session start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "Session end time is required"],
    },
    duration: {
      type: Number, // In minutes
      required: [true, "Session duration is required"],
      min: [1, "Session duration must be at least 1 minute"],
    },
    tasksCompleted: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user study sessions by date
studySessionSchema.index({ userId: 1, startTime: -1 });
studySessionSchema.index({ userId: 1, subjectId: 1 });

const StudySession = mongoose.model("StudySession", studySessionSchema);

module.exports = StudySession;
