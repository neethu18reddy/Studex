import React, { useState, useEffect, useCallback } from "react";
import {
  CalendarIcon,
  PlusIcon,
  StarIcon,
  ClockIcon,
  XIcon,
} from "./Icons";

export default function CalendarModal({
  isOpen,
  onClose,
  token,
  apiBase,
  onError,
  onFeedback,
  onOpenUpcoming,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showEventForm, setShowEventForm] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  // New Event Form State
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    category: "study",
    color: "#aa3bff",
    isImportant: false,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // Fetch events for current month
  const fetchMonthEvents = useCallback(async () => {
    if (!token || !isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/calendar?month=${monthStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [token, isOpen, apiBase, monthStr]);

  useEffect(() => {
    fetchMonthEvents();
  }, [fetchMonthEvents]);

  if (!isOpen) return null;

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split("T")[0]);
  };

  const handleSelectDay = (dayNum) => {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    setSelectedDateStr(dStr);
    setEventForm((prev) => ({ ...prev, date: dStr }));
  };

  // Create Event Handler
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;

    setSavingEvent(true);
    try {
      const res = await fetch(`${apiBase}/api/calendar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to schedule event");
      }

      onFeedback?.(
        eventForm.isImportant
          ? "Event scheduled & marked as Important ⭐"
          : "Event scheduled on calendar! 📅"
      );
      setShowEventForm(false);
      setEventForm({
        title: "",
        description: "",
        date: selectedDateStr,
        startTime: "09:00",
        endTime: "10:00",
        category: "study",
        color: "#aa3bff",
        isImportant: false,
      });
      fetchMonthEvents();
    } catch (err) {
      onError?.(err.message || "Failed to save event");
    } finally {
      setSavingEvent(false);
    }
  };

  // Toggle Important Handler
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
      onError?.("Could not update event priority");
    }
  };

  // Delete Event Handler
  const handleDeleteEvent = async (eventId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Remove this event from calendar?")) return;
    try {
      const res = await fetch(`${apiBase}/api/calendar/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvents((prev) => prev.filter((ev) => ev._id !== eventId));
        onFeedback?.("Event removed from calendar");
      }
    } catch (err) {
      onError?.("Failed to delete event");
    }
  };

  // Filter events for selected day
  const selectedDayEvents = events.filter((ev) => ev.date === selectedDateStr);
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card calendar-modal-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header calendar-modal-header">
          <div className="calendar-title-group">
            <span className="section-kicker">Academic Schedule & Planner</span>
            <h3 className="calendar-modal-title">
              <CalendarIcon size={18} className="modal-title-icon" /> {monthNames[month]} {year}
            </h3>
          </div>

          <div className="calendar-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrevMonth}
              title="Previous Month"
            >
              &larr; Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleToday}
              title="Jump to Today"
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNextMonth}
              title="Next Month"
            >
              Next &rarr;
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEventForm((prev) => ({ ...prev, date: selectedDateStr }));
                setShowEventForm(true);
              }}
            >
              <PlusIcon size={14} /> Schedule Item
            </button>
            <button
              type="button"
              className="btn-link-secondary btn-sm"
              onClick={() => {
                onClose();
                onOpenUpcoming?.();
              }}
              title="View all upcoming and important events"
            >
              <CalendarIcon size={14} /> Upcoming
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Main Grid: Left Calendar View, Right Day Inspector */}
        <div className="calendar-modal-body">
          <div className="calendar-grid-section">
            {/* Weekday Header */}
            <div className="calendar-weekdays-row">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="calendar-weekday-cell">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="calendar-days-grid">
              {/* Prev month fill cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => {
                const prevDay = daysInPrevMonth - firstDayOfMonth + i + 1;
                return (
                  <div key={`prev-${i}`} className="calendar-day-cell dim">
                    <span className="day-number">{prevDay}</span>
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                  dayNum
                ).padStart(2, "0")}`;
                const isSelected = dStr === selectedDateStr;
                const isToday = dStr === todayStr;

                const dayEvents = events.filter((e) => e.date === dStr);
                const hasImportant = dayEvents.some((e) => e.isImportant);

                return (
                  <div
                    key={`curr-${dayNum}`}
                    className={`calendar-day-cell ${isSelected ? "selected" : ""} ${
                      isToday ? "today" : ""
                    } ${dayEvents.length > 0 ? "has-events" : ""}`}
                    onClick={() => handleSelectDay(dayNum)}
                  >
                    <div className="day-cell-top">
                      <span className="day-number">{dayNum}</span>
                      {hasImportant && (
                        <span className="day-star-badge" title="Important Event">
                          <StarIcon size={12} filled={true} />
                        </span>
                      )}
                    </div>

                    {/* Mini event chips */}
                    <div className="day-events-preview">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev._id}
                          className={`mini-event-chip ${ev.isImportant ? "important" : ""}`}
                          style={{ borderLeftColor: ev.color || "#080808" }}
                          title={`${ev.title} (${ev.startTime || ""})`}
                        >
                          {ev.isImportant && <StarIcon size={10} filled={true} className="chip-star" />}
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="more-events-tag">+{dayEvents.length - 2} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Inspector: Selected Date Items */}
          <div className="calendar-inspector-section">
            <div className="inspector-header">
              <div>
                <span className="inspector-kicker">Selected Date</span>
                <h4 className="inspector-date-title">
                  {new Date(selectedDateStr + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h4>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => {
                  setEventForm((prev) => ({ ...prev, date: selectedDateStr }));
                  setShowEventForm(true);
                }}
              >
                + Add Item
              </button>
            </div>

            {/* Events List for Selected Day */}
            <div className="inspector-events-list">
              {loading ? (
                <div className="inspector-empty">Loading schedule...</div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="inspector-empty">
                  <span className="empty-icon"><CalendarIcon size={24} /></span>
                  <p>No items scheduled for this day.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEventForm((prev) => ({ ...prev, date: selectedDateStr }));
                      setShowEventForm(true);
                    }}
                  >
                    Schedule an Item
                  </button>
                </div>
              ) : (
                selectedDayEvents.map((ev) => (
                  <div
                    key={ev._id}
                    className={`inspector-event-item card ${
                      ev.isImportant ? "is-important" : ""
                    }`}
                  >
                    <div className="event-item-top">
                      <div className="event-item-meta">
                        <span
                          className="event-cat-badge"
                          style={{ backgroundColor: ev.color || "#080808" }}
                        >
                          {ev.category.toUpperCase()}
                        </span>
                        <span className="event-time-badge">
                          <ClockIcon size={12} /> {ev.startTime} - {ev.endTime}
                        </span>
                      </div>

                      <div className="event-actions-inline">
                        <button
                          type="button"
                          className={`star-toggle-btn ${ev.isImportant ? "starred" : ""}`}
                          onClick={(e) => handleToggleImportant(ev._id, e)}
                          title={
                            ev.isImportant
                              ? "Marked as Important (Click to unmark)"
                              : "Mark as Important"
                          }
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

                    <h5 className="event-item-title">{ev.title}</h5>
                    {ev.description && (
                      <p className="event-item-desc">{ev.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Schedule Item Modal Overlay */}
        {showEventForm && (
          <div
            className="modal-backdrop sub-modal-backdrop"
            onClick={() => setShowEventForm(false)}
          >
            <div className="modal-card modal-sub-card animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Schedule New Calendar Item</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowEventForm(false)}
                  aria-label="Close"
                >
                  <XIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="auth-form">
                <div className="form-group">
                  <label htmlFor="ev-title">Title / Topic *</label>
                  <input
                    id="ev-title"
                    type="text"
                    placeholder="e.g. Midterm Exam Prep / Physics Lab / Assignment Due"
                    value={eventForm.title}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="ev-date">Date (YYYY-MM-DD) *</label>
                    <input
                      id="ev-date"
                      type="date"
                      value={eventForm.date}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ev-cat">Category</label>
                    <select
                      id="ev-cat"
                      value={eventForm.category}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, category: e.target.value })
                      }
                    >
                      <option value="study">📚 Study Session</option>
                      <option value="exam">🎯 Exam / Quiz</option>
                      <option value="assignment">📝 Assignment Due</option>
                      <option value="lecture">🎓 Lecture / Class</option>
                      <option value="meeting">👥 Group Meeting</option>
                      <option value="other">📌 Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="ev-start">Start Time</label>
                    <input
                      id="ev-start"
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, startTime: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="ev-end">End Time</label>
                    <input
                      id="ev-end"
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ev-color">Event Color</label>
                  <div className="color-picker-row">
                    {[
                      "#aa3bff",
                      "#3b82f6",
                      "#10b981",
                      "#f59e0b",
                      "#ef4444",
                      "#ec4899",
                      "#6366f1",
                    ].map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={`color-choice-btn ${
                          eventForm.color === col ? "selected" : ""
                        }`}
                        style={{ backgroundColor: col }}
                        onClick={() => setEventForm({ ...eventForm, color: col })}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label-card">
                    <input
                      type="checkbox"
                      checked={eventForm.isImportant}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, isImportant: e.target.checked })
                      }
                    />
                    <span>⭐ Mark this item as Important</span>
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="ev-desc">Notes / Description (Optional)</label>
                  <textarea
                    id="ev-desc"
                    rows="2"
                    placeholder="Chapter notes, venue, Zoom link, or prep list..."
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, description: e.target.value })
                    }
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingEvent}
                  >
                    {savingEvent ? "Scheduling..." : "Schedule Item"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEventForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
