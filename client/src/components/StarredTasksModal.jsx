import React, { useState, useEffect, useCallback } from "react";
import {
  TasksIcon,
  StarIcon,
  ClockIcon,
  CalendarIcon,
  CheckIcon,
  XIcon,
} from "./Icons";

export default function StarredTasksModal({
  isOpen,
  onClose,
  token,
  apiBase,
  onError,
  onFeedback,
  onNavigateToTasks,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStarredTasks = useCallback(async () => {
    if (!token || !isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Filter tasks that are starred or high/urgent priority
        const starred = (data.data || []).filter(
          (t) => t.isStarred || t.priority === "high" || t.priority === "urgent"
        );
        setTasks(starred);
      }
    } catch (err) {
      console.error("Failed to load starred tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [token, isOpen, apiBase]);

  useEffect(() => {
    fetchStarredTasks();
  }, [fetchStarredTasks]);

  if (!isOpen) return null;

  // Toggle status
  const handleToggleStatus = async (task, e) => {
    e?.stopPropagation();
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    try {
      const res = await fetch(`${apiBase}/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
        );
        onFeedback?.(
          nextStatus === "completed" ? "Task completed! 🎉" : "Task marked as to-do"
        );
      }
    } catch (err) {
      onError?.("Failed to update task status");
    }
  };

  // Toggle star
  const handleToggleStar = async (taskId, currentStarred, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`${apiBase}/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isStarred: !currentStarred }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, isStarred: !currentStarred } : t))
        );
        onFeedback?.(!currentStarred ? "Starred task ⭐" : "Unstarred task");
      }
    } catch (err) {
      onError?.("Failed to toggle star");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card starred-tasks-modal-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="section-kicker">High Priority Focus</span>
            <h3>Important & Starred Tasks</h3>
          </div>

          <div className="starred-header-btns">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onClose();
                onNavigateToTasks?.();
              }}
            >
              <TasksIcon size={14} /> Open Task Engine
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
              <XIcon size={18} />
            </button>
          </div>
        </div>

        <div className="starred-tasks-container">
          {loading ? (
            <div className="starred-loading">Loading priority tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="starred-empty-state">
              <span className="empty-icon"><StarIcon size={24} /></span>
              <h4>No Starred Tasks</h4>
              <p>Mark critical homework, projects, or exam targets with stars in the Task Engine to see them here.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  onNavigateToTasks?.();
                }}
              >
                <TasksIcon size={14} /> Go to Task Engine
              </button>
            </div>
          ) : (
            <div className="starred-tasks-list">
              {tasks.map((task) => {
                const isDone = task.status === "completed";
                return (
                  <div
                    key={task._id}
                    className={`starred-task-item ${isDone ? "is-done" : ""}`}
                  >
                    <button
                      type="button"
                      className={`task-checkbox-circle ${isDone ? "checked" : ""}`}
                      onClick={(e) => handleToggleStatus(task, e)}
                      title={isDone ? "Mark as to-do" : "Mark as completed"}
                      aria-label={isDone ? "Mark as to-do" : "Mark as completed"}
                    >
                      {isDone ? <CheckIcon size={12} /> : null}
                    </button>

                    <div className="starred-task-body">
                      <div className="starred-task-title-row">
                        <h4 className="starred-task-title">{task.title}</h4>
                        <span className={`priority-tag ${task.priority}`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>

                      {task.description && (
                        <p className="starred-task-desc">{task.description}</p>
                      )}

                      <div className="starred-task-meta-row">
                        {task.subject && (
                          <span
                            className="task-subject-pill"
                            style={{ backgroundColor: `${task.subject.color || "#080808"}22`, color: task.subject.color || "#353536" }}
                          >
                            {task.subject.name}
                          </span>
                        )}
                        {task.deadline && (
                          <span className="task-deadline-pill">
                            <CalendarIcon size={12} /> Due {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        <span className="task-duration-pill">
                          <ClockIcon size={12} /> {task.estimatedDuration || 30} mins
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`star-toggle-btn ${task.isStarred ? "starred" : ""}`}
                      onClick={(e) => handleToggleStar(task._id, task.isStarred, e)}
                      title={task.isStarred ? "Unstar task" : "Star task"}
                      aria-label="Toggle star"
                    >
                      <StarIcon size={15} filled={task.isStarred} />
                    </button>
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
