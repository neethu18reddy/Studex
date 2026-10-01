import React, { useState, useEffect } from "react";
import { getSocket } from "../services/socket";
import { BellIcon, XIcon, MessageSquareIcon, MegaphoneIcon, ClockIcon } from "./Icons";

export default function RealTimeNotificationToast() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      const toastItem = {
        id: notif.id || `toast_${Date.now()}_${Math.random()}`,
        type: notif.type || "info",
        title: notif.title || "New Notification",
        message: notif.message || "",
        sender: notif.sender,
        createdAt: notif.createdAt || new Date(),
      };

      setNotifications((prev) => [toastItem, ...prev.slice(0, 4)]);

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== toastItem.id));
      }, 5000);
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="realtime-toast-container">
      {notifications.map((n) => (
        <div key={n.id} className={`realtime-toast-card type-${n.type} animate-slide-in-right`}>
          <div className="toast-icon-wrap">
            {n.type === "message" && <MessageSquareIcon size={16} />}
            {n.type === "announcement" && <MegaphoneIcon size={16} />}
            {n.type === "task" && <ClockIcon size={16} />}
            {!["message", "announcement", "task"].includes(n.type) && <BellIcon size={16} />}
          </div>

          <div className="toast-content-body">
            <div className="toast-title-line">
              <strong>{n.title}</strong>
              <span className="toast-time-now">Just now</span>
            </div>
            <p className="toast-message-text">{n.message}</p>
          </div>

          <button
            type="button"
            className="toast-close-btn"
            onClick={() => removeNotification(n.id)}
            title="Dismiss"
          >
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
