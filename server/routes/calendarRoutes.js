const express = require("express");
const router = express.Router();
const {
  getCalendarEvents,
  getUpcomingCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  toggleImportantEvent,
  deleteCalendarEvent,
} = require("../controllers/calendarController");
const { protect } = require("../middleware/authMiddleware");

// All calendar endpoints are protected
router.use(protect);

router.route("/").get(getCalendarEvents).post(createCalendarEvent);
router.get("/upcoming", getUpcomingCalendarEvents);
router.patch("/:id/toggle-important", toggleImportantEvent);
router.route("/:id").patch(updateCalendarEvent).put(updateCalendarEvent).delete(deleteCalendarEvent);

module.exports = router;
