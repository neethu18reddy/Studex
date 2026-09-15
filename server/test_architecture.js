const http = require("http");
const app = require("./server");

// We test middleware and controllers using supertest-like in-memory requests or direct handler invocation
const { validateRegister, validateLogin, validateCourseCreate, validateObjectId } = require("./middleware/validationMiddleware");
const { protect } = require("./middleware/authMiddleware");
const asyncHandler = require("./middleware/asyncHandler");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const { generateToken } = require("./controllers/authController");

async function runTests() {
  console.log("==========================================");
  console.log("🧪 TESTING BACKEND ARCHITECTURE & MIDDLEWARE");
  console.log("==========================================\n");

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

  // Test 1: Validation Middleware - validateRegister
  console.log("--- 1. Validation Middleware ---");
  {
    const req = { body: { name: "", email: "notanemail", password: "123" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    validateRegister(req, res, next);
    assert(statusSent === 400 && !nextCalled && jsonSent.errors.length === 3, "validateRegister rejects invalid registration payload with 400 and error list");

    const validReq = { body: { name: "Alice", email: "alice@example.com", password: "secretPassword123" } };
    let validNextCalled = false;
    validateRegister(validReq, res, () => { validNextCalled = true; });
    assert(validNextCalled, "validateRegister allows valid registration payload");
  }

  // Test 2: Validation Middleware - validateLogin
  {
    const req = { body: { email: "", password: "" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };
    let nextCalled = false;
    validateLogin(req, res, () => { nextCalled = true; });
    assert(statusSent === 400 && !nextCalled, "validateLogin rejects empty email/password with 400");
  }

  // Test 3: Validation Middleware - validateCourseCreate
  {
    const req = { body: { course_name: "", instructor: "", ratings: 99 } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };
    let nextCalled = false;
    validateCourseCreate(req, res, () => { nextCalled = true; });
    assert(statusSent === 400 && jsonSent.errors.length === 3, "validateCourseCreate validates name, instructor, and ratings bounds (0-5)");
  }

  // Test 4: Validation Middleware - validateObjectId
  {
    const req = { params: { id: "invalid-id-123" } };
    let statusSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: () => res
    };
    let nextCalled = false;
    validateObjectId("id")(req, res, () => { nextCalled = true; });
    assert(statusSent === 400 && !nextCalled, "validateObjectId blocks invalid 24-hex ObjectId");

    const validIdReq = { params: { id: "507f1f77bcf86cd799439011" } };
    let validNext = false;
    validateObjectId("id")(validIdReq, res, () => { validNext = true; });
    assert(validNext, "validateObjectId passes valid 24-hex ObjectId");
  }

  // Test 5: Authentication Middleware - protect
  console.log("\n--- 2. Authentication Middleware ---");
  {
    const reqNoToken = { headers: {} };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };
    let nextCalled = false;
    await protect(reqNoToken, res, () => { nextCalled = true; });
    assert(statusSent === 401 && !nextCalled, "protect middleware rejects missing authorization token with 401");

    const reqInvalidToken = { headers: { authorization: "Bearer invalid.fake.token" } };
    statusSent = null;
    nextCalled = false;
    await protect(reqInvalidToken, res, () => { nextCalled = true; });
    assert(statusSent === 401 && !nextCalled, "protect middleware rejects malformed/invalid JWT token with 401");
  }

  // Test 6: Async Error Handler Middleware
  console.log("\n--- 3. Async Error Handling ---");
  {
    const errorToThrow = new Error("Async database failure");
    const failingController = async () => {
      throw errorToThrow;
    };
    const wrapped = asyncHandler(failingController);

    let caughtError = null;
    wrapped({}, {}, (err) => {
      caughtError = err;
    });

    // Give microtask tick to resolve promise catch
    await new Promise((r) => setTimeout(r, 10));
    assert(caughtError === errorToThrow, "asyncHandler safely forwards rejected async promise to next(error)");
  }

  // Test 7: Centralized Error Handling Middleware
  console.log("\n--- 4. Error Handling Middleware ---");
  {
    const castError = new Error("Cast error");
    castError.name = "CastError";
    castError.value = "bad_id";

    let statusSent = null;
    let jsonSent = null;
    const res = {
      statusCode: 200,
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; }
    };

    errorHandler(castError, {}, res, () => {});
    assert(statusSent === 400 && jsonSent.message.includes("Resource not found with id of bad_id"), "errorHandler formats Mongoose CastError with 400 status");
  }

  console.log("\n==========================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==========================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
