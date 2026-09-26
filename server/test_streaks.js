const streakRoutes = require("./routes/streakRoutes");
const {
  getStreakGamificationData,
  updateStreakTargets,
} = require("./controllers/streakController");

async function runStreakTests() {
  console.log("==================================================");
  console.log("🧪 TESTING PHASE 10 — GAMIFICATION & STREAKS");
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

  // --- 1. Streak Routes Definition ---
  console.log("--- 1. Streak Routes Definition ---");
  {
    assert(typeof streakRoutes === "function", "streakRoutes is defined as express router");
    
    const routes = streakRoutes.stack
      .filter((layer) => layer.route)
      .map((layer) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    assert(
      routes.some((r) => r.path === "/dashboard" && r.methods.includes("get")),
      "GET /dashboard route is registered on streakRoutes"
    );
    assert(
      routes.some((r) => r.path === "/targets" && r.methods.includes("put")),
      "PUT /targets route is registered on streakRoutes"
    );
  }

  // --- 2. Streak Controller Handlers ---
  console.log("\n--- 2. Streak Controller Handlers ---");
  {
    assert(typeof getStreakGamificationData === "function", "getStreakGamificationData controller exists");
    assert(typeof updateStreakTargets === "function", "updateStreakTargets controller exists");
  }

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runStreakTests();
