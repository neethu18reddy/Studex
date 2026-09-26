import { useState, useEffect, useCallback } from "react";
import ShareableStreakCardModal from "./ShareableStreakCardModal";

export default function GamificationEngine({
  token,
  apiBase,
  currentUser,
  onError,
  onFeedback,
}) {
  const [loading, setLoading] = useState(true);
  const [streakData, setStreakData] = useState(null);
  const [activeBadgeCategory, setActiveBadgeCategory] = useState("all");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);

  const [targetsForm, setTargetsForm] = useState({
    dailyStudyGoalMinutes: 45,
    weeklyStudyGoalHours: 15,
  });

  // Fetch Streak & Gamification Data
  const fetchStreakData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/streaks/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load gamification data");
      }
      setStreakData(data.data);
      setTargetsForm({
        dailyStudyGoalMinutes: data.data.dailyStreak.targetMinutes || 45,
        weeklyStudyGoalHours: data.data.weeklyStreak.targetHours || 15,
      });
    } catch (err) {
      console.error("Streak load error:", err);
      onError?.(err.message || "Could not load streak data");
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, onError]);

  useEffect(() => {
    fetchStreakData();
  }, [fetchStreakData]);

  // Update Daily & Weekly Streak Goals
  const handleUpdateTargets = async (e) => {
    e.preventDefault();
    setSavingTargets(true);
    try {
      const res = await fetch(`${apiBase}/api/streaks/targets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(targetsForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update targets");
      }
      onFeedback?.("Daily and weekly streak goals saved! 🎯");
      setShowTargetModal(false);
      fetchStreakData();
    } catch (err) {
      onError?.(err.message || "Could not update streak goals");
    } finally {
      setSavingTargets(false);
    }
  };

  if (loading) {
    return (
      <div className="gamification-loading-pane">
        <div className="spinner"></div>
        <p>Loading your Gamification & Streak Dashboard...</p>
      </div>
    );
  }

  const daily = streakData?.dailyStreak || {
    count: 0,
    label: "🔥 0 Day Streak",
    targetMinutes: 45,
    todayMinutes: 0,
    todayPercentage: 0,
    isTargetMetToday: false,
    longest: 0,
  };

  const weekly = streakData?.weeklyStreak || {
    count: 0,
    label: "🏆 0 Week Goal Streak",
    targetHours: 15,
    thisWeekHours: 0,
    thisWeekPercentage: 0,
    isTargetMetThisWeek: false,
  };

  const gamification = streakData?.gamification || {
    level: 1,
    rankTitle: "Novice Scholar",
    totalXP: 0,
    levelProgress: 0,
    badges: [],
    unlockedBadgesCount: 0,
    totalBadgesCount: 0,
  };

  const filteredBadges = gamification.badges.filter((b) => {
    if (activeBadgeCategory === "all") return true;
    return b.category === activeBadgeCategory;
  });

  return (
    <div className="gamification-engine-container animate-fade-in">
      {/* Header */}
      <div className="gamification-header-row">
        <div>
          <h2 className="gamification-main-title">🏆 Gamification & Streak Engine</h2>
          <p className="gamification-subtitle">
            Build unstoppable momentum with daily target streaks, weekly goal mastery, unlockable achievement badges, and shareable streak cards.
          </p>
        </div>

        <div className="gamification-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowTargetModal(true)}
          >
            🎯 Adjust Streak Goals
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-generate-card"
            onClick={() => setShowShareModal(true)}
          >
            ✨ Shareable Streak Card
          </button>
        </div>
      </div>

      {/* ============================================================
          1. HERO STREAK SHOWCASE ARENA
         ============================================================ */}
      <div className="streak-hero-showcase-grid">
        {/* Daily Streak Card */}
        <div className="card streak-hero-card daily-streak-card">
          <div className="streak-card-top">
            <div className="streak-icon-wrap flame-wrap">🔥</div>
            <div className="streak-info-col">
              <span className="streak-kicker">DAILY TARGET STREAK</span>
              <h3 className="streak-title-val">{daily.label}</h3>
            </div>
            <span className="streak-badge-longest">Best: {daily.longest}d</span>
          </div>

          <div className="streak-target-meter-wrap">
            <div className="meter-label-row">
              <span>Today's Target Progress:</span>
              <strong>
                {daily.todayMinutes} / {daily.targetMinutes} mins{" "}
                {daily.isTargetMetToday ? "✅ (Target Met!)" : `(${daily.todayPercentage}%)`}
              </strong>
            </div>
            <div className="streak-progress-track">
              <div
                className="streak-progress-fill flame-fill"
                style={{ width: `${Math.min(100, daily.todayPercentage)}%` }}
              ></div>
            </div>
          </div>

          <div className="streak-card-footer">
            <span className="streak-footer-desc">
              Complete {daily.targetMinutes}m of deep study today to advance your streak!
            </span>
            <span className="streak-status-tag">
              {daily.isTargetMetToday ? "🔥 Streak Active Today" : "⏳ Study Target Pending"}
            </span>
          </div>
        </div>

        {/* Weekly Streak Card */}
        <div className="card streak-hero-card weekly-streak-card">
          <div className="streak-card-top">
            <div className="streak-icon-wrap trophy-wrap">🏆</div>
            <div className="streak-info-col">
              <span className="streak-kicker">WEEKLY GOAL STREAK</span>
              <h3 className="streak-title-val">{weekly.label}</h3>
            </div>
            <span className="streak-badge-longest">Goal: {weekly.targetHours}h/wk</span>
          </div>

          <div className="streak-target-meter-wrap">
            <div className="meter-label-row">
              <span>Current Week Progress:</span>
              <strong>
                {weekly.thisWeekHours} / {weekly.targetHours} hrs{" "}
                {weekly.isTargetMetThisWeek ? "✅ (Goal Met!)" : `(${weekly.thisWeekPercentage}%)`}
              </strong>
            </div>
            <div className="streak-progress-track">
              <div
                className="streak-progress-fill trophy-fill"
                style={{ width: `${Math.min(100, weekly.thisWeekPercentage)}%` }}
              ></div>
            </div>
          </div>

          <div className="streak-card-footer">
            <span className="streak-footer-desc">
              Reach your {weekly.targetHours}h weekly goal to sustain your championship streak!
            </span>
            <span className="streak-status-tag">
              {weekly.isTargetMetThisWeek ? "🏆 Goal Reached" : "📈 In Progress"}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. LEVEL, XP & STUDENT RANK BANNER
         ============================================================ */}
      <div className="card student-rank-xp-card">
        <div className="rank-left-details">
          <div className="rank-badge-bubble">⭐</div>
          <div>
            <div className="rank-tier-line">
              <strong className="rank-level-text">LEVEL {gamification.level}</strong>
              <span className="rank-title-tag">{gamification.rankTitle}</span>
            </div>
            <p className="rank-xp-subtitle">
              Total XP Earned: <strong>{gamification.totalXP.toLocaleString()} XP</strong> &bull;{" "}
              {gamification.unlockedBadgesCount} / {gamification.totalBadgesCount} Badges Unlocked
            </p>
          </div>
        </div>

        <div className="rank-progress-col">
          <div className="rank-meter-header">
            <span>XP to Level {gamification.level + 1}</span>
            <strong>{gamification.levelProgress}%</strong>
          </div>
          <div className="rank-meter-track">
            <div
              className="rank-meter-fill"
              style={{ width: `${gamification.levelProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ============================================================
          3. ACHIEVEMENT & STREAK BADGES ARENA
         ============================================================ */}
      <div className="card badges-arena-card">
        <div className="badges-header-row">
          <div>
            <h3 className="badges-arena-title">🎖️ Streak Badges & Achievements</h3>
            <p className="badges-arena-subtitle">
              Earn exclusive badges by sustaining daily focus and crushing study goals.
            </p>
          </div>

          {/* Badge Category Filter Chips */}
          <div className="badge-filter-chips">
            <button
              type="button"
              className={`badge-chip ${activeBadgeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveBadgeCategory("all")}
            >
              All Badges ({gamification.badges.length})
            </button>
            <button
              type="button"
              className={`badge-chip ${activeBadgeCategory === "daily" ? "active" : ""}`}
              onClick={() => setActiveBadgeCategory("daily")}
            >
              🔥 Daily Streaks
            </button>
            <button
              type="button"
              className={`badge-chip ${activeBadgeCategory === "weekly" ? "active" : ""}`}
              onClick={() => setActiveBadgeCategory("weekly")}
            >
              🏆 Weekly Goals
            </button>
            <button
              type="button"
              className={`badge-chip ${activeBadgeCategory === "focus" ? "active" : ""}`}
              onClick={() => setActiveBadgeCategory("focus")}
            >
              ⚡ Focus Hours
            </button>
            <button
              type="button"
              className={`badge-chip ${activeBadgeCategory === "tasks" ? "active" : ""}`}
              onClick={() => setActiveBadgeCategory("tasks")}
            >
              🎯 Tasks
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="badges-grid">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className={`badge-tile ${badge.unlocked ? "unlocked" : "locked"}`}
            >
              <div className="badge-icon-wrapper">
                <span className="badge-main-icon">{badge.icon}</span>
                {badge.unlocked && <span className="badge-check-dot">✓</span>}
              </div>

              <div className="badge-tile-body">
                <strong className="badge-tile-title">{badge.title}</strong>
                <p className="badge-tile-desc">{badge.description}</p>
              </div>

              <div className="badge-tile-footer">
                {badge.unlocked ? (
                  <span className="badge-unlocked-tag">Unlocked ✨</span>
                ) : (
                  <div className="badge-lock-progress">
                    <span>
                      Progress: {badge.current} / {badge.required}
                    </span>
                    <div className="badge-mini-track">
                      <div
                        className="badge-mini-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((badge.current / badge.required) * 100)
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          TARGET CONFIGURATION MODAL
         ============================================================ */}
      {showTargetModal && (
        <div className="modal-backdrop animate-fade-in">
          <div className="modal-card animate-scale-in" style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <h3>🎯 Streak Study Targets</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowTargetModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateTargets} className="modal-form">
              <div className="form-group">
                <label>Daily Study Target for Streak (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={targetsForm.dailyStudyGoalMinutes}
                  onChange={(e) =>
                    setTargetsForm({
                      ...targetsForm,
                      dailyStudyGoalMinutes: Number(e.target.value),
                    })
                  }
                  required
                />
                <small className="form-hint">
                  Studying at least this many minutes per day counts toward your Daily Streak (e.g. 45 mins).
                </small>
              </div>

              <div className="form-group">
                <label>Weekly Study Target for Streak (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={targetsForm.weeklyStudyGoalHours}
                  onChange={(e) =>
                    setTargetsForm({
                      ...targetsForm,
                      weeklyStudyGoalHours: Number(e.target.value),
                    })
                  }
                  required
                />
                <small className="form-hint">
                  Accumulating this many hours per week counts toward your Weekly Goal Streak (e.g. 15 hrs).
                </small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTargetModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingTargets}
                >
                  {savingTargets ? "Saving..." : "Save Targets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          SHAREABLE STREAK CARD MODAL
         ============================================================ */}
      <ShareableStreakCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        streakData={streakData}
        currentUser={currentUser}
        onFeedback={onFeedback}
      />
    </div>
  );
}
