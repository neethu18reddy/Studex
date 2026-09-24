import { useState, useEffect, useCallback } from "react";

export default function TaskEngine({ token, apiBase, onError, onFeedback }) {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState("all"); // 'all', 'today', 'upcoming'
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Task Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    subject: "",
    priority: "medium",
    deadline: "",
    estimatedDuration: 30,
  });

  // Fetch subjects for dropdown selector
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubjects(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load subjects for tasks:", err);
    }
  }, [apiBase, token]);

  // Fetch tasks based on active viewTab
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `${apiBase}/api/tasks`;
      if (viewTab === "today") {
        endpoint = `${apiBase}/api/tasks/today`;
      } else if (viewTab === "upcoming") {
        endpoint = `${apiBase}/api/tasks/upcoming`;
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(data.data || []);
      } else {
        onError?.(data.message || "Failed to load tasks");
      }
    } catch (err) {
      onError?.(err.message || "Network error loading tasks");
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, viewTab, onError]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Create Task Handler
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setSavingTask(true);
    try {
      const res = await fetch(`${apiBase}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          subject: newTask.subject || undefined,
          priority: newTask.priority,
          deadline: newTask.deadline || undefined,
          estimatedDuration: Number(newTask.estimatedDuration) || 30,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create task");
      }

      onFeedback?.("Task created successfully!");
      setShowAddModal(false);
      setNewTask({
        title: "",
        description: "",
        subject: "",
        priority: "medium",
        deadline: "",
        estimatedDuration: 30,
      });
      fetchTasks();
    } catch (err) {
      onError?.(err.message || "Failed to create task");
    } finally {
      setSavingTask(false);
    }
  };

  // Toggle Task Status (todo <-> completed)
  const handleToggleStatus = async (task) => {
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
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update task status");
      }

      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
      );
      onFeedback?.(
        nextStatus === "completed" ? "Task marked as completed! 🎉" : "Task marked as to-do"
      );
    } catch (err) {
      onError?.(err.message || "Could not update task");
    }
  };

  // Delete Task Handler
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`${apiBase}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      onFeedback?.("Task deleted successfully");
    } catch (err) {
      onError?.(err.message || "Could not delete task");
    }
  };

  // Filter tasks locally by status, priority, and search query
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description && task.description.toLowerCase().includes(q);
      const matchSubject = task.subject?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchSubject) return false;
    }
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pendingCount = tasks.filter((t) => t.status !== "completed").length;

  return (
    <div className="task-engine-container">
      {/* Header & Controls */}
      <div className="section-header-row">
        <div>
          <h2 className="section-title">📋 Student Task Engine</h2>
          <p className="section-subtitle">
            Plan your daily study goals, track deadlines, and conquer your assignments.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Add New Task
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="task-summary-grid">
        <div className="kpi-card">
          <span className="kpi-icon">🎯</span>
          <div>
            <div className="kpi-value">{tasks.length}</div>
            <div className="kpi-label">Total Tasks</div>
          </div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">⏳</span>
          <div>
            <div className="kpi-value">{pendingCount}</div>
            <div className="kpi-label">Pending / To-Do</div>
          </div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">✅</span>
          <div>
            <div className="kpi-value">{completedCount}</div>
            <div className="kpi-label">Completed</div>
          </div>
        </div>
      </div>

      {/* View Tabs: All Tasks / Today's Tasks / Upcoming */}
      <div className="task-controls-bar">
        <div className="task-view-tabs">
          <button
            className={`task-tab-btn ${viewTab === "all" ? "active" : ""}`}
            onClick={() => setViewTab("all")}
          >
            All Tasks
          </button>
          <button
            className={`task-tab-btn ${viewTab === "today" ? "active" : ""}`}
            onClick={() => setViewTab("today")}
          >
            ☀️ Today's Focus
          </button>
          <button
            className={`task-tab-btn ${viewTab === "upcoming" ? "active" : ""}`}
            onClick={() => setViewTab("upcoming")}
          >
            📅 Upcoming Deadlines
          </button>
        </div>

        <div className="task-filters-row">
          <input
            type="text"
            className="task-search-input"
            placeholder="🔍 Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="task-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="todo">To-Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            className="task-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
      </div>

      {/* Task List Rendering */}
      {loading ? (
        <div className="loading-box">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state-box">
          <span className="empty-icon">📝</span>
          <h3>No tasks found</h3>
          <p>
            {viewTab === "today"
              ? "You have no deadlines scheduled for today! Great time to get ahead."
              : viewTab === "upcoming"
              ? "No upcoming deadlines on the calendar."
              : "Create your first task to start organizing your assignments and study goals."}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            ➕ Create Task
          </button>
        </div>
      ) : (
        <div className="task-list-grid">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const deadlineDate = task.deadline ? new Date(task.deadline) : null;
            const isOverdue =
              deadlineDate && !isCompleted && deadlineDate.getTime() < Date.now();

            return (
              <div
                key={task._id}
                className={`task-card ${isCompleted ? "task-completed" : ""} ${
                  isOverdue ? "task-overdue" : ""
                }`}
              >
                <div className="task-header-row">
                  <label className="task-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => handleToggleStatus(task)}
                    />
                    <span className="task-title-text">{task.title}</span>
                  </label>

                  <span className={`priority-badge priority-${task.priority}`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>

                {task.description && (
                  <p className="task-desc-text">{task.description}</p>
                )}

                <div className="task-meta-footer">
                  <div className="task-meta-tags">
                    {task.subject && (
                      <span
                        className="task-subject-tag"
                        style={{
                          borderColor: task.subject.color || "#aa3bff",
                          color: task.subject.color || "#aa3bff",
                        }}
                      >
                        📚 {task.subject.name}
                      </span>
                    )}

                    {task.estimatedDuration && (
                      <span className="task-duration-tag">
                        ⏱️ {task.estimatedDuration} mins
                      </span>
                    )}

                    {deadlineDate && (
                      <span
                        className={`task-deadline-tag ${
                          isOverdue ? "text-danger" : ""
                        }`}
                      >
                        📅 {deadlineDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isOverdue ? " (Overdue)" : ""}
                      </span>
                    )}
                  </div>

                  <button
                    className="task-delete-btn"
                    title="Delete task"
                    onClick={() => handleDeleteTask(task._id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Student Task</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="auth-form">
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Finish Calculus Homework Assignment"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Chapters 4.1 to 4.5 problems 12-30"
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Subject</label>
                  <select
                    value={newTask.subject}
                    onChange={(e) =>
                      setNewTask({ ...newTask, subject: e.target.value })
                    }
                  >
                    <option value="">General (No subject)</option>
                    {subjects.map((sub) => (
                      <option key={sub._id} value={sub._id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value })
                    }
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Deadline Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(e) =>
                      setNewTask({ ...newTask, deadline: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Estimated Duration (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={newTask.estimatedDuration}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        estimatedDuration: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={savingTask}
                >
                  {savingTask ? "Saving Task..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
