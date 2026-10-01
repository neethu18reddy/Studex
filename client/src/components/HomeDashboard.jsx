import { useState, useEffect, useCallback, useRef } from "react";
import ShareableStreakCardModal from "./ShareableStreakCardModal";
import {
  ClockIcon,
  TasksIcon,
  BookOpenIcon,
  AnalyticsIcon,
  TrophyIcon,
  StarIcon,
  CheckIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  FileTextIcon,
  PinIcon,
  CalendarIcon,
  SparklesIcon,
} from "./Icons";

export default function HomeDashboard({
  token,
  apiBase,
  currentUser,
  onNavigateTab,
  onOpenProfile,
  onError,
  onFeedback,
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Consolidated Dashboard Data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // Quick Task Add Input State
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState("medium");
  const [quickTaskSubject, setQuickTaskSubject] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Quick Focus Timer State
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [focusSubject, setFocusSubject] = useState("");
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const timerRef = useRef(null);

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Daily Student Motivation Quotes
  const quotes = [
    "“Success is the sum of small efforts, repeated day in and day out.”",
    "“Focus on being productive instead of busy.”",
    "“Deep work is the superpower of the 21st century.”",
    "“Small daily improvements over time lead to stunning results.”",
    "“Action is the foundational key to all success.”",
  ];
  const dailyQuote = quotes[new Date().getDate() % quotes.length];

  // Fetch all essential data concurrently
  const loadDashboardData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [analyticsRes, streaksRes, tasksRes, todayRes, subjectsRes, resourcesRes] =
          await Promise.all([
            fetch(`${apiBase}/api/analytics/dashboard`, { headers }).catch(
              () => null
            ),
            fetch(`${apiBase}/api/streaks/dashboard`, { headers }).catch(
              () => null
            ),
            fetch(`${apiBase}/api/tasks`, { headers }).catch(() => null),
            fetch(`${apiBase}/api/tasks/today`, { headers }).catch(() => null),
            fetch(`${apiBase}/api/subjects`, { headers }).catch(() => null),
            fetch(`${apiBase}/api/resources`, { headers }).catch(() => null),
          ]);

        if (analyticsRes && analyticsRes.ok) {
          const aData = await analyticsRes.json();
          if (aData.success) setAnalyticsData(aData.data);
        }

        if (streaksRes && streaksRes.ok) {
          const stData = await streaksRes.json();
          if (stData.success) setStreakData(stData.data);
        }

        if (tasksRes && tasksRes.ok) {
          const tData = await tasksRes.json();
          if (tData.success) setAllTasks(tData.data || []);
        }

        if (todayRes && todayRes.ok) {
          const tdData = await todayRes.json();
          if (tdData.success) setTodayTasks(tdData.data || []);
        }

        if (subjectsRes && subjectsRes.ok) {
          const sData = await subjectsRes.json();
          if (sData.success) setSubjects(sData.data || []);
        }

        if (resourcesRes && resourcesRes.ok) {
          const rData = await resourcesRes.json();
          if (rData.success) setRecentResources((rData.data || []).slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to load Home dashboard:", err);
        onError?.("Could not load dashboard data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiBase, token, onError]
  );

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Mini Timer Tick Effect
  useEffect(() => {
    if (isTimerActive && !isTimerPaused) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoFinishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, isTimerPaused]);

  // Start Quick Timer
  const handleStartTimer = () => {
    setIsTimerActive(true);
    setIsTimerPaused(false);
    if (!timerStartTime) setTimerStartTime(new Date());
    onFeedback?.("Focus session active! Deep work in progress. 🧠");
  };

  // Pause Timer
  const handlePauseTimer = () => setIsTimerPaused(true);

  // Resume Timer
  const handleResumeTimer = () => setIsTimerPaused(false);

  // Reset Timer
  const handleResetTimer = () => {
    setIsTimerActive(false);
    setIsTimerPaused(false);
    setSecondsLeft(timerMinutes * 60);
    setTimerStartTime(null);
  };

  // Set Duration Preset
  const handleSetPreset = (mins) => {
    if (isTimerActive && !window.confirm("Change timer duration? Active session will reset.")) {
      return;
    }
    setIsTimerActive(false);
    setIsTimerPaused(false);
    setTimerMinutes(mins);
    setSecondsLeft(mins * 60);
    setTimerStartTime(null);
  };

  // Save Session
  const handleSaveSession = async (actualDurationMins) => {
    setSavingSession(true);
    const end = new Date();
    const start =
      timerStartTime || new Date(Date.now() - actualDurationMins * 60 * 1000);

    try {
      const res = await fetch(`${apiBase}/api/study-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectId: focusSubject || undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration: Math.max(1, actualDurationMins),
          notes: "Quick home study session",
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.message || "Failed to log session");
      }

      onFeedback?.(`Awesome work! Logged ${actualDurationMins}m of study time. 🎉`);
      handleResetTimer();
      loadDashboardData(true);
    } catch (err) {
      onError?.(err.message || "Could not log study session");
    } finally {
      setSavingSession(false);
    }
  };

  const handleAutoFinishSession = () => handleSaveSession(timerMinutes);

  const handleManualFinish = () => {
    const elapsedSeconds = timerMinutes * 60 - secondsLeft;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    handleSaveSession(elapsedMinutes);
  };

  // Toggle Task Completion directly from Home
  const handleToggleTaskStatus = async (task) => {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    try {
      const res = await fetch(`${apiBase}/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update task");
      }

      onFeedback?.(
        newStatus === "completed"
          ? `Task "${task.title}" completed! ✅`
          : `Task "${task.title}" marked to do.`
      );
      loadDashboardData(true);
    } catch (err) {
      onError?.(err.message || "Could not update task");
    }
  };

  // Quick Add Task from Home
  const handleQuickAddTask = async (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    setAddingTask(true);
    try {
      const res = await fetch(`${apiBase}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: quickTaskTitle.trim(),
          priority: quickTaskPriority,
          subject: quickTaskSubject || null,
          status: "todo",
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create task");
      }

      onFeedback?.(`Task "${quickTaskTitle}" added to your queue! 🚀`);
      setQuickTaskTitle("");
      loadDashboardData(true);
    } catch (err) {
      onError?.(err.message || "Could not create task");
    } finally {
      setAddingTask(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const overview = analyticsData?.overview?.thisWeek || {
    study: { formatted: "0.0 / 15 hrs", percentage: 0 },
    tasks: { formatted: "0 / 28", completionRate: 0, completed: 0, target: 28 },
    consistency: { streakLabel: "🔥 0 days", activeDaysThisWeek: 0, weekMatrix: [] },
  };

  // Pending tasks due soon (top 5)
  const pendingTasksList = allTasks
    .filter((t) => t.status !== "completed")
    .slice(0, 5);

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "urgent": return "priority-urgent";
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      default: return "priority-low";
    }
  };

  if (loading) {
    return (
      <div className="home-dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="home-dashboard-container animate-fade-in">
      {/* ============================================================
          1. WELCOME HERO & STUDENT SPOTLIGHT
         ============================================================ */}
      <section className="home-hero-banner card">
        <div className="home-hero-left">
          <h2 className="home-hero-greeting">
            {getGreeting()}, <span className="highlight-name">{currentUser?.name || "Student"}</span>! 👋
          </h2>

          <p className="home-hero-quote">{dailyQuote}</p>

          <div className="home-student-meta">
            {currentUser?.college && (
              <span className="home-meta-tag">🏛️ {currentUser.college}</span>
            )}
            {currentUser?.course && (
              <span className="home-meta-tag">🎓 {currentUser.course}</span>
            )}
            <span className="home-meta-tag">📚 {subjects.length} Subjects Enrolled</span>
          </div>
        </div>

        <div className="home-hero-quick-actions">
          <button
            type="button"
            className="btn btn-primary btn-ai-hero-cta"
            onClick={() => onNavigateTab("ai")}
          >
            <SparklesIcon size={15} /> Studex AI Planner ✨
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab("study")}
          >
            <ClockIcon size={15} /> Focus Timer
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab("tasks")}
          >
            <TasksIcon size={15} /> Manage Tasks
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab("workspace")}
          >
            <BookOpenIcon size={15} /> Workspace
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab("analytics")}
          >
            <AnalyticsIcon size={15} /> Analytics
          </button>
        </div>
      </section>

      {/* ============================================================
          AI STUDY PLANNER SPOTLIGHT BANNER
         ============================================================ */}
      <section
        className="home-ai-spotlight-card card"
        onClick={() => onNavigateTab("ai")}
        style={{ cursor: "pointer" }}
        title="Open Studex AI Personalized Planner"
      >
        <div className="home-ai-spotlight-content">
          <div className="home-ai-badge">
            <SparklesIcon size={14} /> AI Study Planner
          </div>
          <h3 className="home-ai-spotlight-title">
            Plan Your Next Study Session with AI
          </h3>
          <p className="home-ai-spotlight-desc">
            Generate tailored time-blocked schedules and active recall roadmaps based on your enrolled subjects, pending assignments, and upcoming deadlines.
          </p>
        </div>
        <div className="home-ai-spotlight-action">
          <button
            type="button"
            className="btn btn-primary btn-ai-spotlight-cta"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateTab("ai");
            }}
          >
            <SparklesIcon size={15} /> Generate My Plan &rarr;
          </button>
        </div>
      </section>

      {/* ============================================================
          2. THIS WEEK AT A GLANCE
         ============================================================ */}
      <section className="home-week-glance-card card">
        <div className="home-card-header">
          <div className="home-card-title-group">
            <span className="section-kicker">Weekly Momentum</span>
            <h3 className="home-card-title">This Week at a Glance</h3>
          </div>
          <button
            type="button"
            className="btn-text-link"
            onClick={() => onNavigateTab("analytics")}
          >
            Full Analytics Dashboard &rarr;
          </button>
        </div>

        <div className="home-glance-grid">
          {/* Study Progress Card */}
          <div
            className="home-glance-item study-glow"
            onClick={() => onNavigateTab("study")}
            title="Click to open Focus Study Engine"
          >
            <div className="glance-item-top">
              <span className="glance-icon"><ClockIcon size={18} /></span>
              <span className="glance-label">Study Time</span>
              <span className="glance-val">{overview.study.formatted}</span>
            </div>
            <div className="glance-progress-track">
              <div
                className="glance-progress-fill study-fill"
                style={{ width: `${Math.min(100, overview.study.percentage)}%` }}
              ></div>
            </div>
            <div className="glance-item-bottom">
              <span className="glance-subtext">
                {overview.study.percentage}% of weekly target
              </span>
              <span className="glance-action-hint">Launch Timer &rarr;</span>
            </div>
          </div>

          {/* Tasks Progress Card */}
          <div
            className="home-glance-item tasks-glow"
            onClick={() => onNavigateTab("tasks")}
            title="Click to open Task Engine"
          >
            <div className="glance-item-top">
              <span className="glance-icon"><TasksIcon size={18} /></span>
              <span className="glance-label">Tasks Finished</span>
              <span className="glance-val">{overview.tasks.formatted}</span>
            </div>
            <div className="glance-progress-track">
              <div
                className="glance-progress-fill tasks-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (overview.tasks.completed / (overview.tasks.target || 1)) * 100
                    )
                  )}%`,
                }}
              ></div>
            </div>
            <div className="glance-item-bottom">
              <span className="glance-subtext">
                {overview.tasks.completionRate}% completion rate
              </span>
              <span className="glance-action-hint">View Tasks &rarr;</span>
            </div>
          </div>

          {/* Consistency Card */}
          <div
            className="home-glance-item consistency-glow"
            onClick={() => onNavigateTab("analytics")}
            title="Click to view Streak & Analytics"
          >
            <div className="glance-item-top">
              <span className="glance-icon"><StarIcon size={18} /></span>
              <span className="glance-label">Consistency</span>
              <span className="glance-val">{overview.consistency.streakLabel || `${overview.consistency.currentStreak || 0} days`}</span>
            </div>
            <div className="glance-progress-track">
              <div
                className="glance-progress-fill consistency-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((overview.consistency.activeDaysThisWeek || 0) / 7) * 100
                    )
                  )}%`,
                }}
              ></div>
            </div>
            <div className="glance-item-bottom">
              <span className="glance-subtext">
                {overview.consistency.activeDaysThisWeek} of 7 days active
              </span>
              <span className="glance-action-hint">Streak Details &rarr;</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          GAMIFICATION & STREAK SPOTLIGHT
         ============================================================ */}
      <section className="home-streak-spotlight-card card animate-slide-up">
        <div className="home-card-header">
          <div className="home-card-title-group">
            <span className="section-kicker">Streaks & Rewards</span>
            <h3 className="home-card-title">Daily & Weekly Streak System</h3>
          </div>
          <div className="home-streak-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm btn-share-streak-home"
              onClick={() => setShowStreakModal(true)}
            >
              <TrophyIcon size={14} /> Generate Shareable Streak Card
            </button>
            <button
              type="button"
              className="btn-text-link"
              onClick={() => onNavigateTab("gamification")}
            >
              All Badges & Streaks &rarr;
            </button>
          </div>
        </div>

        <div className="home-streak-spotlight-grid">
          {/* Daily Streak Highlight */}
          <div
            className="home-streak-highlight-tile daily-glow"
            onClick={() => onNavigateTab("gamification")}
            title="Click to view daily streak details & badges"
          >
            <div className="streak-highlight-header">
              <span className="streak-bubble-icon flame"><StarIcon size={20} filled={true} /></span>
              <div className="streak-highlight-text-col">
                <span className="streak-highlight-kicker">DAILY STUDY TARGET</span>
                <strong className="streak-highlight-val">
                  {streakData?.dailyStreak?.label || "12 Day Streak"}
                </strong>
              </div>
              <span
                className={`streak-pill-tag ${
                  streakData?.dailyStreak?.isTargetMetToday ? "met" : "pending"
                }`}
              >
                {streakData?.dailyStreak?.isTargetMetToday
                  ? "Target Met Today"
                  : "Target In Progress"}
              </span>
            </div>

            <div className="streak-highlight-meter">
              <div className="meter-label-row">
                <span>
                  Today: {streakData?.dailyStreak?.todayMinutes || 0} /{" "}
                  {streakData?.dailyStreak?.targetMinutes || 45} mins
                </span>
                <strong>{streakData?.dailyStreak?.todayPercentage || 0}%</strong>
              </div>
              <div className="streak-mini-progress-track">
                <div
                  className="streak-mini-progress-fill flame"
                  style={{
                    width: `${Math.min(
                      100,
                      streakData?.dailyStreak?.todayPercentage || 0
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Weekly Streak Highlight */}
          <div
            className="home-streak-highlight-tile weekly-glow"
            onClick={() => onNavigateTab("gamification")}
            title="Click to view weekly streak details & badges"
          >
            <div className="streak-highlight-header">
              <span className="streak-bubble-icon trophy"><TrophyIcon size={20} /></span>
              <div className="streak-highlight-text-col">
                <span className="streak-highlight-kicker">WEEKLY GOAL TARGET</span>
                <strong className="streak-highlight-val">
                  {streakData?.weeklyStreak?.label || "4 Week Goal Streak"}
                </strong>
              </div>
              <span
                className={`streak-pill-tag ${
                  streakData?.weeklyStreak?.isTargetMetThisWeek ? "met" : "pending"
                }`}
              >
                {streakData?.weeklyStreak?.isTargetMetThisWeek
                  ? "Goal Met"
                  : "Week In Progress"}
              </span>
            </div>

            <div className="streak-highlight-meter">
              <div className="meter-label-row">
                <span>
                  This Week: {streakData?.weeklyStreak?.thisWeekHours || 0} /{" "}
                  {streakData?.weeklyStreak?.targetHours || 15} hrs
                </span>
                <strong>{streakData?.weeklyStreak?.thisWeekPercentage || 0}%</strong>
              </div>
              <div className="streak-mini-progress-track">
                <div
                  className="streak-mini-progress-fill trophy"
                  style={{
                    width: `${Math.min(
                      100,
                      streakData?.weeklyStreak?.thisWeekPercentage || 0
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          3. MAIN TWO-COLUMN COMMAND CENTER GRID
         ============================================================ */}
      <div className="home-main-two-col-grid">
        {/* ================= LEFT COLUMN ================= */}
        <div className="home-col">
          {/* Priority Tasks & Focus Queue */}
          <div className="card home-feature-card">
            <div className="home-card-header">
              <div className="home-card-title-group">
                <span className="section-kicker">Task Velocity</span>
                <h3 className="home-card-title">🎯 Priority Focus & Deadlines</h3>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => onNavigateTab("tasks")}
              >
                All Tasks ({allTasks.length}) &rarr;
              </button>
            </div>

            {/* Quick Add Task Form */}
            <form onSubmit={handleQuickAddTask} className="home-quick-add-task-form">
              <input
                type="text"
                placeholder="⚡ Quick Add: e.g. Finish Calculus Homework Chapter 4..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="home-quick-input"
                required
              />
              <select
                value={quickTaskPriority}
                onChange={(e) => setQuickTaskPriority(e.target.value)}
                className="home-quick-select"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {subjects.length > 0 && (
                <select
                  value={quickTaskSubject}
                  onChange={(e) => setQuickTaskSubject(e.target.value)}
                  className="home-quick-select"
                >
                  <option value="">No Subject</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={addingTask || !quickTaskTitle.trim()}
              >
                <PlusIcon size={14} /> {addingTask ? "Adding..." : "Add"}
              </button>
            </form>

            {/* Tasks List */}
            <div className="home-tasks-list">
              {pendingTasksList.length === 0 ? (
                <div className="empty-home-state">
                  <span className="empty-icon"><CheckIcon size={24} /></span>
                  <p>All caught up! No pending tasks in your focus queue.</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigateTab("tasks")}
                  >
                    Create New Task
                  </button>
                </div>
              ) : (
                pendingTasksList.map((task) => (
                  <div key={task._id} className="home-task-item">
                    <input
                      type="checkbox"
                      checked={task.status === "completed"}
                      onChange={() => handleToggleTaskStatus(task)}
                      className="home-task-checkbox"
                      title="Mark task completed"
                    />

                    <div className="home-task-details">
                      <div className="home-task-title-line">
                        <strong className="home-task-title">{task.title}</strong>
                        <span
                          className={`task-priority-badge ${getPriorityBadgeClass(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <div className="home-task-sub-line">
                        {task.subject ? (
                          <span
                            className="home-subject-badge"
                            style={{
                              borderColor: task.subject.color || "#0F172A",
                              color: task.subject.color || "#0F172A",
                            }}
                          >
                            {task.subject.name}
                          </span>
                        ) : (
                          <span className="home-general-badge">General</span>
                        )}

                        {task.deadline && (
                          <span className="home-deadline-tag">
                            <CalendarIcon size={12} /> Due:{" "}
                            {new Date(task.deadline).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        <span className="home-est-time">
                          <ClockIcon size={12} /> ~{task.estimatedDuration || 30}m
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Academic Workspace Snapshot */}
          <div className="card home-feature-card">
            <div className="home-card-header">
              <div className="home-card-title-group">
                <span className="section-kicker">Knowledge Base</span>
                <h3 className="home-card-title">Academic Workspace & Subjects</h3>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => onNavigateTab("workspace")}
              >
                Open Workspace &rarr;
              </button>
            </div>

            <div className="home-subjects-grid">
              {subjects.length === 0 ? (
                <div className="empty-home-state">
                  <span className="empty-icon"><BookOpenIcon size={24} /></span>
                  <p>No subjects added yet. Create subjects to organize your study notes!</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigateTab("workspace")}
                  >
                    + Add Subject
                  </button>
                </div>
              ) : (
                subjects.map((sub) => (
                  <div
                    key={sub._id}
                    className="home-subject-card"
                    style={{ borderLeftColor: sub.color || "#0F172A" }}
                    onClick={() => onNavigateTab("workspace")}
                    title={`Open ${sub.name} in Workspace`}
                  >
                    <div className="home-subject-card-top">
                      <strong className="home-subject-name">{sub.name}</strong>
                      {sub.code && (
                        <span className="home-subject-code">{sub.code}</span>
                      )}
                    </div>
                    <p className="home-subject-desc">
                      {sub.description || "Organized notes & study materials"}
                    </p>
                    <div className="home-subject-footer">
                      <span className="home-subject-tag-pill">
                        <PinIcon size={12} /> {sub.resourcesCount || 0} materials
                      </span>
                      <span className="home-subject-action">View &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="home-col">
          {/* Quick Focus Study Station */}
          <div className="card home-feature-card focus-station-card">
            <div className="home-card-header">
              <div className="home-card-title-group">
                <span className="section-kicker">Deep Focus Station</span>
                <h3 className="home-card-title">Quick Study Launchpad</h3>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => onNavigateTab("study")}
              >
                Full Study Engine &rarr;
              </button>
            </div>

            {/* Quick Timer Presets */}
            <div className="home-timer-presets">
              <button
                type="button"
                className={`home-preset-chip ${timerMinutes === 25 ? "active" : ""}`}
                onClick={() => handleSetPreset(25)}
              >
                25m Pomodoro
              </button>
              <button
                type="button"
                className={`home-preset-chip ${timerMinutes === 50 ? "active" : ""}`}
                onClick={() => handleSetPreset(50)}
              >
                50m Deep Work
              </button>
              <button
                type="button"
                className={`home-preset-chip ${timerMinutes === 15 ? "active" : ""}`}
                onClick={() => handleSetPreset(15)}
              >
                15m Sprint
              </button>
            </div>

            {/* Subject Selector for Session */}
            <div className="home-timer-subject-picker">
              <label>Link Session to Subject:</label>
              <select
                value={focusSubject}
                onChange={(e) => setFocusSubject(e.target.value)}
                className="home-timer-select"
              >
                <option value="">General Focus (No Subject)</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Clock Visualization */}
            <div className="home-clock-wrapper">
              <div className="home-clock-digits">{formatTimer(secondsLeft)}</div>
              <div className="home-clock-status">
                {isTimerActive
                  ? isTimerPaused
                    ? "Paused"
                    : "Deep Work in Progress..."
                  : "Ready for your next focus session"}
              </div>
            </div>

            {/* Timer Action Buttons */}
            <div className="home-timer-actions">
              {!isTimerActive ? (
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={handleStartTimer}
                >
                  <PlayIcon size={16} /> Start {timerMinutes}m Focus
                </button>
              ) : isTimerPaused ? (
                <div className="home-timer-btn-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleResumeTimer}
                  >
                    <PlayIcon size={16} /> Resume
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleManualFinish}
                    disabled={savingSession}
                  >
                    <CheckIcon size={16} /> {savingSession ? "Saving..." : "Finish & Log"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResetTimer}
                  >
                    <RotateCcwIcon size={16} /> Reset
                  </button>
                </div>
              ) : (
                <div className="home-timer-btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePauseTimer}
                  >
                    <PauseIcon size={16} /> Pause
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleManualFinish}
                    disabled={savingSession}
                  >
                    <CheckIcon size={16} /> {savingSession ? "Saving..." : "Finish & Log"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleResetTimer}
                  >
                    <RotateCcwIcon size={16} /> Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Study Materials & PDFs */}
          <div className="card home-feature-card">
            <div className="home-card-header">
              <div className="home-card-title-group">
                <span className="section-kicker">Multi-Format Assets</span>
                <h3 className="home-card-title">Recent Study Materials</h3>
              </div>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => onNavigateTab("workspace")}
              >
                All Resources &rarr;
              </button>
            </div>

            <div className="home-resources-list">
              {recentResources.length === 0 ? (
                <div className="empty-home-state">
                  <span className="empty-icon"><FileTextIcon size={24} /></span>
                  <p>No study materials uploaded yet. Upload PDFs, docs, or web links!</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigateTab("workspace")}
                  >
                    Upload Material
                  </button>
                </div>
              ) : (
                recentResources.map((res) => {
                  return (
                    <div key={res._id} className="home-resource-item">
                      <span className="resource-item-icon"><FileTextIcon size={18} /></span>
                      <div className="resource-item-info">
                        <strong className="resource-item-title">{res.title}</strong>
                        <span className="resource-item-sub">
                          {res.subject?.name || "General"} &bull; {res.type?.toUpperCase()}
                        </span>
                      </div>
                      {res.fileUrl && (
                        <a
                          href={res.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm home-resource-open"
                        >
                          Open ↗
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shareable Streak Card Modal on Home */}
      <ShareableStreakCardModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakData={streakData}
        currentUser={currentUser}
        onFeedback={onFeedback}
      />
    </div>
  );
}
