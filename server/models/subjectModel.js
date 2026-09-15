const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    color: {
      type: String,
      trim: true,
      default: "#aa3bff", // Default Studex purple theme
    },
    semester: {
      type: String,
      trim: true,
      default: "Semester 1",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure fast user query lookup
subjectSchema.index({ user: 1, createdAt: -1 });

const Subject = mongoose.model("Subject", subjectSchema);

module.exports = Subject;
