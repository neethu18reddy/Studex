/**
 * Studex AI Mentor Brain Service — Production Hardened
 * Core Orchestrator connecting Real LLM Provider (Google Gemini), Context Engine,
 * Backend Tools, and Short-term / Persistent Learning Memory.
 */

const aiProviderService = require("./aiProviderService");
const {
  getStudentLearningProfile,
  getTopicMastery,
  updateTopicMastery,
  calculateNextBestAction,
  saveMentorMemoryFact,
  STUDEX_AI_TOOL_DECLARATIONS,
  executeStudexTool,
  searchStudyMaterials,
} = require("./mentorToolsService");
const {
  buildMentorSystemInstruction,
  assembleRecentHistory,
  formatStudyMaterialContext,
} = require("./contextEngineService");
const { validateQuestionsList } = require("./questionValidationService");
const MentorMemory = require("../models/mentorMemoryModel");

/**
 * 1. Conversational Multi-Turn AI Mentor Loop
 */
async function processMentorMessage(userId, message, currentContext = {}, options = {}) {
  const generationId = options.generationId || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const profile = await getStudentLearningProfile(userId);
  const memory = await MentorMemory.findOne({ user: userId }).lean().catch(() => null);

  // Save explicit goal or preference if student states one
  if (/\b(my goal is|i am preparing for|i prefer|please remember that)\b/i.test(message)) {
    await saveMentorMemoryFact(userId, message, "goal");
  }

  // Check RAG study notes if query references notes or documents
  let ragContext = "";
  if (/\b(notes|syllabus|document|pdf|lecture|slides|uploaded)\b/i.test(message)) {
    const docs = await searchStudyMaterials(userId, message, currentContext.subject);
    if (docs.length > 0) {
      ragContext = formatStudyMaterialContext(docs);
    }
  }

  const systemInstruction =
    buildMentorSystemInstruction(profile, {
      subject: currentContext.subject,
      topic: currentContext.topic,
      activity: currentContext.page || "Studex AI Hub",
    }) + ragContext;

  const history = assembleRecentHistory(memory?.conversationSession || [], 16);

  // Inbound Trace
  console.log(`[Studex AI Inbound] User: ${profile.student.name} | GenId: ${generationId} | Query: "${message.slice(0, 80)}"`);

  const response = await aiProviderService.generateChatResponse({
    systemInstruction,
    history,
    message,
    tools: STUDEX_AI_TOOL_DECLARATIONS,
    toolExecutor: async (toolName, toolArgs) => {
      console.log(`[Studex AI Tool Exec] ${toolName} with args:`, toolArgs);
      return await executeStudexTool(userId, toolName, toolArgs);
    },
    temperature: 0.6,
    generationId,
  });

  if (!response.success) {
    console.warn(`[Studex AI Provider Failure] GenId: ${generationId} | Code: ${response.error?.code}`);
    return {
      success: false,
      isConfigured: response.isConfigured,
      generationId,
      error: response.error || {
        code: "AI_TEMPORARY_UNAVAILABLE",
        message: "Studex AI is temporarily busy. Please try again in a moment.",
        retryable: true,
      },
      reply: response.error?.message || "Studex AI is temporarily busy. Please try again in a moment.",
      toolsExecuted: [],
    };
  }

  // Persist interaction in session memory ONLY on successful generation
  await persistConversationTurn(userId, message, response.text, currentContext, generationId);

  return {
    success: true,
    isConfigured: true,
    generationId,
    reply: response.text,
    toolsExecuted: response.toolsExecuted || [],
  };
}

/**
 * 2. Streaming AI Mentor Chat (SSE)
 */
async function streamMentorMessage(userId, message, currentContext = {}, onChunk, options = {}) {
  const generationId = options.generationId || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const profile = await getStudentLearningProfile(userId);
  const memory = await MentorMemory.findOne({ user: userId }).lean().catch(() => null);

  let ragContext = "";
  if (/\b(notes|syllabus|document|pdf|lecture|slides|uploaded)\b/i.test(message)) {
    const docs = await searchStudyMaterials(userId, message, currentContext.subject);
    if (docs.length > 0) {
      ragContext = formatStudyMaterialContext(docs);
    }
  }

  const systemInstruction =
    buildMentorSystemInstruction(profile, {
      subject: currentContext.subject,
      topic: currentContext.topic,
      activity: currentContext.page || "Studex AI Hub",
    }) + ragContext;

  const history = assembleRecentHistory(memory?.conversationSession || [], 16);

  const fullText = await aiProviderService.streamChatResponse({
    systemInstruction,
    history,
    message,
    onChunk,
    temperature: 0.6,
    generationId,
  });

  await persistConversationTurn(userId, message, fullText, currentContext, generationId);
  return fullText;
}

/**
 * 3. Diagnostic Quiz Generation via Real LLM
 */
async function generateDiagnosticQuiz(userId, { subjectName, topic, questionCount = 3, difficulty = "adaptive" }) {
  const profile = await getStudentLearningProfile(userId);
  const masteryList = await getTopicMastery(userId, subjectName);
  const currentTopicMastery = masteryList.find((m) => m.topic.toLowerCase() === (topic || "").toLowerCase());

  const prompt = `Generate a ${questionCount}-question diagnostic quiz for student ${profile.student.name}.
Subject: ${subjectName}
Topic: ${topic || "Core Subject Concepts"}
Student Mastery Level: ${currentTopicMastery ? `${currentTopicMastery.masteryScore}%` : "Beginner"}
Difficulty: ${difficulty}

Return ONLY a JSON array with this exact structure:
[
  {
    "id": "q1",
    "question": "Clear conceptual question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Detailed explanation of why this option is correct",
    "conceptTested": "${topic || subjectName}"
  }
]`;

  if (aiProviderService.isConfigured()) {
    try {
      const response = await aiProviderService.generateChatResponse({
        systemInstruction: "You are an elite academic test designer. Output valid JSON arrays only.",
        message: prompt,
        temperature: 0.3,
      });

      if (response.success && response.text) {
        const jsonMatch = response.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const rawQuestions = JSON.parse(jsonMatch[0]);
          const validated = validateQuestionsList(rawQuestions, subjectName, topic);
          if (validated.length > 0) {
            return {
              success: true,
              source: "gemini",
              subjectName,
              topic,
              questions: validated,
            };
          }
        }
      }
    } catch (err) {
      console.warn("LLM quiz generation error:", err.message);
    }
  }

  return {
    success: false,
    message: "Diagnostic quiz generation is currently unavailable. Please try again in a moment.",
    questions: [],
  };
}

/**
 * 4. Evaluate Quiz Answers & Record Topic Mastery
 */
async function evaluateQuizSubmission(userId, { subjectName, topic, answers }) {
  let totalPoints = 0;
  const evaluations = [];

  for (const item of answers) {
    const isCorrect = item.selectedOptionIndex === item.correctAnswerIndex;
    if (isCorrect) totalPoints += 1;

    evaluations.push({
      questionId: item.id,
      isCorrect,
      explanation: item.explanation,
      misconception: isCorrect ? null : `Struggling with ${item.conceptTested || topic}`,
    });

    await updateTopicMastery(userId, {
      subjectName,
      topic: item.conceptTested || topic,
      scoreDelta: isCorrect ? 8 : -5,
      mistake: isCorrect
        ? null
        : {
            question: item.question,
            studentAnswer: item.options ? item.options[item.selectedOptionIndex] : "Selected wrong option",
            misconception: `Misunderstood ${item.conceptTested || topic}`,
          },
      strength: isCorrect ? item.conceptTested : null,
    });
  }

  const scorePercentage = Math.round((totalPoints / (answers.length || 1)) * 100);

  return {
    success: true,
    score: totalPoints,
    total: answers.length,
    percentage: scorePercentage,
    evaluations,
    feedback:
      scorePercentage >= 80
        ? `🌟 Outstanding mastery! You demonstrated strong conceptual precision in ${topic || subjectName}.`
        : scorePercentage >= 50
        ? `👍 Good progress. Review the explanations for missed questions to solidify your understanding.`
        : `💡 Needs review. Let's do a targeted review on ${topic || subjectName} to clear up key misconceptions.`,
  };
}

/**
 * Helper: Persist multi-turn conversation into MongoDB
 */
async function persistConversationTurn(userId, userMessage, assistantReply, context = {}, generationId = null) {
  try {
    await MentorMemory.findOneAndUpdate(
      { user: userId },
      {
        $push: {
          conversationSession: {
            $each: [
              { role: "user", content: userMessage, mode: "TEACH", metadata: { generationId } },
              { role: "assistant", content: assistantReply, mode: "TEACH", metadata: { generationId } },
            ],
            $slice: -24, // Bounded short-term memory window
          },
        },
        $set: {
          lastActivityContext: {
            subject: context.subject || "General Academics",
            topic: context.topic || "Discussion",
            page: context.page || "Studex AI Hub",
            timestamp: new Date(),
          },
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn("Failed to persist conversation turn:", err.message);
  }
}

module.exports = {
  processMentorMessage,
  streamMentorMessage,
  generateDiagnosticQuiz,
  evaluateQuizSubmission,
  getStudentLearningProfile,
};
