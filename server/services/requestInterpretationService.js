/**
 * Request Interpretation Service
 * Converts raw student natural-language messages into structured semantic intent representations.
 * Strict Principle: NEVER treat ambiguous query text as topic names, and ALWAYS preserve explicit user topics.
 */

const { findTaxonomyTopic, ACADEMIC_TAXONOMY } = require("./academicTaxonomyService");

// Ambiguous query patterns with no explicit topic specified
const AMBIGUOUS_PATTERNS = [
  /^can (you|u) explain (me )?(one|a|some|the)?\s*(topic|concept|lesson|chapter|theory|subject|something)\??$/i,
  /^(can|could|would)\s+(you|u)\s+(explain|teach|tell)\s+(me\s+)?(one|a|some)?\s*(concept|topic|lesson|something)\??$/i,
  /^(teach|explain)\s+(me\s+)?(one|a|some)?\s*(concept|topic|something)\??$/i,
  /^i want to learn (one|a|some)?\s*(concept|something|topic)\??$/i,
  /^teach me\??$/i,
  /^explain to me\??$/i,
  /^help me learn\??$/i,
  /^give me a topic\??$/i,
  /^what can you teach me\??$/i,
];

// Direct question patterns
const DIRECT_QUESTION_PATTERNS = [
  /^what is\s+([^?]+)\??$/i,
  /^what does\s+([^?]+)\s+mean\??$/i,
  /^what are\s+([^?]+)\??$/i,
  /^define\s+([^?]+)\??$/i,
  /^definition of\s+([^?]+)\??$/i,
  /^what's the difference between\s+([^?]+)\??$/i,
];

// Explicit learning request patterns
const LEARN_PATTERNS = [
  /\b(?:i want to learn|teach me|explain|can you explain|walk me through|learn about|tell me about|now teach me|how does)\s+([^.]+?)(?:\s+(?:from|in|under|of)\s+([^.]+?))?(?:\.|\?|$)/i,
  /\b(?:learn|study)\s+([^.]+?)(?:\s+(?:from|in|under|of)\s+([^.]+?))?(?:\.|\?|$)/i,
];

function cleanStr(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a string is an ambiguous placeholder rather than a genuine topic
 */
function isAmbiguousPlaceholder(term) {
  if (!term) return true;
  const c = cleanStr(term);
  const placeholders = [
    "one topic",
    "a topic",
    "the topic",
    "topic",
    "topics",
    "a concept",
    "one concept",
    "the concept",
    "concept",
    "concepts",
    "something",
    "lesson",
    "a lesson",
    "me something",
    "me a topic",
    "me one topic",
    "this",
  ];
  return placeholders.includes(c);
}

/**
 * Discovers if the text contains a canonical subject from enrolled list or taxonomy
 */
function matchSubjectName(text, enrolledSubjects = []) {
  if (!text) return null;
  const clean = cleanStr(text);

  // Check taxonomy subjects
  for (const [subKey, subData] of Object.entries(ACADEMIC_TAXONOMY)) {
    if (clean.includes(subKey) || subData.aliases.some((a) => clean.includes(a))) {
      return subKey;
    }
  }

  // Check enrolled subjects
  for (const sub of enrolledSubjects) {
    const sName = typeof sub === "string" ? sub : sub?.name;
    if (sName && clean.includes(cleanStr(sName))) {
      return sName;
    }
  }

  return null;
}

/**
 * Interprets student input into a structured mentor request object
 */
function interpretStudentRequest(message, enrolledSubjects = [], currentTeachingState = null) {
  if (!message || typeof message !== "string") {
    return {
      intent: "UNKNOWN",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: null,
      needs_clarification: true,
      direct_answer: false,
      raw_message: "",
    };
  }

  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check if previous state was AWAITING_TOPIC_SELECTION
  if (currentTeachingState?.state === "AWAITING_TOPIC_SELECTION" && !isAmbiguousPlaceholder(trimmed)) {
    let candidateTopic = trimmed;
    let candidateSubject = null;

    // Check if user said "X from Y"
    const fromMatch = trimmed.match(/^(.+?)\s+(?:from|in|under|of)\s+(.+?)$/i);
    if (fromMatch) {
      candidateTopic = fromMatch[1].trim();
      candidateSubject = matchSubjectName(fromMatch[2], enrolledSubjects) || fromMatch[2].trim();
    } else {
      candidateSubject = matchSubjectName(trimmed, enrolledSubjects);
    }

    if (!isAmbiguousPlaceholder(candidateTopic)) {
      const taxMatch = findTaxonomyTopic(candidateSubject, candidateTopic);
      return {
        intent: "LEARN",
        subject: taxMatch?.subjectKey || candidateSubject,
        topic: taxMatch?.conceptName || candidateTopic,
        subtopic: null,
        topic_source: "USER_EXPLICIT",
        needs_clarification: false,
        direct_answer: false,
        raw_message: trimmed,
      };
    }
  }

  // 2. Score / Performance Reflection
  const scoreRegex = /\b(i got|i scored|my score was|i received|scored)\s+(\d{1,3})%?/i;
  if (scoreRegex.test(lower) || /\b(failed my quiz|got (\d+) out of (\d+)|struggled with)\b/i.test(lower)) {
    const match = lower.match(scoreRegex);
    const scoreVal = match ? parseInt(match[2], 10) : null;

    // Check if topic is named in the message (e.g. "in normalization")
    let topicName = null;
    let subjectName = null;
    const topicAfterIn = lower.match(/\b(?:in|on|for)\s+([a-zA-Z0-9 _-]+)/i);
    if (topicAfterIn) {
      const foundTopic = topicAfterIn[1].trim();
      const tax = findTaxonomyTopic("", foundTopic);
      if (tax) {
        topicName = tax.conceptName;
        subjectName = tax.subjectKey;
      } else {
        topicName = foundTopic;
      }
    }

    return {
      intent: "EVALUATE_PERFORMANCE",
      subject: subjectName,
      topic: topicName,
      subtopic: null,
      score: scoreVal,
      topic_source: topicName ? "USER_EXPLICIT" : "CONVERSATION_FOLLOWUP",
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  // 3. Ambiguous queries with NO topic (e.g. "can u explain me one topic", "teach me something")
  if (AMBIGUOUS_PATTERNS.some((p) => p.test(trimmed))) {
    return {
      intent: "AMBIGUOUS_LEARN_REQUEST",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: null,
      needs_clarification: true,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  // 4. Ambiguous queries with subject but NO topic (e.g. "teach me something in machine learning")
  const subjectOnlyMatch = trimmed.match(/^(?:teach me|explain|learn)\s+(?:something|a topic|a concept)?\s*(?:in|from|about|under)\s+(.+?)\??$/i);
  if (subjectOnlyMatch && isAmbiguousPlaceholder(subjectOnlyMatch[1])) {
    return {
      intent: "AMBIGUOUS_LEARN_REQUEST",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: null,
      needs_clarification: true,
      direct_answer: false,
      raw_message: trimmed,
    };
  }
  if (subjectOnlyMatch) {
    const candidateSubject = matchSubjectName(subjectOnlyMatch[1], enrolledSubjects);
    if (candidateSubject) {
      return {
        intent: "AMBIGUOUS_SUBJECT_LEARN_REQUEST",
        subject: candidateSubject,
        topic: null,
        subtopic: null,
        topic_source: null,
        needs_clarification: true,
        direct_answer: false,
        raw_message: trimmed,
      };
    }
  }

  // 5. Study Roadmap / Recommendation queries (e.g. "what should i study today?")
  if (
    /\b(what should i study|what to study|plan my day|what is next|where should i start|what do you recommend i study|study roadmap)\b/i.test(
      lower
    )
  ) {
    return {
      intent: "STUDY_RECOMMENDATION",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: null,
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  // 6. Conversational Follow-up intents (Simpler, Example, Quiz, Confused)
  if (
    /\b(make it simpler|make it easier|simpler|explain simpler|in simpler terms|too hard|easy explanation|eli5|simple words|make this simpler|can you simplify)\b/i.test(
      lower
    )
  ) {
    return {
      intent: "SIMPLIFY",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: "CONVERSATION_FOLLOWUP",
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  if (
    /\b(give me an example|show me an example|another example|code example|practical example|real life example|show an example|give an example)\b/i.test(
      lower
    )
  ) {
    return {
      intent: "GIVE_EXAMPLE",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: "CONVERSATION_FOLLOWUP",
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  if (
    /\b(quiz me|test me|ask me a question|give me a problem|practice question|give me a quiz|test my knowledge)\b/i.test(
      lower
    )
  ) {
    return {
      intent: "QUIZ_REQUEST",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: "CONVERSATION_FOLLOWUP",
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  if (
    /\b(i don't understand|i do not understand|i am confused|i don't get it|still confused|what does that mean|didn't understand|did not understand)\b/i.test(
      lower
    )
  ) {
    return {
      intent: "CONFUSED",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: "CONVERSATION_FOLLOWUP",
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  // 7. Direct Factual / Definitional Queries (e.g. "what is overfitting?", "what is entropy?", "define deadlock")
  for (const pattern of DIRECT_QUESTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const candidate = match[1].trim();
      const tax = findTaxonomyTopic("", candidate);
      return {
        intent: "DIRECT_QUESTION",
        subject: tax?.subjectKey || null,
        topic: tax?.conceptName || candidate,
        subtopic: null,
        topic_source: "USER_EXPLICIT",
        needs_clarification: false,
        direct_answer: true,
        raw_message: trimmed,
      };
    }
  }

  // 8. Explicit Topic Learning Requests (e.g. "I want to learn Decision Trees from Machine Learning", "Explain normalization")
  for (const pattern of LEARN_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      let rawTopic = match[1]?.trim();
      let rawSubject = match[2]?.trim() || null;

      // Filter out ambiguous placeholders
      if (isAmbiguousPlaceholder(rawTopic)) {
        return {
          intent: "AMBIGUOUS_LEARN_REQUEST",
          subject: null,
          topic: null,
          subtopic: null,
          topic_source: null,
          needs_clarification: true,
          direct_answer: false,
          raw_message: trimmed,
        };
      }

      const matchedSub = matchSubjectName(rawSubject, enrolledSubjects);
      const tax = findTaxonomyTopic(matchedSub || "", rawTopic);

      return {
        intent: "LEARN",
        subject: tax?.subjectKey || matchedSub || rawSubject,
        topic: tax?.conceptName || rawTopic,
        subtopic: null,
        topic_source: "USER_EXPLICIT",
        needs_clarification: false,
        direct_answer: false,
        raw_message: trimmed,
      };
    }
  }

  // 9. Greeting
  if (/^(hi|hello|hey|greetings|good morning|good evening|who are you|what can you do)\b/i.test(lower)) {
    return {
      intent: "GREETING",
      subject: null,
      topic: null,
      subtopic: null,
      topic_source: null,
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  // 10. Fallback: check if the message directly names a known taxonomy topic
  const directTax = findTaxonomyTopic("", trimmed);
  if (directTax) {
    return {
      intent: "LEARN",
      subject: directTax.subjectKey,
      topic: directTax.conceptName,
      subtopic: null,
      topic_source: "USER_EXPLICIT",
      needs_clarification: false,
      direct_answer: false,
      raw_message: trimmed,
    };
  }

  return {
    intent: "GENERAL_CONVERSATION",
    subject: null,
    topic: null,
    subtopic: null,
    topic_source: null,
    needs_clarification: false,
    direct_answer: false,
    raw_message: trimmed,
  };
}

module.exports = {
  interpretStudentRequest,
  isAmbiguousPlaceholder,
  matchSubjectName,
};
