const mongoose = require("mongoose");
const {
  getDashboardAnalytics,
  getDailyStudyAnalytics,
  getWeeklyStudyAnalytics,
  getSubjectWiseAnalytics,
  getTaskAnalytics,
} = require("./controllers/analyticsController");
const analyticsRoutes = require("./routes/analyticsRoutes");

async function runAnalyticsTests() {
  console.log("==================================================");
  console.log("🧪 TESTING PHASE 9 — ANALYTICS & PROGRESS TRACKING");
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

  // --- 1. Analytics Routes Definition ---
  console.log("--- 1. Analytics Routes Definition ---");
  {
    assert(typeof analyticsRoutes === "function", "analyticsRoutes is defined as express router");
    
    // Check route paths in router stack
    const routes = analyticsRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    assert(
      routes.some((r) => r.path === "/dashboard" && r.methods.includes("get")),
      "GET /dashboard route is registered"
    );
    assert(
      routes.some((r) => r.path === "/daily" && r.methods.includes("get")),
      "GET /daily route is registered"
    );
    assert(
      routes.some((r) => r.path === "/weekly" && r.methods.includes("get")),
      "GET /weekly route is registered"
    );
    assert(
      routes.some((r) => r.path === "/subjects" && r.methods.includes("get")),
      "GET /subjects route is registered"
    );
    assert(
      routes.some((r) => r.path === "/tasks" && r.methods.includes("get")),
      "GET /tasks route is registered"
    );
    assert(
      routes.some((r) => r.path === "/goals" && r.methods.includes("put")),
      "PUT /goals route is registered"
    );
  }

  // --- 2. Analytics Controller Handlers ---
  console.log("\n--- 2. Analytics Controller Handlers ---");
  {
    assert(typeof getDashboardAnalytics === "function", "getDashboardAnalytics controller exists");
    assert(typeof getDailyStudyAnalytics === "function", "getDailyStudyAnalytics controller exists");
    assert(typeof getWeeklyStudyAnalytics === "function", "getWeeklyStudyAnalytics controller exists");
    assert(typeof getSubjectWiseAnalytics === "function", "getSubjectWiseAnalytics controller exists");
    assert(typeof getTaskAnalytics === "function", "getTaskAnalytics controller exists");
  }

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runAnalyticsTests();
