const http = require("http");
const { io: ioClient } = require("socket.io-client");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const { connectDb } = require("./config/db");
const { app, server } = require("./server");
const User = require("./models/userModel");
const Space = require("./models/spaceModel");
const SpaceMember = require("./models/spaceMemberModel");
const DirectMessage = require("./models/directMessageModel");
const SpacePost = require("./models/spacePostModel");
const SpaceTask = require("./models/spaceTaskModel");

const TEST_PORT = 5099;

async function runTests() {
  console.log("=== Testing Phase 14 Real-time Socket.io Implementation ===");

  await connectDb();

  // Start test server on TEST_PORT
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`✅ Test server running on port ${TEST_PORT}`);

  const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

  // Create two test users: User A (Alice) and User B (Bob)
  const ts = Date.now();
  const userA = await User.findOneAndUpdate(
    { email: `alice_${ts}@studex.test` },
    {
      name: "Alice Realtime",
      email: `alice_${ts}@studex.test`,
      password: "password123",
      college: "MIT",
    },
    { upsert: true, new: true }
  );

  const userB = await User.findOneAndUpdate(
    { email: `bob_${ts}@studex.test` },
    {
      name: "Bob Realtime",
      email: `bob_${ts}@studex.test`,
      password: "password123",
      college: "Stanford",
    },
    { upsert: true, new: true }
  );

  const tokenA = jwt.sign({ id: userA._id }, JWT_SECRET, { expiresIn: "1h" });
  const tokenB = jwt.sign({ id: userB._id }, JWT_SECRET, { expiresIn: "1h" });

  console.log(`✅ Test Users Created: ${userA.name} and ${userB.name}`);

  // Connect Socket Client A (Alice)
  const clientA = ioClient(`http://localhost:${TEST_PORT}`, {
    auth: { token: tokenA },
    transports: ["websocket"],
  });

  await new Promise((resolve, reject) => {
    clientA.on("connect", resolve);
    clientA.on("connect_error", reject);
  });
  console.log("✅ Socket Client A connected");

  // Connect Socket Client B (Bob) and listen for presence
  let bobReceivedUserStatus = false;
  const clientB = ioClient(`http://localhost:${TEST_PORT}`, {
    auth: { token: tokenB },
    transports: ["websocket"],
  });

  clientB.on("presence:user_status", (status) => {
    if (status.userId === userA._id.toString() || status.userId === userB._id.toString()) {
      bobReceivedUserStatus = true;
    }
  });

  await new Promise((resolve, reject) => {
    clientB.on("connect", resolve);
    clientB.on("connect_error", reject);
  });
  console.log("✅ Socket Client B connected");

  // Test 1: Typing Indicator
  const typingPromise = new Promise((resolve) => {
    clientB.on("dm:typing", (data) => {
      console.log(`✅ 1. Typing Indicator Received by Bob: "${data.senderName}" is typing = ${data.isTyping}`);
      resolve(data);
    });
  });

  clientA.emit("dm:typing", { recipientId: userB._id.toString(), isTyping: true });
  await typingPromise;

  // Test 2: Real-time Messaging + Persistence
  const messagePromise = new Promise((resolve) => {
    clientB.on("dm:new_message", (msg) => {
      console.log(`✅ 2. Real-time Message Received by Bob: "${msg.content}"`);
      resolve(msg);
    });
  });

  const notificationPromise = new Promise((resolve) => {
    clientB.on("notification:new", (notif) => {
      console.log(`✅ 3. Real-time Push Notification Received by Bob: "${notif.title}"`);
      resolve(notif);
    });
  });

  clientA.emit("dm:send_message", {
    recipientId: userB._id.toString(),
    content: "Hey Bob! Have you reviewed the Socket.io milestone?",
  });

  const [receivedMsg, receivedNotif] = await Promise.all([messagePromise, notificationPromise]);

  // Check MongoDB persistence
  const savedMsg = await DirectMessage.findById(receivedMsg._id);
  if (!savedMsg) throw new Error("Message was not persisted in MongoDB!");
  console.log(`✅ 4. MongoDB Persistence Verified for Message ID: ${savedMsg._id}`);

  // Test 3: Space Real-time Room Broadcast
  const testSpace = await Space.create({
    name: "Realtime Systems 2026",
    creator: userA._id,
    category: "study_group",
  });
  await SpaceMember.create({ space: testSpace._id, user: userA._id, role: "owner", status: "active" });
  await SpaceMember.create({ space: testSpace._id, user: userB._id, role: "member", status: "active" });

  clientA.emit("space:join", { spaceId: testSpace._id.toString() });
  clientB.emit("space:join", { spaceId: testSpace._id.toString() });
  await new Promise((r) => setTimeout(r, 200));

  const spaceTypingPromise = new Promise((resolve) => {
    clientB.on("space:typing", (data) => {
      console.log(`✅ 5. Real-time Space Typing Indicator Received: ${data.user.name}`);
      resolve(data);
    });
  });

  clientA.emit("space:typing", { spaceId: testSpace._id.toString(), isTyping: true });
  await spaceTypingPromise;

  // Test 4: Real-time Task Update
  const taskUpdatePromise = new Promise((resolve) => {
    clientB.on("space:task_updated", (data) => {
      console.log(`✅ 6. Real-time Space Task Update Received: Task ${data.taskId} is now ${data.status}`);
      resolve(data);
    });
  });

  clientA.emit("task:status_update", {
    spaceId: testSpace._id.toString(),
    taskId: "task_12345",
    newStatus: "completed",
  });
  await taskUpdatePromise;

  // Cleanup
  clientA.disconnect();
  clientB.disconnect();
  server.close();

  console.log("\n🎉 ALL PHASE 14 REAL-TIME SOCKET.IO TESTS PASSED SUCCESSFULLY!\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
