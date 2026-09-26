import { useState, useRef } from "react";

export default function ShareableStreakCardModal({
  isOpen,
  onClose,
  streakData,
  currentUser,
  onFeedback,
}) {
  const [selectedTheme, setSelectedTheme] = useState("cyberpunk");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  if (!isOpen) return null;

  const themes = {
    cyberpunk: {
      name: "🌌 Cyberpunk Neon",
      bg: "linear-gradient(135deg, #12072b 0%, #0d1117 50%, #1e053a 100%)",
      accent: "#aa3bff",
      secondary: "#00f0ff",
      border: "rgba(170, 59, 255, 0.45)",
      flameGradient: "linear-gradient(135deg, #ff4500, #ff8c00)",
      trophyGradient: "linear-gradient(135deg, #ffd700, #ffa500)",
    },
    amethyst: {
      name: "🔮 Royal Amethyst",
      bg: "linear-gradient(135deg, #1f0836 0%, #2e1065 50%, #4c1d95 100%)",
      accent: "#c084fc",
      secondary: "#f472b6",
      border: "rgba(192, 132, 252, 0.5)",
      flameGradient: "linear-gradient(135deg, #f43f5e, #fb7185)",
      trophyGradient: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    },
    emerald: {
      name: "🌿 Emerald Fire",
      bg: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)",
      accent: "#10b981",
      secondary: "#34d399",
      border: "rgba(16, 185, 129, 0.45)",
      flameGradient: "linear-gradient(135deg, #f97316, #eab308)",
      trophyGradient: "linear-gradient(135deg, #10b981, #06b6d4)",
    },
    sunset: {
      name: "🌅 Sunset Blaze",
      bg: "linear-gradient(135deg, #431407 0%, #7c2d12 50%, #18181b 100%)",
      accent: "#f97316",
      secondary: "#fbbf24",
      border: "rgba(249, 115, 22, 0.5)",
      flameGradient: "linear-gradient(135deg, #ea580c, #f59e0b)",
      trophyGradient: "linear-gradient(135deg, #fbbf24, #d97706)",
    },
    midnight: {
      name: "💎 Midnight Titanium",
      bg: "linear-gradient(135deg, #090d16 0%, #111827 50%, #1f2937 100%)",
      accent: "#38bdf8",
      secondary: "#818cf8",
      border: "rgba(56, 189, 248, 0.45)",
      flameGradient: "linear-gradient(135deg, #f97316, #ef4444)",
      trophyGradient: "linear-gradient(135deg, #38bdf8, #818cf8)",
    },
  };

  const currentTheme = themes[selectedTheme] || themes.cyberpunk;

  const card = streakData?.shareableCard || {
    studentName: currentUser?.name || "Student Scholar",
    college: currentUser?.college || "Studex Academy",
    course: currentUser?.course || "Academic Workspace",
    avatar: currentUser?.profilePicture?.url || "",
    dailyStreak: streakData?.dailyStreak?.count || 12,
    dailyStreakLabel: streakData?.dailyStreak?.label || "🔥 12 Day Streak",
    weeklyStreak: streakData?.weeklyStreak?.count || 4,
    weeklyStreakLabel: streakData?.weeklyStreak?.label || "🏆 4 Week Goal Streak",
    totalFocusHours: 28.5,
    tasksCompleted: 23,
    completionRate: 82.1,
    level: streakData?.gamification?.level || 8,
    rankTitle: streakData?.gamification?.rankTitle || "Scholar",
  };

  const defaultAvatar =
    "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-7.png";
  const avatarUrl = card.avatar || defaultAvatar;

  // Download Card as PNG Image using Native Canvas Rendering
  const handleDownloadImage = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 1200;
      canvas.height = 680;

      // 1. Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 680);
      if (selectedTheme === "amethyst") {
        bgGrad.addColorStop(0, "#1f0836");
        bgGrad.addColorStop(0.5, "#2e1065");
        bgGrad.addColorStop(1, "#4c1d95");
      } else if (selectedTheme === "emerald") {
        bgGrad.addColorStop(0, "#022c22");
        bgGrad.addColorStop(0.5, "#064e3b");
        bgGrad.addColorStop(1, "#0f172a");
      } else if (selectedTheme === "sunset") {
        bgGrad.addColorStop(0, "#431407");
        bgGrad.addColorStop(0.5, "#7c2d12");
        bgGrad.addColorStop(1, "#18181b");
      } else if (selectedTheme === "midnight") {
        bgGrad.addColorStop(0, "#090d16");
        bgGrad.addColorStop(0.5, "#111827");
        bgGrad.addColorStop(1, "#1f2937");
      } else {
        bgGrad.addColorStop(0, "#12072b");
        bgGrad.addColorStop(0.5, "#0d1117");
        bgGrad.addColorStop(1, "#1e053a");
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 680);

      // 2. Outer Border Frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 1160, 640);

      // Top Accent Bar
      const topBarGrad = ctx.createLinearGradient(0, 0, 1200, 0);
      topBarGrad.addColorStop(0, "#ff4500");
      topBarGrad.addColorStop(0.5, "#aa3bff");
      topBarGrad.addColorStop(1, "#00f0ff");
      ctx.fillStyle = topBarGrad;
      ctx.fillRect(20, 20, 1160, 8);

      // 3. Header Branding
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.fillText("STUDEX ACADEMIC WORKSPACE", 60, 75);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("OFFICIAL VERIFIED STREAK BADGE", 60, 105);

      // Level Pill
      ctx.fillStyle = "rgba(170, 59, 255, 0.25)";
      ctx.fillRect(940, 55, 200, 44);
      ctx.strokeStyle = "#aa3bff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(940, 55, 200, 44);

      ctx.fillStyle = "#f3f4f6";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(`LEVEL ${card.level} • ${card.rankTitle}`, 955, 83);

      // 4. Student Info Row
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px system-ui, sans-serif";
      ctx.fillText(card.studentName, 60, 180);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "20px system-ui, sans-serif";
      const collegeStr = `${card.college} • ${card.course}`;
      ctx.fillText(collegeStr, 60, 215);

      // 5. Hero Streak Badges
      // Daily Streak Card
      ctx.fillStyle = "rgba(255, 69, 0, 0.12)";
      ctx.fillRect(60, 260, 520, 180);
      ctx.strokeStyle = "rgba(255, 69, 0, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 260, 520, 180);

      ctx.fillStyle = "#ff8c00";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("DAILY STUDY STREAK", 90, 305);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.fillText(card.dailyStreakLabel, 90, 370);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Consecutive daily study goals completed 🔥", 90, 410);

      // Weekly Streak Card
      ctx.fillStyle = "rgba(255, 215, 0, 0.12)";
      ctx.fillRect(620, 260, 520, 180);
      ctx.strokeStyle = "rgba(255, 215, 0, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(620, 260, 520, 180);

      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("WEEKLY TARGET STREAK", 650, 305);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.fillText(card.weeklyStreakLabel, 650, 370);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Consecutive 15h weekly study goals crushed 🏆", 650, 410);

      // 6. Bottom KPI Metrics
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(60, 470, 1080, 110);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(60, 470, 1080, 110);

      // Total Focus Hours
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("TOTAL FOCUS STUDY", 100, 510);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px system-ui, sans-serif";
      ctx.fillText(`${card.totalFocusHours} hrs`, 100, 555);

      // Tasks Completed
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("TASKS COMPLETED", 460, 510);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px system-ui, sans-serif";
      ctx.fillText(`${card.tasksCompleted} Tasks`, 460, 555);

      // Completion Rate
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("COMPLETION RATE", 820, 510);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px system-ui, sans-serif";
      ctx.fillText(`${card.completionRate}%`, 820, 555);

      // 7. Footer Watermark
      ctx.fillStyle = "#64748b";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(
        `Generated on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} • Studex Student Platform`,
        60,
        620
      );

      // Download triggered
      const imgData = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = imgData;
      a.download = `Studex_Streak_Card_${card.studentName.replace(/\s+/g, "_")}.png`;
      a.click();

      onFeedback?.("Streak Card downloaded successfully! 📸🔥");
    } catch (err) {
      console.error("Failed to generate streak card image:", err);
    } finally {
      setDownloading(false);
    }
  };

  // Copy Formatted Text / Badge
  const handleCopyBadge = () => {
    const text = `🔥 Studex Streak Achievement:
👤 ${card.studentName} (${card.college})
${card.dailyStreakLabel} | ${card.weeklyStreakLabel}
⚡ Total Focus: ${card.totalFocusHours} hrs | 🎯 Tasks: ${card.tasksCompleted} (${card.completionRate}% rate)
Level ${card.level} ${card.rankTitle} • Studex Platform 🚀`;

    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      onFeedback?.("Streak summary copied to clipboard! 📋");
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const shareText = encodeURIComponent(
    `🔥 I am on a ${card.dailyStreakLabel} and a ${card.weeklyStreakLabel} on Studex! Crushing my academic goals 🚀`
  );

  return (
    <div className="modal-backdrop animate-fade-in">
      <div className="modal-card shareable-card-modal-card animate-scale-in">
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <span className="section-kicker">Streaks & Rewards</span>
            <h3>✨ Shareable Streak Card</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Theme Presets Row */}
        <div className="card-theme-selector-row">
          <label>Card Theme:</label>
          <div className="card-theme-chips">
            {Object.entries(themes).map(([key, t]) => (
              <button
                key={key}
                type="button"
                className={`theme-chip-btn ${selectedTheme === key ? "active" : ""}`}
                onClick={() => setSelectedTheme(key)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================
            THE VISUAL SHAREABLE STREAK CARD
           ============================================================ */}
        <div
          ref={cardRef}
          className="shareable-streak-card-render animate-fade-in"
          style={{
            background: currentTheme.bg,
            borderColor: currentTheme.border,
          }}
        >
          {/* Top Bar */}
          <div className="card-render-top-accent"></div>

          {/* Card Header */}
          <div className="card-render-header">
            <div className="card-render-brand">
              <div className="card-render-logo">SX</div>
              <div>
                <strong className="card-render-title">STUDEX ACADEMIC</strong>
                <span className="card-render-sub">Verified Streak Card</span>
              </div>
            </div>

            <div className="card-render-level-badge">
              <span>⭐ LEVEL {card.level}</span>
              <strong>{card.rankTitle}</strong>
            </div>
          </div>

          {/* Student Profile Info */}
          <div className="card-render-profile-row">
            <img
              src={avatarUrl}
              alt={card.studentName}
              className="card-render-avatar"
            />
            <div className="card-render-student-details">
              <h2 className="card-render-name">{card.studentName}</h2>
              <p className="card-render-college">
                {card.college} &bull; {card.course}
              </p>
            </div>
          </div>

          {/* Double Streak Showcase */}
          <div className="card-render-streaks-grid">
            {/* Daily Streak Tile */}
            <div className="card-render-streak-tile daily-tile">
              <span className="tile-kicker">DAILY STUDY TARGET</span>
              <div className="tile-hero-val">{card.dailyStreakLabel}</div>
              <span className="tile-subtext">Consecutive daily targets met 🔥</span>
            </div>

            {/* Weekly Streak Tile */}
            <div className="card-render-streak-tile weekly-tile">
              <span className="tile-kicker">WEEKLY GOAL TARGET</span>
              <div className="tile-hero-val">{card.weeklyStreakLabel}</div>
              <span className="tile-subtext">Consecutive 15h weeks crushed 🏆</span>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="card-render-metrics-row">
            <div className="card-render-stat">
              <span>FOCUS HOURS</span>
              <strong>{card.totalFocusHours} hrs</strong>
            </div>
            <div className="card-render-stat">
              <span>TASKS DONE</span>
              <strong>{card.tasksCompleted}</strong>
            </div>
            <div className="card-render-stat">
              <span>COMPLETION RATE</span>
              <strong>{card.completionRate}%</strong>
            </div>
          </div>

          {/* Card Footer Watermark */}
          <div className="card-render-footer">
            <span>Verified Student Record &bull; Studex Platform</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Share & Download Action Controls */}
        <div className="shareable-modal-actions-bar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadImage}
            disabled={downloading}
          >
            {downloading ? "Generating PNG..." : "📸 Download Card as Image (PNG)"}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopyBadge}
          >
            {copied ? "✅ Copied" : "📋 Copy Summary"}
          </button>

          <div className="social-share-btn-group">
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn twitter"
              title="Share on X / Twitter"
            >
              🐦 Tweet
            </a>
            <a
              href={`https://api.whatsapp.com/send?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn whatsapp"
              title="Share on WhatsApp"
            >
              💬 WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=https://studex.app`}
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn linkedin"
              title="Share on LinkedIn"
            >
              💼 LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
