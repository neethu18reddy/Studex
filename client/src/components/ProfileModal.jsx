import { useState, useEffect } from "react";

const AVATAR_PRESETS = [
  { label: "Male Student 1", gender: "male", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-7.png" },
  { label: "Male Student 2", gender: "male", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-3.png" },
  { label: "Male Student 3", gender: "male", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-9.png" },
  { label: "Female Student 1", gender: "female", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-8.png" },
  { label: "Female Student 2", gender: "female", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-4.png" },
  { label: "Female Student 3", gender: "female", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-6.png" },
  { label: "Neutral Avatar 1", gender: "other", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png" },
  { label: "Neutral Avatar 2", gender: "other", url: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png" },
];

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  token,
  apiBase,
  onProfileUpdated,
  onLogout,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    gender: user?.gender || "male",
    college: user?.college || "",
    course: user?.course || "",
    year: user?.year || "1st Year",
    subjects: Array.isArray(user?.subjects) ? user.subjects.join(", ") : "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        gender: user.gender || "male",
        college: user.college || "",
        course: user.course || "",
        year: user.year || "1st Year",
        subjects: Array.isArray(user.subjects) ? user.subjects.join(", ") : "",
      });
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Profile Details Update (PUT /api/users/me)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          gender: formData.gender,
          college: formData.college,
          course: formData.course,
          year: formData.year,
          subjects: formData.subjects,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      setSuccessMsg("Profile updated successfully!");
      setIsEditing(false);
      onProfileUpdated(data.data);
    } catch (err) {
      setError(err.message || "Could not update profile");
    } finally {
      setLoading(false);
    }
  };

  // Handle Image File Upload
  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setSuccessMsg("");
    setUploadingImage(true);

    const bodyData = new FormData();
    bodyData.append("image", file);

    try {
      const res = await fetch(`${apiBase}/api/users/profile-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: bodyData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Image upload failed");
      }

      setSuccessMsg("Profile picture updated!");
      onProfileUpdated({
        ...user,
        profilePicture: data.data.profilePicture,
      });
    } catch (err) {
      setError(err.message || "Failed to upload profile picture");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Preset Avatar Selection
  const handleSelectPresetAvatar = async (avatarUrl) => {
    setError("");
    setSuccessMsg("");
    setUploadingImage(true);

    try {
      const res = await fetch(`${apiBase}/api/users/profile-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageUrl: avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to apply avatar");
      }

      setSuccessMsg("Avatar updated!");
      setShowPresets(false);
      onProfileUpdated({
        ...user,
        profilePicture: data.data.profilePicture,
      });
    } catch (err) {
      setError(err.message || "Could not apply avatar preset");
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle Custom Image URL Submission
  const handleApplyCustomUrl = async () => {
    if (!customImageUrl.trim()) return;

    setError("");
    setSuccessMsg("");
    setUploadingImage(true);

    try {
      const res = await fetch(`${apiBase}/api/users/profile-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageUrl: customImageUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update image URL");
      }

      setSuccessMsg("Profile picture updated!");
      setShowUrlInput(false);
      setCustomImageUrl("");
      onProfileUpdated({
        ...user,
        profilePicture: data.data.profilePicture,
      });
    } catch (err) {
      setError(err.message || "Could not apply image URL");
    } finally {
      setUploadingImage(false);
    }
  };

  const avatarUrl =
    user.profilePicture?.url ||
    "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png";

  const genderLabels = {
    male: "👨 Male",
    female: "👩 Female",
    other: "🧑 Other / Non-Binary",
    prefer_not_to_say: "🤐 Prefer not to say",
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Student Profile</h3>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}
        {successMsg && <div className="auth-success-banner">{successMsg}</div>}

        {/* Profile Avatar & Upload Section */}
        <div className="profile-header-section">
          <div className="avatar-wrapper">
            <img src={avatarUrl} alt={user.name} className="profile-large-avatar" />
            {uploadingImage && <div className="avatar-loading-overlay">Saving...</div>}
          </div>

          <div className="avatar-actions">
            <h4 className="profile-name-title">{user.name}</h4>
            <p className="profile-email-subtitle">{user.email}</p>
            
            <div className="avatar-buttons-row">
              <button
                type="button"
                className="btn btn-secondary btn-sm upload-btn"
                onClick={() => setShowPresets(!showPresets)}
              >
                🎭 Choose Avatar
              </button>
              <label className="btn btn-secondary btn-sm upload-btn">
                📁 Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  disabled={uploadingImage}
                  style={{ display: "none" }}
                />
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm upload-btn"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                🔗 Paste URL
              </button>
            </div>

            {/* Avatar Preset Gallery */}
            {showPresets && (
              <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.78rem", color: "#9ca3af" }}>
                  Select a gender avatar preset:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <img
                      key={idx}
                      src={preset.url}
                      alt={preset.label}
                      title={preset.label}
                      onClick={() => handleSelectPresetAvatar(preset.url)}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        border: avatarUrl === preset.url ? "2px solid #aa3bff" : "2px solid transparent",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                      onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  ))}
                </div>
              </div>
            )}

            {showUrlInput && (
              <div className="url-input-popover">
                <input
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleApplyCustomUrl}
                  disabled={uploadingImage}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {!isEditing ? (
          /* Profile Details View */
          <div className="profile-info-view">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-value">{genderLabels[user.gender] || "Not specified"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">College / University</span>
                <span className="info-value">{user.college || "Not specified"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Course / Major</span>
                <span className="info-value">{user.course || "Not specified"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Academic Year</span>
                <span className="info-value">{user.year || "Not specified"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Student ID</span>
                <span className="info-value monospace">{user._id || user.id}</span>
              </div>
            </div>

            <div className="subjects-section">
              <span className="info-label">Enrolled Subjects</span>
              {Array.isArray(user.subjects) && user.subjects.length > 0 ? (
                <div className="subject-tags">
                  {user.subjects.map((sub, idx) => (
                    <span key={idx} className="subject-tag">
                      {sub}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="no-subjects">No subjects added yet.</p>
              )}
            </div>

            <div className="profile-footer-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setFormData({
                    name: user.name || "",
                    gender: user.gender || "male",
                    college: user.college || "",
                    course: user.course || "",
                    year: user.year || "1st Year",
                    subjects: Array.isArray(user.subjects) ? user.subjects.join(", ") : "",
                  });
                  setIsEditing(true);
                  setError("");
                  setSuccessMsg("");
                }}
              >
                ✏️ Edit Profile
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-danger-outline"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        ) : (
          /* Profile Edit Form */
          <form onSubmit={handleSaveProfile} className="profile-edit-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-name">Full Name *</label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-gender">Gender</label>
                <select
                  id="edit-gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="male">👨 Male</option>
                  <option value="female">👩 Female</option>
                  <option value="other">🧑 Other / Non-Binary</option>
                  <option value="prefer_not_to_say">🤐 Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edit-college">College / University</label>
                <input
                  id="edit-college"
                  name="college"
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={formData.college}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-course">Course / Major</label>
                <input
                  id="edit-course"
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
                <label htmlFor="edit-year">Academic Year</label>
                <select
                  id="edit-year"
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
                <label htmlFor="edit-subjects">Subjects (comma separated)</label>
                <input
                  id="edit-subjects"
                  name="subjects"
                  type="text"
                  placeholder="e.g. React, Node.js, MongoDB"
                  value={formData.subjects}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-buttons profile-edit-buttons">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

