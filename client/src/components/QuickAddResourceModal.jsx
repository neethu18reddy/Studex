import React, { useState, useEffect } from "react";
import { PinIcon, XIcon } from "./Icons";

export default function QuickAddResourceModal({
  isOpen,
  onClose,
  token,
  apiBase,
  onError,
  onFeedback,
  onResourceAdded,
}) {
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [mode, setMode] = useState("file"); // 'file' or 'link'
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    url: "",
    tags: "",
    file: null,
  });

  // Fetch subjects for selector
  useEffect(() => {
    if (!token || !isOpen) return;
    setLoadingSubjects(true);
    fetch(`${apiBase}/api/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSubjects(data.data);
          if (data.data.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(data.data[0]._id);
          }
        }
      })
      .catch((err) => console.error("Error loading subjects:", err))
      .finally(() => setLoadingSubjects(false));
  }, [token, isOpen, apiBase, selectedSubjectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      onError?.("Please select a subject for this resource.");
      return;
    }
    if (!form.title.trim()) {
      onError?.("Resource title is required.");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (mode === "file") {
        if (!form.file) {
          throw new Error("Please select a file to upload.");
        }
        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("description", form.description.trim());
        formData.append("subject", selectedSubjectId);
        formData.append("tags", form.tags.trim());
        formData.append("file", form.file);

        res = await fetch(`${apiBase}/api/resources`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        if (!form.url.trim()) {
          throw new Error("Please provide a valid web link.");
        }
        res = await fetch(`${apiBase}/api/resources`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            subject: selectedSubjectId,
            tags: form.tags.trim(),
            url: form.url.trim(),
            type: "link",
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add resource");
      }

      onFeedback?.("Resource added successfully to your Academic Workspace! 📌");
      onResourceAdded?.(data.data);
      onClose();
    } catch (err) {
      onError?.(err.message || "Failed to add resource");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card quick-resource-modal animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="section-kicker">Academic Workspace Quick Pin</span>
            <h3>Add Study Resource</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab ${mode === "file" ? "active" : ""}`}
            onClick={() => setMode("file")}
          >
            Upload File / PDF
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "link" ? "active" : ""}`}
            onClick={() => setMode("link")}
          >
            Web Link / Video
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Subject Selector Prompt */}
          <div className="form-group">
            <label htmlFor="quick-res-subject">
              Select Subject for Resource *
            </label>
            {loadingSubjects ? (
              <div className="form-hint">Loading your enrolled subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="alert-box warning">
                <span>No subjects found yet. Please create a subject in Academic Workspace first.</span>
              </div>
            ) : (
              <select
                id="quick-res-subject"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                required
                autoFocus
              >
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name} ({sub.code || sub.semester || "General"})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="quick-res-title">Resource Title *</label>
            <input
              id="quick-res-title"
              type="text"
              placeholder="e.g. Chapter 4 Slide Deck / Midterm Cheatsheet"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          {mode === "file" ? (
            <div className="form-group">
              <label htmlFor="quick-res-file">
                File Attachment (PDF, Image, Word, PPT, Docs - Max 15MB) *
              </label>
              <input
                id="quick-res-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx,.txt,.rtf"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })}
                required
              />
              {form.file && (
                <span className="file-selected-text">
                  Selected: {form.file.name} ({(form.file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="quick-res-url">Web URL *</label>
              <input
                id="quick-res-url"
                type="url"
                placeholder="https://notion.so/... or https://youtube.com/..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="quick-res-tags">Tags (comma separated)</label>
            <input
              id="quick-res-tags"
              type="text"
              placeholder="e.g. syllabus, formulas, lecture3"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="quick-res-desc">Description (Optional)</label>
            <textarea
              id="quick-res-desc"
              rows="2"
              placeholder="Key takeaways or summary..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || subjects.length === 0}
            >
              {submitting
                ? mode === "file"
                  ? "Uploading to Cloud..."
                  : "Saving Link..."
                : "Add Resource"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
