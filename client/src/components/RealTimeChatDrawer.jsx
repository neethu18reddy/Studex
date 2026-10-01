import React, { useState, useEffect, useRef, useCallback } from "react";
import { getSocket } from "../services/socket";
import {
  MessageSquareIcon,
  XIcon,
  SendIcon,
  UsersIcon,
  PaperclipIcon,
  CheckIcon,
  SearchIcon,
  FileTextIcon,
  ImageIcon,
  LinkIcon,
  SparklesIcon,
} from "./Icons";

export default function RealTimeChatDrawer({
  token,
  apiBase,
  currentUser,
  onError,
  onFeedback,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePartner, setActivePartner] = useState(null); // Selected peer user object
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState("link");
  const [showAttachBar, setShowAttachBar] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [showNewChatSearch, setShowNewChatSearch] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activePartner && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, activePartner, partnerIsTyping]);

  // Total unread count across all conversations
  const totalUnreadCount = conversations.reduce(
    (acc, curr) => acc + (curr.unreadCount || 0),
    0
  );

  /* =========================================================================
     1. FETCH CONVERSATIONS & STUDENTS
     ========================================================================= */

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    setLoadingConversations(true);
    try {
      const res = await fetch(`${apiBase}/api/dm/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }, [token, apiBase]);

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/api/users/peers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllStudents(data.data || []);
      }
    } catch (err) {
      // Fallback
    }
  }, [token, apiBase]);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchStudents();
    }
  }, [isOpen, fetchConversations, fetchStudents]);

  /* =========================================================================
     2. FETCH MESSAGES WITH ACTIVE PARTNER
     ========================================================================= */

  const openChatWithUser = async (partner) => {
    setActivePartner(partner);
    setLoadingMessages(true);
    setPartnerIsTyping(false);
    try {
      const res = await fetch(`${apiBase}/api/dm/${partner._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.data.messages || []);
        // Reset unread count locally for this conversation
        setConversations((prev) =>
          prev.map((c) =>
            c.partner?._id === partner._id ? { ...c, unreadCount: 0 } : c
          )
        );

        // Tell socket we joined this DM
        const socket = getSocket();
        if (socket) {
          socket.emit("dm:join", { recipientId: partner._id });
          socket.emit("dm:mark_read", { senderId: partner._id });
        }
      }
    } catch (err) {
      onError?.("Could not load chat history");
    } finally {
      setLoadingMessages(false);
    }
  };

  /* =========================================================================
     3. SOCKET.IO REAL-TIME EVENT LISTENERS
     ========================================================================= */

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Presence: Online Users List
    const handleOnlineUsers = (userIds) => {
      setOnlineUserIds(new Set(userIds));
    };

    // Presence: Single User Status Update
    const handleUserStatus = ({ userId, isOnline }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };

    // Real-time Incoming Message
    const handleNewMessage = (newMsg) => {
      const senderId = newMsg.sender?._id || newMsg.sender;
      const recipientId = newMsg.recipient?._id || newMsg.recipient;
      const currentUserId = currentUser?._id;

      const isCurrentConversation =
        activePartner &&
        (senderId === activePartner._id || recipientId === activePartner._id);

      if (isCurrentConversation) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });

        // If message is from partner, mark read
        if (senderId === activePartner._id) {
          socket.emit("dm:mark_read", { senderId: activePartner._id });
        }
      }

      // Update conversations list with latest message & increment unread if not currently looking
      setConversations((prev) => {
        const partnerId = senderId === currentUserId ? recipientId : senderId;
        const exists = prev.find((c) => c.partner?._id === partnerId);

        if (exists) {
          return prev.map((c) => {
            if (c.partner?._id === partnerId) {
              const shouldIncrement =
                senderId !== currentUserId &&
                (!activePartner || activePartner._id !== partnerId);
              return {
                ...c,
                lastMessage: {
                  _id: newMsg._id,
                  content: newMsg.content,
                  senderId: newMsg.sender?._id || newMsg.sender,
                  createdAt: newMsg.createdAt,
                  isRead: newMsg.isRead,
                },
                unreadCount: shouldIncrement ? (c.unreadCount || 0) + 1 : 0,
              };
            }
            return c;
          });
        } else {
          // New conversation entry
          fetchConversations();
          return prev;
        }
      });
    };

    // Real-time Typing Indicator
    const handleTyping = ({ senderId, isTyping }) => {
      if (activePartner && senderId === activePartner._id) {
        setPartnerIsTyping(isTyping);
      }
    };

    // Real-time Read Receipts
    const handleMessagesRead = ({ readerId }) => {
      if (activePartner && readerId === activePartner._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender?._id === currentUser?._id ? { ...m, isRead: true } : m
          )
        );
      }
    };

    socket.on("presence:online_users", handleOnlineUsers);
    socket.on("presence:user_status", handleUserStatus);
    socket.on("dm:new_message", handleNewMessage);
    socket.on("dm:typing", handleTyping);
    socket.on("dm:messages_read", handleMessagesRead);

    return () => {
      socket.off("presence:online_users", handleOnlineUsers);
      socket.off("presence:user_status", handleUserStatus);
      socket.off("dm:new_message", handleNewMessage);
      socket.off("dm:typing", handleTyping);
      socket.off("dm:messages_read", handleMessagesRead);
    };
  }, [activePartner, currentUser, fetchConversations]);

  /* =========================================================================
     4. SEND MESSAGE & TYPING EMISSION
     ========================================================================= */

  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    const socket = getSocket();
    if (socket && activePartner) {
      socket.emit("dm:typing", {
        recipientId: activePartner._id,
        isTyping: true,
      });

      // Clear typing indicator after 2 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("dm:typing", {
          recipientId: activePartner._id,
          isTyping: false,
        });
      }, 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartner) return;

    const content = inputText.trim();
    const attachments = attachmentUrl.trim()
      ? [{ type: attachmentType, url: attachmentUrl.trim(), name: "Attachment" }]
      : [];

    setInputText("");
    setAttachmentUrl("");
    setShowAttachBar(false);

    const socket = getSocket();

    // Reset typing indicator immediately
    if (socket) {
      socket.emit("dm:typing", {
        recipientId: activePartner._id,
        isTyping: false,
      });
    }

    // Send via real-time socket with callback fallback to REST
    if (socket && socket.connected) {
      socket.emit(
        "dm:send_message",
        {
          recipientId: activePartner._id,
          content,
          attachments,
        },
        (res) => {
          if (!res?.success) {
            console.warn("Socket send fallback to REST");
            sendViaRest(content, attachments);
          }
        }
      );
    } else {
      sendViaRest(content, attachments);
    }
  };

  const sendViaRest = async (content, attachments) => {
    try {
      const res = await fetch(`${apiBase}/api/dm/${activePartner._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, attachments }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, data.data]);
      }
    } catch (err) {
      onError?.("Could not send message");
    }
  };

  return (
    <>
      {/* Floating Messenger Toggle Button */}
      <button
        type="button"
        className={`floating-messenger-btn ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open Real-time Chat & Peer Messenger"
      >
        <div className="btn-icon-wrap">
          <MessageSquareIcon size={20} />
          {totalUnreadCount > 0 && (
            <span className="messenger-unread-badge">{totalUnreadCount}</span>
          )}
        </div>
        <span className="messenger-btn-label">Peer Chat</span>
      </button>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="realtime-chat-drawer card animate-scale-up">
          {/* Top Header */}
          <div className="chat-drawer-header">
            {activePartner ? (
              <div className="chat-partner-header-info">
                <button
                  type="button"
                  className="btn-back-conversations"
                  onClick={() => setActivePartner(null)}
                  title="Back to all conversations"
                >
                  &larr;
                </button>
                <div className="partner-avatar-wrap">
                  <img
                    src={
                      activePartner.profilePicture?.url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${activePartner.name || "Peer"}`
                    }
                    alt={activePartner.name}
                    className="partner-header-avatar"
                  />
                  {onlineUserIds.has(activePartner._id) && (
                    <span className="online-presence-dot" title="Online now" />
                  )}
                </div>
                <div className="partner-header-text">
                  <strong>{activePartner.name}</strong>
                  <span className="partner-status-text">
                    {onlineUserIds.has(activePartner._id) ? (
                      <span className="status-online">Online</span>
                    ) : (
                      "Offline"
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="chat-drawer-title-row">
                <div className="title-with-pulse">
                  <span className="active-dot-live" />
                  <h3>Peer Messages</h3>
                </div>
                <span className="online-count-badge">
                  {onlineUserIds.size} Online
                </span>
              </div>
            )}

            <button
              type="button"
              className="btn-close-drawer"
              onClick={() => setIsOpen(false)}
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* VIEW A: CONVERSATION LIST */}
          {!activePartner && (
            <div className="chat-conversations-view">
              {/* Search or New Chat Bar */}
              <div className="chat-search-bar">
                <SearchIcon size={14} className="search-icon-muted" />
                <input
                  type="text"
                  placeholder="Search students to message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="chat-search-input"
                />
              </div>

              {/* Conversations Feed */}
              {loadingConversations ? (
                <div className="chat-loading-box">Loading conversations...</div>
              ) : conversations.length === 0 && !searchQuery.trim() ? (
                <div className="chat-empty-box">
                  <div className="empty-chat-icon">💬</div>
                  <h4>No active chats</h4>
                  <p>Start a live conversation with any peer or classmate!</p>
                  {allStudents.length > 0 && (
                    <div className="suggested-peers-tray">
                      <span className="suggested-title">Connect with classmates:</span>
                      <div className="peers-chips-grid">
                        {allStudents.slice(0, 5).map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            className="peer-chip-btn"
                            onClick={() => openChatWithUser(student)}
                          >
                            <img
                              src={
                                student.profilePicture?.url ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`
                              }
                              alt={student.name}
                              className="peer-chip-avatar"
                            />
                            <span>{student.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="conversations-list">
                  {/* If searching, show filtered peer directory */}
                  {searchQuery.trim() && (
                    <div className="search-results-section">
                      <span className="search-section-label">Students matching "{searchQuery}"</span>
                      {allStudents
                        .filter(
                          (s) =>
                            s._id !== currentUser?._id &&
                            (s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              s.college?.toLowerCase().includes(searchQuery.toLowerCase()))
                        )
                        .map((student) => (
                          <div
                            key={student._id}
                            className="conversation-item-row"
                            onClick={() => {
                              setSearchQuery("");
                              openChatWithUser(student);
                            }}
                          >
                            <div className="conv-avatar-wrap">
                              <img
                                src={
                                  student.profilePicture?.url ||
                                  `https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`
                                }
                                alt={student.name}
                                className="conv-avatar"
                              />
                              {onlineUserIds.has(student._id) && (
                                <span className="online-presence-dot" />
                              )}
                            </div>
                            <div className="conv-text-block">
                              <strong className="conv-name">{student.name}</strong>
                              <span className="conv-preview">{student.college || "Student"}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Active Conversations */}
                  {conversations.map((c) => {
                    const isOnline = onlineUserIds.has(c.partner?._id);
                    return (
                      <div
                        key={c.partner?._id}
                        className={`conversation-item-row ${
                          c.unreadCount > 0 ? "has-unread" : ""
                        }`}
                        onClick={() => openChatWithUser(c.partner)}
                      >
                        <div className="conv-avatar-wrap">
                          <img
                            src={
                              c.partner?.profilePicture?.url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${c.partner?.name || "Peer"}`
                            }
                            alt={c.partner?.name}
                            className="conv-avatar"
                          />
                          {isOnline && <span className="online-presence-dot" />}
                        </div>

                        <div className="conv-text-block">
                          <div className="conv-top-line">
                            <strong className="conv-name">{c.partner?.name}</strong>
                            {c.lastMessage?.createdAt && (
                              <span className="conv-timestamp">
                                {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <div className="conv-bottom-line">
                            <p className="conv-preview">{c.lastMessage?.content || "Started a chat"}</p>
                            {c.unreadCount > 0 && (
                              <span className="conv-unread-badge">{c.unreadCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW B: ACTIVE CHAT WITH STUDENT */}
          {activePartner && (
            <div className="active-chat-view">
              {/* Message Feed */}
              <div className="chat-messages-container">
                {loadingMessages ? (
                  <div className="chat-loading-box">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-bubble">
                    <SparklesIcon size={24} />
                    <p>No messages yet. Say hello to <strong>{activePartner.name}</strong>!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe =
                      (msg.sender?._id || msg.sender) === currentUser?._id;
                    return (
                      <div
                        key={msg._id}
                        className={`message-bubble-row ${isMe ? "sent" : "received"}`}
                      >
                        {!isMe && (
                          <img
                            src={
                              msg.sender?.profilePicture?.url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender?.name || "Peer"}`
                            }
                            alt="Avatar"
                            className="msg-peer-avatar"
                          />
                        )}
                        <div className="message-bubble-content">
                          <p className="msg-text">{msg.content}</p>

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="msg-attachments-wrap">
                              {msg.attachments.map((att, aIdx) => (
                                <a
                                  key={aIdx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="msg-attachment-link"
                                >
                                  {att.type === "pdf" && <FileTextIcon size={12} />}
                                  {att.type === "image" && <ImageIcon size={12} />}
                                  {att.type === "link" && <LinkIcon size={12} />}
                                  <span>{att.name || "Resource Link"}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="msg-meta-row">
                            <span className="msg-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && (
                              <span
                                className={`read-receipt ${
                                  msg.isRead ? "is-read" : ""
                                }`}
                              >
                                {msg.isRead ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Live Typing Indicator */}
                {partnerIsTyping && (
                  <div className="typing-indicator-bubble">
                    <span>{activePartner.name} is typing</span>
                    <div className="typing-dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Optional Attachment Tray */}
              {showAttachBar && (
                <div className="msg-attachment-input-tray animate-fade-in">
                  <select
                    value={attachmentType}
                    onChange={(e) => setAttachmentType(e.target.value)}
                    className="attach-type-sel"
                  >
                    <option value="link">🔗 Link</option>
                    <option value="pdf">📄 PDF</option>
                    <option value="image">🖼️ Image</option>
                  </select>
                  <input
                    type="url"
                    placeholder="Paste resource URL..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    className="attach-url-in"
                  />
                  <button
                    type="button"
                    className="btn-cancel-attach"
                    onClick={() => setShowAttachBar(false)}
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Message Composer Footer */}
              <form onSubmit={handleSendMessage} className="chat-composer-form">
                <button
                  type="button"
                  className={`btn-toggle-attach ${showAttachBar ? "active" : ""}`}
                  onClick={() => setShowAttachBar(!showAttachBar)}
                  title="Attach link or document"
                >
                  <PaperclipIcon size={16} />
                </button>

                <input
                  type="text"
                  placeholder={`Message ${activePartner.name}...`}
                  value={inputText}
                  onChange={handleInputChange}
                  className="chat-composer-input"
                  autoFocus
                />

                <button
                  type="submit"
                  className="btn-send-message"
                  disabled={!inputText.trim()}
                  title="Send message"
                >
                  <SendIcon size={15} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
