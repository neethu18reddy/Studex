import { useEffect, useState, useCallback } from "react";
import "./App.css";
import AuthModal from "./components/AuthModal";
import ProfileModal from "./components/ProfileModal";
import AcademicWorkspace from "./components/AcademicWorkspace";
import TaskEngine from "./components/TaskEngine";
import StudyEngine from "./components/StudyEngine";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import GamificationEngine from "./components/GamificationEngine";
import HomeDashboard from "./components/HomeDashboard";
import Sidebar from "./components/Sidebar";
import CalendarModal from "./components/CalendarModal";
import UpcomingEventsModal from "./components/UpcomingEventsModal";
import StarredTasksModal from "./components/StarredTasksModal";
import QuickAddResourceModal from "./components/QuickAddResourceModal";
import QuickFocusSessionModal from "./components/QuickFocusSessionModal";
import NavbarProfileDropdown from "./components/NavbarProfileDropdown";
import StudexAIEngine from "./components/StudexAIEngine";
import SpacesEngine from "./components/SpacesEngine";
import RealTimeChatDrawer from "./components/RealTimeChatDrawer";
import RealTimeNotificationToast from "./components/RealTimeNotificationToast";
import { initSocket, disconnectSocket } from "./services/socket";
import { BookOpenIcon, TasksIcon, ClockIcon, TrophyIcon, AnalyticsIcon, SparklesIcon, UsersIcon } from "./components/Icons";

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
    gender: "male",
    college: "",
    course: "",
    year: "1st Year",
    subjects: "",
  });

  // Active Main Navigation Tab (Default is 'home' on login)
  const [activeTab, setActiveTab] = useState("home"); // 'home', 'workspace', 'tasks', 'study', 'gamification', 'analytics'
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Action & Modal States
  const [showNavbarProfileDropdown, setShowNavbarProfileDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showUpcomingEventsModal, setShowUpcomingEventsModal] = useState(false);
  const [showStarredTasksModal, setShowStarredTasksModal] = useState(false);
  const [showQuickResourceModal, setShowQuickResourceModal] = useState(false);
  const [showQuickFocusModal, setShowQuickFocusModal] = useState(false);
  const [taskTriggerAdd, setTaskTriggerAdd] = useState(0);
  const [studyTriggerCustom, setStudyTriggerCustom] = useState(0);

  // Theme State ('dark' or 'light')
  const [theme, setTheme] = useState(() => localStorage.getItem("studex_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("studex_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

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
      initSocket(API_BASE, token);
    } else {
      setAuthChecking(false);
      disconnectSocket();
    }
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth, token, fetchUserProfile]);

  // Global Smooth Scroll Reveal Observer
  useEffect(() => {
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        } else {
          if (entry.boundingClientRect.top > window.innerHeight) {
            entry.target.classList.remove("is-visible");
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      threshold: 0.08,
      rootMargin: "0px 0px -30px 0px",
    });

    const scanAndObserve = () => {
      const elements = document.querySelectorAll(
        ".card, .home-glance-item, .home-section, .analytics-momentum-card, .analytics-chart-container, .task-card, .analytics-kpi-card, .notes-card, .subject-card, .resource-item-card"
      );
      elements.forEach((el) => {
        if (!el.classList.contains("reveal-on-scroll")) {
          el.classList.add("reveal-on-scroll");
        }
        observer.observe(el);
      });
    };

    scanAndObserve();
    const timerId = setTimeout(scanAndObserve, 350);

    return () => {
      observer.disconnect();
      clearTimeout(timerId);
    };
  }, [activeTab, currentUser]);

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
            gender: authFormData.gender,
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

  if (authChecking) {
    return (
      <div className="studex-app loading-app">
        <div className="spinner"></div>
        <p>Loading Studex Academic Workspace...</p>
      </div>
    );
  }

  return (
    <div className={`studex-layout-wrapper ${currentUser ? "has-sidebar" : ""}`}>
      {currentUser && (
        <Sidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((prev) => !prev)}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentUser={currentUser}
          onOpenProfile={() => setShowProfileModal(true)}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenAddResource={() => {
            setActiveTab("workspace");
            setShowQuickResourceModal(true);
          }}
          onOpenAddTask={() => {
            setActiveTab("tasks");
            setTaskTriggerAdd((p) => p + 1);
          }}
          onOpenAddFocusSession={() => setShowQuickFocusModal(true)}
          onOpenStarredTasks={() => setShowStarredTasksModal(true)}
          onOpenCalendar={() => setShowCalendarModal(true)}
          onOpenUpcomingEvents={() => setShowUpcomingEventsModal(true)}
        />
      )}

      <div className="studex-app">
        {/* Header */}
        <header className="studex-header">
          {/* Left Side: Brand Logo & Title */}
          <div
            className="brand-group"
            onClick={() => currentUser && setActiveTab("home")}
            style={{ cursor: "pointer" }}
          >
            <div className="brand-logo">SX</div>
            <div>
              <h1 className="brand-title">Studex</h1>
              <p className="brand-subtitle">Academic Workspace & Student Network</p>
            </div>
          </div>

          {/* Right Side (Strict Left-to-Right Order): Feature Links + Profile Avatar */}
          {currentUser ? (
            <div className="navbar-right-container">
              {/* 1. Academic Workspace */}
              <button
                type="button"
                className={`navbar-feature-link ${activeTab === "workspace" ? "active" : ""}`}
                onClick={() => setActiveTab("workspace")}
                title="Academic Workspace (Subjects & Resources)"
              >
                <span className="nav-feature-icon"><BookOpenIcon size={16} /></span>
                <span className="nav-feature-label">Academic Workspace</span>
              </button>

              {/* 2. Task Engine */}
              <button
                type="button"
                className={`navbar-feature-link ${activeTab === "tasks" ? "active" : ""}`}
                onClick={() => setActiveTab("tasks")}
                title="Task Engine (Daily & Priority Tasks)"
              >
                <span className="nav-feature-icon"><TasksIcon size={16} /></span>
                <span className="nav-feature-label">Task Engine</span>
              </button>

              {/* 3. Focus Study Engine */}
              <button
                type="button"
                className={`navbar-feature-link ${activeTab === "study" ? "active" : ""}`}
                onClick={() => setActiveTab("study")}
                title="Focus Study Engine (Pomodoro & Session Timer)"
              >
                <span className="nav-feature-icon"><ClockIcon size={16} /></span>
                <span className="nav-feature-label">Focus Study Engine</span>
              </button>

              {/* 4. Gamification & Streaks */}
              <button
                type="button"
                className={`navbar-feature-link ${activeTab === "gamification" ? "active" : ""}`}
                onClick={() => setActiveTab("gamification")}
                title="Gamification & Streaks (Momentum, Badges & Level)"
              >
                <span className="nav-feature-icon"><TrophyIcon size={16} /></span>
                <span className="nav-feature-label">Gamification & Streaks</span>
              </button>

              {/* 5. Analytics & Progress Tracking */}
              <button
                type="button"
                className={`navbar-feature-link ${activeTab === "analytics" ? "active" : ""}`}
                onClick={() => setActiveTab("analytics")}
                title="Analytics & Progress Tracking (Study Goals, Velocity & Trends)"
              >
                <span className="nav-feature-icon"><AnalyticsIcon size={16} /></span>
                <span className="nav-feature-label">Analytics & Progress</span>
              </button>

              {/* 6. Studex AI Assistant & Study Planner */}
              <button
                type="button"
                className={`navbar-feature-link ai-nav-link ${activeTab === "ai" ? "active" : ""}`}
                onClick={() => setActiveTab("ai")}
                title="Studex AI (Context-Aware Study Planner & Academic Assistant)"
              >
                <span className="nav-feature-icon"><SparklesIcon size={16} /></span>
                <span className="nav-feature-label">Studex AI ✨</span>
              </button>

              {/* 7. Spaces & Collaborative Groups */}
              <button
                type="button"
                className={`navbar-feature-link ${activeTab === "spaces" ? "active" : ""}`}
                onClick={() => setActiveTab("spaces")}
                title="Studex Spaces (Study Groups, Teams & Classes)"
              >
                <span className="nav-feature-icon"><UsersIcon size={16} /></span>
                <span className="nav-feature-label">Spaces</span>
              </button>

              {/* 7. Profile Avatar Only (No text name next to it) */}
              <div className="navbar-profile-wrapper">
                <button
                  type="button"
                  className={`navbar-avatar-btn ${showNavbarProfileDropdown ? "active" : ""}`}
                  onClick={() => setShowNavbarProfileDropdown((prev) => !prev)}
                  title="Student Profile & System Status"
                  aria-label="Account Menu"
                >
                  <img
                    src={avatarUrl}
                    alt={currentUser.name}
                    className="navbar-avatar-img"
                  />
                </button>

                {/* Profile Dropdown Panel (DB, Server Status, Profile link - no logout) */}
                <NavbarProfileDropdown
                  isOpen={showNavbarProfileDropdown}
                  onClose={() => setShowNavbarProfileDropdown(false)}
                  currentUser={currentUser}
                  serverHealth={serverHealth}
                  onOpenProfileModal={() => setShowProfileModal(true)}
                />
              </div>
            </div>
          ) : (
            <div className="navbar-auth-notice">
              <span className="dot online"></span>
              <span>Studex Portal Active</span>
            </div>
          )}
        </header>

      {/* Main Content Area */}
      <main className="main-content">
        {actionFeedback && (
          <div className="feedback-banner">
            <span>{actionFeedback}</span>
            <button onClick={() => setActionFeedback("")}>&times;</button>
          </div>
        )}

        {/* 1. If NOT logged in: Gorgeous Modern Authentication & Platform Gateway */}
        {!currentUser ? (
          <div className="auth-gateway-container animate-fade-in">
            <div className="auth-gateway-hero">
              <div className="gateway-kicker-pill">
                <span className="kicker-sparkle">✨</span> Welcome to Studex Academic Platform
              </div>
              <h2 className="gateway-hero-title">
                Master Your Semesters with an <span className="highlight-ai">Intelligent Workspace</span>
              </h2>
              <p className="gateway-hero-desc">
                Everything you need to excel in university &mdash; organized subject hubs, high-speed cloud notes, Pomodoro focus tracking, deadline calendars, and context-aware AI study planning.
              </p>

              <div className="gateway-features-grid">
                <div className="gateway-feature-card">
                  <div className="gateway-feature-icon-wrap blue">📚</div>
                  <div className="gateway-feature-text">
                    <strong>Academic Workspace</strong>
                    <p>Organize lecture slides, PDFs, notes, and study links by subject.</p>
                  </div>
                </div>

                <div className="gateway-feature-card">
                  <div className="gateway-feature-icon-wrap purple">✨</div>
                  <div className="gateway-feature-text">
                    <strong>Studex AI Planner</strong>
                    <p>Generate personalized time-blocked study schedules based on live deadlines.</p>
                  </div>
                </div>

                <div className="gateway-feature-card">
                  <div className="gateway-feature-icon-wrap amber">⏱️</div>
                  <div className="gateway-feature-text">
                    <strong>Focus Study Engine</strong>
                    <p>Track Pomodoro focus sessions and build unbreakable study streaks.</p>
                  </div>
                </div>

                <div className="gateway-feature-card">
                  <div className="gateway-feature-icon-wrap green">📅</div>
                  <div className="gateway-feature-text">
                    <strong>Planner & Calendar</strong>
                    <p>Track upcoming exam dates, homework deadlines, and milestones.</p>
                  </div>
                </div>
              </div>

              <div className="gateway-trust-row">
                <span className="trust-item">🔒 Secure Student Auth</span>
                <span className="trust-dot">&bull;</span>
                <span className="trust-item">☁️ Cloudinary Storage</span>
                <span className="trust-dot">&bull;</span>
                <span className="trust-item">🧠 Gemini AI Powered</span>
              </div>
            </div>

            {/* Main Auth Form Card */}
            <div className="card auth-gateway-card">
              <div className="auth-card-header">
                <div className="auth-brand-badge">SX</div>
                <div className="auth-header-text">
                  <h3>{authMode === "login" ? "Welcome Back!" : "Join Studex"}</h3>
                  <p>{authMode === "login" ? "Enter your credentials to access your workspace" : "Create your student profile and get started"}</p>
                </div>
              </div>

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
                  Register Account
                </button>
              </div>

              {authError && <div className="auth-error-banner">{authError}</div>}

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authMode === "register" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", padding: "0.75rem", background: "rgba(170, 59, 255, 0.08)", borderRadius: "10px", border: "1px solid rgba(170, 59, 255, 0.2)" }}>
                      <img
                        src={defaultGenderAvatars[authFormData.gender] || defaultGenderAvatars.other}
                        alt="Default Avatar"
                        style={{ width: "52px", height: "52px", borderRadius: "50%", border: "2px solid #aa3bff", objectFit: "cover" }}
                      />
                      <div>
                        <strong style={{ fontSize: "0.9rem", color: "#f3f4f6" }}>Default Student Avatar</strong>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#9ca3af" }}>
                          Generated automatically for your profile based on gender.
                        </p>
                      </div>
                    </div>

                    <div className="form-grid">
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

                      <div className="form-group">
                        <label htmlFor="gate-gender">Gender *</label>
                        <select
                          id="gate-gender"
                          value={authFormData.gender}
                          onChange={(e) =>
                            setAuthFormData({ ...authFormData, gender: e.target.value })
                          }
                        >
                          <option value="male">👨 Male</option>
                          <option value="female">👩 Female</option>
                          <option value="other">🧑 Other / Non-Binary</option>
                          <option value="prefer_not_to_say">🤐 Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </>
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
          /* 2. When Logged In: Unlocks Selected Feature via Sidebar (Default: Home) */
          <>
            {/* Tab 0: Home Command Center (Default Landing Page) */}
            {activeTab === "home" && (
              <div key="home" className="tab-content-pane animate-slide-up">
                <HomeDashboard
                  token={token}
                  apiBase={API_BASE}
                  currentUser={currentUser}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenProfile={() => setShowProfileModal(true)}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                />
              </div>
            )}

            {/* Tab 1: Academic Workspace (Subjects + Resources) */}
            {activeTab === "workspace" && (
              <div key="workspace" className="tab-content-pane animate-slide-up">
                <AcademicWorkspace
                  token={token}
                  apiBase={API_BASE}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                />
              </div>
            )}

            {/* Tab 2: Student Task Engine */}
            {activeTab === "tasks" && (
              <div key="tasks" className="tab-content-pane animate-slide-up">
                <TaskEngine
                  token={token}
                  apiBase={API_BASE}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                  triggerAdd={taskTriggerAdd}
                />
              </div>
            )}

            {/* Tab 3: Focus Study Engine */}
            {activeTab === "study" && (
              <div key="study" className="tab-content-pane animate-slide-up">
                <StudyEngine
                  token={token}
                  apiBase={API_BASE}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                  triggerCustom={studyTriggerCustom}
                />
              </div>
            )}

            {/* Tab 4: Milestone 9 Progress Tracking & Analytics */}
            {activeTab === "analytics" && (
              <div key="analytics" className="tab-content-pane animate-slide-up">
                <AnalyticsDashboard
                  token={token}
                  apiBase={API_BASE}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                />
              </div>
            )}

            {/* Tab 5: Phase 10 Gamification & Streaks */}
            {activeTab === "gamification" && (
              <div key="gamification" className="tab-content-pane animate-slide-up">
                <GamificationEngine
                  token={token}
                  apiBase={API_BASE}
                  currentUser={currentUser}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                />
              </div>
            )}

            {/* Tab 6: Studex AI Assistant & Study Planner */}
            {activeTab === "ai" && (
              <div key="ai" className="tab-content-pane animate-slide-up">
                <StudexAIEngine
                  token={token}
                  apiBase={API_BASE}
                  currentUser={currentUser}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onStartFocusSession={() => {
                    setActiveTab("study");
                    setShowQuickFocusModal(true);
                  }}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                />
              </div>
            )}

            {/* Tab 7: Phase 12 Milestone 12 — Studex Spaces & Collaborative Groups */}
            {activeTab === "spaces" && (
              <div key="spaces" className="tab-content-pane animate-slide-up">
                <SpacesEngine
                  token={token}
                  apiBase={API_BASE}
                  currentUser={currentUser}
                  onError={(msg) => setActionFeedback(`Error: ${msg}`)}
                  onFeedback={(msg) => setActionFeedback(msg)}
                />
              </div>
            )}
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

      {/* Academic Calendar Modal */}
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        token={token}
        apiBase={API_BASE}
        onError={(msg) => setActionFeedback(`Error: ${msg}`)}
        onFeedback={(msg) => setActionFeedback(msg)}
        onOpenUpcoming={() => setShowUpcomingEventsModal(true)}
      />

      {/* Consolidated Upcoming Events & Deadlines Modal */}
      <UpcomingEventsModal
        isOpen={showUpcomingEventsModal}
        onClose={() => setShowUpcomingEventsModal(false)}
        token={token}
        apiBase={API_BASE}
        onError={(msg) => setActionFeedback(`Error: ${msg}`)}
        onFeedback={(msg) => setActionFeedback(msg)}
        onOpenCalendar={() => setShowCalendarModal(true)}
      />

      {/* Starred / Important Tasks Modal */}
      <StarredTasksModal
        isOpen={showStarredTasksModal}
        onClose={() => setShowStarredTasksModal(false)}
        token={token}
        apiBase={API_BASE}
        onError={(msg) => setActionFeedback(`Error: ${msg}`)}
        onFeedback={(msg) => setActionFeedback(msg)}
        onNavigateToTasks={() => setActiveTab("tasks")}
      />

      {/* Quick Pin Resource with Subject Selector Modal */}
      <QuickAddResourceModal
        isOpen={showQuickResourceModal}
        onClose={() => setShowQuickResourceModal(false)}
        token={token}
        apiBase={API_BASE}
        onError={(msg) => setActionFeedback(`Error: ${msg}`)}
        onFeedback={(msg) => setActionFeedback(msg)}
      />

      {/* Quick Focus Session Modal (Customisation, Start, Subject Option) */}
      <QuickFocusSessionModal
        isOpen={showQuickFocusModal}
        onClose={() => setShowQuickFocusModal(false)}
        token={token}
        apiBase={API_BASE}
        onError={(msg) => setActionFeedback(`Error: ${msg}`)}
        onFeedback={(msg) => setActionFeedback(msg)}
      />

      {/* Real-time Push Notifications Toast Banner */}
      <RealTimeNotificationToast />

      {/* Real-time Direct Chat & Peer Messenger Drawer */}
      {token && currentUser && (
        <RealTimeChatDrawer
          token={token}
          apiBase={API_BASE}
          currentUser={currentUser}
          onError={(msg) => setActionFeedback(`Error: ${msg}`)}
          onFeedback={(msg) => setActionFeedback(msg)}
        />
      )}
      </div>
    </div>
  );
}

export default App;