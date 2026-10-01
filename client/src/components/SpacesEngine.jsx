import React, { useState, useEffect, useCallback } from "react";
import {
  UsersIcon,
  PlusIcon,
  ShieldIcon,
  CrownIcon,
  DoorIcon,
  LockIcon,
  UnlockIcon,
  CopyIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  MailIcon,
  SparklesIcon,
  ClockIcon,
  CalendarIcon,
  MessageSquareIcon,
  FolderIcon,
  FileTextIcon,
  PaperclipIcon,
  HeartIcon,
  LinkIcon,
  VideoIcon,
  ImageIcon,
  MegaphoneIcon,
  StarIcon,
} from "./Icons";
import { getSocket } from "../services/socket";

const SPACE_CATEGORIES = [
  { id: "study_group", label: "Study Group", icon: "📚", color: "#9333EA" },
  { id: "project_team", label: "Project Team", icon: "⚡", color: "#2563EB" },
  { id: "class", label: "Class / Section", icon: "🎓", color: "#059669" },
  { id: "peer_circle", label: "Peer Circle", icon: "🤝", color: "#EA580C" },
  { id: "general", label: "General Workspace", icon: "🌐", color: "#64748B" },
];

const PRESET_ICONS = ["🚀", "📚", "💻", "⚡", "🔬", "🧠", "🎯", "🎨", "🌐", "🏆", "🔥", "✨"];
const PRESET_COLORS = ["#9333EA", "#2563EB", "#059669", "#EA580C", "#DC2626", "#0891B2", "#4F46E5", "#D97706"];

export default function SpacesEngine({
  token,
  apiBase,
  currentUser,
  onError,
  onFeedback,
}) {
  // Navigation View: 'hub' or 'detail'
  const [currentView, setCurrentView] = useState("hub");
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [selectedSpaceData, setSelectedSpaceData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Hub States: 'my_spaces' or 'discover'
  const [hubTab, setHubTab] = useState("my_spaces");
  const [mySpaces, setMySpaces] = useState([]);
  const [discoverSpaces, setDiscoverSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Room Sub-Tabs: 'discussions' | 'resources' | 'tasks' | 'announcements' | 'members'
  const [activeRoomTab, setActiveRoomTab] = useState("discussions");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareResourceModal, setShowShareResourceModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // Create Space Form
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    category: "study_group",
    icon: "🚀",
    color: "#9333EA",
    isPrivate: false,
  });
  const [creating, setCreating] = useState(false);

  // Join Code Form
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joining, setJoining] = useState(false);

  // Invite Form
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [inviting, setInviting] = useState(false);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState(false);

  /* =========================================================================
     COLLABORATION STATES (Discussions, Resources, Group Tasks, Announcements)
     ========================================================================= */

  // 1. Discussions & Announcements State
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postInput, setPostInput] = useState("");
  const [postAttachmentUrl, setPostAttachmentUrl] = useState("");
  const [postAttachmentType, setPostAttachmentType] = useState("link");
  const [postAttachmentName, setPostAttachmentName] = useState("");
  const [sendingPost, setSendingPost] = useState(false);
  const [replyInputs, setReplyInputs] = useState({}); // { [postId]: string }
  const [expandedReplies, setExpandedReplies] = useState({}); // { [postId]: boolean }

  // Announcement Form State
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    isPinned: true,
  });
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);

  // 2. Shared Resources State
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceFilter, setResourceFilter] = useState("all");
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceForm, setResourceForm] = useState({
    title: "",
    description: "",
    type: "pdf",
    url: "",
    subject: "",
    tags: "",
  });
  const [sharingResource, setSharingResource] = useState(false);

  // 3. Group Tasks State
  const [groupTasks, setGroupTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    deadline: "",
    priority: "medium",
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [syncingTaskId, setSyncingTaskId] = useState(null);

  /* =========================================================================
     DATA FETCHERS
     ========================================================================= */

  // 1. Fetch User's Spaces
  const fetchMySpaces = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/api/spaces/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMySpaces(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch my spaces:", err);
    }
  }, [token, apiBase]);

  // 2. Fetch Discoverable Public Spaces
  const fetchDiscoverSpaces = useCallback(async () => {
    if (!token) return;
    try {
      let url = `${apiBase}/api/spaces/discover?`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      if (selectedCategoryFilter !== "all") url += `category=${selectedCategoryFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscoverSpaces(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch discover spaces:", err);
    }
  }, [token, apiBase, searchQuery, selectedCategoryFilter]);

  // Initial load
  useEffect(() => {
    setLoadingSpaces(true);
    Promise.all([fetchMySpaces(), fetchDiscoverSpaces()]).finally(() => {
      setLoadingSpaces(false);
    });
  }, [fetchMySpaces, fetchDiscoverSpaces]);

  // 3. Fetch Space Detail View
  const fetchSpaceDetail = useCallback(
    async (spaceId) => {
      if (!token || !spaceId) return;
      setLoadingDetail(true);
      try {
        const res = await fetch(`${apiBase}/api/spaces/${spaceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSelectedSpaceData(data.data);
        } else {
          onError?.(data.message || "Failed to load space details");
          setCurrentView("hub");
        }
      } catch (err) {
        onError?.("Network error while loading space");
        setCurrentView("hub");
      } finally {
        setLoadingDetail(false);
      }
    },
    [token, apiBase, onError]
  );

  // 4. Fetch Space Posts (Discussions & Announcements)
  const fetchPosts = useCallback(async () => {
    if (!token || !selectedSpaceId) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load space posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [token, apiBase, selectedSpaceId]);

  // 5. Fetch Shared Resources
  const fetchResources = useCallback(async () => {
    if (!token || !selectedSpaceId) return;
    setLoadingResources(true);
    try {
      let url = `${apiBase}/api/spaces/${selectedSpaceId}/resources?`;
      if (resourceFilter !== "all") url += `type=${resourceFilter}&`;
      if (resourceSearch.trim()) url += `search=${encodeURIComponent(resourceSearch.trim())}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResources(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load space resources:", err);
    } finally {
      setLoadingResources(false);
    }
  }, [token, apiBase, selectedSpaceId, resourceFilter, resourceSearch]);

  // 6. Fetch Group Tasks
  const fetchGroupTasks = useCallback(async () => {
    if (!token || !selectedSpaceId) return;
    setLoadingTasks(true);
    try {
      let url = `${apiBase}/api/spaces/${selectedSpaceId}/tasks?`;
      if (taskStatusFilter !== "all") url += `status=${taskStatusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGroupTasks(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load group tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  }, [token, apiBase, selectedSpaceId, taskStatusFilter]);

  // Trigger room data fetches when activeRoomTab changes
  useEffect(() => {
    if (currentView === "detail" && selectedSpaceId) {
      if (activeRoomTab === "discussions" || activeRoomTab === "announcements") {
        fetchPosts();
      } else if (activeRoomTab === "resources") {
        fetchResources();
      } else if (activeRoomTab === "tasks") {
        fetchGroupTasks();
      }
    }
  }, [currentView, selectedSpaceId, activeRoomTab, fetchPosts, fetchResources, fetchGroupTasks]);

  // Space real-time typing indicators: { [userId]: { name, profilePicture } }
  const [spaceTypingUsers, setSpaceTypingUsers] = useState({});

  // Socket.io Real-time Space Synchronizer
  useEffect(() => {
    if (currentView !== "detail" || !selectedSpaceId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join Space Room
    socket.emit("space:join", { spaceId: selectedSpaceId });

    // 1. Real-time New Discussion Post / Announcement
    const handleNewPost = (post) => {
      setPosts((prev) => [post, ...prev.filter((p) => p._id !== post._id)]);
    };

    // 2. Real-time Post Reply
    const handlePostReply = ({ postId, updatedPost }) => {
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? updatedPost : p))
      );
    };

    // 3. Real-time Post Liked
    const handlePostLiked = ({ postId, likesCount }) => {
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likesCount } : p))
      );
    };

    // 4. Real-time Shared Resource
    const handleNewResource = (resource) => {
      setResources((prev) => [resource, ...prev.filter((r) => r._id !== resource._id)]);
    };

    // 5. Real-time Group Task Created
    const handleTaskCreated = (task) => {
      setGroupTasks((prev) => [task, ...prev.filter((t) => t._id !== task._id)]);
    };

    // 6. Real-time Group Task Updated
    const handleTaskUpdated = (task) => {
      setGroupTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, ...task } : t))
      );
    };

    // 7. Real-time Space Typing Indicator
    const handleSpaceTyping = ({ spaceId, user: typingUser, isTyping }) => {
      if (spaceId !== selectedSpaceId || typingUser._id === currentUser?._id) return;

      setSpaceTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[typingUser._id] = typingUser;
        } else {
          delete next[typingUser._id];
        }
        return next;
      });
    };

    socket.on("space:new_post", handleNewPost);
    socket.on("space:post_reply", handlePostReply);
    socket.on("space:post_liked", handlePostLiked);
    socket.on("space:new_resource", handleNewResource);
    socket.on("space:task_created", handleTaskCreated);
    socket.on("space:task_updated", handleTaskUpdated);
    socket.on("space:typing", handleSpaceTyping);

    return () => {
      socket.emit("space:leave", { spaceId: selectedSpaceId });
      socket.off("space:new_post", handleNewPost);
      socket.off("space:post_reply", handlePostReply);
      socket.off("space:post_liked", handlePostLiked);
      socket.off("space:new_resource", handleNewResource);
      socket.off("space:task_created", handleTaskCreated);
      socket.off("space:task_updated", handleTaskUpdated);
      socket.off("space:typing", handleSpaceTyping);
      setSpaceTypingUsers({});
    };
  }, [currentView, selectedSpaceId, currentUser]);

  const openSpaceDetail = (spaceId) => {
    setSelectedSpaceId(spaceId);
    setCurrentView("detail");
    setActiveRoomTab("discussions");
    fetchSpaceDetail(spaceId);
  };

  /* =========================================================================
     DISCUSSIONS & ANNOUNCEMENTS HANDLERS
     ========================================================================= */

  const spaceTypingTimeoutRef = React.useRef(null);

  const handlePostInputChange = (e) => {
    const val = e.target.value;
    setPostInput(val);

    const socket = getSocket();
    if (socket && selectedSpaceId) {
      socket.emit("space:typing", {
        spaceId: selectedSpaceId,
        isTyping: true,
      });

      if (spaceTypingTimeoutRef.current) clearTimeout(spaceTypingTimeoutRef.current);
      spaceTypingTimeoutRef.current = setTimeout(() => {
        socket.emit("space:typing", {
          spaceId: selectedSpaceId,
          isTyping: false,
        });
      }, 2000);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postInput.trim()) return;

    setSendingPost(true);
    const socket = getSocket();
    if (socket && selectedSpaceId) {
      socket.emit("space:typing", { spaceId: selectedSpaceId, isTyping: false });
    }
    try {
      const attachments = postAttachmentUrl.trim()
        ? [{ type: postAttachmentType, url: postAttachmentUrl.trim(), name: postAttachmentName.trim() || "Resource Link" }]
        : [];

      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: postInput.trim(),
          type: "discussion",
          attachments,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to post message");
      }

      setPostInput("");
      setPostAttachmentUrl("");
      setPostAttachmentName("");
      onFeedback?.("Posted to discussion!");
      fetchPosts();
    } catch (err) {
      onError?.(err.message || "Could not publish post");
    } finally {
      setSendingPost(false);
    }
  };

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      onError?.("Please fill out both announcement title and message.");
      return;
    }

    setPublishingAnnouncement(true);
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: announcementForm.title.trim(),
          content: announcementForm.content.trim(),
          type: "announcement",
          isPinned: announcementForm.isPinned,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to publish announcement");
      }

      onFeedback?.("📢 Official Announcement published to Space!");
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: "", content: "", isPinned: true });
      fetchPosts();
    } catch (err) {
      onError?.(err.message || "Could not publish announcement");
    } finally {
      setPublishingAnnouncement(false);
    }
  };

  const handleReplyPost = async (postId) => {
    const replyText = replyInputs[postId];
    if (!replyText || !replyText.trim()) return;

    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/posts/${postId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to add reply");
      }

      setReplyInputs((prev) => ({ ...prev, [postId]: "" }));
      setExpandedReplies((prev) => ({ ...prev, [postId]: true }));
      fetchPosts();
    } catch (err) {
      onError?.(err.message || "Could not post reply");
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId
              ? {
                  ...p,
                  hasLiked: data.liked,
                  likesCount: data.likesCount,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
    }
  };

  const handleTogglePin = async (postId) => {
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/posts/${postId}/pin`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback?.(data.message);
        fetchPosts();
      }
    } catch (err) {
      onError?.("Could not update pin status");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback?.("Post deleted");
        fetchPosts();
      }
    } catch (err) {
      onError?.("Could not delete post");
    }
  };

  /* =========================================================================
     SHARED RESOURCES HANDLERS
     ========================================================================= */

  const handleShareResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.title.trim() || !resourceForm.url.trim()) {
      onError?.("Please enter a title and URL for the resource.");
      return;
    }

    setSharingResource(true);
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(resourceForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to share resource");
      }

      onFeedback?.(`Shared "${resourceForm.title}" with the Space!`);
      setShowShareResourceModal(false);
      setResourceForm({
        title: "",
        description: "",
        type: "pdf",
        url: "",
        subject: "",
        tags: "",
      });
      fetchResources();
    } catch (err) {
      onError?.(err.message || "Could not share resource");
    } finally {
      setSharingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId, title) => {
    if (!window.confirm(`Delete "${title}" from space resources?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/resources/${resourceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback?.("Resource removed from space");
        fetchResources();
      }
    } catch (err) {
      onError?.("Could not delete resource");
    }
  };

  /* =========================================================================
     GROUP TASKS & PERSONAL <-> GROUP INTEGRATION HANDLERS
     ========================================================================= */

  const handleCreateGroupTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      onError?.("Task title is required.");
      return;
    }

    setCreatingTask(true);
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create group task");
      }

      onFeedback?.(`Group Task created & synced! ⭐`);
      setShowCreateTaskModal(false);
      setTaskForm({
        title: "",
        description: "",
        assignedTo: "",
        deadline: "",
        priority: "medium",
      });
      fetchGroupTasks();
    } catch (err) {
      onError?.(err.message || "Could not create group task");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback?.(data.message || `Task marked as ${newStatus.toUpperCase()}`);
        setGroupTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      onError?.("Could not update task status");
    }
  };

  const handleDeleteGroupTask = async (taskId, title) => {
    if (!window.confirm(`Delete group task "${title}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onFeedback?.("Group task deleted");
        fetchGroupTasks();
      }
    } catch (err) {
      onError?.("Could not delete task");
    }
  };

  // Personal <-> Group Integration: Sync / Unsync with student's personal task list
  const handleToggleSyncPersonal = async (task) => {
    setSyncingTaskId(task._id);
    const currentlySynced = task.isSyncedToMyTasks;
    const method = currentlySynced ? "DELETE" : "POST";

    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/tasks/${task._id}/sync-personal`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update personal sync");
      }

      onFeedback?.(data.message);
      setGroupTasks((prev) =>
        prev.map((t) =>
          t._id === task._id ? { ...t, isSyncedToMyTasks: !currentlySynced } : t
        )
      );
    } catch (err) {
      onError?.(err.message || "Sync operation failed");
    } finally {
      setSyncingTaskId(null);
    }
  };

  /* =========================================================================
     SPACE HUB & SETTINGS HANDLERS
     ========================================================================= */

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      onError?.("Please enter a space name");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${apiBase}/api/spaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create space");
      }

      onFeedback?.(`Space "${data.data.space.name}" created!`);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        description: "",
        category: "study_group",
        icon: "🚀",
        color: "#9333EA",
        isPrivate: false,
      });
      fetchMySpaces();
      openSpaceDetail(data.data.space._id);
    } catch (err) {
      onError?.(err.message || "Could not create space");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      onError?.("Please enter an invite code");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`${apiBase}/api/spaces/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: joinCodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid invite code");
      }

      onFeedback?.(data.message || "Successfully joined Space!");
      setShowJoinModal(false);
      setJoinCodeInput("");
      fetchMySpaces();
      openSpaceDetail(data.data.space._id);
    } catch (err) {
      onError?.(err.message || "Could not join space");
    } finally {
      setJoining(false);
    }
  };

  const handleJoinPublic = async (spaceId) => {
    try {
      const res = await fetch(`${apiBase}/api/spaces/${spaceId}/join-public`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to join space");
      }

      onFeedback?.(data.message || "Joined Space!");
      fetchMySpaces();
      fetchDiscoverSpaces();
      openSpaceDetail(spaceId);
    } catch (err) {
      onError?.(err.message || "Could not join space");
    }
  };

  const handleLeaveSpace = async () => {
    if (!window.confirm("Are you sure you want to leave this space?")) return;

    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to leave space");
      }

      onFeedback?.(data.message || "You have left the space");
      setCurrentView("hub");
      fetchMySpaces();
      fetchDiscoverSpaces();
    } catch (err) {
      onError?.(err.message || "Could not leave space");
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) {
      onError?.("Enter a student email or Student ID");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentEmailOrId: inviteIdentifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to invite member");
      }

      onFeedback?.(data.message || "Member invited!");
      setShowInviteModal(false);
      setInviteIdentifier("");
      fetchSpaceDetail(selectedSpaceId);
    } catch (err) {
      onError?.(err.message || "Could not invite student");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || "this member"} from the space?`)) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to remove member");
      }

      onFeedback?.(data.message || "Member removed");
      fetchSpaceDetail(selectedSpaceId);
    } catch (err) {
      onError?.(err.message || "Could not remove member");
    }
  };

  const handleUpdateRole = async (memberId, newRole, memberName) => {
    const confirmMsg =
      newRole === "owner"
        ? `Are you sure you want to TRANSFER OWNERSHIP to ${memberName}? You will become an Admin.`
        : `Change ${memberName}'s role to ${newRole.toUpperCase()}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${apiBase}/api/spaces/${selectedSpaceId}/members/${memberId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update role");
      }

      onFeedback?.(data.message || "Role updated!");
      fetchSpaceDetail(selectedSpaceId);
      fetchMySpaces();
    } catch (err) {
      onError?.(err.message || "Could not update member role");
    }
  };

  const copyInviteCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    onFeedback?.("Invite code copied to clipboard! 📋");
  };

  return (
    <div className="spaces-container animate-fade-in">
      {/* =========================================================================
          VIEW 1: SPACES HUB (My Spaces & Public Directory)
          ========================================================================= */}
      {currentView === "hub" && (
        <>
          <section className="card spaces-hero-banner">
            <div className="spaces-hero-content">
              <h2 className="spaces-hero-title">
                Studex <span className="highlight-ai">Spaces &amp; Groups</span>
              </h2>
              <p className="spaces-hero-subtitle">
                Collaborate with peers, study buddies, project teams, and classes with shared resources, group tasks, and discussions.
              </p>
            </div>

            <div className="spaces-hero-actions">
              <button
                type="button"
                className="btn btn-primary btn-spaces-create"
                onClick={() => setShowCreateModal(true)}
              >
                <PlusIcon size={15} /> Create Space
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-spaces-join"
                onClick={() => setShowJoinModal(true)}
              >
                <LockIcon size={14} /> Join with Code
              </button>
            </div>
          </section>

          {/* Navigation Sub-Tabs & Search Filter */}
          <div className="spaces-nav-bar-row">
            <div className="spaces-subtab-pills">
              <button
                type="button"
                className={`spaces-subtab-btn ${hubTab === "my_spaces" ? "active" : ""}`}
                onClick={() => setHubTab("my_spaces")}
              >
                <UsersIcon size={14} /> My Spaces ({mySpaces.length})
              </button>
              <button
                type="button"
                className={`spaces-subtab-btn ${hubTab === "discover" ? "active" : ""}`}
                onClick={() => setHubTab("discover")}
              >
                <SparklesIcon size={14} /> Discover Public Spaces ({discoverSpaces.length})
              </button>
            </div>

            <div className="spaces-filter-controls">
              <div className="spaces-search-box">
                <SearchIcon size={14} className="search-icon-muted" />
                <input
                  type="text"
                  placeholder="Search spaces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="spaces-search-input"
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="spaces-category-select"
              >
                <option value="all">All Categories</option>
                {SPACE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingSpaces && (
            <div className="spaces-loading-box">
              <div className="spinner"></div>
              <p>Loading academic spaces...</p>
            </div>
          )}

          {/* TAB 1: MY SPACES GRID */}
          {!loadingSpaces && hubTab === "my_spaces" && (
            <div className="spaces-grid-layout">
              {mySpaces.length === 0 ? (
                <div className="card spaces-empty-card">
                  <div className="empty-icon-circle">🚀</div>
                  <h3>No Spaces Joined Yet</h3>
                  <p>
                    Create a new study group, project team, or class space, or join an existing one using an invite code.
                  </p>
                  <div className="empty-action-buttons">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <PlusIcon size={14} /> Create My First Space
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowJoinModal(true)}
                    >
                      <LockIcon size={14} /> Enter Invite Code
                    </button>
                  </div>
                </div>
              ) : (
                mySpaces
                  .filter((s) => selectedCategoryFilter === "all" || s.category === selectedCategoryFilter)
                  .map((space) => {
                    const catInfo = SPACE_CATEGORIES.find((c) => c.id === space.category) || SPACE_CATEGORIES[0];
                    return (
                      <div
                        key={space._id}
                        className="card space-card-item"
                        onClick={() => openSpaceDetail(space._id)}
                      >
                        <div className="space-card-top">
                          <div
                            className="space-avatar-badge"
                            style={{ backgroundColor: `${space.color || "#9333EA"}22`, color: space.color || "#9333EA" }}
                          >
                            {space.icon || catInfo.icon}
                          </div>

                          <div className="space-card-badges">
                            <span className="space-category-tag">
                              {catInfo.label}
                            </span>
                            {space.myRole && (
                              <span className={`space-role-tag role-${space.myRole}`}>
                                {space.myRole === "owner" && <CrownIcon size={12} />}
                                {space.myRole === "admin" && <ShieldIcon size={12} />}
                                {space.myRole === "member" && <UsersIcon size={12} />}
                                {space.myRole.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="space-card-name">{space.name}</h3>
                        <p className="space-card-desc">
                          {space.description || "Academic collaboration and study group space."}
                        </p>

                        <div className="space-card-footer">
                          <div className="space-member-count">
                            <UsersIcon size={13} />
                            <span>{space.memberCount || 1} {space.memberCount === 1 ? "Member" : "Members"}</span>
                          </div>

                          <span className="space-enter-btn">
                            Enter Workspace &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* TAB 2: DISCOVER PUBLIC SPACES */}
          {!loadingSpaces && hubTab === "discover" && (
            <div className="spaces-grid-layout">
              {discoverSpaces.length === 0 ? (
                <div className="card spaces-empty-card">
                  <div className="empty-icon-circle">🌐</div>
                  <h3>No Public Spaces Found</h3>
                  <p>There are no public spaces matching your search. Create the first one!</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <PlusIcon size={14} /> Create Public Space
                  </button>
                </div>
              ) : (
                discoverSpaces.map((space) => {
                  const catInfo = SPACE_CATEGORIES.find((c) => c.id === space.category) || SPACE_CATEGORIES[0];
                  return (
                    <div key={space._id} className="card space-card-item">
                      <div className="space-card-top">
                        <div
                          className="space-avatar-badge"
                          style={{ backgroundColor: `${space.color || "#9333EA"}22`, color: space.color || "#9333EA" }}
                        >
                          {space.icon || catInfo.icon}
                        </div>

                        <div className="space-card-badges">
                          <span className="space-category-tag">
                            {catInfo.label}
                          </span>
                          {space.isJoined && (
                            <span className="space-role-tag role-joined">
                              <CheckIcon size={12} /> JOINED
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="space-card-name">{space.name}</h3>
                      <p className="space-card-desc">
                        {space.description || "Public student academic collaboration workspace."}
                      </p>

                      <div className="space-card-footer">
                        <div className="space-member-count">
                          <UsersIcon size={13} />
                          <span>{space.memberCount || 1} Members</span>
                        </div>

                        {space.isJoined ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openSpaceDetail(space._id)}
                          >
                            Open Space &rarr;
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleJoinPublic(space._id)}
                          >
                            Join Space ✨
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          VIEW 2: SPACE ROOM COLLABORATION VIEW (Phase 13 Shared Workspace)
          ========================================================================= */}
      {currentView === "detail" && (
        <div className="space-detail-layout animate-fade-in">
          {/* Back Navigation Bar */}
          <div className="space-detail-back-row">
            <button
              type="button"
              className="btn-back-link"
              onClick={() => {
                setCurrentView("hub");
                fetchMySpaces();
              }}
            >
              &larr; Back to All Spaces
            </button>

            <div className="space-detail-header-actions">
              {selectedSpaceData?.space?.inviteCode && (
                <button
                  type="button"
                  className="space-invite-chip-btn"
                  onClick={() => copyInviteCode(selectedSpaceData.space.inviteCode)}
                  title="Click to copy invite code"
                >
                  <span className="chip-label">Invite Code:</span>
                  <code className="chip-code">{selectedSpaceData.space.inviteCode}</code>
                  {copiedCode ? <CheckIcon size={14} className="copied-check" /> : <CopyIcon size={14} />}
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowInviteModal(true)}
              >
                <PlusIcon size={14} /> Invite Member
              </button>

              {["owner", "admin"].includes(selectedSpaceData?.myRole) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowSettingsModal(true)}
                  title="Space Settings & Roles"
                >
                  <SettingsIcon size={15} /> Settings
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm btn-leave"
                onClick={handleLeaveSpace}
                title="Leave this space"
              >
                <DoorIcon size={15} /> Leave
              </button>
            </div>
          </div>

          {loadingDetail && (
            <div className="spaces-loading-box">
              <div className="spinner"></div>
              <p>Loading workspace...</p>
            </div>
          )}

          {!loadingDetail && selectedSpaceData && (
            <div className="space-room-content">
              {/* Space Header Banner */}
              <section className="card space-room-banner">
                <div className="space-room-header-left">
                  <div
                    className="space-room-avatar-big"
                    style={{
                      backgroundColor: `${selectedSpaceData.space.color || "#9333EA"}22`,
                      color: selectedSpaceData.space.color || "#9333EA",
                    }}
                  >
                    {selectedSpaceData.space.icon || "🚀"}
                  </div>
                  <div className="space-room-meta-info">
                    <div className="space-room-pill-row">
                      <span className="space-category-tag">
                        {SPACE_CATEGORIES.find((c) => c.id === selectedSpaceData.space.category)?.label || "Workspace"}
                      </span>
                      <span className="space-privacy-pill">
                        {selectedSpaceData.space.isPrivate ? <LockIcon size={11} /> : <UnlockIcon size={11} />}
                        {selectedSpaceData.space.isPrivate ? "Private Space" : "Public Space"}
                      </span>
                      <span className={`space-role-tag role-${selectedSpaceData.myRole}`}>
                        {selectedSpaceData.myRole === "owner" && <CrownIcon size={12} />}
                        {selectedSpaceData.myRole === "admin" && <ShieldIcon size={12} />}
                        {selectedSpaceData.myRole === "member" && <UsersIcon size={12} />}
                        YOUR ROLE: {selectedSpaceData.myRole?.toUpperCase()}
                      </span>
                    </div>

                    <h2 className="space-room-title">{selectedSpaceData.space.name}</h2>
                    <p className="space-room-desc">
                      {selectedSpaceData.space.description || "Collaborative academic workspace for shared learning and coordination."}
                    </p>
                  </div>
                </div>

                <div className="space-room-stat-card">
                  <div className="room-stat-val">{selectedSpaceData.memberCount || 1}</div>
                  <div className="room-stat-label">Active Members</div>
                </div>
              </section>

              {/* Phase 13 Collaboration Sub-Navigation Bar */}
              <div className="space-workspace-tabs-bar">
                <button
                  type="button"
                  className={`space-ws-tab-btn ${activeRoomTab === "discussions" ? "active" : ""}`}
                  onClick={() => setActiveRoomTab("discussions")}
                >
                  <MessageSquareIcon size={15} /> Discussions
                </button>
                <button
                  type="button"
                  className={`space-ws-tab-btn ${activeRoomTab === "resources" ? "active" : ""}`}
                  onClick={() => setActiveRoomTab("resources")}
                >
                  <FolderIcon size={15} /> Shared Resources
                </button>
                <button
                  type="button"
                  className={`space-ws-tab-btn ${activeRoomTab === "tasks" ? "active" : ""}`}
                  onClick={() => setActiveRoomTab("tasks")}
                >
                  <ClockIcon size={15} /> Group Tasks
                  <span className="group-task-badge-pill">Sync Active</span>
                </button>
                <button
                  type="button"
                  className={`space-ws-tab-btn ${activeRoomTab === "announcements" ? "active" : ""}`}
                  onClick={() => setActiveRoomTab("announcements")}
                >
                  <MegaphoneIcon size={15} /> Announcements
                </button>
                <button
                  type="button"
                  className={`space-ws-tab-btn ${activeRoomTab === "members" ? "active" : ""}`}
                  onClick={() => setActiveRoomTab("members")}
                >
                  <UsersIcon size={15} /> Member Roster ({selectedSpaceData.members?.length || 0})
                </button>
              </div>

              {/* =============================================================
                  TAB 1: DISCUSSIONS (Threaded Space Communication)
                  ============================================================= */}
              {activeRoomTab === "discussions" && (
                <div className="space-discussions-tab animate-fade-in">
                  {/* Post Composer */}
                  <div className="card space-post-composer-card">
                    <form onSubmit={handleCreatePost}>
                      <div className="composer-user-row">
                        <img
                          src={
                            currentUser?.profilePicture?.url ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.name || "Student"}`
                          }
                          alt="Me"
                          className="composer-avatar"
                        />
                        <div className="composer-input-wrap">
                          <textarea
                            className="composer-textarea"
                            placeholder="Share an idea, question, or study update with the space..."
                            rows={3}
                            value={postInput}
                            onChange={handlePostInputChange}
                          />
                        </div>
                      </div>

                      {/* Optional Attachment Bar */}
                      <div className="composer-attachment-bar">
                        <div className="composer-attach-inputs">
                          <PaperclipIcon size={14} className="text-muted" />
                          <select
                            value={postAttachmentType}
                            onChange={(e) => setPostAttachmentType(e.target.value)}
                            className="attachment-type-select"
                          >
                            <option value="link">🔗 Web Link</option>
                            <option value="pdf">📄 PDF Document</option>
                            <option value="image">🖼️ Image</option>
                            <option value="video">🎥 Video Link</option>
                          </select>
                          <input
                            type="url"
                            placeholder="Attachment URL (optional)..."
                            value={postAttachmentUrl}
                            onChange={(e) => setPostAttachmentUrl(e.target.value)}
                            className="attachment-url-input"
                          />
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary btn-sm btn-post-submit"
                          disabled={sendingPost || !postInput.trim()}
                        >
                          {sendingPost ? "Posting..." : "Post to Space ✨"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Real-time Typing Indicators in Space */}
                  {Object.keys(spaceTypingUsers).length > 0 && (
                    <div className="space-typing-indicator-bar animate-fade-in">
                      <div className="typing-dots-space">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                      <span>
                        {Object.values(spaceTypingUsers)
                          .map((u) => u.name)
                          .join(", ")}{" "}
                        {Object.keys(spaceTypingUsers).length === 1 ? "is" : "are"} typing...
                      </span>
                    </div>
                  )}

                  {/* Posts Feed */}
                  {loadingPosts ? (
                    <div className="spaces-loading-box">Loading discussion feed...</div>
                  ) : posts.filter((p) => p.type === "discussion").length === 0 ? (
                    <div className="card space-empty-subcard">
                      <MessageSquareIcon size={32} />
                      <h4>No discussions yet</h4>
                      <p>Start the conversation by posting a question, note, or idea above!</p>
                    </div>
                  ) : (
                    <div className="space-posts-feed">
                      {posts
                        .filter((p) => p.type === "discussion")
                        .map((post) => {
                          const isAuthor = post.author?._id === currentUser?._id;
                          const canDelete = isAuthor || ["owner", "admin"].includes(selectedSpaceData?.myRole);
                          const isExpanded = expandedReplies[post._id];

                          return (
                            <div key={post._id} className="card space-post-card">
                              <div className="post-header-row">
                                <div className="post-author-info">
                                  <img
                                    src={
                                      post.author?.profilePicture?.url ||
                                      `https://api.dicebear.com/7.x/bottts/svg?seed=${post.author?.name || "Student"}`
                                    }
                                    alt={post.author?.name}
                                    className="post-author-avatar"
                                  />
                                  <div>
                                    <div className="post-author-name-row">
                                      <strong>{post.author?.name || "Student"}</strong>
                                      {post.author?.role && (
                                        <span className={`post-role-badge role-${post.author.role}`}>
                                          {post.author.role}
                                        </span>
                                      )}
                                    </div>
                                    <span className="post-timestamp">
                                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                </div>

                                {canDelete && (
                                  <button
                                    type="button"
                                    className="btn-delete-post"
                                    onClick={() => handleDeletePost(post._id)}
                                    title="Delete post"
                                  >
                                    <TrashIcon size={14} />
                                  </button>
                                )}
                              </div>

                              <div className="post-body-text">{post.content}</div>

                              {/* Attachments */}
                              {post.attachments && post.attachments.length > 0 && (
                                <div className="post-attachments-list">
                                  {post.attachments.map((att, attIdx) => (
                                    <a
                                      key={attIdx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="post-attachment-chip"
                                    >
                                      {att.type === "pdf" && <FileTextIcon size={13} />}
                                      {att.type === "image" && <ImageIcon size={13} />}
                                      {att.type === "video" && <VideoIcon size={13} />}
                                      {att.type === "link" && <LinkIcon size={13} />}
                                      <span>{att.name || att.url}</span>
                                      <ShareIcon size={11} />
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Post Actions Footer */}
                              <div className="post-footer-actions">
                                <button
                                  type="button"
                                  className={`post-action-btn ${post.hasLiked ? "liked" : ""}`}
                                  onClick={() => handleToggleLike(post._id)}
                                >
                                  <HeartIcon size={14} filled={post.hasLiked} />
                                  <span>{post.likesCount || 0} {post.likesCount === 1 ? "Like" : "Likes"}</span>
                                </button>

                                <button
                                  type="button"
                                  className="post-action-btn"
                                  onClick={() =>
                                    setExpandedReplies((prev) => ({
                                      ...prev,
                                      [post._id]: !prev[post._id],
                                    }))
                                  }
                                >
                                  <MessageSquareIcon size={14} />
                                  <span>{post.repliesCount || 0} Replies</span>
                                </button>
                              </div>

                              {/* Threaded Replies Section */}
                              {isExpanded && (
                                <div className="post-replies-tray">
                                  {post.replies && post.replies.length > 0 ? (
                                    <div className="replies-list">
                                      {post.replies.map((rep, rIdx) => (
                                        <div key={rIdx} className="reply-row">
                                          <img
                                            src={
                                              rep.author?.profilePicture?.url ||
                                              `https://api.dicebear.com/7.x/bottts/svg?seed=${rep.author?.name || "Peer"}`
                                            }
                                            alt={rep.author?.name}
                                            className="reply-avatar"
                                          />
                                          <div className="reply-content-box">
                                            <div className="reply-author-line">
                                              <strong>{rep.author?.name || "Student"}</strong>
                                              <span className="reply-time">
                                                {new Date(rep.createdAt).toLocaleTimeString([], {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })}
                                              </span>
                                            </div>
                                            <p className="reply-text">{rep.content}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="no-replies-hint">No replies yet. Be the first to respond!</div>
                                  )}

                                  {/* Reply Composer */}
                                  <div className="reply-composer-row">
                                    <input
                                      type="text"
                                      className="reply-input"
                                      placeholder="Write a reply..."
                                      value={replyInputs[post._id] || ""}
                                      onChange={(e) =>
                                        setReplyInputs((prev) => ({
                                          ...prev,
                                          [post._id]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleReplyPost(post._id);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => handleReplyPost(post._id)}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  TAB 2: SHARED RESOURCES (PDF, Image, Document, Link, Video)
                  ============================================================= */}
              {activeRoomTab === "resources" && (
                <div className="space-resources-tab animate-fade-in">
                  {/* Controls Row */}
                  <div className="resources-controls-row">
                    <div className="resource-type-filters">
                      <button
                        type="button"
                        className={`res-filter-btn ${resourceFilter === "all" ? "active" : ""}`}
                        onClick={() => setResourceFilter("all")}
                      >
                        All Types
                      </button>
                      <button
                        type="button"
                        className={`res-filter-btn ${resourceFilter === "pdf" ? "active" : ""}`}
                        onClick={() => setResourceFilter("pdf")}
                      >
                        📄 PDFs
                      </button>
                      <button
                        type="button"
                        className={`res-filter-btn ${resourceFilter === "image" ? "active" : ""}`}
                        onClick={() => setResourceFilter("image")}
                      >
                        🖼️ Images
                      </button>
                      <button
                        type="button"
                        className={`res-filter-btn ${resourceFilter === "document" ? "active" : ""}`}
                        onClick={() => setResourceFilter("document")}
                      >
                        📝 Documents
                      </button>
                      <button
                        type="button"
                        className={`res-filter-btn ${resourceFilter === "link" ? "active" : ""}`}
                        onClick={() => setResourceFilter("link")}
                      >
                        🔗 Web Links
                      </button>
                      <button
                        type="button"
                        className={`res-filter-btn ${resourceFilter === "video" ? "active" : ""}`}
                        onClick={() => setResourceFilter("video")}
                      >
                        🎥 Videos
                      </button>
                    </div>

                    <div className="resources-action-group">
                      <div className="resources-search-box">
                        <SearchIcon size={14} className="search-icon-muted" />
                        <input
                          type="text"
                          placeholder="Search resources..."
                          value={resourceSearch}
                          onChange={(e) => setResourceSearch(e.target.value)}
                          className="resource-search-input"
                        />
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowShareResourceModal(true)}
                      >
                        <PlusIcon size={14} /> Share Resource
                      </button>
                    </div>
                  </div>

                  {/* Resources Grid */}
                  {loadingResources ? (
                    <div className="spaces-loading-box">Loading shared resources...</div>
                  ) : resources.length === 0 ? (
                    <div className="card space-empty-subcard">
                      <FolderIcon size={36} />
                      <h4>No shared resources found</h4>
                      <p>Share lecture slides, research papers, YouTube recordings, or study links with your peers!</p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowShareResourceModal(true)}
                      >
                        <PlusIcon size={14} /> Share First Resource
                      </button>
                    </div>
                  ) : (
                    <div className="resources-cards-grid">
                      {resources.map((res) => {
                        const canDelete =
                          res.uploadedBy?._id === currentUser?._id ||
                          ["owner", "admin"].includes(selectedSpaceData?.myRole);

                        return (
                          <div key={res._id} className="card resource-item-card">
                            <div className="resource-card-top">
                              <span className={`resource-type-pill type-${res.type}`}>
                                {res.type === "pdf" && "📄 PDF"}
                                {res.type === "image" && "🖼️ IMAGE"}
                                {res.type === "document" && "📝 DOC"}
                                {res.type === "link" && "🔗 LINK"}
                                {res.type === "video" && "🎥 VIDEO"}
                              </span>

                              {canDelete && (
                                <button
                                  type="button"
                                  className="btn-delete-res"
                                  onClick={() => handleDeleteResource(res._id, res.title)}
                                  title="Delete resource"
                                >
                                  <TrashIcon size={13} />
                                </button>
                              )}
                            </div>

                            <h4 className="resource-item-title">{res.title}</h4>
                            {res.description && (
                              <p className="resource-item-desc">{res.description}</p>
                            )}

                            {res.tags && res.tags.length > 0 && (
                              <div className="resource-tags-row">
                                {res.tags.map((tag, tIdx) => (
                                  <span key={tIdx} className="resource-tag-chip">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="resource-card-footer">
                              <div className="resource-uploader-info">
                                <span className="uploader-name">
                                  Shared by {res.uploadedBy?.name || "Member"}
                                </span>
                              </div>

                              <a
                                href={res.url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm btn-open-resource"
                              >
                                Open Resource &rarr;
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  TAB 3: GROUP TASKS & PERSONAL INTEGRATION (Milestone 13)
                  ============================================================= */}
              {activeRoomTab === "tasks" && (
                <div className="space-tasks-tab animate-fade-in">
                  {/* Task Controls Row */}
                  <div className="group-tasks-header-row">
                    <div className="group-tasks-kpi-bar">
                      <div className="group-kpi-chip">
                        <span className="kpi-num">{groupTasks.length}</span>
                        <span className="kpi-lbl">Total Tasks</span>
                      </div>
                      <div className="group-kpi-chip">
                        <span className="kpi-num">
                          {groupTasks.filter((t) => t.status === "completed").length}
                        </span>
                        <span className="kpi-lbl">Completed</span>
                      </div>
                      <div className="group-kpi-chip">
                        <span className="kpi-num">
                          {groupTasks.filter((t) => t.isSyncedToMyTasks).length}
                        </span>
                        <span className="kpi-lbl">In My Personal Tasks ⭐</span>
                      </div>
                    </div>

                    <div className="group-tasks-actions">
                      <select
                        value={taskStatusFilter}
                        onChange={(e) => setTaskStatusFilter(e.target.value)}
                        className="task-status-filter-select"
                      >
                        <option value="all">All Statuses</option>
                        <option value="todo">To-Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowCreateTaskModal(true)}
                      >
                        <PlusIcon size={14} /> New Group Task
                      </button>
                    </div>
                  </div>

                  {/* Group Tasks List */}
                  {loadingTasks ? (
                    <div className="spaces-loading-box">Loading group tasks...</div>
                  ) : groupTasks.length === 0 ? (
                    <div className="card space-empty-subcard">
                      <ClockIcon size={36} />
                      <h4>No group tasks yet</h4>
                      <p>
                        Assign tasks, set group deadlines, and track collaborative milestone progress together.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowCreateTaskModal(true)}
                      >
                        <PlusIcon size={14} /> Create First Task
                      </button>
                    </div>
                  ) : (
                    <div className="group-tasks-grid">
                      {groupTasks.map((task) => {
                        const isCompleted = task.status === "completed";
                        const isOverdue =
                          task.deadline &&
                          !isCompleted &&
                          new Date(task.deadline).getTime() < Date.now();
                        const canManage =
                          task.creator?._id === currentUser?._id ||
                          task.assignedTo?._id === currentUser?._id ||
                          ["owner", "admin"].includes(selectedSpaceData?.myRole);

                        return (
                          <div
                            key={task._id}
                            className={`card group-task-card ${isCompleted ? "is-completed" : ""} ${
                              isOverdue ? "is-overdue" : ""
                            }`}
                          >
                            <div className="group-task-top-row">
                              <span className={`task-priority-badge priority-${task.priority}`}>
                                {task.priority.toUpperCase()}
                              </span>

                              <div className="group-task-top-actions">
                                {/* Personal <-> Group Integration Toggle Button */}
                                <button
                                  type="button"
                                  className={`btn-sync-personal ${
                                    task.isSyncedToMyTasks ? "synced" : ""
                                  }`}
                                  onClick={() => handleToggleSyncPersonal(task)}
                                  disabled={syncingTaskId === task._id}
                                  title={
                                    task.isSyncedToMyTasks
                                      ? "In your Personal Tasks list. Click to unsync."
                                      : "Add this group task to your Personal Task Manager"
                                  }
                                >
                                  {task.isSyncedToMyTasks ? (
                                    <>
                                      <CheckIcon size={12} /> Synced to My Tasks
                                    </>
                                  ) : (
                                    <>
                                      <StarIcon size={12} /> Add to Personal Tasks
                                    </>
                                  )}
                                </button>

                                {canManage && (
                                  <button
                                    type="button"
                                    className="btn-delete-task"
                                    onClick={() => handleDeleteGroupTask(task._id, task.title)}
                                    title="Delete group task"
                                  >
                                    <TrashIcon size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <h4 className="group-task-title">{task.title}</h4>
                            {task.description && (
                              <p className="group-task-desc">{task.description}</p>
                            )}

                            {/* Assignee & Deadline Row */}
                            <div className="group-task-meta-row">
                              <div className="assignee-pill">
                                <span className="meta-kicker">Assigned To:</span>
                                {task.assignedTo ? (
                                  <div className="assignee-user-badge">
                                    <img
                                      src={
                                        task.assignedTo?.profilePicture?.url ||
                                        `https://api.dicebear.com/7.x/bottts/svg?seed=${task.assignedTo?.name || "Peer"}`
                                      }
                                      alt="Assignee"
                                      className="assignee-avatar-tiny"
                                    />
                                    <strong>{task.assignedTo?.name}</strong>
                                  </div>
                                ) : (
                                  <span className="unassigned-text">Unassigned</span>
                                )}
                              </div>

                              {task.deadline && (
                                <div className={`deadline-pill ${isOverdue ? "text-danger" : ""}`}>
                                  <CalendarIcon size={13} />
                                  <span>
                                    {new Date(task.deadline).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                    {isOverdue && " (Overdue)"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Status Selector Footer */}
                            <div className="group-task-footer-status">
                              <span className="status-label">Status:</span>
                              <select
                                value={task.status}
                                onChange={(e) => handleUpdateTaskStatus(task._id, e.target.value)}
                                className={`task-status-selector status-${task.status}`}
                              >
                                <option value="todo">📋 To-Do</option>
                                <option value="in_progress">⚡ In Progress</option>
                                <option value="completed">✅ Completed</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  TAB 4: ANNOUNCEMENTS (Official Pinned Notices)
                  ============================================================= */}
              {activeRoomTab === "announcements" && (
                <div className="space-announcements-tab animate-fade-in">
                  <div className="announcements-header-bar">
                    <div>
                      <h3>Official Announcements</h3>
                      <p className="section-subtitle">
                        Important deadlines, exam notices, and milestones posted by Space Owners and Admins.
                      </p>
                    </div>

                    {["owner", "admin"].includes(selectedSpaceData?.myRole) && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowAnnouncementModal(true)}
                      >
                        <MegaphoneIcon size={14} /> Publish Announcement
                      </button>
                    )}
                  </div>

                  {loadingPosts ? (
                    <div className="spaces-loading-box">Loading announcements...</div>
                  ) : posts.filter((p) => p.type === "announcement").length === 0 ? (
                    <div className="card space-empty-subcard">
                      <MegaphoneIcon size={36} />
                      <h4>No announcements yet</h4>
                      <p>Space owners and admins will post critical updates and deadlines here.</p>
                    </div>
                  ) : (
                    <div className="announcements-feed">
                      {posts
                        .filter((p) => p.type === "announcement")
                        .map((ann) => {
                          const canManage = ["owner", "admin"].includes(selectedSpaceData?.myRole);
                          return (
                            <div
                              key={ann._id}
                              className={`card announcement-card ${ann.isPinned ? "is-pinned" : ""}`}
                            >
                              <div className="announcement-top-bar">
                                <div className="announcement-badge-row">
                                  <span className="announcement-flag-pill">
                                    <MegaphoneIcon size={13} /> OFFICIAL NOTICE
                                  </span>
                                  {ann.isPinned && (
                                    <span className="pinned-badge">📌 PINNED</span>
                                  )}
                                </div>

                                {canManage && (
                                  <div className="announcement-manage-actions">
                                    <button
                                      type="button"
                                      className="btn-action-icon"
                                      onClick={() => handleTogglePin(ann._id)}
                                      title={ann.isPinned ? "Unpin Announcement" : "Pin to Top"}
                                    >
                                      📌
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-action-icon text-danger"
                                      onClick={() => handleDeletePost(ann._id)}
                                      title="Delete Announcement"
                                    >
                                      <TrashIcon size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {ann.title && <h3 className="announcement-title">{ann.title}</h3>}
                              <div className="announcement-body-text">{ann.content}</div>

                              <div className="announcement-footer">
                                <div className="announcement-publisher">
                                  <img
                                    src={
                                      ann.author?.profilePicture?.url ||
                                      `https://api.dicebear.com/7.x/bottts/svg?seed=${ann.author?.name || "Admin"}`
                                    }
                                    alt="Admin"
                                    className="publisher-avatar-tiny"
                                  />
                                  <span>
                                    Published by <strong>{ann.author?.name || "Space Admin"}</strong>
                                  </span>
                                </div>

                                <span className="announcement-date">
                                  {new Date(ann.createdAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* =============================================================
                  TAB 5: MEMBERS ROSTER
                  ============================================================= */}
              {activeRoomTab === "members" && (
                <div className="space-room-grid animate-fade-in">
                  <div className="card space-members-card full-width">
                    <div className="card-header-compact">
                      <div className="members-header-title">
                        <span className="section-kicker">Member Roster</span>
                        <h3>Space Members ({selectedSpaceData.members?.length || 0})</h3>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowInviteModal(true)}
                      >
                        <PlusIcon size={13} /> Invite
                      </button>
                    </div>

                    <div className="space-members-list">
                      {selectedSpaceData.members?.map((m) => {
                        const isMe = m.user?._id === currentUser?._id;
                        const isOwner = selectedSpaceData.myRole === "owner";
                        const isAdmin = selectedSpaceData.myRole === "admin";
                        const canManage = isOwner || (isAdmin && m.role === "member");

                        return (
                          <div key={m.id} className="space-member-row">
                            <div className="member-avatar-wrap">
                              <img
                                src={
                                  m.user?.profilePicture?.url ||
                                  `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user?.name || "Student"}`
                                }
                                alt={m.user?.name}
                                className="member-img"
                              />
                              {m.role === "owner" && (
                                <span className="role-badge-icon owner" title="Space Owner">
                                  <CrownIcon size={10} />
                                </span>
                              )}
                              {m.role === "admin" && (
                                <span className="role-badge-icon admin" title="Space Admin">
                                  <ShieldIcon size={10} />
                                </span>
                              )}
                            </div>

                            <div className="member-details">
                              <div className="member-name-row">
                                <strong className="member-name">
                                  {m.user?.name || "Student"} {isMe && "(You)"}
                                </strong>
                                <span className={`member-role-badge role-${m.role}`}>
                                  {m.role}
                                </span>
                              </div>
                              <span className="member-academic-info">
                                {m.user?.college || "Studex"} &bull; {m.user?.course || "Student"}
                              </span>
                            </div>

                            {canManage && !isMe && (
                              <div className="member-actions-group">
                                {isOwner && (
                                  <select
                                    value={m.role}
                                    onChange={(e) => handleUpdateRole(m.id, e.target.value, m.user?.name)}
                                    className="member-role-select"
                                    title="Change Member Role"
                                  >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    <option value="owner">Transfer Owner</option>
                                  </select>
                                )}

                                <button
                                  type="button"
                                  className="btn-remove-member"
                                  onClick={() => handleRemoveMember(m.id, m.user?.name)}
                                  title={`Remove ${m.user?.name} from space`}
                                >
                                  <TrashIcon size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* 1. Share Resource Modal */}
      {showShareResourceModal && (
        <div className="modal-overlay" onClick={() => setShowShareResourceModal(false)}>
          <div className="card modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Share Academic Resource</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowShareResourceModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleShareResource}>
              <div className="form-group">
                <label className="form-label">Resource Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Raft Consensus Lecture Notes, Midterm Study Guide..."
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Resource Type *</label>
                <select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                  className="form-select"
                >
                  <option value="pdf">📄 PDF Document</option>
                  <option value="image">🖼️ Image / Diagram</option>
                  <option value="document">📝 Word / Google Doc</option>
                  <option value="link">🔗 Web / Article Link</option>
                  <option value="video">🎥 Video / Lecture Recording</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Resource URL / Link *</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={resourceForm.url}
                  onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  placeholder="Brief summary of what this document covers..."
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                  className="form-textarea"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Consensus, Algorithms, Chapter 4"
                  value={resourceForm.tags}
                  onChange={(e) => setResourceForm({ ...resourceForm, tags: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowShareResourceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sharingResource}
                >
                  {sharingResource ? "Sharing..." : "Share with Space 📁"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Group Task Modal */}
      {showCreateTaskModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTaskModal(false)}>
          <div className="card modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Create Group Task</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowCreateTaskModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateGroupTask}>
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Implement Heartbeat RPC Handler..."
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assign Member</label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="form-select"
                >
                  <option value="">Unassigned (Open for any member)</option>
                  {selectedSpaceData?.members?.map((m) => (
                    <option key={m.user?._id} value={m.user?._id}>
                      👤 {m.user?.name} {m.user?._id === currentUser?._id && "(You)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="form-select"
                  >
                    <option value="low">🌱 Low</option>
                    <option value="medium">⚡ Medium</option>
                    <option value="high">🔥 High</option>
                    <option value="urgent">🚨 Urgent</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input
                    type="datetime-local"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  placeholder="Subtasks, requirements, or deliverables..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="form-textarea"
                  rows={2}
                />
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateTaskModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingTask}
                >
                  {creatingTask ? "Creating..." : "Create & Sync Task ⭐"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Publish Announcement Modal */}
      {showAnnouncementModal && (
        <div className="modal-overlay" onClick={() => setShowAnnouncementModal(false)}>
          <div className="card modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Publish Space Announcement</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowAnnouncementModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePublishAnnouncement}>
              <div className="form-group">
                <label className="form-label">Announcement Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Project Submission Deadline"
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, title: e.target.value })
                  }
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Announcement Message *</label>
                <textarea
                  placeholder="Details, requirements, and instructions for all space members..."
                  value={announcementForm.content}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, content: e.target.value })
                  }
                  className="form-textarea"
                  rows={4}
                  required
                />
              </div>

              <div className="form-checkbox-row">
                <input
                  type="checkbox"
                  id="ann-pinned-check"
                  checked={announcementForm.isPinned}
                  onChange={(e) =>
                    setAnnouncementForm({ ...announcementForm, isPinned: e.target.checked })
                  }
                />
                <label htmlFor="ann-pinned-check">📌 Pin Announcement to Top of Space</label>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAnnouncementModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={publishingAnnouncement}
                >
                  {publishingAnnouncement ? "Publishing..." : "Publish Announcement 📢"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Create Space Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="card modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Create a New Space</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowCreateModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSpace}>
              <div className="form-group">
                <label className="form-label">Space Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Systems Lab, CSE 2026 Batch..."
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  placeholder="What is this space for?"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="form-textarea"
                  rows={2}
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="form-select"
                  >
                    {SPACE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Privacy</label>
                  <select
                    value={createForm.isPrivate ? "private" : "public"}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, isPrivate: e.target.value === "private" })
                    }
                    className="form-select"
                  >
                    <option value="public">🌐 Public (Discoverable)</option>
                    <option value="private">🔒 Private (Invite Code Only)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Icon</label>
                <div className="icon-selector-grid">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-choice-btn ${createForm.icon === icon ? "active" : ""}`}
                      onClick={() => setCreateForm({ ...createForm, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Space ✨"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Join Code Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="card modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Join with Invite Code</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowJoinModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleJoinByCode}>
              <div className="form-group">
                <label className="form-label">Space Invite Code</label>
                <input
                  type="text"
                  placeholder="e.g. SX-A1B2C3"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="form-input code-input"
                  required
                />
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={joining}
                >
                  {joining ? "Joining..." : "Join Space ✨"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Invite Member Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="card modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Invite Member to Space</h3>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowInviteModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleInviteMember}>
              <div className="form-group">
                <label className="form-label">Student Email or Student ID</label>
                <input
                  type="text"
                  placeholder="peer@university.edu or STU-10492"
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              {selectedSpaceData?.space?.inviteCode && (
                <div className="invite-code-box-modal">
                  <span className="code-label">Or share this invite code directly:</span>
                  <div className="code-row">
                    <code>{selectedSpaceData.space.inviteCode}</code>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => copyInviteCode(selectedSpaceData.space.inviteCode)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviting}
                >
                  {inviting ? "Inviting..." : "Send Invite 📨"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
