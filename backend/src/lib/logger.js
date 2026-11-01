/**
 * Minimal structured logger for external-discovery diagnostics.
 *
 * Goal: make it obvious *which* dependency caused a slow or failed discovery
 * request (geocoding vs. provider vs. cache) without logging secrets.
 * Only non-sensitive values are ever written: provider names, categories,
 * coordinates, durations and HTTP status codes. API keys are never passed in.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function resolveLevel() {
  const configured = String(process.env.DISCOVERY_LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[configured] ?? LEVELS.info;
}

function formatValue(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return /\s/.test(value) ? JSON.stringify(value) : value;
  if (Array.isArray(value)) return `[${value.map(formatValue).join(',')}]`;
  return JSON.stringify(value);
}

function createLogger(scope, { level = resolveLevel() } = {}) {
  function emit(logLevel, message, fields = {}) {
    if (LEVELS[logLevel] < level) return;

    const parts = Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${formatValue(value)}`);

    const line = `[${new Date().toISOString()}] ${logLevel.toUpperCase().padEnd(5)} [${scope}] ${message}${
      parts.length ? ` ${parts.join(' ')}` : ''
    }`;

    if (logLevel === 'error') console.error(line);
    else if (logLevel === 'warn') console.warn(line);
    else console.log(line);
  }

  return {
    debug: (message, fields) => emit('debug', message, fields),
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields)
  };
}

module.exports = { createLogger, LEVELS };
