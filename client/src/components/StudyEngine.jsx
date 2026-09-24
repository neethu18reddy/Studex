import { useState, useEffect, useCallback, useRef } from "react";

export default function StudyEngine({ token, apiBase, onError, onFeedback }) {
  // Timer State
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
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

  // Timer Tick Effect
  useEffect(() => {
    if (isActive && !isPaused) {
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
  }, [isActive, isPaused]);

  // Start Timer
  const handleStartTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    if (!startTime) {
      setStartTime(new Date());
    }
    onFeedback?.("Focus session started! Eliminate distractions. 🧠");
  };

  // Pause Timer
  const handlePauseTimer = () => {
    setIsPaused(true);
  };

  // Resume Timer
  const handleResumeTimer = () => {
    setIsPaused(false);
  };

  // Reset Timer
  const handleResetTimer = () => {
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
    setIsActive(false);
    setIsPaused(false);
    setTimerMinutes(mins);
    setSecondsLeft(mins * 60);
    setStartTime(null);
    setCustomMinutesInput(mins);
    onFeedback?.(`Timer set to ${mins} minutes`);
  };

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

  // Auto-finish on 0:00
  const handleAutoFinishSession = () => {
    handleSaveSession(timerMinutes);
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

      {/* Analytics KPI Row */}
      <div className="study-kpi-grid">
        <div className="kpi-card focus-kpi">
          <span className="kpi-icon">⚡</span>
          <div>
            <div className="kpi-value">{stats ? `${stats.todayFocusMinutes}m` : "0m"}</div>
            <div className="kpi-label">Today's Focus Time</div>
          </div>
        </div>

        <div className="kpi-card focus-kpi">
          <span className="kpi-icon">📅</span>
          <div>
            <div className="kpi-value">{stats ? `${stats.weekFocusMinutes}m` : "0m"}</div>
            <div className="kpi-label">Past 7 Days Focus</div>
          </div>
        </div>

        <div className="kpi-card focus-kpi">
          <span className="kpi-icon">🏆</span>
          <div>
            <div className="kpi-value">{stats ? `${stats.totalFocusHours} hrs` : "0 hrs"}</div>
            <div className="kpi-label">Total Focus ({stats?.totalSessions || 0} Sessions)</div>
          </div>
        </div>

        <div className="kpi-card focus-kpi">
          <span className="kpi-icon">🎯</span>
          <div>
            <div className="kpi-value">{stats?.totalTasksCompletedInFocus || 0}</div>
            <div className="kpi-label">Tasks Finished in Focus</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Timer, Right = Subject Analytics & Recent Logs */}
      <div className="study-main-grid">
        {/* Left: Focus Timer Widget */}
        <div className="card focus-timer-card">
          <h3 className="timer-card-title">Deep Focus Session</h3>

          {/* Preset Buttons */}
          <div className="timer-presets-row">
            <button
              className={`preset-btn ${timerMinutes === 25 && !showCustomInput ? "active" : ""}`}
              onClick={() => handleSetPreset(25)}
            >
              🍅 25m Pomodoro
            </button>
            <button
              className={`preset-btn ${timerMinutes === 50 && !showCustomInput ? "active" : ""}`}
              onClick={() => handleSetPreset(50)}
            >
              🧠 50m Deep Work
            </button>
            <button
              className={`preset-btn ${timerMinutes === 60 && !showCustomInput ? "active" : ""}`}
              onClick={() => handleSetPreset(60)}
            >
              ⚡ 60m Power Hour
            </button>
            <button
              className={`preset-btn ${showCustomInput || ![25, 50, 60].includes(timerMinutes) ? "active" : ""}`}
              onClick={() => setShowCustomInput(!showCustomInput)}
            >
              ⚙️ Custom ({timerMinutes}m)
            </button>
          </div>

          {/* Custom Duration Configurator */}
          {showCustomInput && (
            <div style={{ padding: "0.75rem", background: "rgba(170, 59, 255, 0.08)", borderRadius: "10px", border: "1px solid rgba(170, 59, 255, 0.2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f3f4f6" }}>Custom Focus Duration:</span>
                <span style={{ fontSize: "0.85rem", color: "#aa3bff", fontWeight: 700 }}>{customMinutesInput} minutes</span>
              </div>

              {/* Quick Preset Chips */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[15, 30, 45, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.75rem",
                      background: customMinutesInput === mins ? "#aa3bff" : "rgba(255,255,255,0.06)",
                      color: customMinutesInput === mins ? "#fff" : "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
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
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                <button
                  type="button"
                  style={{ padding: "4px 8px", background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer" }}
                  onClick={() => setCustomMinutesInput((prev) => Math.max(1, prev - 5))}
                >
                  -5m
                </button>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(Number(e.target.value))}
                  style={{ width: "70px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-h)", textAlign: "center" }}
                />
                <button
                  type="button"
                  style={{ padding: "4px 8px", background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer" }}
                  onClick={() => setCustomMinutesInput((prev) => Math.min(360, prev + 5))}
                >
                  +5m
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => handleApplyCustomDuration(customMinutesInput)}
                >
                  Apply {customMinutesInput}m
                </button>
              </div>
            </div>
          )}

          {/* Timer Visual Display */}
          <div className="timer-clock-display">
            <div className="timer-circle-wrap">
              <div
                className="timer-progress-fill"
                style={{ width: `${totalProgress}%` }}
              ></div>
            </div>
            <div className="timer-digits">{formatTime(secondsLeft)}</div>
            <div className="timer-status-caption">
              {isActive
                ? isPaused
                  ? "⏸️ Paused"
                  : "🔥 Focus in Progress..."
                : "Ready to focus"}
            </div>
          </div>

          {/* Action Controls */}
          <div className="timer-actions-row">
            {!isActive ? (
              <button
                className="btn btn-primary btn-lg btn-start-timer"
                onClick={handleStartTimer}
              >
                ▶️ Start Focus Session
              </button>
            ) : isPaused ? (
              <>
                <button className="btn btn-primary" onClick={handleResumeTimer}>
                  ▶️ Resume
                </button>
                <button
                  className="btn btn-secondary btn-finish-session"
                  onClick={handleManualFinish}
                  disabled={savingSession}
                >
                  {savingSession ? "Saving..." : "🏁 Finish & Log Session"}
                </button>
                <button className="btn btn-secondary" onClick={handleResetTimer}>
                  🔄 Reset
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={handlePauseTimer}>
                  ⏸️ Pause
                </button>
                <button
                  className="btn btn-primary btn-finish-session"
                  onClick={handleManualFinish}
                  disabled={savingSession}
                >
                  {savingSession ? "Saving..." : "🏁 Finish & Log Session"}
                </button>
                <button className="btn btn-secondary" onClick={handleResetTimer}>
                  🔄 Reset
                </button>
              </>
            )}
          </div>

          {/* Session Linking Controls */}
          <div className="timer-session-options">
            <div className="form-group">
              <label>📚 Focus Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">General Study (No specific subject)</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name} {sub.code ? `(${sub.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {tasks.length > 0 && (
              <div className="form-group">
                <label>🎯 Mark Tasks Completed in this Session</label>
                <div className="tasks-checkbox-list">
                  {tasks.slice(0, 5).map((t) => (
                    <label key={t._id} className="task-mini-checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedTasks.includes(t._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTasks([...selectedTasks, t._id]);
                          } else {
                            setSelectedTasks(
                              selectedTasks.filter((id) => id !== t._id)
                            );
                          }
                        }}
                      />
                      <span>{t.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>📝 Session Reflection / Notes</label>
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
            <h3>📊 Focus Time by Subject</h3>
            {loadingStats ? (
              <p>Loading analytics...</p>
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
                        <strong style={{ color: sb.color || "#aa3bff" }}>
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
                            backgroundColor: sb.color || "#aa3bff",
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
            <h3>📜 Recent Study Log</h3>
            {loadingStats ? (
              <p>Loading history...</p>
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
                          ⚡ {s.duration} mins
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
                        className="session-delete-btn"
                        title="Delete session"
                        onClick={() => handleDeleteSession(s._id)}
                      >
                        🗑️
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
