import { useState, useEffect, useCallback } from "react";
import {
  AnalyticsIcon,
  TargetIcon,
  ShareIcon,
  RotateCcwIcon,
  CheckIcon,
  ClockIcon,
  TasksIcon,
  TrophyIcon,
  CalendarIcon,
  StarIcon,
  PlusIcon
} from "./Icons";

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
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

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
      <div className="analytics-loading-pane animate-fade-in">
        <div className="spinner"></div>
        <p className="loading-text">Crunching MongoDB analytics & progress tracking metrics...</p>
      </div>
    );
  }

  const overview = data?.overview?.thisWeek || {
    study: { currentHours: 0, targetHours: 15, percentage: 0, formatted: "0.0 / 15 hrs" },
    tasks: { completed: 0, target: 28, pending: 0, total: 0, completionRate: 0, formatted: "0 / 28" },
    consistency: { currentStreak: 0, streakLabel: "0 days", activeDaysThisWeek: 0, score: 0, weekMatrix: [] },
  };

  const metrics = data?.metrics || {};
  const dailyTrend = data?.dailyStudyTrend || [];
  const subjectBreakdown = data?.subjectBreakdown || [];
  const weekMatrix = data?.weekConsistency || [];

  // Find maximum minutes in daily trend to scale chart bars nicely
  const maxTrendMins = Math.max(60, ...dailyTrend.map((d) => d.minutes || 0));

  // Find highest study day
  const topDay = dailyTrend.reduce(
    (max, d) => (d.minutes > (max?.minutes || 0) ? d : max),
    null
  );

  return (
    <div className="analytics-dashboard-container animate-fade-in">
      {/* 1. Header Section with Controls */}
      <div className="analytics-header-row">
        <div className="analytics-title-block">
          <div className="analytics-title-badge-line">
            <div className="analytics-hero-icon-bubble">
              <AnalyticsIcon size={20} />
            </div>
            <div>
              <h2 className="analytics-main-title">Analytics & Progress Tracking</h2>
              <p className="analytics-subtitle">
                High-precision focus trends, subject distributions, and completion velocity.
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-header-actions">
          {/* Range Switcher */}
          <div className="analytics-range-pills">
            <button
              type="button"
              className={`analytics-range-btn ${selectedRange === "this_week" ? "active" : ""}`}
              onClick={() => setSelectedRange("this_week")}
            >
              This Week
            </button>
            <button
              type="button"
              className={`analytics-range-btn ${selectedRange === "past_30" ? "active" : ""}`}
              onClick={() => setSelectedRange("past_30")}
            >
              Past 30 Days
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm glossy-btn"
            onClick={() => setShowGoalModal(true)}
            title="Configure Weekly Goals"
          >
            <TargetIcon size={14} />
            <span>Adjust Goals</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm glossy-btn"
            onClick={handleCopySummary}
            title="Copy formatted summary"
          >
            {copiedSummary ? <CheckIcon size={14} /> : <ShareIcon size={14} />}
            <span>{copiedSummary ? "Copied" : "Share"}</span>
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-sm glossy-btn ${refreshing ? "loading" : ""}`}
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            title="Refresh Aggregations"
          >
            <RotateCcwIcon size={14} className={refreshing ? "spin-animation" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Momentum Showcase (3 Glossy Interactive Cards) */}
      <section className="analytics-momentum-hero">
        <div className="analytics-momentum-grid">
          {/* Card 1: Study Time Progress */}
          <div className="card analytics-momentum-card study-momentum">
            <div className="momentum-card-header">
              <div className="momentum-title-group">
                <div className="momentum-icon-wrap study-glow">
                  <ClockIcon size={18} />
                </div>
                <div>
                  <span className="momentum-kicker">Study Momentum</span>
                  <h4 className="momentum-title">Weekly Focus Hours</h4>
                </div>
              </div>
              <span className="momentum-tag-pill study-pill">
                {overview.study.percentage}% Achieved
              </span>
            </div>

            <div className="momentum-stat-row">
              <span className="momentum-huge-stat">{overview.study.formatted.split("/")[0]?.trim() || "0"}</span>
              <span className="momentum-stat-denom">/ {overview.study.targetHours} hrs target</span>
            </div>

            <div className="momentum-bar-wrap">
              <div
                className="momentum-bar-fill study-gradient"
                style={{ width: `${Math.min(100, Math.max(4, overview.study.percentage))}%` }}
              >
                <div className="momentum-bar-shine"></div>
              </div>
            </div>

            <div className="momentum-footer-row">
              <span className="momentum-footer-hint">
                {overview.study.percentage >= 100
                  ? "🎉 Weekly target surpassed!"
                  : `${Math.max(0, (overview.study.targetHours - overview.study.currentHours)).toFixed(1)} hrs remaining`}
              </span>
              <span className="momentum-chip">{metrics.weeklyStudyTime?.weeklySessions || 0} sessions</span>
            </div>
          </div>

          {/* Card 2: Tasks Execution Velocity */}
          <div className="card analytics-momentum-card tasks-momentum">
            <div className="momentum-card-header">
              <div className="momentum-title-group">
                <div className="momentum-icon-wrap tasks-glow">
                  <TasksIcon size={18} />
                </div>
                <div>
                  <span className="momentum-kicker">Task Execution</span>
                  <h4 className="momentum-title">Task Velocity</h4>
                </div>
              </div>
              <span className="momentum-tag-pill tasks-pill">
                {overview.tasks.completionRate}% Rate
              </span>
            </div>

            <div className="momentum-stat-row">
              <span className="momentum-huge-stat">{overview.tasks.completed}</span>
              <span className="momentum-stat-denom">/ {overview.tasks.target} target</span>
            </div>

            <div className="momentum-bar-wrap">
              <div
                className="momentum-bar-fill tasks-gradient"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(4, Math.round((overview.tasks.completed / (overview.tasks.target || 1)) * 100))
                  )}%`,
                }}
              >
                <div className="momentum-bar-shine"></div>
              </div>
            </div>

            <div className="momentum-footer-row">
              <span className="momentum-footer-hint">
                {overview.tasks.pending} active tasks in progress
              </span>
              <span className="momentum-chip">{overview.tasks.completed} resolved</span>
            </div>
          </div>

          {/* Card 3: 7-Day Consistency Matrix */}
          <div className="card analytics-momentum-card consistency-momentum">
            <div className="momentum-card-header">
              <div className="momentum-title-group">
                <div className="momentum-icon-wrap streak-glow">
                  <TrophyIcon size={18} />
                </div>
                <div>
                  <span className="momentum-kicker">Habit Consistency</span>
                  <h4 className="momentum-title">Daily Study Rhythm</h4>
                </div>
              </div>
              <span className="momentum-tag-pill streak-pill">
                {overview.consistency.activeDaysThisWeek}/7 Active Days
              </span>
            </div>

            <div className="consistency-chips-matrix">
              {weekMatrix.map((day, idx) => (
                <div
                  key={idx}
                  className={`consistency-day-bubble ${day.active ? "active" : "inactive"} ${
                    day.isToday ? "today" : ""
                  }`}
                  title={`${day.dayName} (${day.date}): ${day.minutes} mins studied`}
                >
                  <span className="bubble-day">{day.dayName.slice(0, 3)}</span>
                  <span className="bubble-indicator"></span>
                  <span className="bubble-mins">{day.minutes > 0 ? `${day.minutes}m` : "0m"}</span>
                </div>
              ))}
            </div>

            <div className="momentum-footer-row">
              <span className="momentum-footer-hint">
                Current streak: <strong>{overview.consistency.streakLabel || `${overview.consistency.currentStreak} days`}</strong>
              </span>
              <span className="momentum-chip">{overview.consistency.score}% Consistency</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Analytics KPI Grid (6 Animated Metric Cards) */}
      <div className="analytics-kpi-grid">
        {/* KPI 1: Daily Focus */}
        <div className="card analytics-kpi-card hover-lift">
          <div className="kpi-top-line">
            <div className="kpi-icon-bubble cyan">
              <ClockIcon size={16} />
            </div>
            <span className="kpi-badge-pill cyan">Today</span>
          </div>
          <div className="kpi-big-number">
            {metrics.dailyStudyTime?.todayHours || 0}
            <small> hrs</small>
          </div>
          <p className="kpi-detail-text">
            <strong>{metrics.dailyStudyTime?.todayMinutes || 0} mins</strong> recorded across {metrics.dailyStudyTime?.todaySessions || 0} session(s)
          </p>
          <div className="kpi-glow-bar">
            <div
              className="kpi-glow-fill cyan"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(((metrics.dailyStudyTime?.todayMinutes || 0) / 120) * 100)
                )}%`,
              }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Weekly Total */}
        <div className="card analytics-kpi-card hover-lift">
          <div className="kpi-top-line">
            <div className="kpi-icon-bubble purple">
              <CalendarIcon size={16} />
            </div>
            <span className="kpi-badge-pill purple">Weekly Goal</span>
          </div>
          <div className="kpi-big-number">
            {metrics.weeklyStudyTime?.weekHours || 0}
            <small> / {metrics.weeklyStudyTime?.weeklyGoalHours || 15}h</small>
          </div>
          <p className="kpi-detail-text">
            <strong>{overview.study.percentage}%</strong> of weekly study quota completed
          </p>
          <div className="kpi-glow-bar">
            <div
              className="kpi-glow-fill purple"
              style={{ width: `${Math.min(100, overview.study.percentage)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 3: Resolved Tasks */}
        <div className="card analytics-kpi-card hover-lift">
          <div className="kpi-top-line">
            <div className="kpi-icon-bubble green">
              <CheckIcon size={16} />
            </div>
            <span className="kpi-badge-pill green">Resolved</span>
          </div>
          <div className="kpi-big-number">
            {metrics.taskMetrics?.completed || 0}
            <small> / {metrics.taskMetrics?.total || 0}</small>
          </div>
          <p className="kpi-detail-text">
            <strong>{metrics.taskMetrics?.completed || 0} tasks</strong> finished on schedule
          </p>
          <div className="kpi-glow-bar">
            <div
              className="kpi-glow-fill green"
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

        {/* KPI 4: Pending Tasks */}
        <div className="card analytics-kpi-card hover-lift">
          <div className="kpi-top-line">
            <div className="kpi-icon-bubble amber">
              <TasksIcon size={16} />
            </div>
            <span className="kpi-badge-pill amber">In Pipeline</span>
          </div>
          <div className="kpi-big-number">
            {metrics.taskMetrics?.pending || 0}
            <small> tasks</small>
          </div>
          <p className="kpi-detail-text">
            <strong>{metrics.taskMetrics?.inProgress || 0}</strong> active, {metrics.taskMetrics?.todo || 0} queued
          </p>
          <div className="kpi-glow-bar">
            <div
              className="kpi-glow-fill amber"
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

        {/* KPI 5: Execution Efficiency */}
        <div className="card analytics-kpi-card hover-lift">
          <div className="kpi-top-line">
            <div className="kpi-icon-bubble emerald">
              <TargetIcon size={16} />
            </div>
            <span className="kpi-badge-pill emerald">Efficiency</span>
          </div>
          <div className="kpi-big-number">
            {metrics.taskMetrics?.completionRate || 0}
            <small>%</small>
          </div>
          <p className="kpi-detail-text">
            Overall student execution efficiency rate
          </p>
          <div className="kpi-glow-bar">
            <div
              className="kpi-glow-fill emerald"
              style={{ width: `${metrics.taskMetrics?.completionRate || 0}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 6: Lifetime Dedication */}
        <div className="card analytics-kpi-card hover-lift">
          <div className="kpi-top-line">
            <div className="kpi-icon-bubble blue">
              <TrophyIcon size={16} />
            </div>
            <span className="kpi-badge-pill blue">All-Time</span>
          </div>
          <div className="kpi-big-number">
            {metrics.allTimeStudyTime?.totalHours || 0}
            <small> hrs</small>
          </div>
          <p className="kpi-detail-text">
            Across <strong>{metrics.allTimeStudyTime?.totalSessions || 0}</strong> total focus sessions
          </p>
          <div className="kpi-glow-bar">
            <div className="kpi-glow-fill blue" style={{ width: "100%" }}></div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Left Chart: Daily Study Trend (Interactive Bar Columns) */}
        <div className="card analytics-chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-title-row">
                <div className="chart-header-dot cyan"></div>
                <h3 className="chart-card-title">Daily Study Time Trend</h3>
              </div>
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
                  8,
                  Math.min(100, Math.round((day.minutes / maxTrendMins) * 100))
                );
                const isToday =
                  new Date().toISOString().slice(0, 10) === day.date;
                const isHovered = hoveredBarIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`chart-bar-col ${isHovered ? "hovered" : ""}`}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    <div className={`bar-val-tooltip ${isHovered ? "visible" : ""}`}>
                      <strong>{day.hours}h</strong>
                      <span>({day.minutes}m)</span>
                    </div>

                    <div className="bar-track">
                      <div
                        className={`bar-fill ${isToday ? "today-bar" : ""}`}
                        style={{ height: `${day.minutes === 0 ? 6 : barHeightPercent}%` }}
                      >
                        <div className="bar-glow-cap"></div>
                      </div>
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
                hrs/day
              </strong>
            </div>
            {topDay && topDay.minutes > 0 && (
              <div className="footer-metric-pill highlight">
                <span>Peak Day:</span>
                <strong>{topDay.dayName} ({topDay.hours}h)</strong>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Subject-Wise Study Distribution */}
        <div className="card analytics-chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-title-row">
                <div className="chart-header-dot purple"></div>
                <h3 className="chart-card-title">Subject-Wise Study Time</h3>
              </div>
              <p className="chart-card-subtitle">
                Focus allocation breakdown across enrolled academic subjects.
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
                No subject study sessions recorded yet. Start a focus session in the Focus Study Engine to see breakdown!
              </div>
            ) : (
              subjectBreakdown.map((sub, idx) => (
                <div key={idx} className="subject-analytics-row hover-lift">
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

      {/* 5. Smart Study Velocity & Insights Callout */}
      <div className="card analytics-insight-callout">
        <div className="insight-callout-left">
          <div className="insight-icon-pulse">
            <StarIcon size={20} filled={true} />
          </div>
          <div>
            <h4 className="insight-callout-title">Study Velocity & Consistency Insights</h4>
            <p className="insight-callout-text">
              {overview.consistency.activeDaysThisWeek >= 5
                ? "Outstanding momentum! You've maintained high study consistency this week. Keep this rhythm to lock in all Milestone achievements."
                : overview.consistency.activeDaysThisWeek >= 2
                ? "Good steady progress! Add a quick 25-minute Pomodoro session today to reach your weekly study targets."
                : "Kickstart your weekly momentum! Launch a deep focus session from the Study Engine or complete a pending task."}
            </p>
          </div>
        </div>
        <div className="insight-callout-right">
          <button
            type="button"
            className="btn btn-primary btn-sm glossy-btn"
            onClick={() => setShowGoalModal(true)}
          >
            <TargetIcon size={14} />
            <span>Customize Weekly Targets</span>
          </button>
        </div>
      </div>

      {/* 6. Goals Configuration Modal */}
      {showGoalModal && (
        <div className="modal-backdrop animate-fade-in">
          <div className="modal-content card animate-scale-in" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(170, 59, 255, 0.12)", color: "#aa3bff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TargetIcon size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Customize Study Goals</h3>
              </div>
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
                  Recommended: 15 hours per week (approx. 2.1 hrs / active day).
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
                  Recommended: 28 tasks per week (approx. 4 tasks / day).
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
