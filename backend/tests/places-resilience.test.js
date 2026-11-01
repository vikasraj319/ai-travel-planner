process.env.NODE_ENV = 'test';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const env = require('../src/config/env');
const { setFetchImpl } = require('../src/lib/httpClient');
const { _geocodeCache } = require('../src/services/geocodingService');
const {
  getNearbyPlaces,
  buildCacheKey,
  _placesCache,
  _inFlightRequests
} = require('../src/services/nearbyPlacesService');

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

function jsonResponse(status, data, headers = {}) {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => lower[String(key).toLowerCase()] ?? null },
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data))
  };
}

/** A response that never arrives until the request is aborted. */
function hangingResponse() {
  return (url, opts = {}) =>
    new Promise((resolve, reject) => {
      if (opts?.signal?.aborted) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
        return;
      }
      const timer = setTimeout(() => resolve(jsonResponse(200, { elements: [] })), 60_000);
      opts?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
}

const NOMINATIM_GOA = [
  {
    lat: '15.2993',
    lon: '74.124',
    display_name: 'Goa, India',
    name: 'Goa',
    type: 'state',
    importance: 0.82
  }
];

const OVERPASS_OK = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: 15.31,
      lon: 74.12,
      tags: { name: 'Beach Shack', amenity: 'restaurant', 'addr:city': 'Goa' }
    }
  ]
};

const originalEnv = {
  placesProvider: env.placesProvider,
  googlePlacesKey: env.googlePlacesKey,
  overpassUrl: env.overpass.url,
  overpassFallbacks: env.overpass.fallbackUrls,
  requestBudgetMs: env.placesRequestBudgetMs,
  attemptTimeoutMs: env.placesAttemptTimeoutMs,
  maxAttempts: env.placesMaxAttempts,
  retryBaseDelayMs: env.placesRetryBaseDelayMs,
  retryMaxDelayMs: env.placesRetryMaxDelayMs,
  geocodeTimeoutMs: env.geocodeTimeoutMs
};

function useEndpoints(primary = 'https://primary.example/api/interpreter', fallbacks = []) {
  env.overpass.url = primary;
  env.overpass.fallbackUrls = fallbacks;
}

function geocodingOnly(handler) {
  setFetchImpl(async (url, opts) => {
    const target = String(url);
    if (target.includes('nominatim')) return jsonResponse(200, NOMINATIM_GOA);
    return handler(target, opts);
  });
}

beforeEach(() => {
  _geocodeCache.clear();
  _placesCache.clear();
  _inFlightRequests.clear();

  env.placesProvider = 'osm';
  env.googlePlacesKey = '';
  env.placesRequestBudgetMs = 2000;
  env.placesAttemptTimeoutMs = 300;
  env.placesMaxAttempts = 3;
  env.placesRetryBaseDelayMs = 10;
  env.placesRetryMaxDelayMs = 50;
  env.geocodeTimeoutMs = 300;
  useEndpoints();
});

afterEach(() => {
  setFetchImpl(null);
  env.placesProvider = originalEnv.placesProvider;
  env.googlePlacesKey = originalEnv.googlePlacesKey;
  env.overpass.url = originalEnv.overpassUrl;
  env.overpass.fallbackUrls = originalEnv.overpassFallbacks;
  env.placesRequestBudgetMs = originalEnv.requestBudgetMs;
  env.placesAttemptTimeoutMs = originalEnv.attemptTimeoutMs;
  env.placesMaxAttempts = originalEnv.maxAttempts;
  env.placesRetryBaseDelayMs = originalEnv.retryBaseDelayMs;
  env.placesRetryMaxDelayMs = originalEnv.retryMaxDelayMs;
  env.geocodeTimeoutMs = originalEnv.geocodeTimeoutMs;
});

// ---------------------------------------------------------------------------
// Retry / failover policy
// ---------------------------------------------------------------------------

test('a capacity error is retried on the same endpoint with backoff and then succeeds', async () => {
  const hosts = [];
  let overpassCalls = 0;

  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly((target) => {
    hosts.push(new URL(target).host);
    overpassCalls += 1;
    // The first attempt reports "at capacity" (502), the retry succeeds.
    if (overpassCalls === 1) return jsonResponse(502, 'This Overpass API server is currently at capacity.');
    return jsonResponse(200, OVERPASS_OK);
  });

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, true);
  assert.equal(result.results.length, 1);
  assert.equal(overpassCalls, 2);
  assert.deepEqual(hosts, ['primary.example', 'primary.example']);
  assert.equal(result.meta.attempts, 2);
});

test('an unreachable endpoint fails over to the next mirror', async () => {
  const hosts = [];

  useEndpoints('https://primary.example/api/interpreter', [
    'https://mirror.example/api/interpreter'
  ]);

  geocodingOnly((target) => {
    hosts.push(new URL(target).host);
    if (hosts.length === 1) throw new Error('connect ECONNREFUSED');
    return jsonResponse(200, OVERPASS_OK);
  });

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, true);
  assert.deepEqual(hosts, ['primary.example', 'mirror.example']);
  assert.equal(result.meta.endpoint, 'mirror.example');
});

test('a hard 5xx is not retried in place but fails over to the next mirror', async () => {
  const hosts = [];

  useEndpoints('https://primary.example/api/interpreter', [
    'https://mirror.example/api/interpreter'
  ]);

  geocodingOnly((target) => {
    hosts.push(new URL(target).host);
    if (hosts.length === 1) return jsonResponse(500, { remark: 'internal error' });
    return jsonResponse(200, OVERPASS_OK);
  });

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, true);
  assert.deepEqual(hosts, ['primary.example', 'mirror.example']);
});

test('every failing mirror is reported as provider-overloaded for 502', async () => {
  useEndpoints('https://primary.example/api/interpreter', [
    'https://mirror.example/api/interpreter'
  ]);

  geocodingOnly(() => jsonResponse(502, 'at capacity'));

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, false);
  assert.equal(result.reason, 'provider-overloaded');
  assert.equal(result.retryable, true);
  assert.ok(result.reasonDetail);
});

test('a 429 rate limit is retried and reported as rate-limit', async () => {
  let calls = 0;

  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => {
    calls += 1;
    return jsonResponse(429, { remark: 'too many requests' });
  });

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, false);
  assert.equal(result.reason, 'rate-limit');
  assert.equal(result.retryable, true);
  assert.ok(calls >= 2, 'a rate limit must be retried at least once');
});

test('a Retry-After header is respected before the next attempt', async () => {
  let calls = 0;
  const startedAt = Date.now();

  // The server hint is honoured but capped, so the cap has to allow the 1s
  // delay the provider asked for.
  env.placesRetryMaxDelayMs = 1500;
  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => {
    calls += 1;
    if (calls === 1) {
      return jsonResponse(429, { remark: 'slow down' }, { 'retry-after': '1' });
    }
    return jsonResponse(200, OVERPASS_OK);
  });

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  const elapsed = Date.now() - startedAt;

  assert.equal(result.available, true);
  assert.equal(calls, 2);
  assert.ok(elapsed >= 950, `expected the Retry-After delay to be honoured, waited ${elapsed}ms`);
});

test('a malformed provider response is reported as provider-error, not as zero results', async () => {
  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => jsonResponse(200, '<html>not json</html>', { 'content-type': 'text/html' }));

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, false);
  assert.equal(result.reason, 'provider-error');
  assert.equal(result.results.length, 0);
});

test('a provider that returns invalid JSON is reported as provider-error', async () => {
  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => jsonResponse(200, '{"elements": [', { 'content-type': 'application/json' }));

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, false);
  assert.equal(result.reason, 'provider-error');
});

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

test('the total request stays inside the configured budget when every mirror hangs', async () => {
  env.placesRequestBudgetMs = 400;
  env.placesAttemptTimeoutMs = 150;

  useEndpoints('https://primary.example/api/interpreter', [
    'https://mirror1.example/api/interpreter',
    'https://mirror2.example/api/interpreter'
  ]);

  geocodingOnly(hangingResponse());

  const startedAt = Date.now();
  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  const elapsed = Date.now() - startedAt;

  assert.equal(result.available, false);
  assert.ok(['timeout', 'budget-exceeded'].includes(result.reason), `unexpected reason ${result.reason}`);
  assert.ok(elapsed < 1200, `the request must respect the budget, took ${elapsed}ms`);
  assert.ok(result.meta.durationMs < 1200);
});

test('a slow geocoder is reported as geocoding-timeout, not as a provider timeout', async () => {
  env.geocodeTimeoutMs = 100;

  useEndpoints('https://primary.example/api/interpreter');

  setFetchImpl(async (url, opts) => {
    if (String(url).includes('nominatim')) return hangingResponse()(url, opts);
    return jsonResponse(200, OVERPASS_OK);
  });

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, false);
  assert.equal(result.reason, 'geocoding-timeout');
  assert.equal(result.retryable, true);
});

test('a client disconnect cancels the upstream provider request', async () => {
  const controller = new AbortController();

  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly((target, opts) => {
    // The client goes away while the provider request is in flight.
    controller.abort();
    return hangingResponse()(target, opts);
  });

  const result = await getNearbyPlaces({
    destination: 'Goa',
    category: 'eat',
    signal: controller.signal
  });

  assert.equal(result.available, false);
  assert.equal(result.reason, 'aborted');
  // A cancelled request is not worth retrying.
  assert.equal(result.retryable, false);
});

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

test('a repeated identical request is served from the cache without hitting the provider', async () => {
  let overpassCalls = 0;

  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => {
    overpassCalls += 1;
    return jsonResponse(200, OVERPASS_OK);
  });

  const first = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  const second = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(first.available, true);
  assert.equal(second.available, true);
  assert.equal(overpassCalls, 1);
  assert.equal(second.meta.cached, true);
});

test('a failure is never cached', async () => {
  let overpassCalls = 0;

  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => {
    overpassCalls += 1;
    return jsonResponse(500, { remark: 'boom' });
  });

  const failed = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  assert.equal(failed.available, false);

  // A second request must reach the provider again instead of replaying the
  // cached failure.
  const again = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  assert.equal(again.available, false);
  assert.ok(overpassCalls >= 2, `the provider must be called again, calls=${overpassCalls}`);
});

test('an empty but successful result is returned as available with zero results', async () => {
  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => jsonResponse(200, { elements: [] }));

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, true);
  assert.equal(result.results.length, 0);
  assert.equal(result.meta.count, 0);
});

test('a stale entry is served while it is refreshed in the background', async () => {
  let overpassCalls = 0;

  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => {
    overpassCalls += 1;
    return jsonResponse(200, OVERPASS_OK);
  });

  const first = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  assert.equal(first.available, true);
  assert.equal(overpassCalls, 1);

  // Force the entry past its TTL while keeping it inside the stale window.
  const key = buildCacheKey({
    provider: 'osm',
    category: 'eat',
    reference: { lat: 15.2993, lng: 74.124 },
    radius: 2000,
    limit: 8
  });
  _placesCache.set(key, first, { ttlMs: 1 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const stale = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(stale.available, true);
  assert.equal(stale.meta.stale, true);
  assert.ok(stale.meta.staleAgeMs >= 0);

  // The background refresh runs after the response was produced.
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(overpassCalls >= 2, `the stale entry must be refreshed, calls=${overpassCalls}`);
});

test('concurrent identical requests collapse into a single provider call', async () => {
  let overpassCalls = 0;

  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => {
    overpassCalls += 1;
    return jsonResponse(200, OVERPASS_OK);
  });

  const results = await Promise.all([
    getNearbyPlaces({ destination: 'Goa', category: 'eat' }),
    getNearbyPlaces({ destination: 'Goa', category: 'eat' }),
    getNearbyPlaces({ destination: 'Goa', category: 'eat' })
  ]);

  for (const result of results) {
    assert.equal(result.available, true);
    assert.equal(result.results.length, 1);
  }

  assert.equal(overpassCalls, 1, `expected a single provider call, got ${overpassCalls}`);
});

// ---------------------------------------------------------------------------
// Categories, credentials and payload shape
// ---------------------------------------------------------------------------

test('all four discovery categories return results', async () => {
  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly((target, opts) => {
    const body = decodeURIComponent(String(opts?.body || ''));
    // The optimised query must group the category filters by key.
    assert.match(body, /node\["/);
    assert.doesNotMatch(body, /\(\?:/);
    return jsonResponse(200, OVERPASS_OK);
  });

  for (const category of ['stay', 'eat', 'facilities', 'explore']) {
    const result = await getNearbyPlaces({ destination: 'Goa', category });
    assert.equal(result.available, true, `${category} should be available`);
    assert.equal(result.category, category);
    assert.equal(result.results.length, 1);
  }
});

test('Google Places without a key is reported as missing-credentials', async () => {
  env.placesProvider = 'google';
  env.googlePlacesKey = '';

  setFetchImpl(async (url) => {
    if (String(url).includes('nominatim')) return jsonResponse(200, NOMINATIM_GOA);
    throw new Error(`Unexpected fetch: ${url}`);
  });

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'stay' });

  assert.equal(result.available, false);
  assert.equal(result.reason, 'missing-credentials');
  assert.equal(result.retryable, false);
});

test('an unavailable result carries a safe message and a retry hint', async () => {
  useEndpoints('https://primary.example/api/interpreter');

  geocodingOnly(() => jsonResponse(502, 'at capacity'));

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });

  assert.equal(result.available, false);
  assert.equal(typeof result.reasonDetail, 'string');
  assert.ok(result.reasonDetail.length > 0);
  assert.equal(result.retryable, true);
  // No raw provider payload may leak into the response.
  assert.equal(result.results.length, 0);
  assert.equal(result.meta.attribution, null);
});
