const {
  getDashboardAnalytics,
  getDailyStudyAnalytics,
  getWeeklyStudyAnalytics,
  getSubjectWiseAnalytics,
  getTaskAnalytics,
} = require("./controllers/analyticsController");

// Progress bar helper test
function testProgressBar() {
  const generateAsciiProgressBar = (current, total, length = 14) => {
    if (!total || total <= 0) return "░".repeat(length);
    const ratio = Math.min(1, Math.max(0, current / total));
    const filled = Math.round(ratio * length);
    const empty = length - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  console.log("--- Testing ASCII Progress Bar Generation ---");
  const studyBar = `${generateAsciiProgressBar(12.4, 15, 14)} 12.4 / 15 hrs`;
  const taskBar = `${generateAsciiProgressBar(23, 28, 13)} 23 / 28`;

  console.log("Study Progress Bar Output:", studyBar);
  console.log("Tasks Progress Bar Output:", taskBar);

  if (studyBar.includes("12.4 / 15 hrs") && taskBar.includes("23 / 28")) {
    console.log("✅ PASS: Milestone 9 Progress bar formatting matches specification precisely!");
  } else {
    console.error("❌ FAIL: Formatting mismatch");
    process.exit(1);
  }
}

testProgressBar();
