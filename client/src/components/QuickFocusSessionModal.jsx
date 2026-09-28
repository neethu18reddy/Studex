import React, { useState, useEffect, useRef } from "react";
import {
  ClockIcon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  CheckIcon,
  XIcon,
  BookOpenIcon,
} from "./Icons";

export default function QuickFocusSessionModal({
  isOpen,
  onClose,
  token,
  apiBase,
  onError,
  onFeedback,
  onSessionLogged,
}) {
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  // Timer State
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [savingSession, setSavingSession] = useState(false);

  const timerRef = useRef(null);

  // Fetch subjects for dropdown selector
  useEffect(() => {
    if (!token || !isOpen) return;
    setLoadingSubjects(true);
    fetch(`${apiBase}/api/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSubjects(data.data);
        }
      })
      .catch((err) => console.error("Error loading subjects:", err))
      .finally(() => setLoadingSubjects(false));
  }, [token, isOpen, apiBase]);

  // Handle auto finishing when countdown hits 0
  const handleAutoFinish = async () => {
    setIsActive(false);
    setIsPaused(false);
    onFeedback?.("Focus session completed! Great job.");
    await handleSaveSession(timerMinutes);
  };

  // Timer interval tick
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoFinish();
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

  if (!isOpen) return null;

  // Preset Selection
  const handleSelectPreset = (mins) => {
    if (isActive && !window.confirm("Changing duration will reset the active session. Continue?")) {
      return;
    }
    setIsActive(false);
    setIsPaused(false);
    setIsCustomMode(false);
    setTimerMinutes(mins);
    setSecondsLeft(mins * 60);
    setStartTime(null);
  };

  // Custom Duration Application
  const handleApplyCustom = (mins) => {
    const val = Number(mins);
    if (isNaN(val) || val < 1 || val > 360) {
      onError?.("Please enter a duration between 1 and 360 minutes");
      return;
    }
    setIsActive(false);
    setIsPaused(false);
    setIsCustomMode(true);
    setTimerMinutes(val);
    setSecondsLeft(val * 60);
    setStartTime(null);
  };

  // Start Timer
  const handleStartTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    if (!startTime) {
      setStartTime(new Date());
    }
    onFeedback?.("Focus session started!");
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

  // Save Session to MongoDB
  const handleSaveSession = async (durationMins) => {
    setSavingSession(true);
    try {
      const payload = {
        subjectId: selectedSubject || undefined,
        duration: durationMins,
        startTime: startTime ? startTime.toISOString() : new Date().toISOString(),
        endTime: new Date().toISOString(),
        notes: sessionNotes.trim() || undefined,
      };

      const res = await fetch(`${apiBase}/api/study-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to log study session");
      }

      onFeedback?.(`Logged ${durationMins}m focus session! Streak updated.`);
      setSessionNotes("");
      handleResetTimer();
      onSessionLogged?.();
      onClose();
    } catch (err) {
      onError?.(err.message || "Could not log focus session");
    } finally {
      setSavingSession(false);
    }
  };

  // Manual Finish
  const handleManualFinish = () => {
    const elapsedSeconds = timerMinutes * 60 - secondsLeft;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    handleSaveSession(elapsedMinutes);
  };

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card quick-focus-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px" }}
      >
        <div className="modal-header">
          <div className="modal-header-title-group">
            <h3>Focus Study Session</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Close"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="quick-focus-modal-content">
          {/* 1. Duration Customisation Presets */}
          <div className="form-group">
            <label>Duration Customisation</label>
            <div className="study-presets-row">
              <button
                type="button"
                className={`preset-pill-btn ${timerMinutes === 25 && !isCustomMode ? "active" : ""}`}
                onClick={() => handleSelectPreset(25)}
              >
                25m Pomodoro
              </button>
              <button
                type="button"
                className={`preset-pill-btn ${timerMinutes === 50 && !isCustomMode ? "active" : ""}`}
                onClick={() => handleSelectPreset(50)}
              >
                50m Deep Work
              </button>
              <button
                type="button"
                className={`preset-pill-btn ${timerMinutes === 60 && !isCustomMode ? "active" : ""}`}
                onClick={() => handleSelectPreset(60)}
              >
                60m Power Hour
              </button>
              <button
                type="button"
                className={`preset-pill-btn ${isCustomMode ? "active" : ""}`}
                onClick={() => {
                  setIsCustomMode(true);
                  handleApplyCustom(customMinutes);
                }}
              >
                Custom ({isCustomMode ? timerMinutes : customMinutes}m)
              </button>
            </div>
          </div>

          {/* Custom Duration Configurator */}
          {isCustomMode && (
            <div className="custom-duration-panel">
              <div className="custom-duration-header">
                <span className="custom-duration-title">Custom Duration</span>
                <span className="custom-duration-badge">{customMinutes} mins</span>
              </div>

              {/* Quick Chips */}
              <div className="custom-chips-row">
                {[15, 30, 45, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`custom-chip-btn ${customMinutes === mins ? "active" : ""}`}
                    onClick={() => {
                      setCustomMinutes(mins);
                      handleApplyCustom(mins);
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Stepper and Input */}
              <div className="custom-stepper-row">
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => {
                    const next = Math.max(1, customMinutes - 5);
                    setCustomMinutes(next);
                    handleApplyCustom(next);
                  }}
                  title="Subtract 5 minutes"
                >
                  -5m
                </button>
                <input
                  type="number"
                  min="1"
                  max="360"
                  value={customMinutes}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCustomMinutes(val);
                    if (val >= 1 && val <= 360) {
                      handleApplyCustom(val);
                    }
                  }}
                  className="custom-minutes-input"
                />
                <button
                  type="button"
                  className="btn-stepper"
                  onClick={() => {
                    const next = Math.min(360, customMinutes + 5);
                    setCustomMinutes(next);
                    handleApplyCustom(next);
                  }}
                  title="Add 5 minutes"
                >
                  +5m
                </button>
              </div>
            </div>
          )}

          {/* 2. Subject Option */}
          <div className="form-group">
            <label>Subject Option</label>
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

          {/* 3. Focus Reflection / Notes */}
          <div className="form-group">
            <label>Focus Goal / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Solve 5 problems, read chapter 2"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
            />
          </div>

          {/* 4. Timer Clock Display */}
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

          {/* 5. Start & Control Actions */}
          <div className="study-timer-actions">
            {!isActive ? (
              <button
                type="button"
                className="btn btn-primary btn-lg btn-full"
                onClick={handleStartTimer}
              >
                <PlayIcon size={18} /> Start Focus Session
              </button>
            ) : isPaused ? (
              <div className="timer-btn-row">
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
              <div className="timer-btn-row">
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
      </div>
    </div>
  );
}
