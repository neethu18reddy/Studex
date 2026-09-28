const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "urgent"],
        message: "{VALUE} is not a valid priority (low, medium, high, urgent)",
      },
      default: "medium",
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["todo", "in_progress", "completed"],
        message: "{VALUE} is not a valid status (todo, in_progress, completed)",
      },
      default: "todo",
    },
    estimatedDuration: {
      type: Number, // In minutes
      default: 30,
      min: [1, "Estimated duration must be at least 1 minute"],
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task must belong to a user"],
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ user: 1, isStarred: 1 });

// Compound index for querying user tasks by deadline and status
taskSchema.index({ user: 1, status: 1, deadline: 1 });
taskSchema.index({ user: 1, subject: 1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
