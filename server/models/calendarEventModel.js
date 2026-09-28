const mongoose = require("mongoose");

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, "Event date is required (YYYY-MM-DD)"],
    },
    startTime: {
      type: String,
      default: "09:00",
    },
    endTime: {
      type: String,
      default: "10:00",
    },
    category: {
      type: String,
      enum: ["exam", "assignment", "lecture", "study", "meeting", "other"],
      default: "study",
    },
    color: {
      type: String,
      default: "#aa3bff",
    },
    isImportant: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Event must belong to a student user"],
    },
  },
  {
    timestamps: true,
  }
);

calendarEventSchema.index({ user: 1, date: 1, isImportant: 1 });

module.exports = mongoose.model("CalendarEvent", calendarEventSchema);
