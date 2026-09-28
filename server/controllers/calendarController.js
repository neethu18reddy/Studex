const CalendarEvent = require("../models/calendarEventModel");
const asyncHandler = require("../middleware/asyncHandler");
const { isDbConnected } = require("../config/db");

// Helper to check DB readiness
const checkDb = (res) => {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      message:
        "Database is currently not connected. Please check your MONGO_URI in server/.env or start MongoDB.",
      data: [],
    });
    return false;
  }
  return true;
};

/**
 * @desc    Get all calendar events for current user (with optional filters)
 * @route   GET /api/calendar
 * @access  Private
 */
const getCalendarEvents = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { month, importantOnly, startDate, endDate } = req.query;
  const query = { user: req.user._id };

  if (importantOnly === "true") {
    query.isImportant = true;
  }

  if (month) {
    // month format YYYY-MM
    query.date = { $regex: `^${month}` };
  } else if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }

  const events = await CalendarEvent.find(query).sort({ date: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

/**
 * @desc    Get consolidated upcoming events & important scheduled items
 * @route   GET /api/calendar/upcoming
 * @access  Private
 */
const getUpcomingCalendarEvents = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch upcoming events from today onwards OR all important events
  const events = await CalendarEvent.find({
    user: req.user._id,
    $or: [{ date: { $gte: todayStr } }, { isImportant: true }],
  }).sort({ date: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
});

/**
 * @desc    Create a new calendar event / schedule item
 * @route   POST /api/calendar
 * @access  Private
 */
const createCalendarEvent = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { title, description, date, startTime, endTime, category, color, isImportant } =
    req.body;

  if (!title || !date) {
    return res.status(400).json({
      success: false,
      message: "Event title and date (YYYY-MM-DD) are required",
    });
  }

  const newEvent = await CalendarEvent.create({
    title: title.trim(),
    description: description ? description.trim() : "",
    date,
    startTime: startTime || "09:00",
    endTime: endTime || "10:00",
    category: category || "study",
    color: color || "#aa3bff",
    isImportant: Boolean(isImportant),
    user: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Calendar event scheduled successfully",
    data: newEvent,
  });
});

/**
 * @desc    Update a calendar event
 * @route   PATCH /api/calendar/:id or PUT /api/calendar/:id
 * @access  Private
 */
const updateCalendarEvent = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const event = await CalendarEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: `Event with ID ${req.params.id} not found`,
    });
  }

  if (event.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this event",
    });
  }

  const { title, description, date, startTime, endTime, category, color, isImportant } =
    req.body;

  if (title !== undefined) event.title = title.trim();
  if (description !== undefined) event.description = description.trim();
  if (date !== undefined) event.date = date;
  if (startTime !== undefined) event.startTime = startTime;
  if (endTime !== undefined) event.endTime = endTime;
  if (category !== undefined) event.category = category;
  if (color !== undefined) event.color = color;
  if (isImportant !== undefined) event.isImportant = Boolean(isImportant);

  await event.save();

  res.status(200).json({
    success: true,
    message: "Calendar event updated successfully",
    data: event,
  });
});

/**
 * @desc    Toggle important status on a calendar event
 * @route   PATCH /api/calendar/:id/toggle-important
 * @access  Private
 */
const toggleImportantEvent = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const event = await CalendarEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (event.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this event",
    });
  }

  event.isImportant = !event.isImportant;
  await event.save();

  res.status(200).json({
    success: true,
    message: event.isImportant ? "Marked as Important ⭐" : "Removed from Important",
    data: event,
  });
});

/**
 * @desc    Delete a calendar event
 * @route   DELETE /api/calendar/:id
 * @access  Private
 */
const deleteCalendarEvent = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const event = await CalendarEvent.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (event.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this event",
    });
  }

  await event.deleteOne();

  res.status(200).json({
    success: true,
    message: "Event deleted successfully",
    data: { id: req.params.id },
  });
});

module.exports = {
  getCalendarEvents,
  getUpcomingCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  toggleImportantEvent,
  deleteCalendarEvent,
};
