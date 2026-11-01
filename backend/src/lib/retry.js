/**
 * Bounded retry helper for transient external-provider failures.
 *
 * Design rules (deliberately conservative):
 *  - only failures classified as transient are retried;
 *  - exponential backoff with jitter, honouring `Retry-After` when present;
 *  - a hard deadline caps the total time spent, so a retry can never push a
 *    request past its response-time budget;
 *  - the number of attempts is always finite.
 */

const DEFAULT_ATTEMPTS = 2;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 2000;

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Computes the delay before the next attempt: exponential backoff plus jitter,
 * never shorter than a `Retry-After` hint supplied by the server.
 */
function computeDelay({ attempt, baseDelayMs, maxDelayMs, retryAfterMs, random }) {
  const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const jitter = Math.floor(backoff * 0.3 * random());
  const serverHint = Math.min(retryAfterMs || 0, maxDelayMs);
  return Math.max(serverHint, backoff + jitter);
}

/**
 * Runs `task` until it succeeds, the failure is not retryable, the attempt
 * budget is exhausted, or the deadline would be exceeded.
 *
 * `task` is expected to resolve to `{ ok, data, error, retryAfterMs }`.
 */
async function runWithRetry(task, options = {}) {
  const {
    attempts = DEFAULT_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    deadline = Infinity,
    isRetryable = () => false,
    onRetry = () => {},
    sleep = defaultSleep,
    random = Math.random
  } = options;

  const maxAttempts = Math.max(1, attempts);
  let last = { ok: false, data: null, error: null, retryAfterMs: null };
  let used = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    used = attempt;
    const result = await task(attempt);
    last = result;

    if (result.ok) {
      return { ...result, attempts: used, retries: used - 1 };
    }

    if (attempt >= maxAttempts) break;
    if (!isRetryable(result)) break;

    const delay = computeDelay({
      attempt,
      baseDelayMs,
      maxDelayMs,
      retryAfterMs: result.retryAfterMs,
      random
    });

    const now = Date.now();
    if (now + delay >= deadline) break;

    onRetry({
      attempt,
      nextAttempt: attempt + 1,
      delayMs: delay,
      error: result.error
    });

    await sleep(delay);
  }

  return { ...last, attempts: used, retries: Math.max(0, used - 1) };
}

module.exports = { runWithRetry, computeDelay, defaultSleep };
