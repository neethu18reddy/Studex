import { useState, useEffect } from "react";
import {
  UserIcon,
  GraduationCapIcon,
  BookOpenIcon,
  CalendarIcon,
  MailIcon,
  CopyIcon,
  CheckIcon,
  EditIcon,
  CameraIcon,
  LogoutIcon,
  XIcon,
} from "./Icons";

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
  const [copiedId, setCopiedId] = useState(false);

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

  const handleCopyId = () => {
    const id = user._id || user.id || "";
    if (id) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
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

      setSuccessMsg("Profile details updated successfully!");
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
  const handleSelectPresetAvatar = async (avatarPresetUrl) => {
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
        body: JSON.stringify({ imageUrl: avatarPresetUrl }),
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
    male: "Male",
    female: "Female",
    other: "Other / Non-Binary",
    prefer_not_to_say: "Prefer not to say",
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card profile-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="modal-header profile-modal-header">
          <div className="profile-modal-title-group">
            <div className="profile-modal-icon-badge">
              <UserIcon size={18} />
            </div>
            <div>
              <h3 className="profile-modal-heading">Student Profile</h3>
              <p className="profile-modal-subheading">Manage your academic identity and account details</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close Profile"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Feedback Banners */}
        {error && <div className="auth-error-banner">{error}</div>}
        {successMsg && <div className="auth-success-banner">{successMsg}</div>}

        {/* Hero Identity & Avatar Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-avatar-wrap">
            <img
              src={avatarUrl}
              alt={user.name}
              className="profile-hero-avatar-img"
            />
            {uploadingImage && (
              <div className="avatar-loading-overlay">
                <span className="spinner-small" />
              </div>
            )}
            <div
              className="profile-avatar-camera-btn"
              title="Change Profile Photo"
              onClick={() => setShowPresets((prev) => !prev)}
            >
              <CameraIcon size={14} />
            </div>
          </div>

          <div className="profile-hero-content">
            <div className="profile-hero-top-row">
              <h4 className="profile-hero-name">{user.name}</h4>
              <span className="profile-status-badge">
                <span className="dot online" /> Active Student
              </span>
            </div>
            
            <p className="profile-hero-email">
              <MailIcon size={14} className="profile-hero-icon" />
              {user.email}
            </p>

            <div className="profile-hero-meta-pills">
              <span className="profile-meta-pill">
                🎓 {user.course || "Undergraduate"}
              </span>
              <span className="profile-meta-pill">
                🏛️ {user.college || "Studex University"}
              </span>
              <span className="profile-meta-pill">
                📅 {user.year || "1st Year"}
              </span>
            </div>

            {/* Quick Avatar Change Controls */}
            <div className="profile-avatar-actions-row">
              <button
                type="button"
                className={`profile-action-pill-btn ${showPresets ? "active" : ""}`}
                onClick={() => {
                  setShowPresets(!showPresets);
                  setShowUrlInput(false);
                }}
              >
                🎭 Choose Avatar
              </button>
              
              <label className="profile-action-pill-btn">
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
                className={`profile-action-pill-btn ${showUrlInput ? "active" : ""}`}
                onClick={() => {
                  setShowUrlInput(!showUrlInput);
                  setShowPresets(false);
                }}
              >
                🔗 Image URL
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Avatar Presets Drawer */}
        {showPresets && (
          <div className="profile-presets-drawer">
            <div className="profile-drawer-header">
              <span className="profile-drawer-title">Choose from Student Avatars</span>
              <button
                type="button"
                className="profile-drawer-close"
                onClick={() => setShowPresets(false)}
              >
                <XIcon size={14} />
              </button>
            </div>
            <div className="profile-presets-grid">
              {AVATAR_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  className={`profile-preset-item ${avatarUrl === preset.url ? "active" : ""}`}
                  onClick={() => handleSelectPresetAvatar(preset.url)}
                  title={preset.label}
                >
                  <img src={preset.url} alt={preset.label} />
                  <span className="profile-preset-label">{preset.label.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Image URL Drawer */}
        {showUrlInput && (
          <div className="profile-url-drawer">
            <input
              type="url"
              className="profile-url-input"
              placeholder="https://example.com/avatar.jpg"
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleApplyCustomUrl}
              disabled={uploadingImage || !customImageUrl.trim()}
            >
              {uploadingImage ? "Saving..." : "Apply URL"}
            </button>
          </div>
        )}

        {/* Main Content Area: View Mode vs Edit Mode */}
        {!isEditing ? (
          <div className="profile-view-section">
            {/* 4-Card Academic Details Grid */}
            <div className="profile-details-grid">
              <div className="profile-detail-card">
                <div className="profile-detail-icon-wrap">
                  <GraduationCapIcon size={18} />
                </div>
                <div className="profile-detail-text">
                  <span className="profile-detail-label">College / University</span>
                  <span className="profile-detail-value">{user.college || "Not specified"}</span>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon-wrap">
                  <BookOpenIcon size={18} />
                </div>
                <div className="profile-detail-text">
                  <span className="profile-detail-label">Course / Major</span>
                  <span className="profile-detail-value">{user.course || "Not specified"}</span>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon-wrap">
                  <CalendarIcon size={18} />
                </div>
                <div className="profile-detail-text">
                  <span className="profile-detail-label">Academic Year</span>
                  <span className="profile-detail-value">{user.year || "1st Year"}</span>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon-wrap">
                  <UserIcon size={18} />
                </div>
                <div className="profile-detail-text">
                  <span className="profile-detail-label">Gender</span>
                  <span className="profile-detail-value">{genderLabels[user.gender] || "Not specified"}</span>
                </div>
              </div>
            </div>

            {/* Student ID Tile */}
            <div className="profile-id-tile">
              <div className="profile-id-left">
                <span className="profile-id-label">STUDENT ID (UID)</span>
                <span className="profile-id-code">{user._id || user.id || "N/A"}</span>
              </div>
              <button
                type="button"
                className="profile-copy-id-btn"
                onClick={handleCopyId}
                title="Copy Student ID"
              >
                {copiedId ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
                <span>{copiedId ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Enrolled Subjects Tile */}
            <div className="profile-subjects-tile">
              <div className="profile-subjects-header">
                <div className="profile-subjects-title-row">
                  <BookOpenIcon size={16} className="profile-subjects-icon" />
                  <span className="profile-subjects-title">Enrolled Subjects</span>
                </div>
                <span className="profile-subjects-count">
                  {Array.isArray(user.subjects) ? user.subjects.length : 0} Subjects
                </span>
              </div>

              {Array.isArray(user.subjects) && user.subjects.length > 0 ? (
                <div className="profile-subjects-chips">
                  {user.subjects.map((sub, idx) => (
                    <span key={idx} className="profile-subject-chip">
                      <span className="chip-bullet" />
                      {sub}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="profile-no-subjects">
                  <p>No subjects added to your study profile yet.</p>
                  <button
                    type="button"
                    className="profile-add-subjects-hint"
                    onClick={() => setIsEditing(true)}
                  >
                    + Add Subjects
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="profile-modal-footer">
              <div className="profile-footer-left">
                <button
                  type="button"
                  className="btn btn-primary profile-edit-cta-btn"
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
                  <EditIcon size={16} />
                  <span>Edit Profile</span>
                </button>
              </div>

              <div className="profile-footer-right">
                <button
                  type="button"
                  className="btn btn-secondary profile-logout-btn"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                >
                  <LogoutIcon size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Profile Edit Form */
          <form onSubmit={handleSaveProfile} className="profile-edit-section">
            <div className="profile-form-grid">
              <div className="profile-form-field">
                <label htmlFor="edit-name">Full Name *</label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  className="profile-form-input"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="profile-form-field">
                <label htmlFor="edit-gender">Gender</label>
                <select
                  id="edit-gender"
                  name="gender"
                  className="profile-form-select"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="male">👨 Male</option>
                  <option value="female">👩 Female</option>
                  <option value="other">🧑 Other / Non-Binary</option>
                  <option value="prefer_not_to_say">🤐 Prefer not to say</option>
                </select>
              </div>

              <div className="profile-form-field">
                <label htmlFor="edit-college">College / University</label>
                <input
                  id="edit-college"
                  name="college"
                  type="text"
                  className="profile-form-input"
                  placeholder="e.g. Stanford University"
                  value={formData.college}
                  onChange={handleChange}
                />
              </div>

              <div className="profile-form-field">
                <label htmlFor="edit-course">Course / Major</label>
                <input
                  id="edit-course"
                  name="course"
                  type="text"
                  className="profile-form-input"
                  placeholder="e.g. Computer Science"
                  value={formData.course}
                  onChange={handleChange}
                />
              </div>

              <div className="profile-form-field">
                <label htmlFor="edit-year">Academic Year</label>
                <select
                  id="edit-year"
                  name="year"
                  className="profile-form-select"
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

              <div className="profile-form-field">
                <label htmlFor="edit-subjects">Subjects (comma-separated)</label>
                <input
                  id="edit-subjects"
                  name="subjects"
                  type="text"
                  className="profile-form-input"
                  placeholder="e.g. React, Data Structures, AI"
                  value={formData.subjects}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="profile-edit-footer">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setError("");
                  setSuccessMsg("");
                }}
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
