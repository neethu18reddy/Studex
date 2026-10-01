import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SparklesIcon,
  BrainIcon,
  ClockIcon,
  TasksIcon,
  CalendarIcon,
  StarIcon,
  SendIcon,
  LightningIcon,
  PlayIcon,
  PlusIcon,
  CheckIcon,
} from "./Icons";

/**
 * Rich Markdown Text Formatter
 */
function FormattedAIContent({ content }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements = [];
  let inTable = false;
  let tableRows = [];

  const flushTable = (key) => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={key} className="ai-formatted-table-wrapper">
          <table className="ai-markdown-table">
            <tbody>
              {tableRows.map((row, rIdx) => {
                const cols = row
                  .split("|")
                  .map((c) => c.trim())
                  .filter((c, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1);

                if (cols.some((c) => c.startsWith(":") || c.startsWith("---"))) {
                  return null;
                }

                return (
                  <tr key={rIdx} className={rIdx === 0 ? "ai-th-row" : ""}>
                    {cols.map((cell, cIdx) => (
                      <td key={cIdx}>
                        {cell.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
    inTable = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      tableRows.push(trimmed);
      return;
    } else if (inTable) {
      flushTable(`tbl-${idx}`);
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="ai-line-space" />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={idx} className="ai-heading-3">
          {renderFormattedInline(trimmed.replace(/^###\s+/, ""))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={idx} className="ai-heading-2">
          {renderFormattedInline(trimmed.replace(/^##\s+/, ""))}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={idx} className="ai-heading-1">
          {renderFormattedInline(trimmed.replace(/^#\s+/, ""))}
        </h2>
      );
    } else if (trimmed.startsWith("> ")) {
      elements.push(
        <div key={idx} className="ai-callout-quote">
          {renderFormattedInline(trimmed.replace(/^>\s+/, ""))}
        </div>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={idx} className="ai-bullet-item">
          <span className="ai-bullet-dot">&bull;</span>
          <span className="ai-bullet-text">
            {renderFormattedInline(trimmed.replace(/^[-*]\s+/, ""))}
          </span>
        </div>
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
      elements.push(
        <div key={idx} className="ai-numbered-item">
          <span className="ai-numbered-badge">{match[1]}</span>
          <span className="ai-numbered-text">{renderFormattedInline(match[2])}</span>
        </div>
      );
    } else if (trimmed === "---") {
      elements.push(<hr key={idx} className="ai-divider" />);
    } else {
      elements.push(
        <p key={idx} className="ai-paragraph">
          {renderFormattedInline(trimmed)}
        </p>
      );
    }
  });

  if (inTable) {
    flushTable("tbl-final");
  }

  return <div className="ai-rich-formatted-body">{elements}</div>;
}

function renderFormattedInline(text) {
  if (!text) return "";
  const parts = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const codeMatch = remaining.match(/`(.*?)`/);

    let firstMatch = null;
    let type = "";

    if (boldMatch && (!codeMatch || boldMatch.index < codeMatch.index)) {
      firstMatch = boldMatch;
      type = "bold";
    } else if (codeMatch) {
      firstMatch = codeMatch;
      type = "code";
    }

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    const matchStart = firstMatch.index;
    if (matchStart > 0) {
      parts.push(remaining.substring(0, matchStart));
    }

    if (type === "bold") {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="ai-strong-text">
          {firstMatch[1]}
        </strong>
      );
    } else if (type === "code") {
      parts.push(
        <code key={`c-${keyIdx++}`} className="ai-code-pill">
          {firstMatch[1]}
        </code>
      );
    }

    remaining = remaining.substring(matchStart + firstMatch[0].length);
  }

  return parts;
}

/**
 * Master Studex AI Component (AI Personal Learning Mentor)
 */
export default function StudexAIEngine({
  token,
  apiBase = "",
  currentUser,
  onStartFocusSession,
  onFeedback,
  onError,
}) {
  // Navigation Tabs: 'mentor' (Chat) | 'mastery' (Radar) | 'quiz' (Diagnostics) | 'planner' (Time-Block) | 'notes' (RAG)
  const [activeSubTab, setActiveSubTab] = useState("mentor");

  // Live Profile & Next-Best-Action
  const [learningProfile, setLearningProfile] = useState(null);
  const [nextBestAction, setNextBestAction] = useState(null);
  const [topicMasteryList, setTopicMasteryList] = useState([]);
  const [aiEngineStatus, setAiEngineStatus] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Mentor Socratic Dialogue State
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello ${currentUser?.name || "Student"}! 👋 I'm **Studex AI** — your AI Personal Academic Mentor.\n\nI have real-time visibility into your enrolled courses, topic mastery scores, and upcoming deadlines. Ask me to **teach a concept**, **diagnose weak topics**, **run a practice quiz**, or **build a personalized study plan**!`,
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);

  // Diagnostic Quiz State
  const [quizSubject, setQuizSubject] = useState("");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDifficulty, setQuizDifficulty] = useState("adaptive");
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizEvaluation, setQuizEvaluation] = useState(null);
  const [evaluatingQuiz, setEvaluatingQuiz] = useState(false);

  // Adaptive Planner State
  const [availableTime, setAvailableTime] = useState("3 hours");
  const [timeWindow, setTimeWindow] = useState("tonight");
  const [focusGoal, setFocusGoal] = useState("balanced");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [topicsToCover, setTopicsToCover] = useState("");
  const [studyMode, setStudyMode] = useState("learning_only");
  const [customNotes, setCustomNotes] = useState("");
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [checkedBlocks, setCheckedBlocks] = useState({});

  // Study Notes / RAG Ingestion State
  const [ragDocTitle, setRagDocTitle] = useState("");
  const [ragDocSubject, setRagDocSubject] = useState("");
  const [ragDocContent, setRagDocContent] = useState("");
  const [uploadingRag, setUploadingRag] = useState(false);

  // Fetch Full Learning Profile, Next Action, and Engine Status
  const fetchLearningData = useCallback(async () => {
    if (!token) return;
    setLoadingProfile(true);
    try {
      const [profRes, actionRes, mastRes, statRes] = await Promise.all([
        fetch(`${apiBase}/api/ai/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/api/ai/next-action`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/api/ai/mastery`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/api/ai/status`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [profData, actionData, mastData, statData] = await Promise.all([
        profRes.json(),
        actionRes.json(),
        mastRes.json(),
        statRes.json(),
      ]);

      if (profRes.ok && profData.success) {
        setLearningProfile(profData.data);
        if (profData.data.subjects?.length > 0 && !quizSubject) {
          setQuizSubject(profData.data.subjects[0].name);
        }
      }
      if (actionRes.ok && actionData.success) setNextBestAction(actionData.data);
      if (mastRes.ok && mastData.success) setTopicMasteryList(mastData.data || []);
      if (statRes.ok && statData.success) setAiEngineStatus(statData.data);
    } catch (err) {
      console.error("Failed to load mentor data:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, [token, apiBase, quizSubject]);

  useEffect(() => {
    fetchLearningData();
  }, [fetchLearningData]);

  const latestGenerationIdRef = useRef(null);

  // Handle Mentor Chat Submit & Retry
  const handleSendChat = async (overrideText, isRetry = false, failedMsgId = null) => {
    const text = (overrideText || chatInput || "").trim();
    if (!text || chatSending) return;

    const generationId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    latestGenerationIdRef.current = generationId;

    if (isRetry && failedMsgId) {
      // Remove failed error bubble on retry
      setChatMessages((prev) => prev.filter((m) => m.id !== failedMsgId));
    } else if (!isRetry) {
      const userMsg = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: text,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);
    }

    setChatInput("");
    setChatSending(true);

    try {
      const res = await fetch(`${apiBase}/api/ai/mentor-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          generationId,
          currentContext: {
            subject: selectedSubject && selectedSubject !== "all" ? selectedSubject : null,
            topic: topicsToCover?.trim() ? topicsToCover.trim() : null,
            page: "Studex AI Hub",
          },
        }),
      });

      const data = await res.json();

      // Guard against race conditions: Ignore response if user sent a newer message
      if (latestGenerationIdRef.current !== generationId) {
        return;
      }

      if (!res.ok || !data.success || data.data?.error) {
        const errObj = data.data?.error || {};
        const safeMessage =
          errObj.message ||
          data.message ||
          "Studex AI is temporarily busy. Please try again in a moment.";

        const errBubble = {
          id: `err_${Date.now()}`,
          sender: "ai",
          isError: true,
          retryable: errObj.retryable !== false,
          originalUserText: text,
          text: safeMessage,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errBubble]);
        return;
      }

      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        isError: false,
        text: data.data?.reply || "I analyzed your request.",
        toolsExecuted: data.data?.toolsExecuted || [],
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      if (latestGenerationIdRef.current !== generationId) return;
      const errBubble = {
        id: `err_${Date.now()}`,
        sender: "ai",
        isError: true,
        retryable: true,
        originalUserText: text,
        text: "Studex AI is temporarily busy. Please try again in a moment.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errBubble]);
    } finally {
      if (latestGenerationIdRef.current === generationId) {
        setChatSending(false);
      }
    }
  };

  // Handle Quiz Generation
  const handleGenerateQuiz = async (overrideTopic) => {
    const topicToUse = overrideTopic || quizTopic || "Core Concepts";
    const subToUse = quizSubject || learningProfile?.subjects?.[0]?.name || "General Coursework";

    setGeneratingQuiz(true);
    setActiveQuiz(null);
    setSelectedAnswers({});
    setQuizEvaluation(null);

    try {
      const res = await fetch(`${apiBase}/api/ai/quiz/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectName: subToUse,
          topic: topicToUse,
          difficulty: quizDifficulty,
          questionCount: 3,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate diagnostic quiz");
      }

      setActiveQuiz(data.data);
      onFeedback?.(`Diagnostic quiz for ${topicToUse} generated!`);
    } catch (err) {
      onError?.(err.message || "Could not generate diagnostic quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // Handle Quiz Submission
  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !activeQuiz.questions) return;

    // Ensure all questions answered
    const unanswered = activeQuiz.questions.some((q, idx) => selectedAnswers[idx] === undefined);
    if (unanswered) {
      onError?.("Please answer all questions before submitting");
      return;
    }

    setEvaluatingQuiz(true);
    try {
      const answersPayload = activeQuiz.questions.map((q, idx) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        selectedOptionIndex: selectedAnswers[idx],
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
        conceptTested: q.conceptTested || activeQuiz.topic,
      }));

      const res = await fetch(`${apiBase}/api/ai/quiz/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectName: activeQuiz.subjectName,
          topic: activeQuiz.topic,
          answers: answersPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to evaluate quiz");
      }

      setQuizEvaluation(data.data);
      onFeedback?.(`Quiz evaluated: ${data.data.percentage}%! Mastery score updated.`);
      fetchLearningData(); // Refresh mastery radar
    } catch (err) {
      onError?.(err.message || "Quiz evaluation failed");
    } finally {
      setEvaluatingQuiz(false);
    }
  };

  // Handle Plan Generation
  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    setCheckedBlocks({});
    try {
      const res = await fetch(`${apiBase}/api/ai/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          availableTime,
          timeWindow,
          focusGoal,
          customNotes,
          selectedSubject,
          topicsToCover,
          studyMode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate study plan");
      }

      setGeneratedPlan(data.data);
      onFeedback?.("Personalized study schedule created!");
    } catch (err) {
      onError?.(err.message || "Could not generate study plan");
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Handle RAG Ingestion
  const handleUploadRagNotes = async () => {
    if (!ragDocTitle.trim() || !ragDocContent.trim()) {
      onError?.("Please enter a document title and notes content");
      return;
    }

    setUploadingRag(true);
    try {
      const res = await fetch(`${apiBase}/api/ai/rag/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentTitle: ragDocTitle.trim(),
          subjectName: ragDocSubject.trim() || "General Coursework",
          textContent: ragDocContent.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to ingest notes");
      }

      onFeedback?.(`Notes "${ragDocTitle}" ingested into Studex RAG Store!`);
      setRagDocTitle("");
      setRagDocContent("");
    } catch (err) {
      onError?.(err.message || "Failed to upload notes");
    } finally {
      setUploadingRag(false);
    }
  };

  const toggleBlockDone = (idx) => {
    setCheckedBlocks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="studex-ai-container animate-fade-in">
      {/* 1. Header Banner */}
      <section className="card studex-ai-hero-banner">
        <div className="ai-hero-top-row">
          <div className="ai-hero-info">
            <div className="ai-kicker-badge">
              <SparklesIcon size={14} />{" "}
              {aiEngineStatus?.hasGeminiKey
                ? "✨ Powered by Google Gemini 1.5"
                : "Studex AI Personal Learning Mentor"}
            </div>
            <h2 className="ai-hero-title">
              Studex <span className="highlight-ai">AI Mentor</span>
            </h2>
            <p className="ai-hero-subtitle">
              Your personalized academic mentor. Understands your topic mastery, diagnoses knowledge gaps, teaches Socratic concepts, and keeps you ahead of deadlines.
            </p>
          </div>

          {/* Academic Snapshot Strip */}
          <div className="ai-snapshot-strip">
            <div className="ai-snapshot-pill">
              <span className="pill-icon">📚</span>
              <strong>{learningProfile?.subjects?.length || 0}</strong>
              <span className="pill-label">Subjects</span>
            </div>
            <div className="ai-snapshot-pill">
              <span className="pill-icon">🎯</span>
              <strong>{topicMasteryList.length}</strong>
              <span className="pill-label">Mastery Topics</span>
            </div>
            <div className="ai-snapshot-pill alert">
              <span className="pill-icon">🚨</span>
              <strong>{learningProfile?.upcomingDeadlines?.length || 0}</strong>
              <span className="pill-label">Deadlines</span>
            </div>
            <div className="ai-snapshot-pill highlight">
              <span className="pill-icon">🔥</span>
              <strong>{learningProfile?.student?.streak || 0}d</strong>
              <span className="pill-label">Streak</span>
            </div>
          </div>
        </div>

        {/* Proactive Next-Best-Action Strip */}
        {nextBestAction && (
          <div className="mentor-next-action-strip">
            <div className="action-strip-left">
              <span className="next-action-badge">⚡ Recommended Next Action</span>
              <strong className="next-action-title">{nextBestAction.title}</strong>
              <p className="next-action-desc">{nextBestAction.description}</p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm action-strip-btn"
              onClick={() => {
                if (nextBestAction.mode === "PRACTICE") {
                  setActiveSubTab("quiz");
                  setQuizSubject(nextBestAction.subject);
                  setQuizTopic(nextBestAction.topic || "");
                  handleGenerateQuiz(nextBestAction.topic);
                } else {
                  setActiveSubTab("mentor");
                  handleSendChat(`Mentor, let's start: ${nextBestAction.title}`);
                }
              }}
            >
              Start Session ({nextBestAction.suggestedDuration}m)
            </button>
          </div>
        )}
      </section>

      {/* 2. Sleek Mentor Tab Switcher */}
      <div className="ai-tab-nav-wrapper">
        <div className="ai-subtab-switch-bar">
          <button
            type="button"
            className={`ai-subtab-btn ${activeSubTab === "mentor" ? "active" : ""}`}
            onClick={() => setActiveSubTab("mentor")}
          >
            <BrainIcon size={15} /> Socratic Mentor (Chat)
          </button>
          <button
            type="button"
            className={`ai-subtab-btn ${activeSubTab === "mastery" ? "active" : ""}`}
            onClick={() => setActiveSubTab("mastery")}
          >
            <StarIcon size={15} /> Knowledge Radar
          </button>
          <button
            type="button"
            className={`ai-subtab-btn ${activeSubTab === "quiz" ? "active" : ""}`}
            onClick={() => setActiveSubTab("quiz")}
          >
            <TasksIcon size={15} /> Diagnostic Quiz
          </button>
          <button
            type="button"
            className={`ai-subtab-btn ${activeSubTab === "planner" ? "active" : ""}`}
            onClick={() => setActiveSubTab("planner")}
          >
            <ClockIcon size={15} /> Adaptive Study Planner
          </button>
          <button
            type="button"
            className={`ai-subtab-btn ${activeSubTab === "notes" ? "active" : ""}`}
            onClick={() => setActiveSubTab("notes")}
          >
            <CalendarIcon size={15} /> Smart Notes &amp; RAG
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: SOCRATIC MENTOR (CONVERSATIONAL DIALOGUE)
          ========================================================================= */}
      {activeSubTab === "mentor" && (
        <div className="card ai-chat-container">
          <div className="ai-chat-header">
            <div className="chat-header-info">
              <h3>Socratic Academic Tutor</h3>
              <span className="chat-header-subtitle">
                Context-aware guidance with intuition, analogies, and checkpoint questions.
              </span>
            </div>
            <div className="chat-status-pill">
              <span className="live-dot-pulse"></span>
              {aiEngineStatus?.hasGeminiKey ? "Gemini 1.5 Active" : "Mentor Active"}
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="chat-quick-prompts-bar">
            <span className="quick-prompts-label">Quick Actions:</span>
            <button
              type="button"
              className="chat-prompt-chip"
              onClick={() => handleSendChat("Explain the core intuition of Normalization in DBMS using a simple analogy.")}
            >
              💡 Intuitive Analogy
            </button>
            <button
              type="button"
              className="chat-prompt-chip"
              onClick={() => handleSendChat("Ask me a Socratic diagnostic question on Computer Networks to test my understanding.")}
            >
              🔍 Socratic Test Question
            </button>
            <button
              type="button"
              className="chat-prompt-chip"
              onClick={() => handleSendChat("Review my weak topics and tell me what concept I should tackle next.")}
            >
              🎯 Weak Topic Diagnostic
            </button>
            <button
              type="button"
              className="chat-prompt-chip"
              onClick={() => handleSendChat("How should I prepare for my upcoming exam in 5 days?")}
            >
              📅 5-Day Exam Strategy
            </button>
          </div>

          {/* Chat Messages */}
          <div className="ai-chat-messages-log">
            {chatMessages.map((msg) => {
              const isAi = msg.sender === "ai";
              return (
                <div
                  key={msg.id}
                  className={`ai-chat-bubble-wrap ${isAi ? "ai-wrap" : "user-wrap"}`}
                >
                  <div className="bubble-avatar">{isAi ? "🤖" : "🎓"}</div>
                  <div className={`ai-chat-bubble ${isAi ? "ai-bubble" : "user-bubble"}`}>
                    <div className="bubble-header-row">
                      <strong>{isAi ? "Studex AI Mentor" : currentUser?.name || "Student"}</strong>
                      <span className="bubble-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                      <div className="ai-tool-execution-pill" style={{ marginBottom: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {msg.toolsExecuted.map((t, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              background: "rgba(59, 130, 246, 0.12)",
                              color: "#3b82f6",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            ⚡ {t.name.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="bubble-content-text">
                      {msg.isError ? (
                        <div className="ai-error-notice-box" style={{ padding: "8px 0" }}>
                          <p style={{ margin: "0 0 8px 0", color: "#f87171", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>⚠️</span> {msg.text}
                          </p>
                          {msg.retryable && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "4px 10px" }}
                              onClick={() => handleSendChat(msg.originalUserText, true, msg.id)}
                            >
                              🔄 Try again
                            </button>
                          )}
                        </div>
                      ) : isAi ? (
                        <FormattedAIContent content={msg.text} />
                      ) : (
                        <p className="ai-paragraph">{msg.text}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {chatSending && (
              <div className="ai-chat-bubble-wrap ai-wrap">
                <div className="bubble-avatar">🤖</div>
                <div className="ai-chat-bubble ai-bubble thinking-bubble">
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="thinking-text">Studex AI is analyzing your academic context...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            className="ai-chat-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
          >
            <input
              type="text"
              className="ai-chat-input-field"
              placeholder="Ask your mentor anything (e.g. 'Explain B+ Trees with an analogy', 'Give me a hint on question 3')..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatSending}
            />
            <button
              type="submit"
              className="btn btn-primary btn-chat-send"
              disabled={!chatInput.trim() || chatSending}
              title="Send to Mentor"
            >
              <SendIcon size={16} />
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          TAB 2: KNOWLEDGE & MASTERY RADAR
          ========================================================================= */}
      {activeSubTab === "mastery" && (
        <div className="ai-mastery-tab-layout">
          <div className="card ai-mastery-card">
            <div className="card-header-compact">
              <div>
                <span className="section-kicker">Knowledge Radar</span>
                <h3>Topic Mastery &amp; Knowledge Gaps</h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={fetchLearningData}
                disabled={loadingProfile}
              >
                🔄 Refresh Radar
              </button>
            </div>

            <p className="mastery-intro-text">
              Studex AI continuously calculates your topic mastery based on diagnostic quizzes, practice exercises, and mistake recurrence.
            </p>

            {topicMasteryList.length === 0 ? (
              <div className="ai-placeholder-box">
                <div className="ai-pulse-icon">
                  <StarIcon size={28} />
                </div>
                <h4>No Topic Mastery Records Yet</h4>
                <p>
                  Take a 3-question diagnostic quiz or ask the mentor questions to automatically calibrate your knowledge radar!
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => setActiveSubTab("quiz")}
                >
                  Start First Diagnostic Quiz
                </button>
              </div>
            ) : (
              <div className="topic-mastery-grid">
                {topicMasteryList.map((item) => {
                  const score = item.masteryScore;
                  const isWeak = score < 60;
                  const isProficient = score >= 80;

                  return (
                    <div
                      key={item._id || `${item.subjectName}-${item.topic}`}
                      className={`topic-mastery-item-card ${isWeak ? "is-weak" : isProficient ? "is-proficient" : ""}`}
                    >
                      <div className="mastery-item-header">
                        <span className="mastery-subject-tag">{item.subjectName}</span>
                        <span className={`mastery-level-badge level-${item.confidenceLevel}`}>
                          {item.confidenceLevel.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="mastery-topic-title">{item.topic}</h4>

                      {/* Score Bar */}
                      <div className="mastery-bar-wrapper">
                        <div className="mastery-bar-track">
                          <div
                            className={`mastery-bar-fill ${isWeak ? "fill-weak" : isProficient ? "fill-proficient" : "fill-mid"}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="mastery-score-label">{score}%</span>
                      </div>

                      {item.weaknesses && item.weaknesses.length > 0 && (
                        <div className="mastery-misconception-box">
                          <strong>⚠️ Target Misconception:</strong> {item.weaknesses[0]}
                        </div>
                      )}

                      <div className="mastery-item-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setQuizSubject(item.subjectName);
                            setQuizTopic(item.topic);
                            setActiveSubTab("quiz");
                            handleGenerateQuiz(item.topic);
                          }}
                        >
                          🧪 Test Me
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setActiveSubTab("mentor");
                            handleSendChat(`Mentor, I want to review my weak points on "${item.topic}" in ${item.subjectName}.`);
                          }}
                        >
                          💡 Socratic Review
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DIAGNOSTIC QUIZ & PRACTICE ENGINE
          ========================================================================= */}
      {activeSubTab === "quiz" && (
        <div className="ai-quiz-tab-layout">
          {/* Quiz Configuration */}
          <div className="card ai-quiz-config-card">
            <div className="card-header-compact">
              <span className="section-kicker">Skill Assessment</span>
              <h3>Diagnostic Quiz Generator</h3>
            </div>

            <div className="form-group">
              <label className="ai-form-label">Subject</label>
              <select
                className="ai-select-input"
                value={quizSubject}
                onChange={(e) => setQuizSubject(e.target.value)}
              >
                {learningProfile?.subjects?.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    📚 {s.name}
                  </option>
                ))}
                <option value="General Academic Curriculum">General Academic Curriculum</option>
              </select>
            </div>

            <div className="form-group">
              <label className="ai-form-label">Topic to Test</label>
              <input
                type="text"
                className="ai-text-input"
                placeholder="e.g. Routing and Forwarding, Normalization, Deadlocks..."
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
              />
              {/* Suggested Academic Topics for Current Subject */}
              {(() => {
                const curSub = learningProfile?.subjects?.find((s) => s.name === quizSubject);
                const tops = curSub?.suggestedTopics || ["Routing and Forwarding", "TCP & Transport Layer", "Subnetting", "DNS & Application Layer"];
                return (
                  <div className="suggested-topics-bar">
                    <span className="suggested-label">Core Syllabus Topics:</span>
                    <div className="suggested-chips-wrap">
                      {tops.map((top) => (
                        <button
                          key={top}
                          type="button"
                          className={`suggested-topic-chip ${quizTopic === top ? "active" : ""}`}
                          onClick={() => setQuizTopic(top)}
                        >
                          📌 {top}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="form-group">
              <label className="ai-form-label">Difficulty Adaptation</label>
              <select
                className="ai-select-input"
                value={quizDifficulty}
                onChange={(e) => setQuizDifficulty(e.target.value)}
              >
                <option value="adaptive">🎯 Adaptive (Calibrated to current mastery)</option>
                <option value="gentle">🌱 Gentle (Foundations &amp; Basics)</option>
                <option value="challenging">🔥 Challenging (Exam Edge Cases)</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full ai-generate-btn"
              onClick={() => handleGenerateQuiz()}
              disabled={generatingQuiz}
            >
              <SparklesIcon size={15} />
              {generatingQuiz ? "Calibrating Questions..." : `Generate Diagnostic Quiz`}
            </button>
          </div>

          {/* Active Quiz Area */}
          <div className="card ai-quiz-render-card">
            {!activeQuiz && !generatingQuiz && (
              <div className="ai-placeholder-box">
                <div className="ai-pulse-icon">
                  <TasksIcon size={32} />
                </div>
                <h4>Ready for Skill Calibration</h4>
                <p>
                  Generate a 3-question adaptive quiz to evaluate your conceptual precision. Studex AI will analyze mistakes and adjust your topic mastery radar.
                </p>
              </div>
            )}

            {generatingQuiz && (
              <div className="ai-loading-state">
                <div className="spinner"></div>
                <h4>Generating Socratic Questions...</h4>
                <p>Calibrating question difficulty against your learning history.</p>
              </div>
            )}

            {activeQuiz && !generatingQuiz && (
              <div className="quiz-active-wrapper">
                <div className="quiz-header-bar">
                  <div>
                    <span className="quiz-subject-tag">{activeQuiz.subjectName}</span>
                    <h3 className="quiz-title">{activeQuiz.topic} Calibration</h3>
                  </div>
                  <span className="quiz-count-badge">
                    {activeQuiz.questions?.length || 0} Questions
                  </span>
                </div>

                <div className="quiz-questions-list">
                  {activeQuiz.questions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="quiz-question-box">
                      <div className="question-text-row">
                        <span className="q-badge">Q{qIdx + 1}</span>
                        <strong className="q-title">{q.question}</strong>
                      </div>

                      <div className="options-grid">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = selectedAnswers[qIdx] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              className={`quiz-option-btn ${isSelected ? "selected" : ""}`}
                              onClick={() => setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                              disabled={!!quizEvaluation}
                            >
                              <span className="opt-letter">{String.fromCharCode(65 + oIdx)}</span>
                              <span className="opt-text">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Post-evaluation breakdown */}
                      {quizEvaluation && (
                        <div
                          className={`evaluation-answer-box ${
                            quizEvaluation.evaluations?.[qIdx]?.isCorrect ? "correct" : "incorrect"
                          }`}
                        >
                          <strong>
                            {quizEvaluation.evaluations?.[qIdx]?.isCorrect
                              ? "✅ Correct Answer"
                              : "❌ Incorrect"}
                          </strong>
                          <p className="eval-explanation">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submission / Result Bar */}
                {!quizEvaluation ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleSubmitQuiz}
                    disabled={evaluatingQuiz}
                  >
                    {evaluatingQuiz ? "Evaluating Answers..." : "Submit Quiz & Update Mastery Radar"}
                  </button>
                ) : (
                  <div className="quiz-result-summary-card">
                    <div className="result-score-badge">
                      Score: {quizEvaluation.score} / {quizEvaluation.total} ({quizEvaluation.percentage}%)
                    </div>
                    <p className="result-feedback-text">{quizEvaluation.feedback}</p>
                    <div className="result-action-row">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleGenerateQuiz()}
                      >
                        🔄 Retake Similar Quiz
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setActiveSubTab("mentor");
                          handleSendChat(`Mentor, I scored ${quizEvaluation.percentage}% on my ${activeQuiz.topic} quiz. Can we review what I missed?`);
                        }}
                      >
                        💡 Review with Mentor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: ADAPTIVE STUDY PLANNER
          ========================================================================= */}
      {activeSubTab === "planner" && (
        <div className="ai-planner-tab-layout">
          {/* Planner Configuration Card */}
          <div className="card ai-planner-config-card">
            <div className="card-header-compact">
              <span className="section-kicker">Session Parameters</span>
              <h3>Configure Your Study Session</h3>
            </div>

            {/* Subject Selector */}
            <div className="form-group">
              <label className="ai-form-label">Which subject do you want to study?</label>
              <div className="subject-presets-grid">
                <button
                  type="button"
                  className={`subject-preset-pill ${selectedSubject === "all" ? "active" : ""}`}
                  onClick={() => setSelectedSubject("all")}
                >
                  ✨ All Subjects (Balanced)
                </button>
                {learningProfile?.subjects?.map((subj) => (
                  <button
                    key={subj.id || subj.name}
                    type="button"
                    className={`subject-preset-pill ${selectedSubject === subj.name ? "active" : ""}`}
                    onClick={() => setSelectedSubject(subj.name)}
                  >
                    📚 {subj.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Topics to Cover */}
            <div className="form-group">
              <div className="ai-label-with-hint">
                <label className="ai-form-label" htmlFor="ai-topics-cover">
                  What topics or chapters do you want to cover?
                </label>
                <span className="ai-input-hint">Specify exact modules or chapters</span>
              </div>
              <input
                id="ai-topics-cover"
                type="text"
                className="ai-text-input"
                placeholder="e.g. Routing and Forwarding, Normalization, Deadlocks..."
                value={topicsToCover}
                onChange={(e) => setTopicsToCover(e.target.value)}
              />
              {/* Suggested Academic Topics for Current Subject */}
              {(() => {
                const curSub = learningProfile?.subjects?.find((s) => s.name === selectedSubject);
                const tops = curSub?.suggestedTopics || ["Routing and Forwarding", "TCP & Transport Layer", "Subnetting", "DNS & Application Layer"];
                return (
                  <div className="suggested-topics-bar">
                    <span className="suggested-label">Core Syllabus Topics:</span>
                    <div className="suggested-chips-wrap">
                      {tops.map((top) => (
                        <button
                          key={top}
                          type="button"
                          className={`suggested-topic-chip ${topicsToCover === top ? "active" : ""}`}
                          onClick={() => setTopicsToCover(top)}
                        >
                          📌 {top}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Study Mode / Style */}
            <div className="form-group">
              <label className="ai-form-label">Study Style / Mode</label>
              <div className="study-mode-grid">
                <button
                  type="button"
                  className={`study-mode-pill ${studyMode === "learning_only" ? "active" : ""}`}
                  onClick={() => setStudyMode("learning_only")}
                >
                  <span className="mode-icon">📖</span>
                  <div className="mode-text-col">
                    <strong>Theory &amp; Learning Only</strong>
                    <span className="mode-desc">Pure concept deep dive (No practice problems)</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`study-mode-pill ${studyMode === "balanced" ? "active" : ""}`}
                  onClick={() => setStudyMode("balanced")}
                >
                  <span className="mode-icon">🎯</span>
                  <div className="mode-text-col">
                    <strong>Balanced</strong>
                    <span className="mode-desc">Concept breakdown + practice problem sets</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`study-mode-pill ${studyMode === "practice_only" ? "active" : ""}`}
                  onClick={() => setStudyMode("practice_only")}
                >
                  <span className="mode-icon">✍️</span>
                  <div className="mode-text-col">
                    <strong>Practice Only</strong>
                    <span className="mode-desc">Hands-on exercises &amp; past exam papers</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`study-mode-pill ${studyMode === "revision" ? "active" : ""}`}
                  onClick={() => setStudyMode("revision")}
                >
                  <span className="mode-icon">🔄</span>
                  <div className="mode-text-col">
                    <strong>Rapid Revision</strong>
                    <span className="mode-desc">High-speed summary &amp; active recall quiz</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Time Presets */}
            <div className="form-group">
              <label className="ai-form-label">Available Time</label>
              <div className="time-presets-grid">
                {["1 hour", "2 hours", "3 hours", "4 hours", "5+ hours"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`time-preset-pill ${availableTime === t ? "active" : ""}`}
                    onClick={() => setAvailableTime(t)}
                  >
                    <ClockIcon size={13} /> {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="ai-form-label" htmlFor="ai-time-window">
                  When are you studying?
                </label>
                <select
                  id="ai-time-window"
                  value={timeWindow}
                  onChange={(e) => setTimeWindow(e.target.value)}
                  className="ai-select-input"
                >
                  <option value="tonight">🌙 Tonight</option>
                  <option value="this afternoon">☀️ This Afternoon</option>
                  <option value="this morning">🌅 This Morning</option>
                  <option value="this weekend">🗓️ This Weekend</option>
                </select>
              </div>

              <div className="form-group">
                <label className="ai-form-label" htmlFor="ai-focus-goal">
                  Study Objective
                </label>
                <select
                  id="ai-focus-goal"
                  value={focusGoal}
                  onChange={(e) => setFocusGoal(e.target.value)}
                  className="ai-select-input"
                >
                  <option value="balanced">🎯 Balanced &amp; Comprehensive</option>
                  <option value="exam_prep">🚨 Urgent Exam Preparation</option>
                  <option value="deadline_blitz">📝 Assignment Blitz</option>
                  <option value="catch_up">⚡ Deep Review of Weak Topics</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="ai-form-label" htmlFor="ai-custom-notes">
                Additional Instructions or Notes (Optional)
              </label>
              <input
                id="ai-custom-notes"
                type="text"
                className="ai-text-input"
                placeholder="e.g. no practice only learning, focus on conceptual diagrams & memory tricks..."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full ai-generate-btn"
              onClick={handleGeneratePlan}
              disabled={generatingPlan}
            >
              <SparklesIcon size={15} />
              {generatingPlan
                ? "Building Your Schedule..."
                : selectedSubject && selectedSubject !== "all"
                ? `Generate ${selectedSubject} Plan (${studyMode === "learning_only" ? "Theory Only" : availableTime})`
                : `Generate ${availableTime} Schedule`}
            </button>
          </div>

          {/* Plan Results Area */}
          <div className="card ai-planner-result-card">
            <div className="card-header-compact">
              <div className="plan-header-title-wrap">
                <span className="section-kicker">Tailored Output</span>
                <h3>Your Time-Blocked Schedule</h3>
              </div>
              {generatedPlan && (
                <div className="plan-badge-pill">
                  <SparklesIcon size={12} />{" "}
                  {generatedPlan.source === "gemini"
                    ? "Google Gemini 1.5 Generated"
                    : "Live AI Plan"}
                </div>
              )}
            </div>

            {/* Empty State */}
            {!generatedPlan && !generatingPlan && (
              <div className="ai-placeholder-box">
                <div className="ai-pulse-icon">
                  <BrainIcon size={32} />
                </div>
                <h4>Ready to plan your study session</h4>
                <p>
                  Choose your available time, target subject, and study mode above. Studex AI will generate an optimal, time-blocked Pomodoro schedule.
                </p>
              </div>
            )}

            {/* Loading State */}
            {generatingPlan && (
              <div className="ai-loading-state">
                <div className="spinner"></div>
                <h4>Optimizing Your Schedule...</h4>
                <p>Evaluating deadlines, subject balance, and active recall intervals.</p>
              </div>
            )}

            {/* Render Generated Schedule */}
            {generatedPlan && !generatingPlan && (
              <div className="generated-plan-content">
                {generatedPlan.blocks && generatedPlan.blocks.length > 0 && (
                  <div className="ai-timeblocks-container">
                    <div className="timeblocks-header-row">
                      <span className="blocks-heading">Session Flow</span>
                      <span className="blocks-subtext">Click checkmark to track progress</span>
                    </div>

                    <div className="ai-blocks-list">
                      {generatedPlan.blocks.map((block, bIdx) => {
                        const isDone = !!checkedBlocks[bIdx];
                        const isBreak = block.type === "break";

                        return (
                          <div
                            key={bIdx}
                            className={`ai-timeblock-card ${isBreak ? "is-break" : "is-study"} ${isDone ? "is-done" : ""}`}
                          >
                            <div className="block-check-area">
                              <button
                                type="button"
                                className={`block-checkbox ${isDone ? "checked" : ""}`}
                                onClick={() => toggleBlockDone(bIdx)}
                                title="Mark block completed"
                              >
                                {isDone ? <CheckIcon size={14} /> : null}
                              </button>
                            </div>

                            <div className="block-time-col">
                              <span className="block-badge duration">
                                ⏱️ {block.durationMins}m
                              </span>
                              {block.timeSpan && (
                                <span className="block-time-span">{block.timeSpan}</span>
                              )}
                            </div>

                            <div className="block-main-content">
                              <div className="block-title-row">
                                <strong className="block-subject">{block.subject}</strong>
                                {block.technique && (
                                  <span className="block-technique-pill">
                                    💡 {block.technique}
                                  </span>
                                )}
                              </div>
                              <p className="block-activity-text">{block.activity}</p>
                            </div>

                            {!isBreak && onStartFocusSession && (
                              <div className="block-action-col">
                                <button
                                  type="button"
                                  className="btn-block-play"
                                  onClick={onStartFocusSession}
                                  title="Start Focus Timer for this block"
                                >
                                  <PlayIcon size={12} /> Focus
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Markdown Strategic Breakdown */}
                {generatedPlan.planMarkdown && (
                  <div className="plan-markdown-body">
                    <FormattedAIContent content={generatedPlan.planMarkdown} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: SMART STUDY NOTES & RAG
          ========================================================================= */}
      {activeSubTab === "notes" && (
        <div className="card ai-rag-tab-card">
          <div className="card-header-compact">
            <div>
              <span className="section-kicker">RAG Ingestion</span>
              <h3>Ground Studex AI with Your Notes</h3>
            </div>
            <span className="rag-status-pill">📚 Semantic Retrieval Store</span>
          </div>

          <p className="rag-intro-text">
            Paste or upload your syllabus, lecture transcripts, or textbook chapters. Studex AI will chunk and index them so your Socratic Mentor answers questions with direct citations from your materials!
          </p>

          <div className="rag-form-grid">
            <div className="form-group">
              <label className="ai-form-label">Document Title</label>
              <input
                type="text"
                className="ai-text-input"
                placeholder="e.g. Unit 3: Concurrency Control & Indexing"
                value={ragDocTitle}
                onChange={(e) => setRagDocTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="ai-form-label">Subject</label>
              <input
                type="text"
                className="ai-text-input"
                placeholder="e.g. Database Management Systems"
                value={ragDocSubject}
                onChange={(e) => setRagDocSubject(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="ai-form-label">Document / Chapter Notes Text</label>
            <textarea
              className="ai-textarea-input"
              rows={8}
              placeholder="Paste your lecture notes, summaries, or syllabus chapters here..."
              value={ragDocContent}
              onChange={(e) => setRagDocContent(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-full ai-generate-btn"
            onClick={handleUploadRagNotes}
            disabled={uploadingRag || !ragDocTitle.trim() || !ragDocContent.trim()}
          >
            <SparklesIcon size={15} />
            {uploadingRag ? "Chunking & Ingesting Notes..." : "Ingest into Studex RAG Store"}
          </button>
        </div>
      )}
    </div>
  );
}
