const mongoose = require("mongoose");

const spaceTaskSchema = new mongoose.Schema(
  {
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
      required: [true, "Space reference is required"],
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task creator is required"],
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [140, "Task title cannot exceed 140 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    deadline: {
      type: Date,
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
    status: {
      type: String,
      enum: {
        values: ["todo", "in_progress", "completed"],
        message: "{VALUE} is not a valid status (todo, in_progress, completed)",
      },
      default: "todo",
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    syncedPersonalUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

spaceTaskSchema.index({ space: 1, status: 1, deadline: 1 });

const SpaceTask = mongoose.model("SpaceTask", spaceTaskSchema);

module.exports = SpaceTask;
