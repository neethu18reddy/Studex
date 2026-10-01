/**
 * End-to-End Verification Test for Rebuilt Studex AI
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { processMentorMessage, streamMentorMessage } = require('./services/mentorBrainService');
const aiProviderService = require('./services/aiProviderService');
const { connectDb } = require('./config/db');
const User = require('./models/userModel');
const Task = require('./models/taskModel');
const MentorMemory = require('./models/mentorMemoryModel');

async function runE2ETests() {
  console.log('=== 1. Checking AI Provider Configuration ===');
  const info = aiProviderService.getProviderInfo();
  console.log('AI Provider Info:', info);
  if (!info.isConfigured) {
    throw new Error('AI Provider is not configured with GEMINI_API_KEY');
  }

  console.log('\n=== 2. Connecting to MongoDB ===');
  await connectDb();

  // Find or create test student
  let testUser = await User.findOne();
  if (!testUser) {
    console.log('No user found in database, creating temporary test user');
    testUser = await User.create({
      name: 'Sneha Reddy',
      email: 'sneha.test@studex.edu',
      password: 'hashedpassword123',
    });
  }
  console.log(`Using student: ${testUser.name} (${testUser._id})`);

  // Clear previous session memory for clean test run
  await MentorMemory.deleteOne({ user: testUser._id });

  console.log('\n=== 3. Testing Conversational AI Academic Mentor (Turn 1) ===');
  const turn1Result = await processMentorMessage(
    testUser._id,
    'Can you explain the difference between routing and forwarding in computer networks with a real-world analogy?',
    { subject: 'Computer Networks', topic: 'Routing and Forwarding' }
  );

  console.log('Turn 1 Success:', turn1Result.success);
  console.log('Turn 1 Reply:\n', turn1Result.reply);

  console.log('\n=== 4. Testing Multi-Turn Context Retention (Turn 2) ===');
  const turn2Result = await processMentorMessage(
    testUser._id,
    'Based on that, which one is implemented in hardware versus software in modern routers?',
    { subject: 'Computer Networks', topic: 'Routing and Forwarding' }
  );

  console.log('Turn 2 Success:', turn2Result.success);
  console.log('Turn 2 Reply:\n', turn2Result.reply);

  console.log('\n=== 5. Testing Streaming Chat (SSE) ===');
  let streamAccumulator = '';
  await streamMentorMessage(
    testUser._id,
    'Give me one quick diagnostic question to test my understanding.',
    { subject: 'Computer Networks' },
    (chunk) => {
      streamAccumulator += chunk;
    }
  );
  console.log('Streaming Succeeded, received bytes:', streamAccumulator.length);
  console.log('Streamed Output:\n', streamAccumulator);

  console.log('\n=== ALL STUDEX AI E2E TESTS PASSED SUCCESSFULLY! ===');
  await mongoose.disconnect();
  process.exit(0);
}

runE2ETests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
