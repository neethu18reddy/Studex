import { useState } from "react";

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

  const [formData, setFormData] = useState({
    name: user?.name || "",
    college: user?.college || "",
    course: user?.course || "",
    year: user?.year || "1st Year",
    subjects: Array.isArray(user?.subjects) ? user.subjects.join(", ") : "",
  });

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

  // Handle Image Upload to Cloudinary (POST /api/users/profile-image)
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

      setSuccessMsg("Profile picture uploaded to Cloudinary!");
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

  const avatarUrl =
    user.profilePicture?.url ||
    "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png";

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
            {uploadingImage && <div className="avatar-loading-overlay">Uploading...</div>}
          </div>

          <div className="avatar-actions">
            <h4 className="profile-name-title">{user.name}</h4>
            <p className="profile-email-subtitle">{user.email}</p>
            <label className="btn btn-secondary btn-sm upload-btn">
              📷 {uploadingImage ? "Uploading to Cloudinary..." : "Change Photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={uploadingImage}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {!isEditing ? (
          /* Profile Details View */
          <div className="profile-info-view">
            <div className="info-grid">
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
