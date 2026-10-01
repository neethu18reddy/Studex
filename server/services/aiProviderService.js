/**
 * AI Provider Abstraction Service — Production Hardened
 * Encapsulates Google Gemini LLM engine with bounded retries, exponential backoff with jitter,
 * fallback model rotation, standardized error classification, timeout protection, and telemetry.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Standardized AI Error Codes
 */
const AI_ERROR_CODES = {
  AI_TEMPORARY_UNAVAILABLE: "AI_TEMPORARY_UNAVAILABLE",
  AI_RATE_LIMITED: "AI_RATE_LIMITED",
  AI_AUTH_ERROR: "AI_AUTH_ERROR",
  AI_TIMEOUT: "AI_TIMEOUT",
  AI_INVALID_RESPONSE: "AI_INVALID_RESPONSE",
  AI_CONFIGURATION_ERROR: "AI_CONFIGURATION_ERROR",
  AI_UNKNOWN_ERROR: "AI_UNKNOWN_ERROR",
};

/**
 * User-Safe Educational Messages mapped from Error Codes
 */
const USER_SAFE_MESSAGES = {
  [AI_ERROR_CODES.AI_TEMPORARY_UNAVAILABLE]: "Studex AI is temporarily busy. Please try again in a moment.",
  [AI_ERROR_CODES.AI_RATE_LIMITED]: "Studex AI is receiving a lot of requests right now. Please try again shortly.",
  [AI_ERROR_CODES.AI_AUTH_ERROR]: "Studex AI is temporarily unavailable. Please try again later.",
  [AI_ERROR_CODES.AI_TIMEOUT]: "The AI took too long to respond. Please try again.",
  [AI_ERROR_CODES.AI_INVALID_RESPONSE]: "Studex AI received an incomplete response format. Please try again.",
  [AI_ERROR_CODES.AI_CONFIGURATION_ERROR]: "Studex AI is ready for your Google Gemini API key. Please add GEMINI_API_KEY to server/.env to enable live mentor reasoning.",
  [AI_ERROR_CODES.AI_UNKNOWN_ERROR]: "Studex AI encountered a temporary issue. Please try again.",
};

/**
 * Centralized Provider Error Normalizer
 */
function classifyProviderError(err) {
  if (!err) {
    return {
      code: AI_ERROR_CODES.AI_UNKNOWN_ERROR,
      message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_UNKNOWN_ERROR],
      retryable: true,
      status: 500,
    };
  }

  const rawMsg = (err.message || "").toLowerCase();
  const status = err.status || (err.response && err.response.status) || 500;

  // 1. Auth / Permissions
  if (
    status === 401 ||
    status === 403 ||
    rawMsg.includes("api_key_invalid") ||
    rawMsg.includes("api key not valid") ||
    rawMsg.includes("permission_denied") ||
    rawMsg.includes("unauthenticated")
  ) {
    return {
      code: AI_ERROR_CODES.AI_AUTH_ERROR,
      message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_AUTH_ERROR],
      retryable: false,
      status: status || 401,
    };
  }

  // 2. Rate Limited
  if (
    status === 429 ||
    rawMsg.includes("429") ||
    rawMsg.includes("resource_exhausted") ||
    rawMsg.includes("rate limit") ||
    rawMsg.includes("quota exceeded")
  ) {
    return {
      code: AI_ERROR_CODES.AI_RATE_LIMITED,
      message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_RATE_LIMITED],
      retryable: true,
      status: 429,
    };
  }

  // 3. Timeout / Abort
  if (
    err.name === "AbortError" ||
    rawMsg.includes("timeout") ||
    rawMsg.includes("timed out") ||
    rawMsg.includes("deadline_exceeded")
  ) {
    return {
      code: AI_ERROR_CODES.AI_TIMEOUT,
      message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_TIMEOUT],
      retryable: true,
      status: 408,
    };
  }

  // 4. Temporary Provider Outage / High Demand
  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    rawMsg.includes("503") ||
    rawMsg.includes("502") ||
    rawMsg.includes("504") ||
    rawMsg.includes("service unavailable") ||
    rawMsg.includes("high demand") ||
    rawMsg.includes("overloaded")
  ) {
    return {
      code: AI_ERROR_CODES.AI_TEMPORARY_UNAVAILABLE,
      message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_TEMPORARY_UNAVAILABLE],
      retryable: true,
      status: status || 503,
    };
  }

  // 5. Default Unknown
  return {
    code: AI_ERROR_CODES.AI_TEMPORARY_UNAVAILABLE,
    message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_TEMPORARY_UNAVAILABLE],
    retryable: true,
    status: status || 500,
  };
}

class AIProviderService {
  constructor() {
    this.providerName = process.env.AI_PROVIDER || "gemini";
    this.modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
    this.timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || "25000", 10);
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES || "3", 10);
    this.baseDelayMs = parseInt(process.env.AI_RETRY_BASE_DELAY_MS || "2000", 10);
    this.fallbackModels = [
      this.modelName,
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
    ];
  }

  /**
   * Get the active API Key securely server-side
   */
  getApiKey() {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      ""
    ).trim();
  }

  /**
   * Check if a real LLM provider API key is present and configured
   */
  isConfigured() {
    const key = this.getApiKey();
    return !!(key && key.length > 5);
  }

  /**
   * Safe Provider metadata (no sensitive credentials exposed)
   */
  getProviderInfo() {
    const configured = this.isConfigured();
    return {
      provider: "Google Gemini",
      model: this.modelName,
      status: configured ? "READY" : "API_KEY_REQUIRED",
      isConfigured: configured,
      requiresEnv: "GEMINI_API_KEY",
    };
  }

  /**
   * Initializes the Google Generative AI client
   */
  getClient() {
    const key = this.getApiKey();
    if (!key) return null;
    return new GoogleGenerativeAI(key);
  }

  /**
   * Calculates exponential backoff delay with random jitter
   */
  calculateBackoff(attempt) {
    const exponential = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 300);
    return Math.min(exponential + jitter, 8000);
  }

  /**
   * Executes a multi-turn chat with automatic tool calling, fallback model rotation,
   * bounded retries with jitter, and error normalization.
   */
  async generateChatResponse({
    systemInstruction,
    history = [],
    message,
    userMessage,
    tools = [],
    toolExecutor = null,
    temperature = 0.6,
    generationId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  }) {
    const inputMsg = (message || userMessage || "").trim();

    if (!this.isConfigured()) {
      return {
        success: false,
        isConfigured: false,
        error: {
          code: AI_ERROR_CODES.AI_CONFIGURATION_ERROR,
          message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_CONFIGURATION_ERROR],
          retryable: false,
          status: 400,
        },
        toolsExecuted: [],
      };
    }

    const genAI = this.getClient();
    const candidateModels = [...new Set([this.modelName, ...this.fallbackModels])];

    let lastError = null;
    const startTime = Date.now();

    for (const modelToTry of candidateModels) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          const modelConfig = {
            model: modelToTry,
            systemInstruction: systemInstruction || undefined,
            generationConfig: {
              temperature: temperature,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2500,
            },
          };

          if (tools && tools.length > 0) {
            modelConfig.tools = [{ functionDeclarations: tools }];
          }

          const model = genAI.getGenerativeModel(modelConfig);

          // Format chat history for Gemini API: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
          const formattedHistory = history.map((h) => ({
            role: h.role === "assistant" || h.role === "model" ? "model" : "user",
            parts: [{ text: typeof h.content === "string" ? h.content : JSON.stringify(h.content) }],
          }));

          const chat = model.startChat({
            history: formattedHistory,
          });

          const executedTools = [];

          // Wrap sendMessage with timeout
          const currentResponse = await Promise.race([
            chat.sendMessage(inputMsg),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("AI_TIMEOUT: Generation took too long")), this.timeoutMs)
            ),
          ]);

          // Handle tool calling loop (up to 5 recursive turns)
          let turns = 0;
          let activeResponse = currentResponse;

          while (turns < 5) {
            const functionCalls = activeResponse.response.functionCalls();
            if (!functionCalls || functionCalls.length === 0) break;

            turns += 1;
            const functionResponses = [];

            for (const call of functionCalls) {
              executedTools.push({ name: call.name, args: call.args });
              let result = {};

              if (toolExecutor) {
                try {
                  result = await toolExecutor(call.name, call.args);
                } catch (toolErr) {
                  result = { error: toolErr.message || "Tool execution failed" };
                }
              } else {
                result = { error: "No tool executor attached" };
              }

              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: result,
                },
              });
            }

            // Send tool execution results back to model
            activeResponse = await Promise.race([
              chat.sendMessage(functionResponses),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI_TIMEOUT: Tool roundtrip took too long")), this.timeoutMs)
              ),
            ]);
          }

          const text = activeResponse.response.text();
          const latencyMs = Date.now() - startTime;

          // Telemetry Logging
          console.log(
            `[AI Telemetry] Success | Provider: ${this.providerName} | Model: ${modelToTry} | GenId: ${generationId} | Latency: ${latencyMs}ms | Retries: ${attempt}`
          );

          return {
            success: true,
            isConfigured: true,
            text,
            generationId,
            modelUsed: modelToTry,
            toolsExecuted: executedTools,
          };
        } catch (err) {
          lastError = err;
          const classified = classifyProviderError(err);

          console.warn(
            `[AI Telemetry] Attempt ${attempt + 1}/${this.maxRetries} failed on model ${modelToTry}: [${classified.code}] (Status: ${classified.status})`
          );

          // If error is permanent (like auth failure), do not retry
          if (!classified.retryable) {
            return {
              success: false,
              isConfigured: true,
              generationId,
              error: classified,
              toolsExecuted: [],
            };
          }

          // If retryable, back off before next attempt
          if (attempt < this.maxRetries - 1) {
            const delay = this.calculateBackoff(attempt);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
    }

    // All retries and fallback models failed
    const finalClassified = classifyProviderError(lastError);
    const totalLatencyMs = Date.now() - startTime;
    console.error(
      `[AI Telemetry] Exhausted all retries | GenId: ${generationId} | Latency: ${totalLatencyMs}ms | Code: ${finalClassified.code}`
    );

    return {
      success: false,
      isConfigured: true,
      generationId,
      error: finalClassified,
      toolsExecuted: [],
    };
  }

  /**
   * Executes streaming chat response via Server-Sent Events / callback with error handling
   */
  async streamChatResponse({
    systemInstruction,
    history = [],
    message,
    userMessage,
    onChunk,
    temperature = 0.6,
    generationId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  }) {
    const inputMsg = (message || userMessage || "").trim();

    if (!this.isConfigured()) {
      throw {
        code: AI_ERROR_CODES.AI_CONFIGURATION_ERROR,
        message: USER_SAFE_MESSAGES[AI_ERROR_CODES.AI_CONFIGURATION_ERROR],
        retryable: false,
        status: 400,
      };
    }

    const genAI = this.getClient();
    const candidateModels = [...new Set([this.modelName, ...this.fallbackModels])];

    let lastError = null;

    for (const modelToTry of candidateModels) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelToTry,
            systemInstruction: systemInstruction || undefined,
            generationConfig: {
              temperature: temperature,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2500,
            },
          });

          const formattedHistory = history.map((h) => ({
            role: h.role === "assistant" || h.role === "model" ? "model" : "user",
            parts: [{ text: typeof h.content === "string" ? h.content : JSON.stringify(h.content) }],
          }));

          const chat = model.startChat({ history: formattedHistory });
          const resultStream = await chat.sendMessageStream(inputMsg);

          let fullText = "";
          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            if (onChunk) onChunk(chunkText);
          }

          console.log(
            `[AI Telemetry Stream] Success | Model: ${modelToTry} | GenId: ${generationId}`
          );
          return fullText;
        } catch (err) {
          lastError = err;
          const classified = classifyProviderError(err);

          if (!classified.retryable) {
            throw classified;
          }

          if (attempt < this.maxRetries - 1) {
            const delay = this.calculateBackoff(attempt);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
    }

    throw classifyProviderError(lastError);
  }
}

module.exports = new AIProviderService();
module.exports.AI_ERROR_CODES = AI_ERROR_CODES;
module.exports.USER_SAFE_MESSAGES = USER_SAFE_MESSAGES;
module.exports.classifyProviderError = classifyProviderError;
