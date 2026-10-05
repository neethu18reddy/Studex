import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClockIcon,
  CalendarIcon,
  TrophyIcon,
  TasksIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  TrashIcon,
  CheckIcon,
  BookOpenIcon,
  FileTextIcon,
} from "./Icons";
import {
  playTimerCompletionChime,
  sendFocusNotification,
  requestNotificationPermission,
} from "../services/sound";

export default function StudyEngine({
  token,
  apiBase,
  onError,
  onFeedback,
  triggerCustom = 0,
}) {
  // Timer State
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (triggerCustom > 0) {
      setShowCustomInput(true);
    }
  }, [triggerCustom]);
  const [customMinutesInput, setCustomMinutesInput] = useState(45);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [sessionNotes, setSessionNotes] = useState("");
  const [startTime, setStartTime] = useState(null);

  // Data State
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [savingSession, setSavingSession] = useState(false);

  const timerRef = useRef(null);
  const targetEndTimeRef = useRef(null);

  // Fetch Stats & History
  const fetchStatsAndHistory = useCallback(async () => {
    setLoadingStats(true);
    try {
      // 1. Stats
      const statsRes = await fetch(`${apiBase}/api/study-sessions/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.success) {
        setStats(statsData.data);
      }

      // 2. History
      const histRes = await fetch(`${apiBase}/api/study-sessions?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const histData = await histRes.json();
      if (histRes.ok && histData.success) {
        setSessionHistory(histData.data || []);
      }
    } catch (err) {
      console.error("Failed to load study stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [apiBase, token]);

  // Fetch Subjects & Tasks for session linkage
  const fetchSubjectsAndTasks = useCallback(async () => {
    try {
      const [subjRes, taskRes] = await Promise.all([
        fetch(`${apiBase}/api/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/tasks?status=todo`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const subjData = await subjRes.json();
      const taskData = await taskRes.json();

      if (subjRes.ok && subjData.success) {
        setSubjects(subjData.data || []);
      }
      if (taskRes.ok && taskData.success) {
        setTasks(taskData.data || []);
      }
    } catch (err) {
      console.error("Failed to load subjects or tasks:", err);
    }
  }, [apiBase, token]);

  useEffect(() => {
    fetchStatsAndHistory();
    fetchSubjectsAndTasks();
  }, [fetchStatsAndHistory, fetchSubjectsAndTasks]);

  // Update browser tab title with active countdown
  useEffect(() => {
    if (isActive && !isPaused) {
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      const fmt = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      document.title = `(${fmt}) Focus - Studex`;
    } else {
      document.title = "Studex - Ultimate Student Workspace";
    }

    return () => {
      document.title = "Studex - Ultimate Student Workspace";
    };
  }, [isActive, isPaused, secondsLeft]);

  // Record Focus Session to Backend
  const handleSaveSession = async (actualDurationMinutes) => {
    setSavingSession(true);
    const end = new Date();
    const start = startTime || new Date(Date.now() - actualDurationMinutes * 60 * 1000);

    try {
      const res = await fetch(`${apiBase}/api/study-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectId: selectedSubject || undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration: Math.max(1, actualDurationMinutes),
          tasksCompleted: selectedTasks,
          notes: sessionNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to record study session");
      }

      onFeedback?.(`Awesome work! Recorded ${actualDurationMinutes} minutes of focus time. 🎉`);
      handleResetTimer();
      setSessionNotes("");
      setSelectedTasks([]);
      fetchStatsAndHistory();
      fetchSubjectsAndTasks();
    } catch (err) {
      onError?.(err.message || "Failed to log session");
    } finally {
      setSavingSession(false);
    }
  };

  // Timer Tick & Background Sync Effect (Timestamp-based so switching apps/tabs never lags)
  useEffect(() => {
    if (!isActive || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const syncTimer = () => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        targetEndTimeRef.current = null;
        setIsActive(false);
        setIsPaused(false);
        playTimerCompletionChime();
        sendFocusNotification("🎉 Focus Session Completed!", `Great job! You finished your ${timerMinutes} minute focus session.`);
        handleSaveSession(timerMinutes);
      }
    };

    // Fast interval check
    timerRef.current = setInterval(syncTimer, 500);

    // Sync immediately whenever the user switches back from other applications or tabs
    document.addEventListener("visibilitychange", syncTimer);
    window.addEventListener("focus", syncTimer);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", syncTimer);
      window.removeEventListener("focus", syncTimer);
    };
  }, [isActive, isPaused, timerMinutes]);

  // Start Timer
  const handleStartTimer = () => {
    requestNotificationPermission();
    const endTime = Date.now() + secondsLeft * 1000;
    targetEndTimeRef.current = endTime;
    setIsActive(true);
    setIsPaused(false);
    if (!startTime) {
      setStartTime(new Date());
    }
    onFeedback?.("Focus session started! Eliminate distractions. 🧠");
  };

  // Pause Timer
  const handlePauseTimer = () => {
    if (targetEndTimeRef.current) {
      const rem = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(rem);
    }
    targetEndTimeRef.current = null;
    setIsPaused(true);
  };

  // Resume Timer
  const handleResumeTimer = () => {
    const endTime = Date.now() + secondsLeft * 1000;
    targetEndTimeRef.current = endTime;
    setIsPaused(false);
  };

  // Reset Timer
  const handleResetTimer = () => {
    targetEndTimeRef.current = null;
    setIsActive(false);
    setIsPaused(false);
    setSecondsLeft(timerMinutes * 60);
    setStartTime(null);
  };

  // Set Timer Duration Preset
  const handleSetPreset = (mins) => {
    if (isActive && !window.confirm("Changing duration will reset the active session. Continue?")) {
      return;
    }
    targetEndTimeRef.current = null;
    setIsActive(false);
    setIsPaused(false);
    setTimerMinutes(mins);
    setSecondsLeft(mins * 60);
    setStartTime(null);
    setShowCustomInput(false);
  };

  // Set Custom Timer Duration
  const handleApplyCustomDuration = (customMins) => {
    const mins = Math.max(1, Math.min(360, parseInt(customMins, 10) || 25));
    if (isActive && !window.confirm("Changing duration will reset the active session. Continue?")) {
      return;
    }
    targetEndTimeRef.current = null;
    setIsActive(false);
    setIsPaused(false);
    setTimerMinutes(mins);
    setSecondsLeft(mins * 60);
    setStartTime(null);
    setCustomMinutesInput(mins);
    onFeedback?.(`Timer set to ${mins} minutes`);
  };

  // Manual Finish / Log Session
  const handleManualFinish = () => {
    const elapsedSeconds = timerMinutes * 60 - secondsLeft;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    handleSaveSession(elapsedMinutes);
  };

  // Delete Session Handler
  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Delete this focus session record?")) return;
    try {
      const res = await fetch(`${apiBase}/api/study-sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete session");
      }
      onFeedback?.("Session removed");
      fetchStatsAndHistory();
    } catch (err) {
      onError?.(err.message || "Could not delete session");
    }
  };

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const totalProgress = ((timerMinutes * 60 - secondsLeft) / (timerMinutes * 60)) * 100;

  return (
    <div className="study-engine-container">
      {/* Header */}
      <div className="section-header-row">
        <div>
          <h2 className="section-title">⏱️ Study Engine & Focus Analytics</h2>
          <p className="section-subtitle">
            Deep focus timer backed by real session data, subject breakdowns, and productivity metrics.
          </p>
        </div>
      </div>

      {/* Analytics KPI Row: 4 side-by-side cards */}
      <div className="study-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap">
            <ClockIcon size={20} />
          </div>
          <div className="kpi-info">
            <div className="kpi-value">{stats ? `${stats.todayFocusMinutes}m` : "0m"}</div>
            <div className="kpi-label">Today's Focus Time</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap pending">
            <CalendarIcon size={20} />
          </div>
          <div className="kpi-info">
            <div className="kpi-value">{stats ? `${stats.weekFocusMinutes}m` : "0m"}</div>
            <div className="kpi-label">Past 7 Days Focus</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap purple">
            <TrophyIcon size={20} />
          </div>
          <div className="kpi-info">
            <div className="kpi-value">{stats ? `${stats.totalFocusHours} hrs` : "0 hrs"}</div>
            <div className="kpi-label">Total Focus ({stats?.totalSessions || 0} Sessions)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap completed">
            <TasksIcon size={20} />
          </div>
          <div className="kpi-info">
            <div className="kpi-value">{stats?.totalTasksCompletedInFocus || 0}</div>
            <div className="kpi-label">Tasks Finished in Focus</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Timer, Right = Subject Analytics & Recent Logs */}
      <div className="study-main-grid">
        {/* Left: Focus Timer Widget */}
        <div className="card focus-timer-card">
          <div className="focus-card-header">
            <h3>Deep Focus Session</h3>
          </div>

          {/* Preset Buttons */}
          <div className="study-presets-row">
            <button
              type="button"
              className={`preset-pill-btn ${timerMinutes === 25 && !showCustomInput ? "active" : ""}`}
              onClick={() => handleSetPreset(25)}
            >
              25m Pomodoro
            </button>
            <button
              type="button"
              className={`preset-pill-btn ${timerMinutes === 50 && !showCustomInput ? "active" : ""}`}
              onClick={() => handleSetPreset(50)}
            >
              50m Deep Work
            </button>
            <button
              type="button"
              className={`preset-pill-btn ${timerMinutes === 60 && !showCustomInput ? "active" : ""}`}
              onClick={() => handleSetPreset(60)}
            >
              60m Power Hour
            </button>
            <button
              type="button"
              className={`preset-pill-btn ${showCustomInput || ![25, 50, 60].includes(timerMinutes) ? "active" : ""}`}
              onClick={() => setShowCustomInput(!showCustomInput)}
            >
              Custom ({timerMinutes}m)
            </button>
          </div>

          {/* Custom Duration Configurator */}
          {showCustomInput && (
            <div className="custom-duration-panel">
              <div className="custom-duration-header">
                <span className="custom-duration-title">Custom Duration</span>
                <span className="custom-duration-badge">{customMinutesInput} mins</span>
              </div>

              {/* Quick Preset Chips */}
              <div className="custom-chips-row">
                {[15, 30, 45, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`custom-chip-btn ${customMinutesInput === mins ? "active" : ""}`}
                    onClick={() => {
                      setCustomMinutesInput(mins);
                      handleApplyCustomDuration(mins);
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Stepper and Direct Input */}
              <div className="custom-stepper-row">
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => setCustomMinutesInput((prev) => Math.max(1, prev - 5))}
                  title="Subtract 5 minutes"
                >
                  -5m
                </button>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(Number(e.target.value))}
                  className="custom-minutes-input"
                />
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => setCustomMinutesInput((prev) => Math.min(360, prev + 5))}
                  title="Add 5 minutes"
                >
                  +5m
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleApplyCustomDuration(customMinutesInput)}
                >
                  Set {customMinutesInput}m
                </button>
              </div>
            </div>
          )}

          {/* Timer Visual Display */}
          <div className="home-clock-wrapper study-clock-wrapper">
            <div className="home-clock-digits">{formatTime(secondsLeft)}</div>
            <div className="home-clock-status">
              {isActive
                ? isPaused
                  ? "Paused"
                  : "Focus in Progress"
                : "Ready to Focus"}
            </div>
          </div>

          {/* Action Controls */}
          <div className="study-timer-actions">
            {!isActive ? (
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleStartTimer}
              >
                <PlayIcon size={18} /> Start Focus Session
              </button>
            ) : isPaused ? (
              <div className="timer-btn-row">
                <button className="btn btn-primary" onClick={handleResumeTimer}>
                  <PlayIcon size={16} /> Resume
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleManualFinish}
                  disabled={savingSession}
                >
                  <CheckIcon size={16} /> {savingSession ? "Saving..." : "Finish & Log"}
                </button>
                <button className="btn btn-secondary" onClick={handleResetTimer}>
                  <RotateCcwIcon size={16} /> Reset
                </button>
              </div>
            ) : (
              <div className="timer-btn-row">
                <button className="btn btn-secondary" onClick={handlePauseTimer}>
                  <PauseIcon size={16} /> Pause
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleManualFinish}
                  disabled={savingSession}
                >
                  <CheckIcon size={16} /> {savingSession ? "Saving..." : "Finish & Log"}
                </button>
                <button className="btn btn-secondary" onClick={handleResetTimer}>
                  <RotateCcwIcon size={16} /> Reset
                </button>
              </div>
            )}
          </div>

          {/* Session Linking Controls */}
          <div className="timer-session-options">
            <div className="form-group">
              <label>Focus Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">General Study (No specific subject)</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {tasks.length > 0 && (
              <div className="form-group">
                <label>Mark Tasks Completed in this Session</label>
                <div className="tasks-checkbox-list">
                  {tasks.slice(0, 5).map((t) => {
                    const isChecked = selectedTasks.includes(t._id);
                    return (
                      <div
                        key={t._id}
                        className={`task-mini-checkbox-item ${isChecked ? "active" : ""}`}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedTasks(selectedTasks.filter((id) => id !== t._id));
                          } else {
                            setSelectedTasks([...selectedTasks, t._id]);
                          }
                        }}
                      >
                        <div className={`task-checkbox-circle ${isChecked ? "checked" : ""}`}>
                          {isChecked && <CheckIcon size={11} />}
                        </div>
                        <span>{t.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Session Reflection / Notes</label>
              <input
                type="text"
                placeholder="e.g. Solved 10 calculus integrals, reviewed lecture slides"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right: Analytics & History */}
        <div className="study-analytics-side">
          {/* Subject Distribution */}
          <div className="card subject-analytics-card">
            <h3>Focus Time by Subject</h3>
            {loadingStats ? (
              <div className="loading-box">Loading analytics...</div>
            ) : !stats || stats.subjectBreakdown.length === 0 ? (
              <p className="empty-hint">
                No study sessions recorded yet. Start the timer to see your subject distribution!
              </p>
            ) : (
              <div className="subject-breakdown-list">
                {stats.subjectBreakdown.map((sb, idx) => {
                  const maxMins = stats.totalFocusMinutes || 1;
                  const pct = Math.round((sb.totalMinutes / maxMins) * 100);
                  return (
                    <div key={idx} className="subject-progress-row">
                      <div className="subject-progress-header">
                        <strong style={{ color: sb.color || "inherit" }}>
                          {sb.subjectName}
                        </strong>
                        <span>
                          {sb.totalMinutes} mins ({sb.sessionCount} sessions)
                        </span>
                      </div>
                      <div className="subject-bar-track">
                        <div
                          className="subject-bar-fill"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: sb.color || "#3B82F6",
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Focus Session Logs */}
          <div className="card session-history-card">
            <h3>Recent Study Log</h3>
            {loadingStats ? (
              <div className="loading-box">Loading history...</div>
            ) : sessionHistory.length === 0 ? (
              <p className="empty-hint">No sessions logged yet.</p>
            ) : (
              <div className="session-history-list">
                {sessionHistory.map((s) => {
                  const dateStr = new Date(s.startTime).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                  );
                  return (
                    <div key={s._id} className="session-log-item">
                      <div className="session-log-left">
                        <span className="session-log-duration">
                          {s.duration} mins
                        </span>
                        <div className="session-log-details">
                          <strong>
                            {s.subjectId ? s.subjectId.name : "General Study"}
                          </strong>
                          <span className="session-log-time">{dateStr}</span>
                          {s.notes && (
                            <p className="session-log-notes">"{s.notes}"</p>
                          )}
                        </div>
                      </div>

                      <button
                        className="event-delete-btn"
                        title="Delete session"
                        onClick={() => handleDeleteSession(s._id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
