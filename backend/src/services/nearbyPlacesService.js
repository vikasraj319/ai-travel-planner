const env = require('../config/env');
const { requestJson } = require('../lib/httpClient');
const { createCache } = require('../lib/cache');
const { createLogger } = require('../lib/logger');
const { computeDelay, defaultSleep } = require('../lib/retry');
const { haversineMeters, formatDistance, isValidCoordinate, resolveCoordinates } = require('../utils/geo');
const { geocode } = require('./geocodingService');
const {
  PLACE_CATEGORIES,
  DEFAULT_CATEGORY,
  isValidCategory,
  getCategory
} = require('../constants/placeCategories');

const log = createLogger('places');

const placesCache = createCache({
  ttlMs: env.cacheTtl.placesMs,
  maxEntries: 800,
  staleMs: env.cacheTtl.placesStaleMs
});

const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';
const GOOGLE_ATTRIBUTION = 'Google Places';
const GOOGLE_SEARCH_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const DEFAULT_RADIUS_M = {
  stay: 5000,
  eat: 2000,
  facilities: 3000,
  explore: 5000
};

const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 50000;
const MAX_LIMIT = 20;

// A provider request is only started when at least this much of the request
// budget is left, so a doomed attempt cannot eat the whole budget.
const MIN_REMAINING_BUDGET_MS = 250;

const REASON_MESSAGES = {
  'location-unresolved': 'We could not match that location. Try a nearby city, region or landmark.',
  'geocoding-failed': 'The map service could not look up that location right now.',
  'geocoding-timeout': 'The map service took too long to look up that location.',
  timeout: 'The places provider took too long to respond. Please try again.',
  'budget-exceeded': 'The places lookup ran out of time before a result was found.',
  'rate-limit': 'The places provider is rate limiting requests. Please try again shortly.',
  'provider-overloaded': 'The places provider is busy right now. Please try again shortly.',
  'provider-unavailable': 'The places provider could not be reached. Please try again shortly.',
  'provider-error': 'The places provider returned an unexpected response.',
  'missing-credentials': 'No places provider is configured for this deployment.',
  'provider-disabled': 'Place discovery is disabled for this deployment.',
  aborted: 'The nearby places request was cancelled before it completed.'
};

const RETRYABLE_REASONS = new Set([
  'timeout',
  'budget-exceeded',
  'rate-limit',
  'provider-overloaded',
  'provider-unavailable',
  'geocoding-timeout'
]);

/**
 * In-flight request registry.
 *
 * Several UI surfaces (four category tabs) can ask for nearby places at the
 * same time. Keyed single-flight guarantees only one provider request per
 * cache key is in flight, so concurrent callers share a single upstream call.
 */
const inFlightRequests = new Map();

function clampRadius(radius, category) {
  const fallback = DEFAULT_RADIUS_M[category] || 3000;
  const value = Number(radius);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Math.round(value)));
}

function clampLimit(limit) {
  const value = Number(limit);
  if (!Number.isFinite(value) || value <= 0) return 8;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(value)));
}

/** Decides which provider to use based on configuration and key availability. */
function resolveProvider() {
  const configured = env.placesProvider;

  if (configured === 'google') {
    return env.googlePlacesKey ? 'google' : 'missing-credentials';
  }

  if (configured === 'osm') {
    return 'osm';
  }

  // auto
  return env.googlePlacesKey ? 'google' : 'osm';
}

// ---------------------------------------------------------------------------
// OpenStreetMap (Overpass)
// ---------------------------------------------------------------------------

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Groups `key=value` filters by key.
 *
 * The previous implementation emitted one `node[...]` and one `way[...]`
 * clause per filter, which produced up to 30 separate spatial scans for the
 * "facilities" category. Grouping by key produces one clause per key with a
 * value regex, which is semantically identical (a key must still match) while
 * cutting the number of spatial scans to the number of distinct keys.
 */
function groupFiltersByKey(filters = []) {
  const grouped = new Map();

  for (const filter of filters) {
    const [key, value] = String(filter).split('=');
    if (!key || !value) continue;
    if (!grouped.has(key)) grouped.set(key, new Set());
    grouped.get(key).add(value);
  }

  return grouped;
}

function buildOverpassQuery({ lat, lng, radius, filters, limit = 60, timeoutSeconds = 25 }) {
  const around = `(around:${radius},${lat},${lng})`;
  const grouped = groupFiltersByKey(filters);
  const clauses = [];

  for (const [key, values] of grouped) {
    // Overpass implements POSIX Extended Regular Expressions, which have no
    // non-capturing group syntax: a plain alternation group is used.
    const valueRegex = `^(${[...values].map(escapeRegex).join('|')})$`;
    // node + way only: adding relations makes the server resolve member
    // geometry and is markedly slower for the same result set.
    clauses.push(`node["${key}"~"${valueRegex}"]${around};`);
    clauses.push(`way["${key}"~"${valueRegex}"]${around};`);
  }

  if (clauses.length === 0) return null;

  return `[out:json][timeout:${timeoutSeconds}];\n(\n  ${clauses.join('\n  ')}\n);\nout center tags ${limit};`;
}

function buildOsmAddress(tags = {}) {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:postcode'],
    tags['addr:country']
  ].filter(Boolean);

  const line = parts.join(', ').trim();
  return line || null;
}

function pickSubcategory(tags = {}) {
  return tags.amenity || tags.tourism || tags.leisure || tags.historic || tags.shop || 'place';
}

function normalizeOverpassElement(element, category) {
  if (!element || typeof element !== 'object') return null;

  const tags = element.tags || {};
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);

  if (!isValidCoordinate(lat, lng)) return null;

  const name = tags.name || tags['name:en'] || tags.official_name;
  if (!name) return null;

  const id = `osm:${element.type}/${element.id}`;
  const website = tags.website || tags['contact:website'] || tags.url || null;
  const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null;

  return {
    id,
    provider: 'openstreetmap',
    name,
    category,
    subcategory: pickSubcategory(tags),
    lat,
    lng,
    address: buildOsmAddress(tags),
    website,
    phone,
    openingHours: tags.opening_hours || null,
    // OpenStreetMap carries no customer ratings or review metadata.
    rating: null,
    reviewCount: null,
    ratingScale: null,
    priceLevel: null,
    openNow: null,
    mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
    sourceUrl: null,
    attribution: OSM_ATTRIBUTION
  };
}

function parseOverpassResponse(data, category) {
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  return elements
    .map((element) => normalizeOverpassElement(element, category))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Google Places API (New)
// ---------------------------------------------------------------------------

const GOOGLE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.googleMapsUri',
  'places.types',
  'places.businessStatus'
].join(',');

const GOOGLE_PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4
};

function normalizeGooglePlace(place, category) {
  if (!place || typeof place !== 'object') return null;

  const lat = Number(place.location?.latitude);
  const lng = Number(place.location?.longitude);
  const name = place.displayName?.text || place.displayName;

  if (!name || !isValidCoordinate(lat, lng)) return null;

  const rating = Number(place.rating);
  const reviewCount = Number(place.userRatingCount);

  return {
    id: `google:${place.id}`,
    provider: 'google',
    name,
    category,
    subcategory: Array.isArray(place.types) && place.types.length ? place.types[0] : 'place',
    lat,
    lng,
    address: place.formattedAddress || null,
    website: place.websiteUri || null,
    phone: place.nationalPhoneNumber || null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.[0] || null,
    // Ratings come from Google and belong to this exact provider place ID.
    rating: Number.isFinite(rating) ? rating : null,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : null,
    ratingScale: Number.isFinite(rating) ? 5 : null,
    priceLevel:
      place.priceLevel && place.priceLevel in GOOGLE_PRICE_LEVELS
        ? GOOGLE_PRICE_LEVELS[place.priceLevel]
        : null,
    openNow:
      typeof place.regularOpeningHours?.openNow === 'boolean'
        ? place.regularOpeningHours.openNow
        : null,
    mapsUrl: place.googleMapsUri || null,
    sourceUrl: place.googleMapsUri || null,
    attribution: GOOGLE_ATTRIBUTION
  };
}

// ---------------------------------------------------------------------------
// Ranking, dedupe, reference resolution
// ---------------------------------------------------------------------------

function dedupePlaces(places = []) {
  const byId = new Set();
  const kept = [];

  for (const place of places) {
    if (!place || !place.id) continue;
    if (byId.has(place.id)) continue;

    const duplicate = kept.find(
      (existing) =>
        typeof existing.name === 'string' &&
        typeof place.name === 'string' &&
        existing.name.toLowerCase() === place.name.toLowerCase() &&
        haversineMeters(existing, place) !== null &&
        haversineMeters(existing, place) < 60
    );

    if (duplicate) continue;

    byId.add(place.id);
    kept.push(place);
  }

  return kept;
}

function scorePlace(place, radius) {
  const distance = Number.isFinite(place.distanceMeters) ? place.distanceMeters : radius;
  const distanceScore = Math.max(0, 1 - distance / radius) * 100;

  let ratingScore = 0;
  if (Number.isFinite(place.rating) && Number.isFinite(place.ratingScale) && place.ratingScale > 0) {
    ratingScore = (place.rating / place.ratingScale) * 40;
  }

  let reviewScore = 0;
  if (Number.isFinite(place.reviewCount) && place.reviewCount > 0) {
    reviewScore = Math.min(20, Math.log10(place.reviewCount + 1) * 10);
  }

  const completeness =
    (place.website ? 5 : 0) +
    (place.phone ? 4 : 0) +
    (place.openingHours ? 4 : 0) +
    (place.address ? 3 : 0);

  return distanceScore + ratingScore + reviewScore + completeness;
}

function rankPlaces(places = [], radius) {
  return [...places].sort((a, b) => scorePlace(b, radius) - scorePlace(a, radius));
}

/**
 * Resolves the search centre.
 *
 * Returns `{ ok, reference, reason }`; a geocoding failure is reported with
 * its own reason so it is never confused with a places-provider failure.
 */
async function resolveReference({ lat, lng, location, destination, deadline, signal }) {
  const coordinates = resolveCoordinates(lat, lng);

  if (coordinates) {
    return {
      ok: true,
      reason: null,
      reference: {
        lat: coordinates.lat,
        lng: coordinates.lng,
        label: String(location || destination || 'Selected location').trim(),
        source: 'coordinates'
      }
    };
  }

  const primary = String(location || '').trim();
  const dest = String(destination || '').trim();

  const query = primary && dest && primary !== dest ? `${primary}, ${dest}` : primary || dest;

  if (!query) {
    return { ok: false, reason: 'location-unresolved', reference: null };
  }

  const timeoutMs = Math.min(env.geocodeTimeoutMs, Math.max(0, deadline - Date.now()));
  const geo = await geocode(query, { timeoutMs, signal });

  if (geo.ok && geo.result) {
    return {
      ok: true,
      reason: null,
      reference: {
        lat: geo.result.lat,
        lng: geo.result.lng,
        label: primary || dest,
        displayName: geo.result.displayName,
        source: 'geocode',
        cached: geo.cached
      }
    };
  }

  // The geocoder answered but knows no such place: the location is unknown,
  // not the geocoder broken.
  const geoReason = geo.ok ? 'location-unresolved' : geo.errorType === 'timeout' ? 'geocoding-timeout' : 'geocoding-failed';

  // Fall back to the broader destination when a specific stop cannot resolve.
  if (primary && dest && primary !== dest) {
    const fallback = await geocode(dest, {
      timeoutMs: Math.min(env.geocodeTimeoutMs, Math.max(0, deadline - Date.now())),
      signal
    });

    if (fallback.ok && fallback.result) {
      return {
        ok: true,
        reason: null,
        reference: {
          lat: fallback.result.lat,
          lng: fallback.result.lng,
          label: dest,
          displayName: fallback.result.displayName,
          source: 'geocode',
          cached: fallback.cached
        }
      };
    }
  }

  return { ok: false, reason: geoReason, reference: null };
}

/** Maps a transport/protocol failure to a machine-readable reason code. */
function mapProviderError(error) {
  switch (error?.type) {
    case 'timeout':
      return 'timeout';
    case 'aborted':
      return 'aborted';
    case 'rate-limit':
      return 'rate-limit';
    case 'server-error':
      // Overpass answers 502/503/504 with "server is currently at capacity".
      return [502, 503, 504].includes(error.status) ? 'provider-overloaded' : 'provider-error';
    case 'network':
      return 'provider-unavailable';
    default:
      return 'provider-error';
  }
}

/**
 * Decides whether a failure is worth retrying *in place*.
 *
 *  - 429 (rate limit) and 502/503/504 (gateway / "server at capacity") are
 *    transient: Overpass explicitly asks clients to retry those with
 *    exponential backoff.
 *  - any other 5xx is a hard error for that endpoint, so the next mirror is
 *    tried instead of burning the budget on the same broken host.
 */
function isRetryableError(error) {
  if (error?.type === 'rate-limit') return true;
  if (error?.type === 'server-error') {
    return [502, 503, 504].includes(error.status);
  }
  return false;
}

function isRetryableReason(reason) {
  return RETRYABLE_REASONS.has(reason);
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provider search with budget, retry and failover
// ---------------------------------------------------------------------------

function osmEndpoints() {
  return [env.overpass.url, ...(env.overpass.fallbackUrls || [])]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

async function requestOverpass({ url, query, timeoutMs, signal }) {
  return requestJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      // Overpass mirrors reject requests without an identifying User-Agent.
      'User-Agent': env.overpass.userAgent
    },
    body: `data=${encodeURIComponent(query)}`,
    timeoutMs,
    signal
  });
}

async function requestGoogle({ lat, lng, radius, category, limit, timeoutMs, signal }) {
  const { googleTypes } = getCategory(category);

  return requestJson(GOOGLE_SEARCH_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.googlePlacesKey,
      'X-Goog-FieldMask': GOOGLE_FIELD_MASK
    },
    body: JSON.stringify({
      includedTypes: googleTypes,
      maxResultCount: Math.min(20, Math.max(limit, 10)),
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius
        }
      }
    }),
    timeoutMs,
    signal
  });
}

/**
 * Searches one provider.
 *
 * The attempt loop is bounded twice: by `maxAttempts` (a hard count) and by
 * `deadline` (a wall-clock budget). A transient overload/rate-limit is retried
 * once on the same endpoint with exponential backoff (as Overpass asks for in
 * its own error message); a transport failure fails over to the next endpoint
 * immediately, because the host itself is unreachable.
 */
async function searchProvider({
  provider,
  lat,
  lng,
  radius,
  category,
  limit,
  deadline,
  signal,
  sleep = defaultSleep
}) {
  const maxAttempts = Math.max(1, env.placesMaxAttempts);
  const maxAttemptsPerEndpoint = 2;
  const startedAt = Date.now();

  const endpoints =
    provider === 'google'
      ? [{ url: GOOGLE_SEARCH_NEARBY_URL, kind: 'google' }]
      : osmEndpoints().map((url) => ({ url, kind: 'osm' }));

  const overpassTimeoutSeconds = Math.max(3, Math.floor(env.placesAttemptTimeoutMs / 1000) - 1);
  const overpassRowLimit = Math.min(100, Math.max(30, limit * 3));

  let attempts = 0;
  let lastError = null;
  let lastReason = 'provider-error';

  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= maxAttemptsPerEndpoint; attempt += 1) {
      if (attempts >= maxAttempts) break;

      const remaining = deadline - Date.now();
      if (remaining <= MIN_REMAINING_BUDGET_MS) {
        log.warn('provider budget exhausted', {
          provider,
          category,
          attempts,
          endpoint: hostOf(endpoint.url)
        });
        return {
          ok: false,
          reason: 'budget-exceeded',
          error: lastError,
          attempts,
          durationMs: Date.now() - startedAt
        };
      }

      const timeoutMs = Math.min(env.placesAttemptTimeoutMs, remaining);

      const response =
        endpoint.kind === 'google'
          ? await requestGoogle({ lat, lng, radius, category, limit, timeoutMs, signal })
          : await requestOverpass({
              url: endpoint.url,
              query: buildOverpassQuery({
                lat,
                lng,
                radius,
                filters: getCategory(category).osm,
                limit: overpassRowLimit,
                timeoutSeconds: overpassTimeoutSeconds
              }),
              timeoutMs,
              signal
            });

      attempts += 1;

      if (response.ok) {
        // A 2xx response with an unexpected body is a provider failure, not an
        // empty result: it must never be presented as "no places found".
        const payloadValid =
          endpoint.kind === 'google'
            ? Boolean(response.data) && typeof response.data === 'object'
            : Array.isArray(response.data?.elements);

        if (!payloadValid) {
          lastError = {
            type: 'invalid-response',
            status: response.status,
            message: 'Provider returned an unexpected response body'
          };
          lastReason = 'provider-error';

          log.warn('provider returned an unexpected payload', {
            provider,
            category,
            endpoint: hostOf(endpoint.url),
            status: response.status,
            reason: lastReason
          });

          break;
        }

        const places =
          endpoint.kind === 'google'
            ? (Array.isArray(response.data?.places) ? response.data.places : [])
                .map((place) => normalizeGooglePlace(place, category))
                .filter(Boolean)
            : parseOverpassResponse(response.data, category);

        log.info('provider responded', {
          provider,
          category,
          endpoint: hostOf(endpoint.url),
          status: response.status,
          attempts,
          durationMs: response.durationMs,
          count: places.length
        });

        return {
          ok: true,
          places,
          reason: null,
          error: null,
          attempts,
          endpoint: hostOf(endpoint.url),
          durationMs: Date.now() - startedAt
        };
      }

      lastError = response.error;
      lastReason = mapProviderError(response.error);

      log.warn('provider attempt failed', {
        provider,
        category,
        endpoint: hostOf(endpoint.url),
        status: response.status,
        errorType: response.error?.type,
        reason: lastReason,
        attempt,
        attempts,
        durationMs: response.durationMs
      });

      if (lastReason === 'aborted') {
        return {
          ok: false,
          reason: 'aborted',
          error: lastError,
          attempts,
          durationMs: Date.now() - startedAt
        };
      }

      // Only an overloaded / rate-limited endpoint is worth retrying in place.
      if (!isRetryableError(response.error)) break;
      if (attempt >= maxAttemptsPerEndpoint) break;

      const delay = computeDelay({
        attempt,
        baseDelayMs: env.placesRetryBaseDelayMs,
        maxDelayMs: env.placesRetryMaxDelayMs,
        retryAfterMs: response.retryAfterMs,
        random: Math.random
      });

      if (Date.now() + delay >= deadline) break;

      log.info('retrying provider', {
        provider,
        category,
        endpoint: hostOf(endpoint.url),
        attempt,
        delayMs: delay
      });

      await sleep(delay);
    }

    if (attempts >= maxAttempts) break;
  }

  return {
    ok: false,
    reason: lastReason,
    error: lastError,
    attempts,
    durationMs: Date.now() - startedAt
  };
}

/**
 * Searches the configured provider and, in `auto` mode only, falls back to
 * OpenStreetMap when the preferred provider fails transiently. The response
 * always reports the provider that actually produced the data.
 */
async function searchWithFallback({ provider, lat, lng, radius, category, limit, deadline, signal, sleep }) {
  const primary = await searchProvider({
    provider,
    lat,
    lng,
    radius,
    category,
    limit,
    deadline,
    signal,
    sleep
  });

  if (primary.ok) {
    return { ...primary, provider, fallbackUsed: false };
  }

  const canFallback =
    env.placesProvider === 'auto' && provider === 'google' && isRetryableReason(primary.reason);

  if (!canFallback) {
    return { ...primary, provider, fallbackUsed: false };
  }

  log.info('falling back to openstreetmap', {
    provider: 'google',
    category,
    reason: primary.reason,
    attempts: primary.attempts
  });

  const fallback = await searchProvider({
    provider: 'osm',
    lat,
    lng,
    radius,
    category,
    limit,
    deadline,
    signal,
    sleep
  });

  if (fallback.ok) {
    return {
      ...fallback,
      provider: 'osm',
      fallbackUsed: true,
      fallbackFrom: 'google',
      attempts: primary.attempts + fallback.attempts
    };
  }

  return {
    ...primary,
    provider,
    fallbackUsed: false,
    attempts: primary.attempts + fallback.attempts
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function buildCacheKey({ provider, category, reference, radius, limit }) {
  return [
    'places',
    provider,
    category,
    reference.lat.toFixed(3),
    reference.lng.toFixed(3),
    radius,
    limit
  ].join(':');
}

function buildQueryKey({ provider, category, location, destination, radius, limit }) {
  return [
    'places-query',
    provider,
    category,
    String(location || '').trim().toLowerCase(),
    String(destination || '').trim().toLowerCase(),
    radius,
    limit
  ].join(':');
}

function unavailablePayload({
  reason,
  category,
  radius,
  provider,
  reference,
  meta = {}
}) {
  return {
    available: false,
    reason,
    reasonDetail: REASON_MESSAGES[reason] || REASON_MESSAGES['provider-error'],
    retryable: isRetryableReason(reason),
    category,
    radiusMeters: radius,
    provider: provider || null,
    reference: reference || null,
    results: [],
    meta: {
      source: provider || null,
      attribution: null,
      lastChecked: new Date().toISOString(),
      cached: false,
      count: 0,
      ...meta
    }
  };
}

/**
 * Runs `factory` at most once per key while a request is in flight.
 * Concurrent callers (e.g. several category tabs) share one upstream call.
 */
async function withSingleFlight(key, factory) {
  const existing = inFlightRequests.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      return await factory();
    } catch (error) {
      log.error('single-flight request failed', { key, error: error?.message });
      return null;
    }
  })().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Discover places near a reference location.
 *
 * Coordinates may be supplied directly (lat/lng) or resolved from a `location`
 * (specific stop) and/or `destination`. When nothing can be resolved, the
 * function reports `available: false` rather than returning invented results.
 */
async function getNearbyPlaces({
  lat,
  lng,
  location,
  destination,
  category = DEFAULT_CATEGORY,
  radius,
  limit,
  signal
} = {}) {
  const startedAt = Date.now();
  const deadline = startedAt + env.placesRequestBudgetMs;

  const safeCategory = isValidCategory(category) ? category : DEFAULT_CATEGORY;
  const effectiveRadius = clampRadius(radius, safeCategory);
  const effectiveLimit = clampLimit(limit);
  const provider = resolveProvider();

  const resolution = await resolveReference({
    lat,
    lng,
    location,
    destination,
    deadline,
    signal
  });

  if (!resolution.ok) {
    log.warn('location could not be resolved', {
      reason: resolution.reason,
      category: safeCategory,
      durationMs: Date.now() - startedAt
    });

    // If geocoding is down we can still serve a previously cached answer for
    // the same query rather than showing the user an empty section.
    const staleByQuery = provider === 'missing-credentials'
      ? null
      : placesCache.getEntry(
          buildQueryKey({ provider, category: safeCategory, location, destination, radius: effectiveRadius, limit: effectiveLimit }),
          { staleMs: env.cacheTtl.placesStaleMs }
        );

    if (staleByQuery && staleByQuery.value) {
      log.info('serving cached result after geocoding failure', {
        category: safeCategory,
        ageMs: staleByQuery.ageMs
      });
      return {
        ...staleByQuery.value,
        reason: resolution.reason,
        reasonDetail: REASON_MESSAGES[resolution.reason],
        retryable: isRetryableReason(resolution.reason),
        meta: {
          ...staleByQuery.value.meta,
          cached: true,
          stale: true,
          staleAgeMs: staleByQuery.ageMs,
          durationMs: Date.now() - startedAt
        }
      };
    }

    return unavailablePayload({
      reason: resolution.reason,
      category: safeCategory,
      radius: effectiveRadius,
      // A location problem is not a provider problem.
      provider: null,
      meta: { durationMs: Date.now() - startedAt }
    });
  }

  const reference = resolution.reference;

  if (provider === 'missing-credentials') {
    return unavailablePayload({
      reason: 'missing-credentials',
      category: safeCategory,
      radius: effectiveRadius,
      provider,
      reference,
      meta: { durationMs: Date.now() - startedAt }
    });
  }

  const cacheKey = buildCacheKey({
    provider,
    category: safeCategory,
    reference,
    radius: effectiveRadius,
    limit: effectiveLimit
  });
  const queryKey = buildQueryKey({
    provider,
    category: safeCategory,
    location,
    destination,
    radius: effectiveRadius,
    limit: effectiveLimit
  });

  const cached = placesCache.getEntry(cacheKey, { staleMs: env.cacheTtl.placesStaleMs });

  if (cached && !cached.stale) {
    log.info('cache hit', {
      provider,
      category: safeCategory,
      ageMs: cached.ageMs,
      durationMs: Date.now() - startedAt
    });
    return {
      ...cached.value,
      reason: null,
      reasonDetail: null,
      retryable: false,
      meta: {
        ...cached.value.meta,
        cached: true,
        stale: false,
        durationMs: Date.now() - startedAt
      }
    };
  }

  if (cached && cached.stale) {
    log.info('serving stale result while refreshing', {
      provider,
      category: safeCategory,
      ageMs: cached.ageMs
    });

    // Refresh in the background; the user keeps seeing the previous results.
    withSingleFlight(cacheKey, () =>
      runProviderSearch({ provider, reference, category: safeCategory, radius: effectiveRadius, limit: effectiveLimit, deadline, signal, cacheKey, queryKey })
    ).catch(() => {});

    return {
      ...cached.value,
      reason: null,
      reasonDetail: null,
      retryable: false,
      meta: {
        ...cached.value.meta,
        cached: true,
        stale: true,
        staleAgeMs: cached.ageMs,
        durationMs: Date.now() - startedAt
      }
    };
  }

  const result = await withSingleFlight(cacheKey, () =>
    runProviderSearch({ provider, reference, category: safeCategory, radius: effectiveRadius, limit: effectiveLimit, deadline, signal, cacheKey, queryKey })
  );

  return (
    result ||
    unavailablePayload({
      reason: 'provider-error',
      category: safeCategory,
      radius: effectiveRadius,
      provider,
      reference,
      meta: { durationMs: Date.now() - startedAt }
    })
  );
}

/**
 * Performs the provider call, normalizes the results and updates the cache.
 * Failures are never cached, so a transient outage cannot poison the cache.
 */
async function runProviderSearch({
  provider,
  reference,
  category,
  radius,
  limit,
  deadline,
  signal,
  cacheKey,
  queryKey
}) {
  const startedAt = Date.now();

  const search = await searchWithFallback({
    provider,
    lat: reference.lat,
    lng: reference.lng,
    radius,
    category,
    limit,
    deadline,
    signal
  });

  if (!search.ok) {
    log.warn('provider search failed', {
      provider,
      category,
      reason: search.reason,
      attempts: search.attempts,
      durationMs: Date.now() - startedAt
    });

    return unavailablePayload({
      reason: search.reason,
      category,
      radius,
      provider: search.provider || provider,
      reference,
      meta: {
        attempts: search.attempts,
        durationMs: Date.now() - startedAt,
        budgetMs: env.placesRequestBudgetMs
      }
    });
  }

  const decorated = search.places.map((place) => {
    const distanceMeters = haversineMeters(reference, place);
    return {
      ...place,
      distanceMeters: Number.isFinite(distanceMeters) ? Math.round(distanceMeters) : null,
      distance: formatDistance(distanceMeters)
    };
  });

  const results = rankPlaces(dedupePlaces(decorated), radius).slice(0, limit);

  const payload = {
    available: true,
    reason: null,
    reasonDetail: null,
    retryable: false,
    category,
    radiusMeters: radius,
    provider: search.provider,
    reference,
    results,
    meta: {
      source: search.provider,
      attribution: search.provider === 'google' ? GOOGLE_ATTRIBUTION : OSM_ATTRIBUTION,
      lastChecked: new Date().toISOString(),
      cached: false,
      count: results.length,
      hasRatings: results.some((place) => Number.isFinite(place.rating)),
      attempts: search.attempts,
      durationMs: Date.now() - startedAt,
      endpoint: search.endpoint || null,
      fallbackUsed: Boolean(search.fallbackUsed),
      stale: false
    }
  };

  // An empty answer is cached briefly (not for the full TTL) so a transient
  // empty response is re-checked quickly.
  const ttlMs = results.length === 0 ? env.cacheTtl.placesEmptyMs : env.cacheTtl.placesMs;

  placesCache.set(cacheKey, payload, { ttlMs });
  if (queryKey) placesCache.set(queryKey, payload, { ttlMs });

  return payload;
}

module.exports = {
  getNearbyPlaces,
  buildOverpassQuery,
  buildCacheKey,
  buildQueryKey,
  groupFiltersByKey,
  parseOverpassResponse,
  normalizeOverpassElement,
  normalizeGooglePlace,
  dedupePlaces,
  rankPlaces,
  resolveProvider,
  resolveReference,
  mapProviderError,
  clampRadius,
  clampLimit,
  isRetryableReason,
  REASON_MESSAGES,
  PLACE_CATEGORIES,
  DEFAULT_RADIUS_M,
  _placesCache: placesCache,
  _inFlightRequests: inFlightRequests
};
