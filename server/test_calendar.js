const calendarRoutes = require("./routes/calendarRoutes");
const calendarController = require("./controllers/calendarController");
const CalendarEvent = require("./models/calendarEventModel");

console.log("==================================================");
console.log("🧪 TESTING CALENDAR ROUTES & CONTROLLERS");
console.log("==================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Check Routes
assert(typeof calendarRoutes === "function", "calendarRoutes is defined as express router");
assert(typeof calendarController.getCalendarEvents === "function", "getCalendarEvents controller exists");
assert(typeof calendarController.getUpcomingCalendarEvents === "function", "getUpcomingCalendarEvents controller exists");
assert(typeof calendarController.createCalendarEvent === "function", "createCalendarEvent controller exists");
assert(typeof calendarController.updateCalendarEvent === "function", "updateCalendarEvent controller exists");
assert(typeof calendarController.toggleImportantEvent === "function", "toggleImportantEvent controller exists");
assert(typeof calendarController.deleteCalendarEvent === "function", "deleteCalendarEvent controller exists");
assert(CalendarEvent.schema.path("isImportant") !== undefined, "CalendarEvent has isImportant field");

console.log("\n==================================================");
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
