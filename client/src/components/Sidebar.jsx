import React from "react";

export default function Sidebar({
  isExpanded,
  onToggle,
  activeTab,
  onSelectTab,
  currentUser,
  onOpenProfile,
  onLogout,
  serverHealth,
  theme = "dark",
  onToggleTheme,
}) {
  const defaultGenderAvatars = {
    male: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-7.png",
    female: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-8.png",
    other: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png",
    prefer_not_to_say: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png",
  };

  const avatarUrl =
    currentUser?.profilePicture?.url ||
    defaultGenderAvatars[currentUser?.gender] ||
    defaultGenderAvatars.other;

  const navItems = [
    {
      id: "home",
      icon: "🏠",
      label: "Home Dashboard",
      subtext: "Command Center & Feed",
      badge: "Home",
    },
    {
      id: "workspace",
      icon: "📚",
      label: "Academic Workspace",
      subtext: "Subjects & Notes",
      badge: "Core",
    },
    {
      id: "tasks",
      icon: "📋",
      label: "Student Task Engine",
      subtext: "Today's Focus & Deadlines",
      badge: "Tasks",
    },
    {
      id: "study",
      icon: "⏱️",
      label: "Focus Study Engine",
      subtext: "Timer & Focus",
      badge: "Focus",
    },
    {
      id: "analytics",
      icon: "📈",
      label: "Analytics & Progress",
      subtext: "Progress & Metrics",
      badge: "Analytics",
    },
    {
      id: "gamification",
      icon: "🏆",
      label: "Gamification & Streaks",
      subtext: "Streaks & Rewards",
      badge: "Streaks",
    },
  ];

  return (
    <aside className={`studex-sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* Sidebar Header with Logo & Toggle Button */}
      <div className="sidebar-header">
        <div className="sidebar-brand" onClick={() => onSelectTab("home")}>
          <div className="sidebar-brand-logo">SX</div>
          {isExpanded && (
            <div className="sidebar-brand-text">
              <h1 className="sidebar-title">Studex</h1>
              <span className="sidebar-subtitle">Student Workspace</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title={isExpanded ? "Collapse Sidebar (Show icons only)" : "Expand Sidebar (Show feature names)"}
        >
          {isExpanded ? "◀" : "☰"}
        </button>
      </div>

      {/* Navigation Feature Items */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-section-label">
          {isExpanded ? "MAIN FEATURES" : "•••"}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(item.id)}
              title={!isExpanded ? item.label : ""}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>

              {isExpanded && (
                <div className="sidebar-nav-content">
                  <div className="sidebar-nav-title-row">
                    <span className="sidebar-nav-label">{item.label}</span>
                  </div>
                  <span className="sidebar-nav-subtext">{item.subtext}</span>
                </div>
              )}

              {isExpanded && isActive && <span className="sidebar-active-indicator" />}
            </button>
          );
        })}

        {/* Quick Profile Tab Button in Nav List */}
        <button
          type="button"
          className="sidebar-nav-item"
          onClick={onOpenProfile}
          title={!isExpanded ? "Edit Student Profile" : ""}
        >
          <span className="sidebar-nav-icon">👤</span>
          {isExpanded && (
            <div className="sidebar-nav-content">
              <span className="sidebar-nav-label">Student Profile</span>
              <span className="sidebar-nav-subtext">View & Edit Details</span>
            </div>
          )}
        </button>
      </nav>

      {/* Sidebar Footer with User Details, Theme Toggle & Status */}
      <div className="sidebar-footer">
        {/* User Profile Card */}
        {currentUser && (
          <div
            className="sidebar-user-card"
            onClick={onOpenProfile}
            title={!isExpanded ? `${currentUser.name} (Click to edit profile)` : ""}
          >
            <img
              src={avatarUrl}
              alt={currentUser.name}
              className="sidebar-user-avatar"
            />
            {isExpanded && (
              <div className="sidebar-user-info">
                <strong className="sidebar-user-name">{currentUser.name}</strong>
                <span className="sidebar-user-role">
                  {currentUser.year || "Student"} • {currentUser.course || "Studex"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status Indicators, Theme Toggle & Logout when expanded */}
        {isExpanded && (
          <div className="sidebar-footer-controls">
            {/* Theme Toggle Button */}
            <button
              type="button"
              className="sidebar-theme-toggle-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              <span>{theme === "dark" ? "☀️" : "🌙"}</span>
              <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>
            </button>

            {serverHealth && (
              <div className="sidebar-status-pill">
                <span className={`status-dot ${serverHealth.status}`} />
                <span>Server {serverHealth.status === "online" ? "Online" : "Offline"}</span>
              </div>
            )}

            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={onLogout}
              title="Logout from Studex"
            >
              🚪 Logout
            </button>
          </div>
        )}

        {!isExpanded && (
          <div className="sidebar-collapsed-actions">
            <button
              type="button"
              className="sidebar-mini-theme-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              type="button"
              className="sidebar-mini-logout-btn"
              onClick={onLogout}
              title="Logout"
            >
              🚪
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
