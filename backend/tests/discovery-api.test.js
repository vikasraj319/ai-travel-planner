process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
// Force the AI fallback path so no real provider network call is attempted.
process.env.GEMINI_API_KEY = '';

const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const env = require('../src/config/env');
const { setFetchImpl } = require('../src/lib/httpClient');
const { _geocodeCache } = require('../src/services/geocodingService');
const { _placesCache } = require('../src/services/nearbyPlacesService');
const { _eventsCache } = require('../src/services/eventsService');

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

function jsonResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => (key.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => JSON.stringify(data)
  };
}

function routeFetch(routes) {
  return async (url, opts = {}) => {
    const target = String(url);
    for (const route of routes) {
      if (target.includes(route.match)) {
        return typeof route.handler === 'function' ? route.handler(target, opts) : route.handler;
      }
    }
    throw new Error(`Unexpected fetch in test: ${target}`);
  };
}

const NOMINATIM = [
  { lat: '15.2993', lon: '74.124', display_name: 'Goa, India', name: 'Goa', type: 'state' }
];

const OVERPASS = {
  elements: [
    { type: 'node', id: 1, lat: 15.31, lon: 74.12, tags: { name: 'Beach Shack', amenity: 'restaurant' } }
  ]
};

const TICKETMASTER = {
  _embedded: {
    events: [
      {
        id: 'evt-1',
        name: 'Goa Music Festival',
        url: 'https://www.ticketmaster.com/evt-1',
        dates: { start: { localDate: '2027-05-02' }, status: { code: 'onsale' } },
        _embedded: { venues: [{ name: 'Beach Arena', location: { latitude: '15.31', longitude: '74.12' } }] }
      }
    ]
  }
};

beforeEach(() => {
  _geocodeCache.clear();
  _placesCache.clear();
  _eventsCache.clear();
  env.placesProvider = 'osm';
  env.googlePlacesKey = '';
  env.ticketmasterKey = 'test-key';
  env.eventsProvider = 'auto';
});

afterEach(() => {
  setFetchImpl(null);
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('GET /api/places/nearby without any location returns 400', async () => {
  const { status, body } = await request('/api/places/nearby');
  assert.equal(status, 400);
  assert.equal(body.success, false);
});

test('GET /api/places/nearby rejects invalid coordinates', async () => {
  const { status } = await request('/api/places/nearby?lat=999&lng=0');
  assert.equal(status, 400);
});

test('GET /api/places/nearby rejects an out-of-range radius', async () => {
  const { status } = await request('/api/places/nearby?destination=Goa&radius=5');
  assert.equal(status, 400);
});

test('GET /api/places/nearby rejects an unknown category', async () => {
  const { status } = await request('/api/places/nearby?destination=Goa&category=bogus');
  assert.equal(status, 400);
});

test('GET /api/events without any location returns 400', async () => {
  const { status, body } = await request('/api/events');
  assert.equal(status, 400);
  assert.equal(body.success, false);
});

test('GET /api/events rejects an invalid date', async () => {
  const { status } = await request('/api/events?destination=Goa&startDate=2026-13-40');
  assert.equal(status, 400);
});

// ---------------------------------------------------------------------------
// Happy paths (mocked providers)
// ---------------------------------------------------------------------------

test('GET /api/places/nearby returns normalized, located results', async () => {
  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM) },
      { match: 'overpass', handler: jsonResponse(200, OVERPASS) }
    ])
  );

  const { status, body } = await request('/api/places/nearby?destination=Goa&category=eat');

  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.available, true);
  assert.equal(body.data.provider, 'osm');
  assert.equal(body.data.results.length, 1);
  assert.equal(body.data.results[0].name, 'Beach Shack');
  assert.ok(body.data.results[0].distance);
  // No secrets or raw provider payloads leaked to the client.
  assert.equal(body.data.results[0].rating, null);
});

test('GET /api/places/nearby geocodes the destination instead of searching (0,0)', async () => {
  const upstream = [];

  setFetchImpl(async (url, opts = {}) => {
    const target = String(url);
    upstream.push(target);
    if (target.includes('nominatim')) return jsonResponse(200, NOMINATIM);
    if (target.includes('overpass')) {
      // The query body must reference the geocoded coordinates, not (0,0).
      const body = decodeURIComponent(String(opts.body || ''));
      assert.match(body, /around:\d+,15\./);
      assert.doesNotMatch(body, /around:\d+,0,0/);
      return jsonResponse(200, OVERPASS);
    }
    throw new Error(`Unexpected fetch: ${target}`);
  });

  const { status, body } = await request('/api/places/nearby?category=eat&limit=6&destination=Goa');

  assert.equal(status, 200);
  assert.equal(body.data.available, true);
  assert.equal(body.data.results.length, 1);
  assert.equal(body.data.reference.source, 'geocode');
  assert.ok(upstream.some((url) => url.includes('nominatim')), 'nominatim must be queried');
  assert.ok(upstream.some((url) => url.includes('overpass')), 'overpass must be queried');
  // The reference must not be the (0,0) sentinel.
  assert.ok(body.data.reference.lat !== 0 || body.data.reference.lng !== 0);
});

test('GET /api/places/nearby sends an identifying User-Agent to Overpass', async () => {
  let overpassHeaders = null;

  setFetchImpl(async (url, opts = {}) => {
    const target = String(url);
    if (target.includes('nominatim')) return jsonResponse(200, NOMINATIM);
    if (target.includes('api/interpreter')) {
      overpassHeaders = opts.headers || {};
      return jsonResponse(200, OVERPASS);
    }
    throw new Error(`Unexpected fetch: ${target}`);
  });

  const { body } = await request('/api/places/nearby?destination=Goa&category=eat');

  assert.equal(body.data.available, true);
  assert.ok(overpassHeaders, 'overpass must be called');
  assert.ok(
    typeof overpassHeaders['User-Agent'] === 'string' && overpassHeaders['User-Agent'].trim().length > 0,
    'a non-empty User-Agent is required by Overpass mirrors'
  );
});

test('GET /api/places/nearby fails over to a mirror when the primary Overpass endpoint errors', async () => {
  const overpassHosts = [];
  const originalUrl = env.overpass.url;
  const originalFallbacks = env.overpass.fallbackUrls;

  env.overpass.url = 'https://primary.example/api/interpreter';
  env.overpass.fallbackUrls = ['https://overpass.kumi.systems/api/interpreter'];

  try {
    setFetchImpl(async (url, opts = {}) => {
      const target = String(url);
      if (target.includes('nominatim')) return jsonResponse(200, NOMINATIM);
      if (target.includes('api/interpreter') || target.includes('overpass')) {
        overpassHosts.push(new URL(target).host);
        // Fail the first Overpass host, succeed on the mirror.
        if (overpassHosts.length === 1) return jsonResponse(500, { remark: 'down' });
        return jsonResponse(200, OVERPASS);
      }
      throw new Error(`Unexpected fetch: ${target}`);
    });

    const { body } = await request('/api/places/nearby?destination=Goa&category=eat');

    assert.equal(body.data.available, true);
    assert.equal(body.data.results.length, 1);
    assert.deepEqual(overpassHosts, ['primary.example', 'overpass.kumi.systems']);
  } finally {
    env.overpass.url = originalUrl;
    env.overpass.fallbackUrls = originalFallbacks;
  }
});

test('GET /api/events returns events matched to the trip dates', async () => {
  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM) },
      { match: 'ticketmaster', handler: jsonResponse(200, TICKETMASTER) }
    ])
  );

  const { status, body } = await request(
    '/api/events?destination=Goa&startDate=2027-05-01&endDate=2027-05-05'
  );

  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.available, true);
  assert.equal(body.data.events.length, 1);
  assert.equal(body.data.events[0].classification, 'confirmed');
});

test('nearby discovery and events discovery work independently', async () => {
  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM) },
      { match: 'overpass', handler: jsonResponse(200, OVERPASS) },
      { match: 'ticketmaster', handler: jsonResponse(200, TICKETMASTER) }
    ])
  );

  const places = await request('/api/places/nearby?destination=Goa&category=eat');
  const events = await request('/api/events?destination=Goa&startDate=2027-05-01&endDate=2027-05-05');

  assert.equal(places.body.data.available, true);
  assert.equal(events.body.data.available, true);
});

// ---------------------------------------------------------------------------
// Graceful degradation
// ---------------------------------------------------------------------------

test('an external provider failure is reported without crashing the endpoint', async () => {
  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM) },
      {
        match: 'overpass',
        handler: async () => {
          throw new Error('ECONNRESET');
        }
      }
    ])
  );

  const { status, body } = await request('/api/places/nearby?destination=Goa&category=eat');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.available, false);
  assert.equal(body.data.reason, 'provider-unavailable');
  assert.deepEqual(body.data.results, []);
});

test('missing event credentials degrade gracefully instead of failing', async () => {
  env.ticketmasterKey = '';
  setFetchImpl(routeFetch([]));

  const { status, body } = await request('/api/events?destination=Goa');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.available, false);
  assert.equal(body.data.reason, 'missing-credentials');
});

test('travel-plan generation does not depend on the discovery providers', async () => {
  // No fetch routes: any discovery call would throw, but /api/travel-plan must
  // not depend on them.
  setFetchImpl(routeFetch([]));

  const { status, body } = await request('/api/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Trip to Goa for 3 days' })
  });

  // The AI is disabled in this test file, so the endpoint reports the provider
  // failure instead of answering with an empty plan. Reaching this point at
  // all proves no discovery provider was contacted.
  assert.equal(status, 503);
  assert.equal(body.success, false);
  assert.match(body.message, /try again/i);
});
