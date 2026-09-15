import { useState } from "react";

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  apiBase,
  initialMode = "login",
}) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    course: "",
    year: "1st Year",
    subjects: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint =
      mode === "login" ? `${apiBase}/api/auth/login` : `${apiBase}/api/auth/register`;

    const payload =
      mode === "login"
        ? { email: formData.email, password: formData.password }
        : {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            college: formData.college,
            course: formData.course,
            year: formData.year,
            subjects: formData.subjects,
          };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || `${mode === "login" ? "Login" : "Registration"} failed`);
      }

      // Save token to localStorage
      if (data.token) {
        localStorage.setItem("studex_token", data.token);
      }

      onAuthSuccess(data.data, data.token);
      onClose();
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === "login" ? "Welcome Back to Studex" : "Create Student Account"}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name *</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                placeholder="e.g. Alex Johnson"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address *</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              placeholder="student@university.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password *</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          {mode === "register" && (
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="auth-college">College / University</label>
                  <input
                    id="auth-college"
                    name="college"
                    type="text"
                    placeholder="e.g. Stanford University"
                    value={formData.college}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-course">Course / Major</label>
                  <input
                    id="auth-course"
                    name="course"
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.course}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="auth-year">Academic Year</label>
                  <select
                    id="auth-year"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="auth-subjects">Subjects (comma separated)</label>
                  <input
                    id="auth-subjects"
                    name="subjects"
                    type="text"
                    placeholder="e.g. Web Dev, Algorithms, AI"
                    value={formData.subjects}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Sign In to Studex"
                : "Register Student Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
