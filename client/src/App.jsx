import { useEffect, useState, useCallback } from "react";
import "./App.css";

const API_BASE = "http://localhost:5000";

function App() {
  const [serverHealth, setServerHealth] = useState({
    status: "connecting",
    message: "Connecting to server...",
    database: "checking",
  });
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    course_name: "",
    instructor: "",
    category: "Computer Science",
    ratings: "5",
    description: "",
    isPublished: true,
  });
  const [actionFeedback, setActionFeedback] = useState("");

  // Check Backend Health
  const checkHealth = useCallback(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        setServerHealth({
          status: "online",
          message: data.message,
          database: data.database || "connected",
        });
      })
      .catch(() => {
        setServerHealth({
          status: "offline",
          message: "Backend server offline (run npm run server)",
          database: "disconnected",
        });
      });
  }, []);

  // Fetch Courses
  const fetchCourses = useCallback(() => {
    fetch(`${API_BASE}/api/courses`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCourses(data.data);
        }
      })
      .catch((err) => {
        console.error("Error fetching courses:", err);
      })
      .finally(() => {
        setLoadingCourses(false);
      });
  }, []);

  useEffect(() => {
    checkHealth();
    fetchCourses();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth, fetchCourses]);

  // Handle Form Change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle Course Creation
  const handleCreateCourse = (e) => {
    e.preventDefault();
    if (!formData.course_name.trim() || !formData.instructor.trim()) {
      setActionFeedback("Please provide course name and instructor.");
      return;
    }

    fetch(`${API_BASE}/api/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        ratings: Number(formData.ratings),
      }),
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setActionFeedback("Course created successfully!");
          setFormData({
            course_name: "",
            instructor: "",
            category: "Computer Science",
            ratings: "5",
            description: "",
            isPublished: true,
          });
          setShowAddForm(false);
          setLoadingCourses(true);
          fetchCourses();
        } else {
          setActionFeedback(`Error: ${resData.message}`);
        }
      })
      .catch((err) => {
        setActionFeedback("Failed to save course to backend.");
        console.error(err);
      });
  };

  // Handle Delete Course
  const handleDeleteCourse = (id) => {
    fetch(`${API_BASE}/api/courses/${id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionFeedback("Course deleted successfully.");
          setLoadingCourses(true);
          fetchCourses();
        }
      })
      .catch((err) => console.error("Error deleting course:", err));
  };

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    if (filter === "published") return c.isPublished;
    if (filter === "draft") return !c.isPublished;
    return true;
  });

  return (
    <div className="studex-app">
      {/* Header */}
      <header className="studex-header">
        <div className="brand-group">
          <div className="brand-logo">SX</div>
          <div>
            <h1 className="brand-title">Studex</h1>
            <p className="brand-subtitle">Student Learning & Social Network</p>
          </div>
        </div>

        <div className="status-container">
          <div className={`status-badge ${serverHealth.status}`}>
            <span className="dot"></span>
            <span>Server: {serverHealth.status.toUpperCase()}</span>
          </div>
          <div className={`status-badge ${serverHealth.database === "connected" ? "online" : "warning"}`}>
            <span className="dot"></span>
            <span>DB: {serverHealth.database.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Banner Section */}
        <section className="hero-banner">
          <div className="hero-text">
            <h2>Empower Your Academic Journey</h2>
            <p>
              Connect with peers, discover vetted student courses, share lecture
              notes, and build collaborative study groups.
            </p>
          </div>
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "Close Form" : "+ Create Course"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                checkHealth();
                setLoadingCourses(true);
                fetchCourses();
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </section>

        {actionFeedback && (
          <div className="feedback-banner">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback("")}>×</button>
          </div>
        )}

        {/* Course Creation Form Card */}
        {showAddForm && (
          <section className="card form-card">
            <h3>Add New Course</h3>
            <form onSubmit={handleCreateCourse}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="course_name">Course Name *</label>
                  <input
                    id="course_name"
                    name="course_name"
                    type="text"
                    placeholder="e.g. Full-Stack Web Development"
                    value={formData.course_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="instructor">Instructor / Lead *</label>
                  <input
                    id="instructor"
                    name="instructor"
                    type="text"
                    placeholder="e.g. Dr. Alex Morgan"
                    value={formData.instructor}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Engineering">Engineering</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="ratings">Rating (1 to 5)</label>
                  <input
                    id="ratings"
                    name="ratings"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.ratings}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Course Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  placeholder="Overview of syllabus, modules, and prerequisites..."
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>

              <div className="form-checkbox">
                <input
                  id="isPublished"
                  name="isPublished"
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                />
                <label htmlFor="isPublished">Publish immediately to student directory</label>
              </div>

              <div className="form-buttons">
                <button type="submit" className="btn btn-primary">
                  Save Course
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Course Directory Section */}
        <section className="courses-section">
          <div className="section-header">
            <div>
              <h3>Course Directory</h3>
              <p className="section-desc">Browse registered courses and study curriculum.</p>
            </div>

            <div className="filter-tabs">
              <button
                className={`tab-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All ({courses.length})
              </button>
              <button
                className={`tab-btn ${filter === "published" ? "active" : ""}`}
                onClick={() => setFilter("published")}
              >
                Published ({courses.filter((c) => c.isPublished).length})
              </button>
              <button
                className={`tab-btn ${filter === "draft" ? "active" : ""}`}
                onClick={() => setFilter("draft")}
              >
                Drafts ({courses.filter((c) => !c.isPublished).length})
              </button>
            </div>
          </div>

          {loadingCourses ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading courses from Studex API...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="empty-state card">
              <h4>No courses found</h4>
              <p>
                {serverHealth.status === "offline"
                  ? "Connect your backend server to load and create courses."
                  : "Click '+ Create Course' above to register your first course."}
              </p>
            </div>
          ) : (
            <div className="course-grid">
              {filteredCourses.map((course) => (
                <div className="course-card card" key={course._id || course.course_name}>
                  <div className="course-header">
                    <span className="category-pill">{course.category || "General"}</span>
                    <span
                      className={`badge ${course.isPublished ? "badge-success" : "badge-neutral"}`}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <h4 className="course-title">{course.course_name}</h4>
                  <p className="course-instructor">Instructor: {course.instructor}</p>

                  {course.description && (
                    <p className="course-desc">{course.description}</p>
                  )}

                  <div className="course-footer">
                    <div className="rating">
                      ⭐ <strong>{course.ratings || 0}</strong> / 5
                    </div>
                    {course._id && (
                      <button
                        className="btn-delete"
                        title="Delete Course"
                        onClick={() => handleDeleteCourse(course._id)}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="studex-footer">
        <p>Studex MERN Stack Application &bull; Student Social & Learning Platform</p>
      </footer>
    </div>
  );
}

export default App;