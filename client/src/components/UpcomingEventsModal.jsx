import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarIcon,
  StarIcon,
  ClockIcon,
  XIcon,
} from "./Icons";

export default function UpcomingEventsModal({
  isOpen,
  onClose,
  token,
  apiBase,
  onError,
  onFeedback,
  onOpenCalendar,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // 'all', 'important', 'today'

  const fetchUpcomingEvents = useCallback(async () => {
    if (!token || !isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/calendar/upcoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load upcoming events:", err);
    } finally {
      setLoading(false);
    }
  }, [token, isOpen, apiBase]);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const handleToggleImportant = async (eventId, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`${apiBase}/api/calendar/${eventId}/toggle-important`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents((prev) =>
          prev.map((ev) => (ev._id === eventId ? { ...ev, isImportant: !ev.isImportant } : ev))
        );
        onFeedback?.(data.message);
      }
    } catch (err) {
      onError?.("Could not update priority");
    }
  };

  const handleDeleteEvent = async (eventId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this event?")) return;
    try {
      const res = await fetch(`${apiBase}/api/calendar/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents((prev) => prev.filter((ev) => ev._id !== eventId));
        onFeedback?.("Event deleted");
      }
    } catch (err) {
      onError?.("Failed to delete event");
    }
  };

  // Filter list
  const filteredEvents = events.filter((ev) => {
    if (filterMode === "important") return ev.isImportant;
    if (filterMode === "today") return ev.date === todayStr;
    return true;
  });

  const importantCount = events.filter((ev) => ev.isImportant).length;
  const todayCount = events.filter((ev) => ev.date === todayStr).length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card upcoming-modal-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="section-kicker">Consolidated Schedule & Priority</span>
            <h3>Upcoming Events & Scheduled Items</h3>
          </div>

          <div className="upcoming-header-btns">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onClose();
                onOpenCalendar?.();
              }}
            >
              <CalendarIcon size={14} /> Open Calendar View
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="upcoming-filter-bar">
          <button
            type="button"
            className={`filter-pill ${filterMode === "all" ? "active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            All Upcoming ({events.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterMode === "important" ? "active" : ""}`}
            onClick={() => setFilterMode("important")}
          >
            <StarIcon size={13} filled={true} /> Important Items ({importantCount})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterMode === "today" ? "active" : ""}`}
            onClick={() => setFilterMode("today")}
          >
            Due Today ({todayCount})
          </button>
        </div>

        {/* List Content */}
        <div className="upcoming-events-container">
          {loading ? (
            <div className="upcoming-loading">Loading upcoming events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="upcoming-empty-state">
              <span className="empty-icon"><CalendarIcon size={24} /></span>
              <h4>No {filterMode === "important" ? "important" : "upcoming"} items found</h4>
              <p>You're all caught up! Use the Calendar to schedule new study blocks or exams.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onOpenCalendar?.();
                }}
              >
                <CalendarIcon size={14} /> Open Calendar to Schedule
              </button>
            </div>
          ) : (
            <div className="upcoming-cards-grid">
              {filteredEvents.map((ev) => {
                const isToday = ev.date === todayStr;
                const eventDate = new Date(ev.date + "T00:00:00");
                return (
                  <div
                    key={ev._id}
                    className={`upcoming-event-card ${ev.isImportant ? "is-important" : ""} ${
                      isToday ? "is-today" : ""
                    }`}
                  >
                    <div className="upcoming-card-top">
                      <div className="upcoming-date-badge" style={{ borderColor: ev.color || "#080808" }}>
                        <span className="date-month">
                          {eventDate.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}
                        </span>
                        <strong className="date-day">
                          {eventDate.getDate()}
                        </strong>
                      </div>

                      <div className="upcoming-details-col">
                        <div className="upcoming-tags-row">
                          <span
                            className="event-cat-badge"
                            style={{ backgroundColor: ev.color || "#080808" }}
                          >
                            {ev.category.toUpperCase()}
                          </span>
                          {isToday && <span className="today-badge">TODAY</span>}
                          <span className="upcoming-time-text">
                            <ClockIcon size={12} /> {ev.startTime} - {ev.endTime}
                          </span>
                        </div>
                        <h4 className="upcoming-event-title">{ev.title}</h4>
                        {ev.description && (
                          <p className="upcoming-event-desc">{ev.description}</p>
                        )}
                      </div>

                      <div className="upcoming-actions-col">
                        <button
                          type="button"
                          className={`star-toggle-btn ${ev.isImportant ? "starred" : ""}`}
                          onClick={(e) => handleToggleImportant(ev._id, e)}
                          title={ev.isImportant ? "Unmark Important" : "Mark Important"}
                          aria-label="Toggle Important"
                        >
                          <StarIcon size={15} filled={ev.isImportant} />
                        </button>
                        <button
                          type="button"
                          className="event-delete-btn"
                          onClick={(e) => handleDeleteEvent(ev._id, e)}
                          title="Delete Event"
                          aria-label="Delete Event"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
