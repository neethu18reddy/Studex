import { useState, useEffect, useCallback } from "react";

export default function AcademicWorkspace({ token, apiBase, onError, onFeedback }) {
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [activeSubject, setActiveSubject] = useState(null);

  // Resources state
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceFilter, setResourceFilter] = useState("all");
  const [resourceSearch, setResourceSearch] = useState("");

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceModalMode, setResourceModalMode] = useState("file"); // 'file' or 'link'

  // Subject Form State
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    semester: "Semester 1",
    color: "#aa3bff",
    description: "",
  });

  // Resource Form State
  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    url: "",
    tags: "",
    file: null,
  });
  const [submittingResource, setSubmittingResource] = useState(false);
  const [submittingSubject, setSubmittingSubject] = useState(false);

  // 1. Fetch Student's Subjects
  const fetchSubjects = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingSubjects(true);
      const res = await fetch(`${apiBase}/api/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubjects(data.data);
        if (data.data.length > 0) {
          setActiveSubject((prev) =>
            prev ? data.data.find((s) => s._id === prev._id) || data.data[0] : data.data[0]
          );
        } else {
          setActiveSubject(null);
        }
      }
    } catch (err) {
      onError("Failed to load subjects.");
      console.error(err);
    } finally {
      setLoadingSubjects(false);
    }
  }, [apiBase, token, onError]);

  // 2. Fetch Resources for Active Subject
  const fetchResources = useCallback(async () => {
    if (!token || !activeSubject) {
      setResources([]);
      return;
    }
    try {
      setLoadingResources(true);
      let query = `?subject=${activeSubject._id}`;
      if (resourceFilter !== "all") query += `&type=${resourceFilter}`;
      if (resourceSearch.trim()) query += `&search=${encodeURIComponent(resourceSearch.trim())}`;

      const res = await fetch(`${apiBase}/api/resources${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResources(data.data);
      }
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoadingResources(false);
    }
  }, [apiBase, token, activeSubject, resourceFilter, resourceSearch]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (activeSubject) {
      fetchResources();
    }
  }, [activeSubject, fetchResources]);

  // Handle Create Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;

    setSubmittingSubject(true);
    try {
      const res = await fetch(`${apiBase}/api/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subjectForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback(`Subject "${data.data.name}" created!`);
        setSubjectForm({
          name: "",
          code: "",
          semester: "Semester 1",
          color: "#aa3bff",
          description: "",
        });
        setShowSubjectModal(false);
        await fetchSubjects();
        setActiveSubject(data.data);
      } else {
        onError(data.message || "Failed to create subject");
      }
    } catch (err) {
      onError("Error saving subject.");
    } finally {
      setSubmittingSubject(false);
    }
  };

  // Handle Delete Subject
  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${subjectName}" and all of its attached resources?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/subjects/${subjectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback(`Subject "${subjectName}" deleted.`);
        await fetchSubjects();
      } else {
        onError(data.message || "Failed to delete subject");
      }
    } catch (err) {
      onError("Error deleting subject.");
    }
  };

  // Handle Create Resource (File upload or Link)
  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.title.trim()) return;
    if (!activeSubject) return;

    setSubmittingResource(true);
    try {
      let res;
      if (resourceModalMode === "file") {
        if (!resourceForm.file) {
          onError("Please select a file to upload.");
          setSubmittingResource(false);
          return;
        }

        const formData = new FormData();
        formData.append("title", resourceForm.title);
        formData.append("description", resourceForm.description);
        formData.append("subject", activeSubject._id);
        formData.append("tags", resourceForm.tags);
        formData.append("file", resourceForm.file);

        res = await fetch(`${apiBase}/api/resources`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        // Link resource
        if (!resourceForm.url.trim()) {
          onError("Please enter a valid URL.");
          setSubmittingResource(false);
          return;
        }

        res = await fetch(`${apiBase}/api/resources`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: resourceForm.title,
            description: resourceForm.description,
            subject: activeSubject._id,
            url: resourceForm.url,
            tags: resourceForm.tags,
            type: "link",
          }),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback(`Resource "${data.data.title}" added to ${activeSubject.name}!`);
        setResourceForm({
          title: "",
          description: "",
          url: "",
          tags: "",
          file: null,
        });
        setShowResourceModal(false);
        fetchResources();
        fetchSubjects(); // update resource count
      } else {
        onError(data.message || "Failed to add resource");
      }
    } catch (err) {
      onError("Error saving resource to workspace.");
    } finally {
      setSubmittingResource(false);
    }
  };

  // Handle Delete Resource
  const handleDeleteResource = async (resourceId, title) => {
    try {
      const res = await fetch(`${apiBase}/api/resources/${resourceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback(`Resource "${title}" removed.`);
        fetchResources();
        fetchSubjects(); // update resource count
      } else {
        onError(data.message || "Failed to delete resource");
      }
    } catch (err) {
      onError("Error deleting resource.");
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case "pdf":
        return "📄";
      case "image":
        return "🖼️";
      case "document":
        return "📝";
      case "link":
      default:
        return "🔗";
    }
  };

  return (
    <div className="academic-workspace">
      {/* Workspace Header */}
      <div className="workspace-header">
        <div>
          <h2>Academic Workspace</h2>
          <p className="section-desc">
            Organize study materials, lecture notes, PDFs, code repos, and research by subject.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowSubjectModal(true)}
        >
          + Add Subject
        </button>
      </div>

      {/* Subjects Navigation Bar */}
      <div className="subjects-nav-container">
        {loadingSubjects ? (
          <div className="subjects-loading">Loading your subjects...</div>
        ) : subjects.length === 0 ? (
          <div className="empty-subjects-banner">
            <span>No subjects created yet. Click <strong>"+ Add Subject"</strong> to get started!</span>
          </div>
        ) : (
          <div className="subjects-scroll-list">
            {subjects.map((sub) => {
              const isActive = activeSubject?._id === sub._id;
              return (
                <div
                  key={sub._id}
                  className={`subject-pill-item ${isActive ? "active" : ""}`}
                  style={{
                    borderColor: isActive ? sub.color || "var(--accent)" : "transparent",
                  }}
                  onClick={() => setActiveSubject(sub)}
                >
                  <span
                    className="subject-color-dot"
                    style={{ backgroundColor: sub.color || "#aa3bff" }}
                  ></span>
                  <div className="subject-pill-text">
                    <span className="subject-pill-name">{sub.name}</span>
                    {sub.code && <span className="subject-pill-code">{sub.code}</span>}
                  </div>
                  <span className="subject-resource-count">
                    {sub.resourceCount || 0}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Subject Workspace */}
      {activeSubject && (
        <div className="active-subject-card card">
          <div className="active-subject-header">
            <div className="active-subject-info">
              <div className="subject-title-row">
                <span
                  className="subject-dot-large"
                  style={{ backgroundColor: activeSubject.color || "#aa3bff" }}
                ></span>
                <h3>{activeSubject.name}</h3>
                {activeSubject.code && (
                  <span className="subject-badge-code">{activeSubject.code}</span>
                )}
                <span className="subject-badge-semester">{activeSubject.semester}</span>
              </div>
              {activeSubject.description && (
                <p className="subject-desc-text">{activeSubject.description}</p>
              )}
            </div>

            <div className="subject-action-buttons">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setResourceModalMode("file");
                  setShowResourceModal(true);
                }}
              >
                + Add Resource
              </button>
              <button
                className="btn btn-secondary btn-sm btn-danger-outline"
                onClick={() => handleDeleteSubject(activeSubject._id, activeSubject.name)}
                title="Delete this subject and its resources"
              >
                🗑️ Delete Subject
              </button>
            </div>
          </div>

          {/* Resource Filter Bar */}
          <div className="resource-filter-toolbar">
            <div className="resource-filter-tabs">
              {[
                { id: "all", label: "All Formats" },
                { id: "pdf", label: "📄 PDFs" },
                { id: "image", label: "🖼️ Images" },
                { id: "document", label: "📝 Documents" },
                { id: "link", label: "🔗 Links" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${resourceFilter === tab.id ? "active" : ""}`}
                  onClick={() => setResourceFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="resource-search-box">
              <input
                type="text"
                placeholder="Search resources..."
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Resources Grid */}
          <div className="resources-grid-container">
            {loadingResources ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading {activeSubject.name} resources...</p>
              </div>
            ) : resources.length === 0 ? (
              <div className="empty-resources-state">
                <span className="empty-icon">📂</span>
                <h4>No resources in this subject</h4>
                <p>
                  Upload PDFs, lecture slides, cheatsheet diagrams, or save helpful web links.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowResourceModal(true)}
                >
                  + Upload First Resource
                </button>
              </div>
            ) : (
              <div className="resources-grid">
                {resources.map((res) => (
                  <div key={res._id} className="resource-item-card card">
                    <div className="resource-card-top">
                      <div className="resource-type-tag-wrap">
                        <span className={`resource-type-tag ${res.type}`}>
                          {getResourceIcon(res.type)} {res.type.toUpperCase()}
                        </span>
                        {res.fileSize > 0 && (
                          <span className="resource-filesize">
                            {formatBytes(res.fileSize)}
                          </span>
                        )}
                      </div>
                      <button
                        className="btn-delete"
                        title="Delete Resource"
                        onClick={() => handleDeleteResource(res._id, res.title)}
                      >
                        🗑️
                      </button>
                    </div>

                    <h4 className="resource-title">{res.title}</h4>
                    {res.description && (
                      <p className="resource-desc">{res.description}</p>
                    )}

                    {Array.isArray(res.tags) && res.tags.length > 0 && (
                      <div className="resource-tags-row">
                        {res.tags.map((t, idx) => (
                          <span key={idx} className="resource-mini-tag">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="resource-card-bottom">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm resource-open-btn"
                      >
                        {res.type === "link" ? "🌐 Visit Link" : "⬇️ View / Download"}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create Subject Modal */}
      {showSubjectModal && (
        <div className="modal-backdrop" onClick={() => setShowSubjectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Academic Subject</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowSubjectModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="auth-form">
              <div className="form-group">
                <label htmlFor="sub-name">Subject Name *</label>
                <input
                  id="sub-name"
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms"
                  value={subjectForm.name}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="sub-code">Subject Code</label>
                  <input
                    id="sub-code"
                    type="text"
                    placeholder="e.g. CS201"
                    value={subjectForm.code}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, code: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sub-semester">Semester / Term</label>
                  <select
                    id="sub-semester"
                    value={subjectForm.semester}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, semester: e.target.value })
                    }
                  >
                    <option value="Semester 1">Semester 1</option>
                    <option value="Semester 2">Semester 2</option>
                    <option value="Semester 3">Semester 3</option>
                    <option value="Semester 4">Semester 4</option>
                    <option value="Semester 5">Semester 5</option>
                    <option value="Semester 6">Semester 6</option>
                    <option value="Semester 7">Semester 7</option>
                    <option value="Semester 8">Semester 8</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sub-color">Theme Color</label>
                <div className="color-picker-row">
                  {[
                    "#aa3bff",
                    "#3b82f6",
                    "#10b981",
                    "#f59e0b",
                    "#ec4899",
                    "#6366f1",
                    "#14b8a6",
                  ].map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={`color-choice-btn ${
                        subjectForm.color === col ? "selected" : ""
                      }`}
                      style={{ backgroundColor: col }}
                      onClick={() => setSubjectForm({ ...subjectForm, color: col })}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="sub-desc">Description (Optional)</label>
                <textarea
                  id="sub-desc"
                  rows="2"
                  placeholder="Subject syllabus, instructor notes, or prerequisites..."
                  value={subjectForm.description}
                  onChange={(e) =>
                    setSubjectForm({ ...subjectForm, description: e.target.value })
                  }
                />
              </div>

              <div className="form-buttons">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingSubject}
                >
                  {submittingSubject ? "Creating..." : "Save Subject"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSubjectModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Resource Modal (File Upload or Link) */}
      {showResourceModal && activeSubject && (
        <div className="modal-backdrop" onClick={() => setShowResourceModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Resource to {activeSubject.name}</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowResourceModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="auth-tab-switch">
              <button
                type="button"
                className={`auth-tab ${resourceModalMode === "file" ? "active" : ""}`}
                onClick={() => setResourceModalMode("file")}
              >
                📁 Upload File (PDF / Image / Doc)
              </button>
              <button
                type="button"
                className={`auth-tab ${resourceModalMode === "link" ? "active" : ""}`}
                onClick={() => setResourceModalMode("link")}
              >
                🔗 External Link
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="auth-form">
              <div className="form-group">
                <label htmlFor="res-title">Resource Title *</label>
                <input
                  id="res-title"
                  type="text"
                  placeholder="e.g. Lecture 01 - Asymptotic Analysis Notes"
                  value={resourceForm.title}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, title: e.target.value })
                  }
                  required
                />
              </div>

              {resourceModalMode === "file" ? (
                <div className="form-group">
                  <label htmlFor="res-file">
                    Select File (PDF, Image, Word, PPT, Text - Max 15MB) *
                  </label>
                  <input
                    id="res-file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx,.txt,.rtf,.epub"
                    onChange={(e) =>
                      setResourceForm({
                        ...resourceForm,
                        file: e.target.files[0] || null,
                      })
                    }
                    required
                  />
                  {resourceForm.file && (
                    <span className="file-selected-text">
                      Selected: {resourceForm.file.name} (
                      {formatBytes(resourceForm.file.size)})
                    </span>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="res-url">External Web Link URL *</label>
                  <input
                    id="res-url"
                    type="url"
                    placeholder="https://youtube.com/watch?v=... or https://notion.so/..."
                    value={resourceForm.url}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, url: e.target.value })
                    }
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="res-tags">Tags (comma separated)</label>
                <input
                  id="res-tags"
                  type="text"
                  placeholder="e.g. lecture, cheatsheet, exam-prep"
                  value={resourceForm.tags}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, tags: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="res-desc">Description (Optional)</label>
                <textarea
                  id="res-desc"
                  rows="2"
                  placeholder="Summary of topics covered, chapters, or homework tips..."
                  value={resourceForm.description}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, description: e.target.value })
                  }
                />
              </div>

              <div className="form-buttons">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingResource}
                >
                  {submittingResource
                    ? resourceModalMode === "file"
                      ? "Uploading to Cloudinary..."
                      : "Saving Link..."
                    : "Save Resource"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowResourceModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
