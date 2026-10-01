function getGeminiModel() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.6,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2500,
      },
    });
  } catch (err) {
    console.error("Gemini initialization error:", err.message);
    return null;
  }
}

/**
 * Constructs a comprehensive system instruction summarizing the student's live context
 */
function buildSystemContextPrompt(context) {
  const { student, subjects, tasks, deadlines, studyStats, streak } = context;

  const subjectsList = subjects.map((s) => `${s.name} (${s.code || "No Code"})`).join(", ");
  
  const tasksSummary = tasks.pending.length > 0
    ? tasks.pending
        .map(
          (t) =>
            `- [${t.priority.toUpperCase()}] ${t.title} (${t.subject}, ${t.deadlineRelative}, est. ${t.estimatedMinutes} mins)`
        )
        .join("\n")
    : "No urgent pending tasks recorded.";

  const deadlinesSummary = deadlines.length > 0
    ? deadlines
        .map(
          (d) =>
            `- [${d.category.toUpperCase()}] ${d.title} (${d.relative} on ${d.date})${d.isImportant ? " ⭐ CRITICAL" : ""}`
        )
        .join("\n")
    : "No upcoming exams or deadlines logged.";

  const studyBreakdown = Object.entries(studyStats.subjectBreakdownMinutes || {})
    .map(([sub, mins]) => `${sub}: ${(mins / 60).toFixed(1)} hrs`)
    .join(", ") || "No study sessions recorded this week yet.";

  return `
You are STUDEX AI — an elite, context-aware academic assistant and personalized study strategist powered by Google Gemini.
You have live, direct access to this student's real-time academic database:

=== STUDENT LIVE PROFILE ===
• Name: ${student.name}
• Institution: ${student.college}
• Major/Degree: ${student.course} (${student.year})
• Enrolled Subjects: ${subjectsList || "General academic curriculum"}

=== UPCOMING DEADLINES & EXAMS (High Urgency) ===
${deadlinesSummary}

=== PENDING ASSIGNMENTS & TASKS ===
${tasksSummary}

=== STUDY MOMENTUM & VELOCITY ===
• Weekly Progress: ${studyStats.weeklyHoursLogged} hrs logged of ${studyStats.weeklyTargetHours} hrs goal (${studyStats.targetProgressPercent}%)
• Subject Time Breakdown: ${studyBreakdown}
• Consistency: ${streak.currentStreakDays}-day streak (Active ${streak.activeDaysThisWeek} of 7 days this week)

=== YOUR ROLE & PLANNING PRINCIPLES ===
1. Generate an inspiring, logically rigorous, time-blocked study schedule that directly matches the student's target subjects, requested topics, and chosen study mode.
2. Adhere strictly to the student's constraints (e.g. if Pure Learning / Theory Only is requested, NEVER include practice problems or coding exercises).
3. Provide deep pedagogical value using proven techniques (Feynman technique, Spaced Retrieval, Mental Models, Chunking).
`;
}

/**
 * Generates a context-aware Personalized Study Plan
 */
async function generatePersonalizedPlan(
  context,
  {
    availableTime = "3 hours",
    timeWindow = "tonight",
    focusGoal = "balanced",
    customNotes = "",
    selectedSubject = "all",
    topicsToCover = "",
    studyMode = "balanced",
  }
) {
  const model = getGeminiModel();
  const systemPrompt = buildSystemContextPrompt(context);

  const isSpecificSubject = selectedSubject && selectedSubject !== "all";

  // Check if user requested learning-only / theory-only
  const isLearningOnly =
    studyMode === "learning_only" ||
    /\b(no practice|only learning|pure theory|theory only|no problems|no coding|just read|just learn)\b/i.test(
      customNotes || ""
    );

  const isPracticeOnly =
    studyMode === "practice_only" ||
    /\b(only practice|practice only|problem solving only|only problems|past questions only)\b/i.test(
      customNotes || ""
    );

  const isRevisionOnly =
    studyMode === "revision" ||
    /\b(revision only|quick review|flashcards only|speed recap)\b/i.test(
      customNotes || ""
    );

  // Formulate dynamic mode instructions
  let modeDirective = "";
  if (isLearningOnly) {
    modeDirective = `
🚨 STRICT CONSTRAINT: PURE THEORY & LEARNING ONLY (NO PRACTICE PROBLEMS)
The student explicitly requested: NO PRACTICE PROBLEMS, NO CODING EXERCISES, NO ASSIGNMENT DRILLS.
- Allocate 100% of study blocks to deep conceptual learning, textbook/syllabus reading, understanding underlying mechanics, architectural diagrams, mental models, and Feynman explanations.
- DO NOT schedule any problem solving, coding drills, or assignment tasks.`;
  } else if (isPracticeOnly) {
    modeDirective = `
🚨 STRICT CONSTRAINT: PRACTICE & PROBLEM SOLVING ONLY
The student wants to focus exclusively on hands-on application, past exam problem sets, exercises, and debugging drills.`;
  } else if (isRevisionOnly) {
    modeDirective = `
🚨 STRICT CONSTRAINT: RAPID REVISION & ACTIVE RECALL
The student wants high-speed review, formula sheets, mind maps, and active flash recall.`;
  } else {
    modeDirective = `
STUDY MODE: BALANCED (Concept Theory & Deep Reading + Application Practice).`;
  }

  const topicDirective = topicsToCover && topicsToCover.trim()
    ? `🎯 TARGET TOPICS / CHAPTERS TO COVER: "${topicsToCover.trim()}".
(You MUST strictly divide the session into structured blocks covering these exact topics).`
    : `TARGET TOPICS: Core topics based on enrolled subject syllabus and closest upcoming deadlines.`;

  const userQuery = `
The student requested:
"I have ${availableTime} available ${timeWindow}. Please generate an optimal personalized study schedule for me."

${
  isSpecificSubject
    ? `TARGET SUBJECT FOCUS: "${selectedSubject}" (The student wants to focus EXCLUSIVELY on "${selectedSubject}". Dedicate ALL study blocks to this subject. Do NOT schedule other subjects).`
    : `SUBJECT FOCUS: Multi-Subject / Balanced across enrolled curriculum.`
}
${topicDirective}
${modeDirective}
Focus Strategy: ${focusGoal}
Additional Student Notes: ${customNotes || "None provided"}

Please generate:
1. 🎯 Strategic Rationale: Brief explanation of why this schedule was built (mentioning ${topicsToCover ? `the requested topics "${topicsToCover}"` : isSpecificSubject ? `key mastery goals for ${selectedSubject}` : "their closest deadlines, exam proximity, and neglected subjects"}).
2. ⏱️ Time-Blocked Schedule: Exact sequential timetable for the available duration (${isLearningOnly ? "100% focused on pure theory, concepts, and reading with NO practice problems" : isSpecificSubject ? `100% focused on ${selectedSubject}` : "balanced across priority subjects"}) with concrete topics/tasks, active recall techniques, and Pomodoro breaks.
3. 💡 High-Impact Study Technique: (e.g., Feynman technique, active recall, diagram mapping for ${topicsToCover || (isSpecificSubject ? selectedSubject : "core coursework")}).
4. 🚀 Actionable Micro-Tasks: 3-5 specific steps the student should check off during this session (${isLearningOnly ? "focused entirely on comprehension and notes" : "actionable learning & practice steps"}).

IMPORTANT: AT THE VERY END OF YOUR RESPONSE, append a JSON code block matching this schema so the frontend interactive cards render your exact plan:
\`\`\`json
{
  "blocks": [
    {
      "blockNumber": 1,
      "durationMins": 45,
      "timeSpan": "0:00 - 0:45",
      "subject": "${isSpecificSubject ? selectedSubject : "Subject Name"}",
      "activity": "Specific activity description for this block",
      "technique": "Feynman Technique",
      "type": "study"
    },
    {
      "blockNumber": 2,
      "durationMins": 10,
      "subject": "Rest & Hydration",
      "activity": "Active Break: Hydrate and step away from screen",
      "type": "break"
    }
  ]
}
\`\`\`
`;

  if (model) {
    try {
      const prompt = `${systemPrompt}\n\n${userQuery}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text();

      // Extract JSON blocks if present
      let extractedBlocks = [];
      const jsonMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.blocks && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
            extractedBlocks = parsed.blocks;
          }
        } catch (e) {
          console.warn("Could not parse Gemini JSON blocks:", e.message);
        }
      }

      // Compute deterministic fallback blocks if JSON parsing did not return blocks
      const fallbackData = generateDeterministicPlanFallback(
        context,
        availableTime,
        timeWindow,
        focusGoal,
        selectedSubject,
        topicsToCover,
        studyMode,
        customNotes
      );

      // Clean the raw response of the trailing JSON code block for clean markdown rendering
      const cleanMarkdown = rawText.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, "").trim();

      return {
        success: true,
        source: "gemini",
        model: "gemini-1.5-flash",
        planMarkdown: cleanMarkdown,
        blocks: extractedBlocks.length > 0 ? extractedBlocks : fallbackData.blocks || [],
        contextSnapshot: {
          pendingTasksCount: context.tasks.totalPending,
          deadlinesCount: context.deadlines.length,
          targetProgressPercent: context.studyStats.targetProgressPercent,
          targetSubject: selectedSubject,
          topicsToCover,
          studyMode,
        },
      };
    } catch (err) {
      console.warn("Gemini API call failed, using intelligent rule-based planner fallback:", err.message);
    }
  }

  // Resilient Smart Academic Rule-Based Planner Fallback
  return generateDeterministicPlanFallback(
    context,
    availableTime,
    timeWindow,
    focusGoal,
    selectedSubject,
    topicsToCover,
    studyMode,
    customNotes
  );
}

/**
 * Context-aware Conversational Chat
 */
async function generateAIChatResponse(context, message, history = []) {
  const model = getGeminiModel();
  const systemPrompt = buildSystemContextPrompt(context);

  if (model) {
    try {
      const fullPrompt = `${systemPrompt}\n\nSTUDENT QUESTION: "${message}"\n\nAnswer with direct reference to their actual subjects, deadlines, and study history.`;
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return {
        success: true,
        source: "gemini",
        reply: response.text(),
      };
    } catch (err) {
      console.warn("Gemini Chat failed, using fallback:", err.message);
    }
  }

  // Fallback assistant response
  return {
    success: true,
    source: "studex_rule_engine",
    reply: generateRuleBasedChatReply(context, message),
  };
}

/**
 * Breaks down a complex task or exam syllabus into actionable micro-tasks
 */
async function generateTaskBreakdown(context, taskTitle, subjectName) {
  const model = getGeminiModel();
  const systemPrompt = buildSystemContextPrompt(context);

  const query = `
Break down the following academic task/exam preparation into 4 to 6 actionable, realistic micro-tasks:
Task: "${taskTitle}"
Subject: "${subjectName || "General"}"

Return the sub-tasks in JSON array format:
[
  { "title": "Subtask title", "estimatedDuration": 25, "priority": "high" }
]
`;

  if (model) {
    try {
      const prompt = `${systemPrompt}\n\n${query}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON if possible
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, subtasks: parsed };
      }
    } catch (err) {
      console.warn("Gemini task breakdown failed, using fallback:", err.message);
    }
  }

  // Fallback Breakdown
  return {
    success: true,
    subtasks: [
      { title: `Review core concepts & syllabus for ${taskTitle}`, estimatedDuration: 25, priority: "high" },
      { title: `Solve 3-5 practice problems or past paper questions`, estimatedDuration: 40, priority: "high" },
      { title: `Draft main outline / key formulas summary`, estimatedDuration: 30, priority: "medium" },
      { title: `Self-quiz with active recall on weak topics`, estimatedDuration: 25, priority: "medium" },
    ],
  };
}

/**
 * Intelligent deterministic study plan generator when offline or API key absent
 */
function generateDeterministicPlanFallback(
  context,
  availableTime,
  timeWindow,
  focusGoal,
  selectedSubject = "all",
  topicsToCover = "",
  studyMode = "balanced",
  customNotes = ""
) {
  const { tasks, deadlines, studyStats, student, subjects } = context;

  // Calculate total minutes
  let totalMinutes = 180;
  if (typeof availableTime === "number") totalMinutes = availableTime;
  else if (typeof availableTime === "string") {
    const match = availableTime.match(/(\d+)/);
    if (match) totalMinutes = parseInt(match[1], 10) * (availableTime.includes("hour") ? 60 : 1);
  }

  const isSpecificSubject = selectedSubject && selectedSubject !== "all";

  // Check if user requested learning-only / theory-only
  const isLearningOnly =
    studyMode === "learning_only" ||
    /\b(no practice|only learning|pure theory|theory only|no problems|no coding|just read|just learn)\b/i.test(
      customNotes || ""
    );

  const isPracticeOnly =
    studyMode === "practice_only" ||
    /\b(only practice|practice only|problem solving only|only problems|past questions only)\b/i.test(
      customNotes || ""
    );

  const isRevisionOnly =
    studyMode === "revision" ||
    /\b(revision only|quick review|flashcards only|speed recap)\b/i.test(
      customNotes || ""
    );

  // Parse topics
  const topicsList = topicsToCover
    ? topicsToCover
        .split(/[,;\n]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const primaryFocusSubject = isSpecificSubject
    ? selectedSubject
    : deadlines.find(
        (d) =>
          d.isImportant ||
          d.relative.includes("Today") ||
          d.relative.includes("Tomorrow") ||
          d.relative.includes("2 days")
      )?.title ||
      tasks.pending[0]?.subject ||
      subjects[0]?.name ||
      "Core Academics";

  const secondaryFocusSubject = isSpecificSubject
    ? selectedSubject
    : tasks.pending[1]?.subject || subjects[1]?.name || "Secondary Subject";

  const t1 = topicsList[0] || (isSpecificSubject ? `${primaryFocusSubject} Core Concepts` : "Key Curriculum Theory");
  const t2 = topicsList[1] || topicsList[0] || (isSpecificSubject ? `${primaryFocusSubject} In-Depth Topics` : "Secondary Priority Subject");
  const t3 = topicsList[2] || (isSpecificSubject ? `${primaryFocusSubject} Synthesis & Mind Maps` : "Coursework Synthesis");

  const blocks = [];
  let remainingTime = totalMinutes;
  let blockIndex = 1;

  if (isLearningOnly) {
    // -------------------------------------------------------------
    // PURE LEARNING / THEORY ONLY SESSION (NO PRACTICE PROBLEMS)
    // -------------------------------------------------------------
    // Block 1: Deep Theory & Concept Acquisition (45-50 mins)
    const b1Duration = Math.min(50, Math.floor(remainingTime * 0.45));
    blocks.push({
      blockNumber: blockIndex++,
      timeSpan: `0:00 - ${Math.floor(b1Duration / 60)}:${String(b1Duration % 60).padStart(2, "0")}`,
      durationMins: b1Duration,
      subject: primaryFocusSubject,
      activity: `Deep Conceptual Reading & Core Theory: Master ${t1} (Understanding fundamental principles & mechanics)`,
      technique: "Feynman Technique + Deep Reading",
      type: "study",
    });
    remainingTime -= b1Duration;

    // Break 1 (10 mins)
    if (remainingTime > 30) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: 10,
        subject: "Rest & Hydration",
        activity: "Active Break: Step away from screens, stretch, hydrate ☕",
        type: "break",
      });
      remainingTime -= 10;
    }

    // Block 2: In-Depth Mechanism & Architecture (45 mins)
    if (remainingTime >= 30) {
      const b2Duration = Math.min(45, Math.floor(remainingTime * 0.6));
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: b2Duration,
        subject: primaryFocusSubject,
        activity: `Architectural Breakdown & Detailed Study: Deep dive into ${t2} (Textbook chapters, schematics & flow models)`,
        technique: "Mental Models & Concept Mapping",
        type: "study",
      });
      remainingTime -= b2Duration;
    }

    // Block 3: Theoretical Synthesis & Mind Mapping (Remaining mins)
    if (remainingTime >= 20) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: remainingTime,
        subject: primaryFocusSubject,
        activity: `Knowledge Consolidation: Create structured summary notes and comprehensive mind map for ${t3 || primaryFocusSubject}`,
        technique: "Active Recall Note Synthesis",
        type: "study",
      });
    }
  } else if (isPracticeOnly) {
    // -------------------------------------------------------------
    // PRACTICE & PROBLEM SOLVING ONLY
    // -------------------------------------------------------------
    const b1Duration = Math.min(50, Math.floor(remainingTime * 0.45));
    blocks.push({
      blockNumber: blockIndex++,
      timeSpan: `0:00 - ${Math.floor(b1Duration / 60)}:${String(b1Duration % 60).padStart(2, "0")}`,
      durationMins: b1Duration,
      subject: primaryFocusSubject,
      activity: `Practice Set 1: Solve targeted problem sets and exercises on ${t1}`,
      technique: "Deliberate Practice",
      type: "study",
    });
    remainingTime -= b1Duration;

    if (remainingTime > 30) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: 10,
        subject: "Rest & Hydration",
        activity: "Active Break: Step away from screens, stretch, hydrate ☕",
        type: "break",
      });
      remainingTime -= 10;
    }

    if (remainingTime >= 30) {
      const b2Duration = Math.min(45, Math.floor(remainingTime * 0.6));
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: b2Duration,
        subject: primaryFocusSubject,
        activity: `Practice Set 2: Advanced problem solving & past exam questions on ${t2}`,
        technique: "Timed Exam Simulation",
        type: "study",
      });
      remainingTime -= b2Duration;
    }

    if (remainingTime >= 20) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: remainingTime,
        subject: primaryFocusSubject,
        activity: `Solution Analysis & Error Log Review for ${primaryFocusSubject}`,
        technique: "Error Reflection & Correction",
        type: "study",
      });
    }
  } else if (isRevisionOnly) {
    // -------------------------------------------------------------
    // RAPID REVISION & FLASH RECALL
    // -------------------------------------------------------------
    const b1Duration = Math.min(50, Math.floor(remainingTime * 0.45));
    blocks.push({
      blockNumber: blockIndex++,
      durationMins: b1Duration,
      subject: primaryFocusSubject,
      activity: `High-Yield Summary Review: Rapid coverage of ${t1} and key definitions`,
      technique: "Flash Summary",
      type: "study",
    });
    remainingTime -= b1Duration;

    if (remainingTime > 30) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: 10,
        subject: "Rest & Hydration",
        activity: "Active Break: Hydrate and rest eyes ☕",
        type: "break",
      });
      remainingTime -= 10;
    }

    if (remainingTime >= 30) {
      const b2Duration = Math.min(45, Math.floor(remainingTime * 0.6));
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: b2Duration,
        subject: primaryFocusSubject,
        activity: `Active Recall Drill: Self-testing and formula quizzing for ${t2}`,
        technique: "Spaced Flashcard Review",
        type: "study",
      });
      remainingTime -= b2Duration;
    }

    if (remainingTime >= 20) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: remainingTime,
        subject: primaryFocusSubject,
        activity: `Speed Checkpoint: Review remaining weak points in ${primaryFocusSubject}`,
        technique: "Targeted Weak-Point Blitz",
        type: "study",
      });
    }
  } else if (isSpecificSubject) {
    // -------------------------------------------------------------
    // Single Subject Balanced Session
    // -------------------------------------------------------------
    const b1Duration = Math.min(50, Math.floor(remainingTime * 0.45));
    blocks.push({
      blockNumber: blockIndex++,
      timeSpan: `0:00 - ${Math.floor(b1Duration / 60)}:${String(b1Duration % 60).padStart(2, "0")}`,
      durationMins: b1Duration,
      subject: primaryFocusSubject,
      activity: `Theory & Core Syllabus Deep Dive: Master ${t1} in ${primaryFocusSubject}`,
      technique: "Feynman Technique + Deep Work",
      type: "study",
    });
    remainingTime -= b1Duration;

    if (remainingTime > 30) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: 10,
        subject: "Rest & Hydration",
        activity: "Active Break: Step away from screens, stretch, hydrate ☕",
        type: "break",
      });
      remainingTime -= 10;
    }

    if (remainingTime >= 30) {
      const b2Duration = Math.min(45, Math.floor(remainingTime * 0.6));
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: b2Duration,
        subject: primaryFocusSubject,
        activity: `Application & Practice: Exercises on ${t2}`,
        technique: "Active Problem Solving",
        type: "study",
      });
      remainingTime -= b2Duration;
    }

    if (remainingTime >= 20) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: remainingTime,
        subject: primaryFocusSubject,
        activity: `Consolidation & Quiz: Summary review & active recall for ${primaryFocusSubject}`,
        technique: "Spaced Repetition Flash Review",
        type: "study",
      });
    }
  } else {
    // -------------------------------------------------------------
    // Multi-Subject Balanced Session
    // -------------------------------------------------------------
    const b1Duration = Math.min(50, Math.floor(remainingTime * 0.4));
    blocks.push({
      blockNumber: blockIndex++,
      timeSpan: `0:00 - ${Math.floor(b1Duration / 60)}:${String(b1Duration % 60).padStart(2, "0")}`,
      durationMins: b1Duration,
      subject: primaryFocusSubject,
      activity: `Priority Focus: Master key topics and concepts in ${primaryFocusSubject}`,
      technique: "Active Recall + Pomodoro Focus",
      type: "study",
    });
    remainingTime -= b1Duration;

    if (remainingTime > 30) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: 10,
        subject: "Rest & Hydration",
        activity: "Active Break: Step away from screens, stretch, hydrate ☕",
        type: "break",
      });
      remainingTime -= 10;
    }

    if (remainingTime >= 30) {
      const b2Duration = Math.min(45, Math.floor(remainingTime * 0.6));
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: b2Duration,
        subject: secondaryFocusSubject,
        activity: `Secondary Coursework: Problem solving & tasks in ${secondaryFocusSubject}`,
        technique: "Feynman Technique + Practice Problems",
        type: "study",
      });
      remainingTime -= b2Duration;
    }

    if (remainingTime >= 20) {
      blocks.push({
        blockNumber: blockIndex++,
        durationMins: remainingTime,
        subject: primaryFocusSubject,
        activity: `Wrap-up & Self-Assessment: Summary notes and formula review`,
        technique: "Spaced Repetition Flash Review",
        type: "study",
      });
    }
  }

  const modeLabel = isLearningOnly
    ? "📖 Pure Learning & Theory Only (Zero Practice Problems)"
    : isPracticeOnly
    ? "✍️ Hands-On Practice & Problem Solving"
    : isRevisionOnly
    ? "🔄 Rapid Revision & Active Recall"
    : "🎯 Balanced (Theory + Practice)";

  const planMarkdown = `
### 🧠 Studex AI Strategic Analysis for ${student.name}

> **Focus Target**: ${isSpecificSubject ? `🎯 **Dedicated Session for ${primaryFocusSubject}**` : `📚 Multi-Subject Curriculum Balance`} (${availableTime} ${timeWindow}).
> **Study Mode**: ${modeLabel}
${topicsToCover ? `> **Requested Topics**: 📌 *${topicsToCover}*\n` : ""}> **Academic Context**: You have **${tasks.totalPending} pending tasks** and weekly study target is at **${studyStats.targetProgressPercent}%** (${studyStats.weeklyHoursLogged}h logged).

${isLearningOnly ? `✨ **Pure Theory Mode Activated**: 100% of your time-blocks are dedicated to deep conceptual reading, structural mental models, and note synthesis. Practice exercises and coding drills are excluded.` : ""}

---

### ⏱️ Personalized Time-Blocked Schedule (${availableTime} ${timeWindow})

| Block | Duration | Focus Area | Activity & Strategy |
| :--- | :--- | :--- | :--- |
${blocks
  .map(
    (b) =>
      `| **Block ${b.blockNumber}** | \`${b.durationMins}m\` | **${b.subject}** | ${b.activity} *(${b.technique || "Rest"})* |`
  )
  .join("\n")}

---

### 💡 High-Impact Study Recommendations for ${primaryFocusSubject}:
1. **${isLearningOnly ? "Conceptual Focus" : "First 45 Mins"}**: ${isLearningOnly ? "Focus entirely on grasping the core logic and drawing visual relationship diagrams rather than solving exercises." : `Tackle the most challenging concept of **${primaryFocusSubject}** first (Eat the Frog method).`}
2. **Active Recall**: Do not passively read notes; explain the topic in your own words using the **Feynman Technique**.
3. **Session Checkpoint**: Log this session in the **Studex Focus Timer** to maintain your **${context.streak.currentStreakDays}-day streak**!
`;

  return {
    success: true,
    source: "studex_rule_engine",
    model: "studex-academic-planner",
    planMarkdown,
    blocks,
    contextSnapshot: {
      pendingTasksCount: tasks.totalPending,
      deadlinesCount: deadlines.length,
      targetProgressPercent: studyStats.targetProgressPercent,
      primaryFocus: primaryFocusSubject,
      selectedSubject,
      topicsToCover,
      studyMode,
    },
  };
}

/**
 * Intelligent rule-based chat fallback
 */
function generateRuleBasedChatReply(context, message) {
  const lower = message.toLowerCase();
  const { student, tasks, deadlines, studyStats, streak, subjects } = context;

  if (lower.includes("exam") || lower.includes("prepare") || lower.includes("cram")) {
    const nextExam = deadlines.find((d) => d.category === "exam") || deadlines[0];
    return `Based on your calendar, your closest deadline is **${nextExam ? nextExam.title : "your upcoming coursework"}** (${nextExam ? nextExam.relative : "soon"}). I recommend allocating 60% of your time to active problem-solving and 40% to flashcard recall rather than re-reading textbooks.`;
  }

  if (lower.includes("diagnose") || lower.includes("velocity") || lower.includes("progress")) {
    return `### 🩺 Studex AI Academic Health Check
- **Weekly Target Progress**: ${studyStats.targetProgressPercent}% (${studyStats.weeklyHoursLogged} of ${studyStats.weeklyTargetHours} hours).
- **Streak Status**: ${streak.currentStreakDays} days active.
- **Pending Tasks**: ${tasks.totalPending} items.
- **Recommendation**: ${studyStats.targetProgressPercent < 50 ? "You are slightly behind on weekly target velocity. A 90-minute evening focus sprint will get you back on track!" : "Great momentum! Keep consistent to maintain your streak."}`;
  }

  return `Hello ${student.name}! I am analyzing your academic context: you have **${subjects.length} enrolled subjects**, **${tasks.totalPending} pending tasks**, and **${deadlines.length} deadlines scheduled**. Ask me to build a study plan for tonight, break down a project, or prioritize your schedule!`;
}

module.exports = {
  generatePersonalizedPlan,
  generateAIChatResponse,
  generateTaskBreakdown,
};
