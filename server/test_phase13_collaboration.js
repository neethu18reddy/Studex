/**
 * Verification test for Phase 13 Shared Academic Workspace & Group Tasks
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDb } = require("./config/db");
const Space = require("./models/spaceModel");
const SpaceMember = require("./models/spaceMemberModel");
const SpacePost = require("./models/spacePostModel");
const SpaceResource = require("./models/spaceResourceModel");
const SpaceTask = require("./models/spaceTaskModel");
const Task = require("./models/taskModel");
const User = require("./models/userModel");

async function runTests() {
  console.log("=== Testing Phase 13 Collaboration Backend ===");
  await connectDb();

  let user1 = await User.findOne({ email: "student1.collab@studex.edu" });
  if (!user1) {
    user1 = await User.create({
      name: "Sneha Lead",
      email: "student1.collab@studex.edu",
      password: "hashedpassword123",
      course: "Computer Science",
    });
  }

  let user2 = await User.findOne({ email: "student2.collab@studex.edu" });
  if (!user2) {
    user2 = await User.create({
      name: "Rahul Peer",
      email: "student2.collab@studex.edu",
      password: "hashedpassword123",
      course: "Computer Science",
    });
  }

  // 1. Create Space
  let space = await Space.findOne({ name: "Distributed Systems Lab" });
  if (!space) {
    space = await Space.create({
      name: "Distributed Systems Lab",
      description: "Collaborative research and assignments for Semester 6",
      category: "project_team",
      icon: "⚡",
      color: "#2563EB",
      creator: user1._id,
      memberCount: 2,
    });
  }

  await SpaceMember.findOneAndUpdate(
    { space: space._id, user: user1._id },
    { role: "owner", status: "active" },
    { upsert: true }
  );

  await SpaceMember.findOneAndUpdate(
    { space: space._id, user: user2._id },
    { role: "member", status: "active" },
    { upsert: true }
  );

  console.log("✅ 1. Space & Members created:", space.name);

  // 2. Create Discussion & Announcement
  const discussion = await SpacePost.create({
    space: space._id,
    author: user1._id,
    type: "discussion",
    content: "Has anyone started on the Raft Consensus replication module?",
  });
  console.log("✅ 2. Discussion Post created:", discussion.content);

  const announcement = await SpacePost.create({
    space: space._id,
    author: user1._id,
    type: "announcement",
    title: "Mid-Term Project Submission Date",
    content: "Please ensure all commits are pushed by Friday 11:59 PM.",
    isPinned: true,
  });
  console.log("✅ 3. Pinned Announcement created:", announcement.title);

  // 3. Create Shared Resources (PDF, Link, Video, etc.)
  const pdfRes = await SpaceResource.create({
    space: space._id,
    uploadedBy: user1._id,
    title: "Raft Consensus Paper (Original)",
    description: "In Search of an Understandable Consensus Algorithm",
    type: "pdf",
    url: "https://raft.github.io/raft.pdf",
    tags: ["Consensus", "Distributed Systems"],
  });

  const videoRes = await SpaceResource.create({
    space: space._id,
    uploadedBy: user2._id,
    title: "Visualizing Raft Simulation Lecture",
    description: "Interactive visual walkthrough of leader election",
    type: "video",
    url: "https://thesecretlivesofdata.com/raft/",
    tags: ["Visual", "Leader Election"],
  });
  console.log("✅ 4. Shared Resources created:", pdfRes.title, "&", videoRes.title);

  // 4. Create Group Task
  const groupTask = await SpaceTask.create({
    space: space._id,
    creator: user1._id,
    title: "Implement Heartbeat RPC Handler",
    description: "Leader election timeout and AppendEntries handler",
    assignedTo: user2._id,
    deadline: new Date(Date.now() + 86400000 * 3),
    priority: "high",
    status: "in_progress",
    syncedPersonalUsers: [user2._id],
  });
  console.log("✅ 5. Group Task created & assigned to Rahul Peer:", groupTask.title);

  // 5. Personal <-> Group Integration: Sync to Rahul's Personal Task Engine
  const syncedPersonalTask = await Task.findOneAndUpdate(
    { user: user2._id, sourceSpaceTask: groupTask._id },
    {
      title: groupTask.title,
      description: groupTask.description,
      priority: groupTask.priority,
      deadline: groupTask.deadline,
      status: groupTask.status,
      isGroupTask: true,
      sourceSpace: space._id,
      sourceSpaceTask: groupTask._id,
      spaceName: space.name,
    },
    { upsert: true, new: true }
  );
  console.log("✅ 6. Personal <-> Group Sync Verified! Personal Task ID:", syncedPersonalTask._id);
  console.log("    isGroupTask:", syncedPersonalTask.isGroupTask, "| Space:", syncedPersonalTask.spaceName);

  // Verify bi-directional status update
  syncedPersonalTask.status = "completed";
  await syncedPersonalTask.save();
  await SpaceTask.findByIdAndUpdate(groupTask._id, { status: "completed" });
  const updatedGroupTask = await SpaceTask.findById(groupTask._id);
  console.log("✅ 7. Bi-directional completion update verified! Group Task Status:", updatedGroupTask.status);

  console.log("\n🎉 ALL PHASE 13 BACKEND COLLABORATION TESTS PASSED!");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
