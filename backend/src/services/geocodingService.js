const env = require('../config/env');
const { requestJson } = require('../lib/httpClient');
const { createCache } = require('../lib/cache');
const { resolveCoordinates } = require('../utils/geo');

const geocodeCache = createCache({ ttlMs: env.cacheTtl.geocodeMs, maxEntries: 500 });

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Maps a Nominatim search result to our stable geocode shape. */
function normalizeNominatimResult(item) {
  if (!item || typeof item !== 'object') return null;

  // Treat missing/empty coordinates as unresolved rather than (0, 0).
  const coordinates = resolveCoordinates(item.lat, item.lon);
  if (!coordinates) return null;

  const { lat, lng } = coordinates;

  return {
    lat,
    lng,
    name: item.name || (item.display_name || '').split(',')[0].trim(),
    displayName: item.display_name || item.name || '',
    type: item.type || item.class || 'place',
    importance: Number.isFinite(Number(item.importance)) ? Number(item.importance) : null,
    source: 'openstreetmap'
  };
}

/**
 * Resolves a free-text location to coordinates using OpenStreetMap Nominatim.
 * Returns { ok, result, cached, source } where `result` is null when the
 * location cannot be confidently resolved.
 */
async function geocode(query, { timeoutMs = env.geocodeTimeoutMs, signal } = {}) {
  const cleaned = String(query || '').trim();
  if (!cleaned) {
    return { ok: false, result: null, cached: false, error: 'A location query is required' };
  }

  const cacheKey = `geocode:${normalizeQuery(cleaned)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return { ok: true, result: cached.value, cached: true, source: 'openstreetmap' };
  }

  const url =
    `${env.nominatim.url}?q=${encodeURIComponent(cleaned)}` +
    '&format=jsonv2&limit=5&addressdetails=1&accept-language=en';

  const response = await requestJson(url, {
    headers: {
      'User-Agent': env.nominatim.userAgent,
      Accept: 'application/json'
    },
    timeoutMs,
    signal
  });

  if (!response.ok) {
    return {
      ok: false,
      result: null,
      cached: false,
      error: response.error?.message || 'Geocoding provider unavailable',
      errorType: response.error?.type || 'http'
    };
  }

  const list = Array.isArray(response.data) ? response.data : [];
  const normalized = list.map(normalizeNominatimResult).filter(Boolean);

  if (normalized.length === 0) {
    return { ok: true, result: null, cached: false, source: 'openstreetmap' };
  }

  // Nominatim orders by relevance; keep that order but prefer results that
  // carry an importance score for stability.
  const best = normalized[0];
  geocodeCache.set(cacheKey, best);

  return { ok: true, result: best, cached: false, source: 'openstreetmap' };
}

module.exports = {
  geocode,
  normalizeNominatimResult,
  _geocodeCache: geocodeCache
};
