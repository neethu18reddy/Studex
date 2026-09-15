import { useEffect, useState, useCallback } from "react";
import "./App.css";
import AuthModal from "./components/AuthModal";
import ProfileModal from "./components/ProfileModal";
import AcademicWorkspace from "./components/AcademicWorkspace";

const API_BASE = "http://localhost:5000";

function App() {
  const [serverHealth, setServerHealth] = useState({
    status: "connecting",
    message: "Connecting to server...",
    database: "checking",
  });
  const [actionFeedback, setActionFeedback] = useState("");

  // Auth State
  const [token, setToken] = useState(() => localStorage.getItem("studex_token") || "");
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Auth Form State (Gateway Landing)
  const [authFormData, setAuthFormData] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    course: "",
    year: "1st Year",
    subjects: "",
  });

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  // Fetch Current User Profile if token exists
  const fetchUserProfile = useCallback(async (authToken) => {
    if (!authToken) {
      setCurrentUser(null);
      setAuthChecking(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.data);
      } else {
        localStorage.removeItem("studex_token");
        setToken("");
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    if (token) {
      fetchUserProfile(token);
    } else {
      setAuthChecking(false);
    }
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth, token, fetchUserProfile]);

  // Auth Gateway Submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const endpoint =
      authMode === "login"
        ? `${API_BASE}/api/auth/login`
        : `${API_BASE}/api/auth/register`;

    const payload =
      authMode === "login"
        ? { email: authFormData.email, password: authFormData.password }
        : {
            name: authFormData.name,
            email: authFormData.email,
            password: authFormData.password,
            college: authFormData.college,
            course: authFormData.course,
            year: authFormData.year,
            subjects: authFormData.subjects,
          };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Authentication failed");
      }

      if (data.token) {
        localStorage.setItem("studex_token", data.token);
        setToken(data.token);
      }

      setCurrentUser(data.data);
      setActionFeedback(`Welcome to Studex, ${data.data.name}!`);
    } catch (err) {
      setAuthError(err.message || "An error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("studex_token");
    setToken("");
    setCurrentUser(null);
    setActionFeedback("You have been logged out. Please sign in to continue.");
  };

  const avatarUrl =
    currentUser?.profilePicture?.url ||
    "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png";

  if (authChecking) {
    return (
      <div className="studex-app loading-app">
        <div className="spinner"></div>
        <p>Loading Studex Academic Workspace...</p>
      </div>
    );
  }

  return (
    <div className="studex-app">
      {/* Header */}
      <header className="studex-header">
        <div className="brand-group">
          <div className="brand-logo">SX</div>
          <div>
            <h1 className="brand-title">Studex</h1>
            <p className="brand-subtitle">Academic Workspace & Student Network</p>
          </div>
        </div>

        {/* Right Header Status & Controls */}
        <div className="header-right-controls">
          <div className="status-container">
            <div className={`status-badge ${serverHealth.status}`}>
              <span className="dot"></span>
              <span>Server: {serverHealth.status.toUpperCase()}</span>
            </div>
            <div
              className={`status-badge ${
                serverHealth.database === "connected" ? "online" : "warning"
              }`}
            >
              <span className="dot"></span>
              <span>DB: {serverHealth.database.toUpperCase()}</span>
            </div>
          </div>

          {currentUser && (
            <div className="user-profile-menu">
              <button
                className="user-profile-btn"
                onClick={() => setShowProfileModal(true)}
                title="View Student Profile"
              >
                <img
                  src={avatarUrl}
                  alt={currentUser.name}
                  className="header-avatar"
                />
                <span className="user-name-text">{currentUser.name}</span>
              </button>
              <button
                className="btn btn-secondary btn-sm btn-danger-outline"
                onClick={handleLogout}
                title="Logout"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {actionFeedback && (
          <div className="feedback-banner">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback("")}>&times;</button>
          </div>
        )}

        {/* 1. If NOT logged in: First thing displayed is Authentication Gateway */}
        {!currentUser ? (
          <div className="auth-gateway-container">
            <div className="auth-gateway-hero">
              <div className="gateway-badge">🔐 Student Authentication Required</div>
              <h2>Sign in to access your Studex Academic Workspace</h2>
              <p>
                Organize your subjects, upload PDFs, diagrams, and lecture slides,
                manage homework resources, and collaborate with your peers.
              </p>

              <div className="gateway-features">
                <div className="feature-item">
                  <span className="feature-icon">📚</span>
                  <div>
                    <strong>Subjects & Multi-Format Resources</strong>
                    <p>Store PDFs, images, docs, and links neatly categorized by subject.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">☁️</span>
                  <div>
                    <strong>Cloudinary Cloud Storage</strong>
                    <p>High-speed cloud delivery for student study materials and profile pictures.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎓</span>
                  <div>
                    <strong>Student Profile</strong>
                    <p>Track College, Year, Major, and enrolled subjects.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Auth Form Card */}
            <div className="card auth-gateway-card">
              <div className="auth-tab-switch">
                <button
                  type="button"
                  className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                >
                  Sign Up (New Student)
                </button>
              </div>

              {authError && <div className="auth-error-banner">{authError}</div>}

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authMode === "register" && (
                  <div className="form-group">
                    <label htmlFor="gate-name">Full Name *</label>
                    <input
                      id="gate-name"
                      type="text"
                      placeholder="e.g. Maya Lin"
                      value={authFormData.name}
                      onChange={(e) =>
                        setAuthFormData({ ...authFormData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="gate-email">Student Email *</label>
                  <input
                    id="gate-email"
                    type="email"
                    placeholder="student@university.edu"
                    value={authFormData.email}
                    onChange={(e) =>
                      setAuthFormData({ ...authFormData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gate-pass">Password *</label>
                  <input
                    id="gate-pass"
                    type="password"
                    placeholder="At least 6 characters"
                    value={authFormData.password}
                    onChange={(e) =>
                      setAuthFormData({ ...authFormData, password: e.target.value })
                    }
                    minLength={6}
                    required
                  />
                </div>

                {authMode === "register" && (
                  <>
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="gate-college">College / University</label>
                        <input
                          id="gate-college"
                          type="text"
                          placeholder="e.g. Stanford University"
                          value={authFormData.college}
                          onChange={(e) =>
                            setAuthFormData({
                              ...authFormData,
                              college: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="gate-course">Course / Major</label>
                        <input
                          id="gate-course"
                          type="text"
                          placeholder="e.g. Computer Science"
                          value={authFormData.course}
                          onChange={(e) =>
                            setAuthFormData({
                              ...authFormData,
                              course: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="gate-year">Academic Year</label>
                        <select
                          id="gate-year"
                          value={authFormData.year}
                          onChange={(e) =>
                            setAuthFormData({
                              ...authFormData,
                              year: e.target.value,
                            })
                          }
                        >
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                          <option value="Postgraduate">Postgraduate</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="gate-subjects">
                          Subjects (comma separated)
                        </label>
                        <input
                          id="gate-subjects"
                          type="text"
                          placeholder="e.g. Algorithms, OS, DB"
                          value={authFormData.subjects}
                          onChange={(e) =>
                            setAuthFormData({
                              ...authFormData,
                              subjects: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? "Processing..."
                      : authMode === "login"
                      ? "Sign In to Studex"
                      : "Register Student Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* 2. When Logged In: Unlocks Academic Workspace */
          <>
            {/* Student Profile Quick Banner */}
            <section className="hero-banner student-profile-banner">
              <div className="student-profile-summary">
                <img
                  src={avatarUrl}
                  alt={currentUser.name}
                  className="student-banner-avatar"
                  onClick={() => setShowProfileModal(true)}
                  title="Click to change photo"
                />
                <div className="student-banner-details">
                  <div className="student-name-row">
                    <h2>{currentUser.name}</h2>
                    <span className="student-tag-year">
                      {currentUser.year || "Student"}
                    </span>
                  </div>
                  <p className="student-college-info">
                    {currentUser.college ? `${currentUser.college} • ` : ""}
                    {currentUser.course || "Academic Workspace"} ({currentUser.email})
                  </p>
                </div>
              </div>

              <div className="hero-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowProfileModal(true)}
                >
                  👤 Edit Profile & Photo
                </button>
                <button
                  className="btn btn-secondary btn-danger-outline"
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>
              </div>
            </section>

            {/* Academic Workspace: Subjects + Resources */}
            <AcademicWorkspace
              token={token}
              apiBase={API_BASE}
              onError={(msg) => setActionFeedback(`Error: ${msg}`)}
              onFeedback={(msg) => setActionFeedback(msg)}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="studex-footer">
        <p>Studex MERN Stack Application &bull; Academic Workspace & Resource Platform</p>
      </footer>

      {/* Student Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        token={token}
        apiBase={API_BASE}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;