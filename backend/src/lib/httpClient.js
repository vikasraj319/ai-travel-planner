const env = require('../config/env');

const defaultFetch = (...args) => {
  if (typeof globalThis.fetch !== 'function') {
    return Promise.reject(new Error('Global fetch is not available in this Node runtime'));
  }
  return globalThis.fetch(...args);
};

let fetchImpl = defaultFetch;

/**
 * Allows tests (and alternative runtimes) to inject a fetch implementation.
 * Passing a falsy value restores the global fetch wrapper.
 */
function setFetchImpl(fn) {
  fetchImpl = typeof fn === 'function' ? fn : defaultFetch;
}

function getFetchImpl() {
  return fetchImpl;
}

class HttpError extends Error {
  constructor(message, { status = 0, body = null, type = 'http' } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
    this.type = type;
  }
}

/**
 * Parses a `Retry-After` header (delta-seconds or HTTP-date) into milliseconds.
 * Returns null when the header is absent or unparsable.
 */
function parseRetryAfter(value) {
  if (value === null || value === undefined || value === '') return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return seconds >= 0 ? Math.round(seconds * 1000) : null;
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;

  const delta = date - Date.now();
  return delta > 0 ? delta : 0;
}

function readHeader(response, name) {
  try {
    const raw = response?.headers?.get?.(name);
    return typeof raw === 'string' ? raw : null;
  } catch {
    return null;
  }
}

function looksLikeJson(text, contentType) {
  if (contentType && contentType.includes('json')) return true;
  return /^\s*[[{"]/.test(text || '');
}

/**
 * Performs a network request with a hard timeout and safe JSON parsing.
 * Never throws for non-2xx responses: callers get { ok, status, data, error }
 * so a provider failure cannot crash the travel-planning flow.
 *
 * Failure `type` values:
 *  - 'timeout'          the request exceeded `timeoutMs`
 *  - 'aborted'          the caller cancelled the request (client disconnect)
 *  - 'rate-limit'       429
 *  - 'server-error'     5xx (overloaded / upstream failure)
 *  - 'http'             any other non-2xx status
 *  - 'invalid-response' 2xx body that could not be parsed as JSON
 *  - 'network'          transport level failure (DNS, TLS, connection reset)
 */
async function requestJson(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = env.externalApiTimeoutMs,
    signal: externalSignal
  } = options;

  const controller = new AbortController();
  let timedOut = false;
  let externallyAborted = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    externallyAborted = true;
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) onExternalAbort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const startedAt = Date.now();

  try {
    const response = await fetchImpl(url, {
      method,
      headers,
      body,
      signal: controller.signal
    });

    const durationMs = Date.now() - startedAt;
    const retryAfterMs = parseRetryAfter(readHeader(response, 'retry-after'));
    const contentType = readHeader(response, 'content-type') || '';

    let data = null;
    let parseFailed = false;

    try {
      const text = await response.text();
      if (text) {
        if (looksLikeJson(text, contentType)) {
          try {
            data = JSON.parse(text);
          } catch {
            parseFailed = true;
          }
        } else {
          data = text;
        }
      }
    } catch {
      // A truncated/aborted body is treated as an invalid response.
      parseFailed = true;
    }

    if (!response.ok) {
      const type =
        response.status === 429
          ? 'rate-limit'
          : response.status >= 500
            ? 'server-error'
            : 'http';

      return {
        ok: false,
        status: response.status,
        data,
        durationMs,
        retryAfterMs,
        error: new HttpError(`Provider responded with ${response.status}`, {
          status: response.status,
          body: data,
          type
        })
      };
    }

    if (parseFailed) {
      return {
        ok: false,
        status: response.status,
        data: null,
        durationMs,
        retryAfterMs,
        error: new HttpError('Provider returned a malformed response', {
          status: response.status,
          type: 'invalid-response'
        })
      };
    }

    return { ok: true, status: response.status, data, durationMs, retryAfterMs, error: null };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const isAbort = Boolean(err) && (err.name === 'AbortError' || err.code === 'ABORT_ERR');

    if (isAbort && externallyAborted) {
      return {
        ok: false,
        status: 0,
        data: null,
        durationMs,
        retryAfterMs: null,
        error: new HttpError('Provider request was cancelled', { type: 'aborted' })
      };
    }

    if (isAbort || timedOut) {
      return {
        ok: false,
        status: 0,
        data: null,
        durationMs,
        retryAfterMs: null,
        error: new HttpError(`Provider request timed out after ${timeoutMs}ms`, { type: 'timeout' })
      };
    }

    return {
      ok: false,
      status: 0,
      data: null,
      durationMs,
      retryAfterMs: null,
      error: new HttpError(err?.message || 'Provider request failed', { type: 'network' })
    };
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

module.exports = {
  requestJson,
  setFetchImpl,
  getFetchImpl,
  parseRetryAfter,
  HttpError
};
