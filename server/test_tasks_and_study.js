const Task = require("./models/taskModel");
const StudySession = require("./models/studySessionModel");
const {
  validateTaskCreate,
  validateTaskUpdate,
  validateStudySessionCreate,
} = require("./middleware/validationMiddleware");

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING TASK MANAGEMENT & STUDY ENGINE");
  console.log("==================================================\n");

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

  // --- 1. Task Model Schema Validation ---
  console.log("--- 1. Task Model Schema Validation ---");
  {
    const paths = Task.schema.paths;
    assert(paths.title !== undefined, "Task schema includes 'title'");
    assert(paths.description !== undefined, "Task schema includes 'description'");
    assert(paths.subject !== undefined, "Task schema references 'subject'");
    assert(paths.priority !== undefined, "Task schema includes 'priority'");
    assert(paths.deadline !== undefined, "Task schema includes 'deadline'");
    assert(paths.status !== undefined, "Task schema includes 'status'");
    assert(paths.estimatedDuration !== undefined, "Task schema includes 'estimatedDuration'");
    assert(paths.user !== undefined, "Task schema references 'user'");

    const priorityEnums = Task.schema.path("priority").enumValues;
    assert(
      ["low", "medium", "high", "urgent"].every((p) => priorityEnums.includes(p)),
      "Task schema supports priorities: low, medium, high, urgent"
    );

    const statusEnums = Task.schema.path("status").enumValues;
    assert(
      ["todo", "in_progress", "completed"].every((s) => statusEnums.includes(s)),
      "Task schema supports statuses: todo, in_progress, completed"
    );
  }

  // --- 2. Task Validation Middleware ---
  console.log("\n--- 2. Task Validation Middleware ---");
  {
    // A: Missing title
    const reqNoTitle = { body: { description: "Work on calculus" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; },
    };
    let nextCalled = false;
    validateTaskCreate(reqNoTitle, res, () => { nextCalled = true; });
    assert(statusSent === 400 && !nextCalled, "validateTaskCreate rejects missing title with 400");

    // B: Invalid priority & invalid deadline
    const reqInvalid = {
      body: {
        title: "Submit Lab",
        priority: "critical_urgent_extreme",
        deadline: "not-a-date",
      },
    };
    statusSent = null;
    validateTaskCreate(reqInvalid, res, () => {});
    assert(statusSent === 400 && jsonSent.errors.length >= 2, "validateTaskCreate validates priority enum and deadline format");

    // C: Valid task payload
    const reqValid = {
      body: {
        title: "Complete Assignment 3",
        priority: "HIGH",
        status: "TODO",
        estimatedDuration: 45,
        deadline: new Date().toISOString(),
      },
    };
    let validNext = false;
    validateTaskCreate(reqValid, res, () => { validNext = true; });
    assert(validNext && reqValid.body.priority === "high", "validateTaskCreate normalizes fields and passes valid payload");

    // D: validateTaskUpdate
    const updateReq = { body: { status: "completed", estimatedDuration: -10 } };
    statusSent = null;
    validateTaskUpdate(updateReq, res, () => {});
    assert(statusSent === 400, "validateTaskUpdate rejects negative estimatedDuration");
  }

  // --- 3. Study Session Model Schema Validation ---
  console.log("\n--- 3. Study Session Model Schema Validation ---");
  {
    const paths = StudySession.schema.paths;
    assert(paths.userId !== undefined, "StudySession schema references 'userId'");
    assert(paths.subjectId !== undefined, "StudySession schema references 'subjectId'");
    assert(paths.startTime !== undefined, "StudySession schema includes 'startTime'");
    assert(paths.endTime !== undefined, "StudySession schema includes 'endTime'");
    assert(paths.duration !== undefined, "StudySession schema includes 'duration'");
    assert(paths.tasksCompleted !== undefined, "StudySession schema includes 'tasksCompleted'");
  }

  // --- 4. Study Session Validation Middleware ---
  console.log("\n--- 4. Study Session Validation Middleware ---");
  {
    const reqNoTime = { body: { notes: "Quick review" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; },
    };
    let nextCalled = false;
    validateStudySessionCreate(reqNoTime, res, () => { nextCalled = true; });
    assert(statusSent === 400 && !nextCalled, "validateStudySessionCreate rejects missing startTime/endTime with 400");

    // Auto duration calculation
    const start = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const end = new Date().toISOString();
    const reqValidSession = {
      body: {
        startTime: start,
        endTime: end,
      },
    };
    let sessionNextCalled = false;
    validateStudySessionCreate(reqValidSession, res, () => { sessionNextCalled = true; });
    assert(
      sessionNextCalled && reqValidSession.body.duration === 30,
      "validateStudySessionCreate automatically computes duration in minutes if omitted"
    );
  }

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
