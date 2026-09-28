import React, { useRef, useEffect } from "react";
import { UserIcon, DatabaseIcon, ServerIcon } from "./Icons";

export default function NavbarProfileDropdown({
  isOpen,
  onClose,
  currentUser,
  serverHealth,
  onOpenProfileModal,
}) {
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentUser) return null;

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

  return (
    <div className="navbar-profile-dropdown animate-scale-in" ref={dropdownRef}>
      {/* Student Profile Header */}
      <div className="dropdown-user-header">
        <img
          src={avatarUrl}
          alt={currentUser.name}
          className="dropdown-avatar"
        />
        <div className="dropdown-user-info">
          <strong className="dropdown-user-name">{currentUser.name}</strong>
          <span className="dropdown-user-email">{currentUser.email}</span>
          <div className="dropdown-badge-row">
            <span className="dropdown-role-pill">
              {currentUser.year || "1st Year"} &bull; {currentUser.course || "Student"}
            </span>
            {currentUser.college && (
              <span className="dropdown-college-pill">
                {currentUser.college}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="dropdown-divider"></div>

      {/* System Status Section (DB & Server Status) */}
      <div className="dropdown-system-section">
        <span className="dropdown-section-title">SYSTEM INFRASTRUCTURE</span>

        <div className="dropdown-status-row">
          <div className="status-item">
            <div className="status-item-header">
              <DatabaseIcon size={14} className="status-item-icon" />
              <span className="status-item-label">Database</span>
            </div>
            <span
              className={`status-pill ${
                serverHealth.database === "connected" ? "online" : "warning"
              }`}
            >
              <span className="dot"></span>
              {serverHealth.database === "connected" ? "Connected" : "Checking"}
            </span>
          </div>

          <div className="status-item">
            <div className="status-item-header">
              <ServerIcon size={14} className="status-item-icon" />
              <span className="status-item-label">Server</span>
            </div>
            <span
              className={`status-pill ${
                serverHealth.status === "online" ? "online" : "error"
              }`}
            >
              <span className="dot"></span>
              {serverHealth.status === "online" ? "Online (5000)" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="dropdown-divider"></div>

      {/* Profile Actions */}
      <div className="dropdown-actions-section">
        <button
          type="button"
          className="dropdown-action-btn primary"
          onClick={() => {
            onClose();
            onOpenProfileModal();
          }}
        >
          <UserIcon size={16} />
          <span>View & Edit Full Profile</span>
        </button>
      </div>
    </div>
  );
}
