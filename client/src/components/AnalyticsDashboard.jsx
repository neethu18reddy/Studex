import { useState, useEffect, useCallback } from "react";

export default function AnalyticsDashboard({ token, apiBase, onError, onFeedback }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [selectedRange, setSelectedRange] = useState("this_week"); // 'this_week', 'past_30'
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    weeklyStudyGoalHours: 15,
    weeklyTaskGoal: 28,
  });
  const [savingGoal, setSavingGoal] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Fetch Dashboard Analytics from MongoDB Aggregation Endpoint
  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/analytics/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.message || "Failed to fetch analytics");
      }

      setData(resJson.data);
      if (resJson.data?.metrics?.weeklyStudyTime) {
        setGoalForm({
          weeklyStudyGoalHours:
            resJson.data.metrics.weeklyStudyTime.weeklyGoalHours || 15,
          weeklyTaskGoal:
            resJson.data.metrics.taskMetrics.weeklyGoal || 28,
        });
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
      onError?.(err.message || "Could not load progress analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBase, token, onError]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Update Study Goals
  const handleUpdateGoals = async (e) => {
    e.preventDefault();
    setSavingGoal(true);
    try {
      const res = await fetch(`${apiBase}/api/analytics/goals`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(goalForm),
      });
      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.message || "Failed to update study goals");
      }
      onFeedback?.("Study targets updated successfully! 🎯");
      setShowGoalModal(false);
      fetchAnalytics(true);
    } catch (err) {
      onError?.(err.message || "Failed to save goals");
    } finally {
      setSavingGoal(false);
    }
  };

  // Copy Weekly Summary to Clipboard
  const handleCopySummary = () => {
    if (!data) return;
    const { overview } = data;
    const summaryText = `📊 Studex Progress Summary (This Week):
⏱️ Study Time: ${overview.thisWeek.study.formatted} (${overview.thisWeek.study.percentage}%)
📋 Tasks Completed: ${overview.thisWeek.tasks.completed}/${overview.thisWeek.tasks.target} (${overview.thisWeek.tasks.completionRate}% completion rate)
🔥 Consistency: ${overview.thisWeek.consistency.streakLabel} (${overview.thisWeek.consistency.activeDaysThisWeek}/7 active days)
Keep grinding! 🚀`;

    navigator.clipboard?.writeText(summaryText).then(() => {
      setCopiedSummary(true);
      onFeedback?.("Weekly progress summary copied to clipboard! 📋");
      setTimeout(() => setCopiedSummary(false), 3000);
    });
  };

  if (loading) {
    return (
      <div className="analytics-loading-pane">
        <div className="spinner"></div>
        <p>Crunching MongoDB analytics & progress tracking metrics...</p>
      </div>
    );
  }

  const overview = data?.overview?.thisWeek || {
    study: { currentHours: 0, targetHours: 15, percentage: 0, formatted: "0.0 / 15 hrs" },
    tasks: { completed: 0, target: 28, pending: 0, total: 0, completionRate: 0, formatted: "0 / 28" },
    consistency: { currentStreak: 0, streakLabel: "🔥 0 days", activeDaysThisWeek: 0, score: 0, weekMatrix: [] },
  };

  const metrics = data?.metrics || {};
  const dailyTrend = data?.dailyStudyTrend || [];
  const subjectBreakdown = data?.subjectBreakdown || [];
  const weekMatrix = data?.weekConsistency || [];

  // Find maximum minutes in daily trend to scale chart bars nicely
  const maxTrendMins = Math.max(60, ...dailyTrend.map((d) => d.minutes || 0));

  return (
    <div className="analytics-dashboard-container animate-fade-in">
      {/* Header Section */}
      <div className="analytics-header-row">
        <div>
          <div className="analytics-badge-tag">
            <span className="badge-pulse-dot"></span>
            <span>PHASE 9 &bull; MILESTONE 9 &bull; REAL-TIME PROGRESS TRACKING</span>
          </div>
          <h2 className="analytics-main-title">📈 Analytics & Progress Tracking</h2>
          <p className="analytics-subtitle">
            MongoDB aggregation-powered dashboard tracking daily focus, weekly study goals, subject distribution, and task velocity.
          </p>
        </div>

        <div className="analytics-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowGoalModal(true)}
            title="Configure Weekly Goals"
          >
            🎯 Adjust Goals
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopySummary}
            title="Copy formatted summary"
          >
            {copiedSummary ? "✅ Copied" : "📋 Share Summary"}
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-sm ${refreshing ? "loading" : ""}`}
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            title="Refresh Aggregations"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* ============================================================
          MILESTONE 9 SHOWCASE: "THIS WEEK" HERO DASHBOARD CARD
          Study:  ████████████░░ 12.4 / 15 hrs
          Tasks:  ██████████░░░ 23 / 28
          Consistency: 🔥 6 days
         ============================================================ */}
      <section className="milestone-dashboard-hero-card card">
        <div className="milestone-hero-header">
          <div className="milestone-hero-title-group">
            <span className="milestone-hero-badge">This Week's Momentum</span>
            <h3 className="milestone-hero-title">This Week</h3>
          </div>
          <div className="milestone-hero-period">
            <span>📅 Active Week Summary</span>
          </div>
        </div>

        <div className="milestone-hero-grid">
          {/* 1. Study Progress Widget */}
          <div className="milestone-hero-item study-item">
            <div className="milestone-item-header">
              <div className="milestone-item-label-group">
                <span className="milestone-item-icon">⏱️</span>
                <span className="milestone-item-name">Study</span>
              </div>
              <span className="milestone-item-val">{overview.study.formatted}</span>
            </div>

            {/* ASCII & Visual Progress Bar */}
            <div className="milestone-progress-bar-container">
              <div
                className="milestone-progress-bar-fill study-bar"
                style={{ width: `${Math.min(100, overview.study.percentage)}%` }}
              ></div>
            </div>

            <div className="milestone-item-footer">
              <span className="ascii-representation">
                {overview.study.asciiBar || `████████████░░ ${overview.study.formatted}`}
              </span>
              <span className="percentage-pill study-pill">
                {overview.study.percentage}% of {overview.study.targetHours}h goal
              </span>
            </div>
          </div>

          {/* 2. Tasks Progress Widget */}
          <div className="milestone-hero-item tasks-item">
            <div className="milestone-item-header">
              <div className="milestone-item-label-group">
                <span className="milestone-item-icon">📋</span>
                <span className="milestone-item-name">Tasks</span>
              </div>
              <span className="milestone-item-val">{overview.tasks.formatted}</span>
            </div>

            {/* ASCII & Visual Progress Bar */}
            <div className="milestone-progress-bar-container">
              <div
                className="milestone-progress-bar-fill tasks-bar"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((overview.tasks.completed / (overview.tasks.target || 1)) * 100)
                  )}%`,
                }}
              ></div>
            </div>

            <div className="milestone-item-footer">
              <span className="ascii-representation">
                {overview.tasks.asciiBar || `██████████░░░ ${overview.tasks.formatted}`}
              </span>
              <span className="percentage-pill tasks-pill">
                {overview.tasks.completionRate}% completion rate
              </span>
            </div>
          </div>

          {/* 3. Consistency / Streak Widget */}
          <div className="milestone-hero-item consistency-item">
            <div className="milestone-item-header">
              <div className="milestone-item-label-group">
                <span className="milestone-item-icon">🔥</span>
                <span className="milestone-item-name">Consistency</span>
              </div>
              <span className="milestone-streak-badge">
                {overview.consistency.streakLabel || `🔥 ${overview.consistency.currentStreak} days`}
              </span>
            </div>

            {/* 7-Day Day Badges */}
            <div className="consistency-days-row">
              {weekMatrix.map((day, idx) => (
                <div
                  key={idx}
                  className={`consistency-day-chip ${day.active ? "active" : "inactive"} ${
                    day.isToday ? "today" : ""
                  }`}
                  title={`${day.dayName} (${day.date}): ${day.minutes} mins studied`}
                >
                  <span className="day-name">{day.dayName}</span>
                  <span className="day-status-icon">{day.active ? "🔥" : "•"}</span>
                  <span className="day-mins">{day.minutes > 0 ? `${day.minutes}m` : "-"}</span>
                </div>
              ))}
            </div>

            <div className="milestone-item-footer">
              <span className="consistency-subtext">
                {overview.consistency.activeDaysThisWeek} of 7 active study days this week
              </span>
              <span className="percentage-pill consistency-pill">
                {overview.consistency.score}% Active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: CORE ANALYTICS KPI CARDS
         ============================================================ */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Daily Study Time (Today) */}
        <div className="card analytics-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-icon-bubble cyan">⚡</span>
            <span className="kpi-tag">Daily</span>
          </div>
          <div className="kpi-main-stat">
            <span className="kpi-number">
              {metrics.dailyStudyTime?.todayHours || 0}
              <small> hrs</small>
            </span>
          </div>
          <div className="kpi-sub-text">
            <strong>{metrics.dailyStudyTime?.todayMinutes || 0} mins</strong> studied today across{" "}
            {metrics.dailyStudyTime?.todaySessions || 0} session(s)
          </div>
          <div className="kpi-trend-bar">
            <div
              className="kpi-trend-fill cyan"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((metrics.dailyStudyTime?.todayMinutes || 0) / 120) * 100)
                )}%`,
              }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Weekly Study Time */}
        <div className="card analytics-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-icon-bubble purple">📅</span>
            <span className="kpi-tag">Weekly</span>
          </div>
          <div className="kpi-main-stat">
            <span className="kpi-number">
              {metrics.weeklyStudyTime?.weekHours || 0}
              <small> / {metrics.weeklyStudyTime?.weeklyGoalHours || 15}h</small>
            </span>
          </div>
          <div className="kpi-sub-text">
            <strong>{overview.study.percentage}%</strong> of {overview.weeklyStudyGoalHours || 15}h weekly study target achieved
          </div>
          <div className="kpi-trend-bar">
            <div
              className="kpi-trend-fill purple"
              style={{ width: `${Math.min(100, overview.study.percentage)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 3: Tasks Completed */}
        <div className="card analytics-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-icon-bubble green">✅</span>
            <span className="kpi-tag">Tasks Done</span>
          </div>
          <div className="kpi-main-stat">
            <span className="kpi-number">
              {metrics.taskMetrics?.completed || 0}
              <small> / {metrics.taskMetrics?.total || 0}</small>
            </span>
          </div>
          <div className="kpi-sub-text">
            <strong>{metrics.taskMetrics?.completed || 0}</strong> tasks resolved successfully
          </div>
          <div className="kpi-trend-bar">
            <div
              className="kpi-trend-fill green"
              style={{
                width: `${
                  metrics.taskMetrics?.total > 0
                    ? Math.round(
                        (metrics.taskMetrics.completed / metrics.taskMetrics.total) * 100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* KPI 4: Tasks Pending */}
        <div className="card analytics-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-icon-bubble orange">⏳</span>
            <span className="kpi-tag">Pending</span>
          </div>
          <div className="kpi-main-stat">
            <span className="kpi-number">{metrics.taskMetrics?.pending || 0}</span>
          </div>
          <div className="kpi-sub-text">
            <strong>{metrics.taskMetrics?.inProgress || 0} in-progress</strong>,{" "}
            {metrics.taskMetrics?.todo || 0} to-do
          </div>
          <div className="kpi-trend-bar">
            <div
              className="kpi-trend-fill orange"
              style={{
                width: `${
                  metrics.taskMetrics?.total > 0
                    ? Math.round(
                        (metrics.taskMetrics.pending / metrics.taskMetrics.total) * 100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* KPI 5: Completion Rate */}
        <div className="card analytics-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-icon-bubble emerald">🎯</span>
            <span className="kpi-tag">Rate</span>
          </div>
          <div className="kpi-main-stat">
            <span className="kpi-number">
              {metrics.taskMetrics?.completionRate || 0}
              <small>%</small>
            </span>
          </div>
          <div className="kpi-sub-text">
            Overall student task execution efficiency
          </div>
          <div className="kpi-trend-bar">
            <div
              className="kpi-trend-fill emerald"
              style={{ width: `${metrics.taskMetrics?.completionRate || 0}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 6: Total Lifetime Focus */}
        <div className="card analytics-kpi-card">
          <div className="kpi-header-row">
            <span className="kpi-icon-bubble blue">🏆</span>
            <span className="kpi-tag">All-Time</span>
          </div>
          <div className="kpi-main-stat">
            <span className="kpi-number">
              {metrics.allTimeStudyTime?.totalHours || 0}
              <small> hrs</small>
            </span>
          </div>
          <div className="kpi-sub-text">
            Across <strong>{metrics.allTimeStudyTime?.totalSessions || 0}</strong> focus sessions
          </div>
          <div className="kpi-trend-bar">
            <div className="kpi-trend-fill blue" style={{ width: "100%" }}></div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 3: VISUAL CHARTS & BREAKDOWNS (2 COLUMN GRID)
         ============================================================ */}
      <div className="analytics-charts-grid">
        {/* Left Chart: Daily Study Time (Past 7 Days Bar Chart) */}
        <div className="card analytics-chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">📊 Daily Study Time Trend</h3>
              <p className="chart-card-subtitle">
                Focus minutes recorded per day across the past 7 days.
              </p>
            </div>
            <div className="chart-legend-badge">
              <span className="legend-dot cyan"></span>
              <span>Study Hours</span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="daily-bar-chart">
            {dailyTrend.length === 0 ? (
              <div className="empty-chart-notice">No study sessions recorded yet this week.</div>
            ) : (
              dailyTrend.map((day, idx) => {
                const barHeightPercent = Math.max(
                  6,
                  Math.min(100, Math.round((day.minutes / maxTrendMins) * 100))
                );
                const isToday =
                  new Date().toISOString().slice(0, 10) === day.date;

                return (
                  <div key={idx} className="chart-bar-col">
                    <div className="bar-val-tooltip">
                      <strong>{day.hours}h</strong>
                      <span>({day.minutes}m)</span>
                    </div>

                    <div className="bar-track">
                      <div
                        className={`bar-fill ${isToday ? "today-bar" : ""}`}
                        style={{ height: `${day.minutes === 0 ? 4 : barHeightPercent}%` }}
                      ></div>
                    </div>

                    <div className="bar-label-group">
                      <span className={`bar-day-name ${isToday ? "today-label" : ""}`}>
                        {day.dayName}
                      </span>
                      <span className="bar-date-label">{day.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="chart-card-footer">
            <div className="footer-metric-pill">
              <span>Weekly Total:</span>
              <strong>{metrics.weeklyStudyTime?.weekHours || 0} hrs</strong>
            </div>
            <div className="footer-metric-pill">
              <span>Daily Average:</span>
              <strong>
                {(
                  (metrics.weeklyStudyTime?.weekHours || 0) /
                  Math.max(1, overview.consistency.activeDaysThisWeek || 1)
                ).toFixed(1)}{" "}
                hrs/active day
              </strong>
            </div>
          </div>
        </div>

        {/* Right Chart: Subject-wise Study Time Distribution */}
        <div className="card analytics-chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">📚 Subject-Wise Study Time</h3>
              <p className="chart-card-subtitle">
                MongoDB aggregation breakdown of focus allocation per subject.
              </p>
            </div>
            <div className="chart-legend-badge">
              <span>{subjectBreakdown.length} Subjects</span>
            </div>
          </div>

          {/* Proportional Segment Bar */}
          {subjectBreakdown.length > 0 && (
            <div className="subject-multi-segment-bar">
              {subjectBreakdown.map((s, idx) => (
                <div
                  key={idx}
                  className="subject-segment"
                  style={{
                    width: `${Math.max(4, s.percentage)}%`,
                    backgroundColor: s.color || "#aa3bff",
                  }}
                  title={`${s.name}: ${s.totalHours} hrs (${s.percentage}%)`}
                ></div>
              ))}
            </div>
          )}

          {/* Subject List */}
          <div className="subject-analytics-list">
            {subjectBreakdown.length === 0 ? (
              <div className="empty-chart-notice">
                No subject study sessions recorded yet. Start a focus session in the Study Engine to see breakdown!
              </div>
            ) : (
              subjectBreakdown.map((sub, idx) => (
                <div key={idx} className="subject-analytics-row">
                  <div className="subject-info-col">
                    <div className="subject-title-line">
                      <span
                        className="subject-color-dot"
                        style={{ backgroundColor: sub.color || "#aa3bff" }}
                      ></span>
                      <strong className="subject-name-text">{sub.name}</strong>
                      {sub.code && (
                        <span className="subject-code-tag">{sub.code}</span>
                      )}
                    </div>
                    <span className="subject-session-count">
                      {sub.sessionCount} session(s) &bull; {sub.totalMinutes} mins total
                    </span>
                  </div>

                  <div className="subject-progress-col">
                    <div className="subject-hours-tag">
                      <strong>{sub.totalHours} hrs</strong>
                      <span className="subject-percent-badge">{sub.percentage}%</span>
                    </div>

                    <div className="subject-mini-track">
                      <div
                        className="subject-mini-fill"
                        style={{
                          width: `${Math.min(100, sub.percentage)}%`,
                          backgroundColor: sub.color || "#aa3bff",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          GOALS CONFIGURATION MODAL
         ============================================================ */}
      {showGoalModal && (
        <div className="modal-backdrop animate-fade-in">
          <div className="modal-content card animate-scale-in" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3>🎯 Customize Weekly Study Goals</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowGoalModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateGoals} className="modal-form">
              <div className="form-group">
                <label>Weekly Study Target (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={goalForm.weeklyStudyGoalHours}
                  onChange={(e) =>
                    setGoalForm({
                      ...goalForm,
                      weeklyStudyGoalHours: Number(e.target.value),
                    })
                  }
                  required
                />
                <small className="form-hint">
                  Default: 15 hours per week (matches Milestone 9: 12.4 / 15 hrs).
                </small>
              </div>

              <div className="form-group">
                <label>Weekly Task Target (Count)</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={goalForm.weeklyTaskGoal}
                  onChange={(e) =>
                    setGoalForm({
                      ...goalForm,
                      weeklyTaskGoal: Number(e.target.value),
                    })
                  }
                  required
                />
                <small className="form-hint">
                  Default: 28 tasks per week (matches Milestone 9: 23 / 28).
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowGoalModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingGoal}
                >
                  {savingGoal ? "Saving..." : "Save Targets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
