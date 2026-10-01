/**
 * Question Validation Service
 * Validates diagnostic and practice questions before returning them to students.
 * Ensures academic domain grounding, eliminates irrelevant filler, and verifies answer correctness.
 */

const FORBIDDEN_GENERIC_FILLER = [
  "eliminating redundancy and establishing robust structural integrity",
  "skipping index structures in large collections",
  "bypassing fundamental computational constraints",
  "hardcoding static variables into schema",
  "series of coordinated workflows",
];

/**
 * Validates a single question object
 */
function validateSingleQuestion(q, subjectName, topicName) {
  if (!q || typeof q !== "object") {
    return { isValid: false, reason: "Question must be an object" };
  }

  if (!q.question || typeof q.question !== "string" || q.question.trim().length < 15) {
    return { isValid: false, reason: "Question text is too short or missing" };
  }

  if (!Array.isArray(q.options) || q.options.length < 2) {
    return { isValid: false, reason: "Question must have at least 2 options" };
  }

  if (
    typeof q.correctAnswerIndex !== "number" ||
    q.correctAnswerIndex < 0 ||
    q.correctAnswerIndex >= q.options.length
  ) {
    return { isValid: false, reason: "correctAnswerIndex is out of bounds" };
  }

  // Check for forbidden generic filler
  const fullText = (q.question + " " + q.options.join(" ") + " " + (q.explanation || "")).toLowerCase();
  for (const filler of FORBIDDEN_GENERIC_FILLER) {
    if (fullText.includes(filler)) {
      return { isValid: false, reason: `Detected forbidden generic template filler: "${filler}"` };
    }
  }

  // Cross-domain mismatch sanity check (e.g. networking question referencing SQL indexing)
  const isNetworking = /\b(network|routing|forwarding|tcp|ip|udp|packet|switch|router|subnet)\b/i.test(
    (subjectName || "") + " " + (topicName || "")
  );
  if (isNetworking && /\b(database normalization|sql schema|b\+ tree index|relational table)\b/i.test(fullText)) {
    return { isValid: false, reason: "Cross-domain mismatch: Database terms found in Computer Networks question" };
  }

  return { isValid: true };
}

/**
 * Validates a list of questions, filtering out any invalid items
 */
function validateQuestionsList(questions, subjectName, topicName) {
  if (!Array.isArray(questions)) return [];

  return questions.filter((q) => {
    const result = validateSingleQuestion(q, subjectName, topicName);
    if (!result.isValid) {
      console.warn(`[Question Validation Filtered Question]: ${result.reason}`);
    }
    return result.isValid;
  });
}

module.exports = {
  validateSingleQuestion,
  validateQuestionsList,
};
