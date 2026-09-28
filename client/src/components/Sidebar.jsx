import React from "react";
import {
  HomeIcon,
  PinIcon,
  PlusIcon,
  ClockIcon,
  StarIcon,
  CalendarIcon,
  BellIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  LogoutIcon,
  MenuIcon,
  ChevronLeftIcon,
} from "./Icons";

export default function Sidebar({
  isExpanded = false,
  onToggle,
  activeTab,
  onSelectTab,
  currentUser,
  onOpenProfile,
  onLogout,
  theme = "dark",
  onToggleTheme,
  onOpenAddResource,
  onOpenAddTask,
  onOpenAddFocusSession,
  onOpenStarredTasks,
  onOpenCalendar,
  onOpenUpcomingEvents,
}) {
  const topNavItems = [
    {
      id: "home",
      icon: <HomeIcon size={20} />,
      label: "Home Dashboard",
      tooltip: "Home Dashboard",
      onClick: () => onSelectTab("home"),
      isActive: activeTab === "home",
    },
    {
      id: "add-resource",
      icon: <PinIcon size={20} />,
      label: "Add Resource",
      tooltip: "Add Resource",
      onClick: onOpenAddResource,
      isActive: false,
    },
    {
      id: "add-task",
      icon: <PlusIcon size={20} />,
      label: "Add Task",
      tooltip: "Add Task",
      onClick: onOpenAddTask,
      isActive: false,
    },
    {
      id: "add-focus",
      icon: <ClockIcon size={20} />,
      label: "Add Focus Session",
      tooltip: "Add Focus Session",
      onClick: onOpenAddFocusSession,
      isActive: false,
    },
    {
      id: "starred-tasks",
      icon: <StarIcon size={20} />,
      label: "Important Tasks",
      tooltip: "Important Tasks",
      onClick: onOpenStarredTasks,
      isActive: false,
    },
    {
      id: "calendar",
      icon: <CalendarIcon size={20} />,
      label: "Academic Calendar",
      tooltip: "Academic Calendar",
      onClick: onOpenCalendar,
      isActive: false,
    },
    {
      id: "upcoming-events",
      icon: <BellIcon size={20} />,
      label: "Upcoming Events",
      tooltip: "Upcoming Events",
      onClick: onOpenUpcomingEvents,
      isActive: false,
    },
  ];

  return (
    <aside className={`studex-sidebar ${isExpanded ? "expanded" : "collapsed"}`}>
      {/* Top Header: Studex Brand Symbol & Expansion Toggle */}
      <div className="sidebar-header">
        <div
          className="sidebar-brand"
          onClick={() => onSelectTab("home")}
          title="Studex Home"
        >
          <div className="sidebar-brand-logo">SX</div>
          {isExpanded && (
            <div className="sidebar-brand-text">
              <h2 className="sidebar-title">Studex</h2>
              <span className="sidebar-subtitle">Academic Hub</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar (Show Text)"}
          aria-label="Toggle Sidebar"
        >
          {isExpanded ? <ChevronLeftIcon size={16} /> : <MenuIcon size={16} />}
        </button>
      </div>

      {/* Top Section: Navigation & Action Icons with Text */}
      <div className="sidebar-top-section">
        {topNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-nav-btn ${item.isActive ? "active" : ""}`}
            onClick={item.onClick}
            data-tooltip={!isExpanded ? item.tooltip : undefined}
            aria-label={item.label}
          >
            <span className="sidebar-btn-icon">{item.icon}</span>
            {isExpanded && (
              <>
                <span className="sidebar-btn-label">{item.label}</span>
                {item.isActive && <span className="sidebar-active-dot" />}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Section: Profile, Theme Toggle & Logout */}
      <div className="sidebar-bottom-section">
        {/* Profile Button */}
        <button
          type="button"
          className="sidebar-nav-btn profile-btn"
          onClick={onOpenProfile}
          data-tooltip={!isExpanded ? (currentUser ? `${currentUser.name} (Profile)` : "Student Profile") : undefined}
          aria-label="Student Profile"
        >
          <span className="sidebar-btn-icon"><UserIcon size={20} /></span>
          {isExpanded && (
            <div className="sidebar-user-details-col">
              <span className="sidebar-btn-label">{currentUser?.name || "Student Profile"}</span>
              <span className="sidebar-btn-sublabel">{currentUser?.year || "Student"}</span>
            </div>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="sidebar-nav-btn theme-toggle-btn"
          onClick={onToggleTheme}
          data-tooltip={!isExpanded ? `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode` : undefined}
          aria-label="Toggle Color Theme"
        >
          <span className="sidebar-btn-icon">
            {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </span>
          {isExpanded && (
            <span className="sidebar-btn-label">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>

        {/* Logout Button */}
        <button
          type="button"
          className="sidebar-nav-btn logout-btn"
          onClick={onLogout}
          data-tooltip={!isExpanded ? "Sign Out / Logout" : undefined}
          aria-label="Logout"
        >
          <span className="sidebar-btn-icon"><LogoutIcon size={20} /></span>
          {isExpanded && <span className="sidebar-btn-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
