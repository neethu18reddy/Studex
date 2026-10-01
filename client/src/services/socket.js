import { io } from "socket.io-client";

let socket = null;

/**
 * Connect to Socket.io server with user JWT token
 */
export const initSocket = (apiBase, token) => {
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  // If already connected with the same token, reuse
  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  // Derive Socket server URL (default to backend host or window.location)
  const serverUrl = apiBase || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

  socket = io(serverUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("⚡ Connected to Studex Real-time Socket Server (ID:", socket.id, ")");
  });

  socket.on("connect_error", (err) => {
    console.warn("Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  return socket;
};

/**
 * Get active socket instance
 */
export const getSocket = () => socket;

/**
 * Disconnect socket cleanly on logout
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
