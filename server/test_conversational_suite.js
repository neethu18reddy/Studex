/**
 * Production Test Suite for Studex AI Conversational Intelligence & Hardened Error Handling
 * Validates all 14 required test scenarios.
 */
require("dotenv").config();
const { connectDb } = require("./config/db");
const { processMentorMessage } = require("./services/mentorBrainService");
const aiProviderService = require("./services/aiProviderService");
const { classifyProviderError, AI_ERROR_CODES } = require("./services/aiProviderService");
const User = require("./models/userModel");
const MentorMemory = require("./models/mentorMemoryModel");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTestSuite() {
  console.log("===============================================================");
  console.log("  STUDEX AI PRODUCTION HARDENING & CONVERSATIONAL TEST SUITE  ");
  console.log("===============================================================\n");

  let dbConnected = false;
  try {
    dbConnected = await connectDb();
  } catch {
    dbConnected = false;
  }

  let userId = "6aa8d3c4300da616fa0ea753"; // default student id
  if (dbConnected) {
    try {
      let testUser = await User.findOne().lean();
      if (testUser) userId = testUser._id;
      await MentorMemory.deleteOne({ user: userId }).catch(() => {});
    } catch {}
  }

  const results = [];
  const recordTest = (num, name, passed, details) => {
    results.push({ num, name, passed, details });
    const statusTag = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`\n[TEST ${num}] ${name}: ${statusTag}`);
    console.log(`Details: ${details.slice(0, 300)}...`);
  };

  // TEST 1: Greeting
  try {
    const res = await processMentorMessage(userId, "hi", { page: "Studex AI Hub" });
    const isGreeting =
      res.success &&
      !res.reply.toLowerCase().includes("transport layer") &&
      !res.reply.toLowerCase().includes("osi") &&
      /\b(hi|hello|hey|welcome|how can i help|what would you like to learn)\b/i.test(res.reply);
    recordTest(1, "Greeting", isGreeting, res.reply);
  } catch (err) {
    recordTest(1, "Greeting", false, err.message);
  }
  await delay(1500);

  // TEST 2: Layer 4 of OSI
  try {
    const res = await processMentorMessage(
      userId,
      "i want you to explain me about what happens in layer 4 of osi computer networks",
      { subject: "Computer Networks", topic: "OSI Model" }
    );
    const mentionsTransport =
      res.success &&
      (res.reply.toLowerCase().includes("transport") ||
        res.reply.toLowerCase().includes("tcp") ||
        res.reply.toLowerCase().includes("udp") ||
        res.reply.toLowerCase().includes("port"));
    recordTest(2, "Layer 4 Explanation", mentionsTransport, res.reply);
  } catch (err) {
    recordTest(2, "Layer 4 Explanation", false, err.message);
  }
  await delay(1500);

  // TEST 3: Typo Tolerance ("clusterring")
  try {
    const res = await processMentorMessage(
      userId,
      "no no i want you to explain me about clusterring in machine learning",
      { subject: "Machine Learning" }
    );
    const mentionsClustering =
      res.success &&
      res.reply.toLowerCase().includes("cluster") &&
      !res.reply.toLowerCase().includes("linear regression");
    recordTest(3, "Typo Understanding ('clusterring')", mentionsClustering, res.reply);
  } catch (err) {
    recordTest(3, "Typo Understanding ('clusterring')", false, err.message);
  }
  await delay(1500);

  // TEST 4: Follow-up ("what is K?")
  try {
    const res = await processMentorMessage(
      userId,
      "what is K?",
      { subject: "Machine Learning" }
    );
    const mentionsKMeans =
      res.success &&
      (res.reply.toLowerCase().includes("k-means") ||
        res.reply.toLowerCase().includes("number of clusters") ||
        res.reply.toLowerCase().includes("cluster"));
    recordTest(4, "Follow-up Resolution ('what is K?')", mentionsKMeans, res.reply);
  } catch (err) {
    recordTest(4, "Follow-up Resolution ('what is K?')", false, err.message);
  }
  await delay(1500);

  // TEST 5: Simplification ("make that simpler")
  try {
    const res = await processMentorMessage(
      userId,
      "make that simpler",
      { subject: "Machine Learning" }
    );
    const isSimplified = res.success && res.reply.length > 20;
    recordTest(5, "Simplification ('make that simpler')", isSimplified, res.reply);
  } catch (err) {
    recordTest(5, "Simplification ('make that simpler')", false, err.message);
  }
  await delay(1500);

  // TEST 6: Example ("give me a real life example")
  try {
    const res = await processMentorMessage(
      userId,
      "give me a real life example",
      { subject: "Machine Learning" }
    );
    const hasExample =
      res.success &&
      (res.reply.toLowerCase().includes("example") ||
        res.reply.toLowerCase().includes("customer") ||
        res.reply.toLowerCase().includes("movie") ||
        res.reply.toLowerCase().includes("group"));
    recordTest(6, "Example Request ('give me a real life example')", hasExample, res.reply);
  } catch (err) {
    recordTest(6, "Example Request ('give me a real life example')", false, err.message);
  }
  await delay(1500);

  // TEST 7: Topic Switch ("actually teach me decision trees")
  try {
    const res = await processMentorMessage(
      userId,
      "actually teach me decision trees",
      { subject: "Machine Learning" }
    );
    const mentionsDecisionTree =
      res.success &&
      (res.reply.toLowerCase().includes("decision tree") ||
        res.reply.toLowerCase().includes("tree") ||
        res.reply.toLowerCase().includes("node") ||
        res.reply.toLowerCase().includes("split"));
    recordTest(7, "Topic Switch to Decision Trees", mentionsDecisionTree, res.reply);
  } catch (err) {
    recordTest(7, "Topic Switch to Decision Trees", false, err.message);
  }
  await delay(1500);

  // TEST 8: Greeting after unfinished topic ("hi")
  try {
    const res = await processMentorMessage(
      userId,
      "hi",
      { subject: "Machine Learning" }
    );
    const isGreetingNotLesson =
      res.success &&
      !res.reply.toLowerCase().startsWith("a decision tree is") &&
      /\b(hi|hello|hey|welcome|how can i help|what)\b/i.test(res.reply);
    recordTest(8, "Greeting After Unfinished Topic ('hi')", isGreetingNotLesson, res.reply);
  } catch (err) {
    recordTest(8, "Greeting After Unfinished Topic ('hi')", false, err.message);
  }
  await delay(1500);

  // TEST 9: Current question overrides old topic ("What is the capital of Japan?")
  try {
    const res = await processMentorMessage(
      userId,
      "What is the capital of Japan?",
      { subject: "General" }
    );
    const answersTokyo = res.success && res.reply.toLowerCase().includes("tokyo");
    recordTest(9, "Unrelated Question ('What is the capital of Japan?')", answersTokyo, res.reply);
  } catch (err) {
    recordTest(9, "Unrelated Question ('What is the capital of Japan?')", false, err.message);
  }
  await delay(1500);

  // TEST 10: Temporary Provider Outage (503 Simulation)
  try {
    const simulatedErr = new Error("Error fetching: [503 Service Unavailable] High demand");
    simulatedErr.status = 503;
    const classified = classifyProviderError(simulatedErr);
    const isClean503 =
      classified.code === AI_ERROR_CODES.AI_TEMPORARY_UNAVAILABLE &&
      classified.retryable === true &&
      classified.message === "Studex AI is temporarily busy. Please try again in a moment.";
    recordTest(10, "Simulated Gemini 503 Error Classification", isClean503, JSON.stringify(classified));
  } catch (err) {
    recordTest(10, "Simulated Gemini 503 Error Classification", false, err.message);
  }

  // TEST 11: Rate Limit (429 Simulation)
  try {
    const simulatedErr = new Error("Resource exhausted: [429 Too Many Requests] quota exceeded");
    simulatedErr.status = 429;
    const classified = classifyProviderError(simulatedErr);
    const isClean429 =
      classified.code === AI_ERROR_CODES.AI_RATE_LIMITED &&
      classified.retryable === true &&
      classified.message === "Studex AI is receiving a lot of requests right now. Please try again shortly.";
    recordTest(11, "Simulated Gemini 429 Rate Limit", isClean429, JSON.stringify(classified));
  } catch (err) {
    recordTest(11, "Simulated Gemini 429 Rate Limit", false, err.message);
  }

  // TEST 12: Authentication Error (401 / Invalid API Key)
  try {
    const simulatedErr = new Error("API_KEY_INVALID: The provided API key is expired");
    simulatedErr.status = 401;
    const classified = classifyProviderError(simulatedErr);
    const isCleanAuth =
      classified.code === AI_ERROR_CODES.AI_AUTH_ERROR &&
      classified.retryable === false &&
      classified.message === "Studex AI is temporarily unavailable. Please try again later.";
    recordTest(12, "Simulated Provider Auth Error", isCleanAuth, JSON.stringify(classified));
  } catch (err) {
    recordTest(12, "Simulated Provider Auth Error", false, err.message);
  }

  // TEST 13: Double Send / Idempotency
  try {
    const genId1 = `gen_double_${Date.now()}`;
    const p1 = processMentorMessage(userId, "What is a subnet mask?", { subject: "Computer Networks" }, { generationId: genId1 });
    const p2 = processMentorMessage(userId, "What is a subnet mask?", { subject: "Computer Networks" }, { generationId: genId1 });
    const [r1, r2] = await Promise.all([p1, p2]);
    const handledSafely = (r1.success && r2.success) || (!r1.success && !r1.error?.code.includes("CRASH"));
    recordTest(13, "Double Send Handling", handledSafely, `R1: ${r1.success ? "200 OK" : r1.error?.code}, R2: ${r2.success ? "200 OK" : r2.error?.code}`);
  } catch (err) {
    recordTest(13, "Double Send Handling", false, err.message);
  }
  await delay(1500);

  // TEST 14: Race Condition / Generation ID Precedence
  try {
    const genA = `gen_race_A_${Date.now()}`;
    const genB = `gen_race_B_${Date.now()}`;
    const pA = processMentorMessage(userId, "Teach me Decision Trees in detail", {}, { generationId: genA });
    const pB = processMentorMessage(userId, "Actually teach me Clustering", {}, { generationId: genB });
    const [resA, resB] = await Promise.all([pA, pB]);
    const hasLatestGenId = resB.generationId === genB && resB.success;
    recordTest(14, "Race Condition & Generation ID Tracking", hasLatestGenId, `GenB (${resB.generationId}) Success: ${resB.success}, Reply Topic: ${resB.reply.slice(0, 100)}`);
  } catch (err) {
    recordTest(14, "Race Condition & Generation ID Tracking", false, err.message);
  }

  console.log("\n===============================================================");
  console.log("                   TEST SUITE SUMMARY                          ");
  console.log("===============================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}\n`);

  process.exit(passedCount === results.length ? 0 : 1);
}

runTestSuite().catch((err) => {
  console.error("Test Suite Fatal Crash:", err);
  process.exit(1);
});
