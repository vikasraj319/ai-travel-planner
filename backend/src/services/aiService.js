const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');
const { runWithRetry } = require('../lib/retry');

function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`AI request timed out after ${ms}ms`)),
      ms
    );
  });
  if (promise && typeof promise.catch === 'function') {
    promise.catch(() => {});
  }
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Extracts the structured error the Gemini SDK puts into `error.message`.
 * The SDK surfaces the raw HTTP body, e.g.
 * `{"error":{"code":404,"message":"... no longer available ...","status":"NOT_FOUND"}}`
 */
function parseProviderError(error) {
  const raw = (error && error.message) || String(error);

  let status = null;
  let providerStatus = null;
  let message = raw;

  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      const detail = parsed?.error;
      if (detail) {
        status = Number.isFinite(detail.code) ? detail.code : null;
        providerStatus = detail.status || null;
        message = detail.message || raw;
      }
    } catch {
      // Not a provider JSON payload: keep the raw message.
    }
  }

  return { status, providerStatus, message };
}

/**
 * Maps a provider failure onto a stable reason code. The reason decides both
 * whether the call is worth retrying and what the user is told.
 */
function classifyFailure({ status, providerStatus, message }) {
  const text = String(message || '').toLowerCase();

  if (text.includes('timed out')) return 'timeout';
  if (text.includes('no longer available')) return 'model_unavailable';
  if (status === 404 || providerStatus === 'NOT_FOUND') return 'model_unavailable';
  if (status === 429 || providerStatus === 'RESOURCE_EXHAUSTED') return 'rate_limit';
  if (status === 401 || status === 403) return 'invalid_credentials';
  if (status === 400 || providerStatus === 'INVALID_ARGUMENT') return 'invalid_request';
  if (status === 503 || status === 502 || status === 500) return 'provider_unavailable';
  if (text.includes('high demand') || text.includes('overloaded')) return 'provider_unavailable';

  return 'provider_error';
}

const RETRYABLE_REASONS = new Set(['timeout', 'rate_limit', 'provider_unavailable']);

async function callGemini({
  systemPrompt,
  messages,
  maxTokens = 900,
  temperature = 0.7,
  timeoutMs = env.aiTimeoutMs
}) {
  if (!env.gemini.apiKey) {
    return {
      ok: false,
      provider: 'gemini',
      reason: 'missing_credentials',
      error: 'Missing GEMINI_API_KEY'
    };
  }

  // A single deadline covers every attempt, so retries can never push the
  // request past its response-time budget.
  const deadline = Date.now() + timeoutMs;

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  } catch (error) {
    return {
      ok: false,
      provider: 'gemini',
      reason: 'invalid_credentials',
      error: error.message
    };
  }

  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const result = await runWithRetry(
    async () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        return {
          ok: false,
          reason: 'timeout',
          error: `AI request timed out after ${timeoutMs}ms`
        };
      }

      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: env.gemini.model,
            contents: `${conversationText}`,
            config: {
              systemInstruction: systemPrompt,
              temperature,
              maxOutputTokens: maxTokens
            }
          }),
          remaining
        );

        return { ok: true, text: response.text || '' };
      } catch (error) {
        const parsed = parseProviderError(error);
        return {
          ok: false,
          reason: classifyFailure(parsed),
          error: parsed.message,
          providerStatus: parsed.providerStatus,
          status: parsed.status
        };
      }
    },
    {
      attempts: env.aiMaxAttempts,
      baseDelayMs: env.aiRetryBaseDelayMs,
      maxDelayMs: env.aiRetryMaxDelayMs,
      deadline,
      isRetryable: (attemptResult) => RETRYABLE_REASONS.has(attemptResult.reason),
      onRetry: ({ attempt, delayMs, error }) => {
        console.warn(
          `AI request failed (attempt ${attempt}), retrying in ${delayMs}ms:`,
          error
        );
      }
    }
  );

  if (result.ok) {
    return {
      ok: true,
      provider: 'gemini',
      text: result.text,
      attempts: result.attempts
    };
  }

  return {
    ok: false,
    provider: 'gemini',
    reason: result.reason || 'provider_error',
    error: result.error,
    attempts: result.attempts
  };
}

async function generateText(options) {
  if (env.aiProvider === 'gemini') {
    return callGemini(options);
  }

  return {
    ok: false,
    provider: env.aiProvider,
    reason: 'unsupported_provider',
    error: `Unsupported AI_PROVIDER: ${env.aiProvider}`
  };
}

module.exports = {
  generateText,
  parseProviderError,
  classifyFailure
};
