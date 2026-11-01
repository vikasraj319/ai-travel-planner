process.env.NODE_ENV = 'test';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const env = require('../src/config/env');
const { setFetchImpl } = require('../src/lib/httpClient');
const { _geocodeCache } = require('../src/services/geocodingService');
const {
  getNearbyPlaces,
  buildOverpassQuery,
  parseOverpassResponse,
  normalizeGooglePlace,
  normalizeOverpassElement,
  dedupePlaces,
  rankPlaces,
  resolveProvider,
  clampRadius,
  clampLimit,
  _placesCache
} = require('../src/services/nearbyPlacesService');

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

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

const OVERPASS_TWO_PLACES = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: 15.31,
      lon: 74.12,
      tags: {
        name: 'Beach Shack',
        amenity: 'restaurant',
        'addr:street': 'Beach Road',
        'addr:city': 'Goa',
        website: 'https://example.com/beach-shack',
        phone: '+91 90000 00000',
        opening_hours: 'Mo-Su 10:00-22:00'
      }
    },
    {
      type: 'way',
      id: 2,
      center: { lat: 15.305, lon: 74.126 },
      tags: { name: 'Cafe Mambo', amenity: 'cafe' }
    },
    // Missing name -> skipped
    { type: 'node', id: 3, lat: 15.33, lon: 74.14, tags: { amenity: 'restaurant' } },
    // Missing coordinates -> skipped
    { type: 'node', id: 4, tags: { name: 'Nowhere Cafe', amenity: 'cafe' } }
  ]
};

beforeEach(() => {
  _geocodeCache.clear();
  _placesCache.clear();
});

afterEach(() => {
  setFetchImpl(null);
  env.placesProvider = 'auto';
  env.googlePlacesKey = '';
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test('buildOverpassQuery includes the around clause and category filters', () => {
  const query = buildOverpassQuery({
    lat: 15.3,
    lng: 74.1,
    radius: 2000,
    filters: ['amenity=restaurant', 'amenity=cafe']
  });

  assert.match(query, /around:2000,15\.3,74\.1/);
  // Filters are grouped by key into a single value-regex clause per key and
  // element type, which keeps the number of spatial scans proportional to the
  // number of distinct keys instead of the number of filters.
  // The regex uses POSIX ERE syntax (no non-capturing groups), which is what
  // Overpass implements.
  assert.match(query, /node\["amenity"~"\^\(restaurant\|cafe\)\$"\]/);
  assert.match(query, /way\["amenity"~"\^\(restaurant\|cafe\)\$"\]/);
  assert.doesNotMatch(query, /\(\?:/);
  assert.match(query, /out center tags/);
});

test('buildOverpassQuery groups filters by key instead of one clause per filter', () => {
  const query = buildOverpassQuery({
    lat: 15.3,
    lng: 74.1,
    radius: 3000,
    filters: [
      'amenity=hospital',
      'amenity=clinic',
      'amenity=pharmacy',
      'amenity=atm',
      'amenity=bank',
      'amenity=police',
      'amenity=fuel',
      'amenity=charging_station',
      'amenity=parking',
      'amenity=toilets',
      'amenity=post_office',
      'amenity=bus_station',
      'railway=station',
      'amenity=taxi',
      'information=tourist'
    ]
  });

  // 15 filters collapse into 3 keys x 2 element types = 6 clauses.
  const clauses = query.match(/node\[|way\[/g) || [];
  assert.equal(clauses.length, 6);
  assert.match(query, /node\["amenity"~"\^\(hospital\|clinic\|/);
  assert.match(query, /way\["railway"~"\^\(station\)\$"\]/);
  assert.match(query, /node\["information"~"\^\(tourist\)\$"\]/);
});

test('buildOverpassQuery returns null when the category has no filters', () => {
  assert.equal(buildOverpassQuery({ lat: 1, lng: 2, radius: 100, filters: [] }), null);
});

test('parseOverpassResponse normalizes valid elements and skips incomplete ones', () => {
  const places = parseOverpassResponse(OVERPASS_TWO_PLACES, 'eat');

  assert.equal(places.length, 2);
  assert.equal(places[0].id, 'osm:node/1');
  assert.equal(places[0].name, 'Beach Shack');
  assert.equal(places[0].website, 'https://example.com/beach-shack');
  assert.equal(places[0].address, 'Beach Road, Goa');
  // OpenStreetMap carries no ratings: they must be honestly absent.
  assert.equal(places[0].rating, null);
  assert.equal(places[0].reviewCount, null);
});

test('normalizeOverpassElement rejects elements without coordinates', () => {
  assert.equal(normalizeOverpassElement({ type: 'node', id: 9, tags: { name: 'X' } }, 'eat'), null);
});

test('geocoder normalization rejects empty coordinates instead of returning (0,0)', () => {
  const { normalizeNominatimResult } = require('../src/services/geocodingService');

  assert.equal(normalizeNominatimResult({ lat: '', lon: '', display_name: 'Nowhere' }), null);
  assert.equal(normalizeNominatimResult({ display_name: 'Nowhere' }), null);

  const valid = normalizeNominatimResult({ lat: '15.2993', lon: '74.124', display_name: 'Goa, India' });
  assert.equal(valid.lat, 15.2993);
  assert.equal(valid.lng, 74.124);
});

test('normalizeGooglePlace maps provider rating, review count and price level', () => {
  const place = normalizeGooglePlace(
    {
      id: 'abc123',
      displayName: { text: 'Sea View Hotel' },
      formattedAddress: '1 Marine Drive, Goa',
      location: { latitude: 15.31, longitude: 74.12 },
      rating: 4.6,
      userRatingCount: 1240,
      priceLevel: 'PRICE_LEVEL_MODERATE',
      regularOpeningHours: { openNow: true, weekdayDescriptions: ['Monday: 9AM-9PM'] },
      websiteUri: 'https://seaview.example',
      nationalPhoneNumber: '+91 12345',
      googleMapsUri: 'https://maps.google.com/?cid=abc123',
      types: ['hotel']
    },
    'stay'
  );

  assert.equal(place.id, 'google:abc123');
  assert.equal(place.rating, 4.6);
  assert.equal(place.reviewCount, 1240);
  assert.equal(place.ratingScale, 5);
  assert.equal(place.priceLevel, 2);
  assert.equal(place.openNow, true);
  assert.equal(place.attribution, 'Google Places');
});

test('normalizeGooglePlace omits ratings when the provider supplies none', () => {
  const place = normalizeGooglePlace(
    {
      id: 'no-rating',
      displayName: { text: 'Corner Store' },
      location: { latitude: 15.3, longitude: 74.1 },
      types: ['store']
    },
    'facilities'
  );

  assert.equal(place.rating, null);
  assert.equal(place.reviewCount, null);
  assert.equal(place.ratingScale, null);
});

test('dedupePlaces removes same-name places within 60m but keeps distant ones', () => {
  const base = { provider: 'osm', category: 'eat' };
  const places = [
    { ...base, id: 'osm:node/1', name: 'Cafe Mambo', lat: 15.3, lng: 74.1 },
    { ...base, id: 'osm:node/2', name: 'Cafe Mambo', lat: 15.3001, lng: 74.1001 },
    { ...base, id: 'osm:node/3', name: 'Cafe Mambo', lat: 15.4, lng: 74.2 }
  ];

  const deduped = dedupePlaces(places);
  assert.equal(deduped.length, 2);
  assert.deepEqual(deduped.map((place) => place.id), ['osm:node/1', 'osm:node/3']);
});

test('rankPlaces prefers nearer, better-rated, more complete places', () => {
  const ranked = rankPlaces(
    [
      { id: 'far', rating: 5, ratingScale: 5, distanceMeters: 1900 },
      { id: 'near', rating: 4.5, ratingScale: 5, reviewCount: 500, distanceMeters: 200, website: 'https://x' }
    ],
    2000
  );

  assert.equal(ranked[0].id, 'near');
});

test('clampRadius and clampLimit enforce sane bounds', () => {
  assert.equal(clampRadius(-5, 'eat'), 2000);
  assert.equal(clampRadius(999999, 'eat'), 50000);
  assert.equal(clampRadius(1500, 'eat'), 1500);
  assert.equal(clampLimit(0), 8);
  assert.equal(clampLimit(999), 20);
});

// ---------------------------------------------------------------------------
// OpenStreetMap provider (no API key required)
// ---------------------------------------------------------------------------

test('getNearbyPlaces returns geographically relevant OSM results without ratings', async () => {
  env.placesProvider = 'osm';

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM_GOA) },
      { match: 'overpass', handler: jsonResponse(200, OVERPASS_TWO_PLACES) }
    ])
  );

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat', radius: 2000 });

  assert.equal(result.available, true);
  assert.equal(result.provider, 'osm');
  assert.equal(result.results.length, 2);
  assert.ok(result.reference.lat > 15 && result.reference.lat < 16);

  for (const place of result.results) {
    assert.ok(place.distanceMeters >= 0);
    assert.ok(typeof place.distance === 'string');
    assert.ok(place.distanceMeters <= result.radiusMeters);
    assert.equal(place.rating, null);
  }

  // Nearest place must rank first.
  const distances = result.results.map((place) => place.distanceMeters);
  assert.deepEqual(distances, [...distances].sort((a, b) => a - b));
  assert.equal(result.meta.hasRatings, false);
  assert.match(result.meta.attribution, /OpenStreetMap/);
});

test('getNearbyPlaces geocodes the destination when lat/lng are null (not 0,0)', async () => {
  env.placesProvider = 'osm';

  let geocoded = false;
  let overpassBody = '';

  setFetchImpl(
    routeFetch([
      {
        match: 'nominatim',
        handler: () => {
          geocoded = true;
          return jsonResponse(200, NOMINATIM_GOA);
        }
      },
      {
        match: 'overpass',
        handler: (url, opts) => {
          overpassBody = String(opts?.body || '');
          return jsonResponse(200, OVERPASS_TWO_PLACES);
        }
      }
    ])
  );

  // The HTTP validator passes null (not undefined) for absent coordinates;
  // Number(null) === 0 must not be treated as an explicit (0, 0) request.
  const result = await getNearbyPlaces({ lat: null, lng: null, destination: 'Goa', category: 'eat' });

  assert.equal(geocoded, true, 'destination should be geocoded');
  assert.equal(result.available, true);
  assert.equal(result.reference.source, 'geocode');
  assert.ok(result.reference.lat > 15 && result.reference.lat < 16);
  assert.ok(result.reference.lng > 73 && result.reference.lng < 75);
  // The Overpass query must search around the geocoded location, not (0,0).
  assert.doesNotMatch(overpassBody, /around:\d+,0,0/);
  assert.match(decodeURIComponent(overpassBody), /around:\d+,15\./);
  assert.equal(result.results.length, 2);
});

test('getNearbyPlaces honours explicit coordinates even when a destination is given', async () => {
  env.placesProvider = 'osm';

  let geocoded = false;

  setFetchImpl(
    routeFetch([
      {
        match: 'nominatim',
        handler: () => {
          geocoded = true;
          return jsonResponse(200, NOMINATIM_GOA);
        }
      },
      { match: 'overpass', handler: jsonResponse(200, OVERPASS_TWO_PLACES) }
    ])
  );

  const result = await getNearbyPlaces({ lat: 15.5, lng: 73.8, destination: 'Goa', category: 'eat' });

  assert.equal(geocoded, false, 'explicit coordinates must skip geocoding');
  assert.equal(result.reference.source, 'coordinates');
  assert.equal(result.reference.lat, 15.5);
  assert.equal(result.reference.lng, 73.8);
});

test('getNearbyPlaces reports unavailable when no location or coordinates are supplied', async () => {
  env.placesProvider = 'osm';
  setFetchImpl(routeFetch([]));

  const result = await getNearbyPlaces({ category: 'eat' });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'location-unresolved');
  assert.deepEqual(result.results, []);
});

test('getNearbyPlaces reports unavailable when geocoding finds nothing', async () => {
  env.placesProvider = 'osm';
  setFetchImpl(routeFetch([{ match: 'nominatim', handler: jsonResponse(200, []) }]));

  const result = await getNearbyPlaces({ destination: 'Nowhereville', category: 'eat' });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'location-unresolved');
  // A location problem is not a provider problem.
  assert.equal(result.provider, null);
});

test('getNearbyPlaces surfaces a provider timeout without throwing', async () => {
  env.placesProvider = 'osm';

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM_GOA) },
      {
        match: 'overpass',
        handler: async () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          throw error;
        }
      }
    ])
  );

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'timeout');
});

test('getNearbyPlaces surfaces a provider rate limit', async () => {
  env.placesProvider = 'osm';

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM_GOA) },
      { match: 'overpass', handler: jsonResponse(429, { remark: 'too many requests' }) }
    ])
  );

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'eat' });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'rate-limit');
});

// ---------------------------------------------------------------------------
// Google Places provider (optional, supplies ratings)
// ---------------------------------------------------------------------------

const GOOGLE_NEARBY = {
  places: [
    {
      id: 'hotel-1',
      displayName: { text: 'Ocean Pearl Resort' },
      formattedAddress: 'Candolim, Goa',
      location: { latitude: 15.305, longitude: 74.125 },
      rating: 4.4,
      userRatingCount: 812,
      priceLevel: 'PRICE_LEVEL_EXPENSIVE',
      regularOpeningHours: { openNow: true },
      websiteUri: 'https://oceanpearl.example',
      googleMapsUri: 'https://maps.google.com/?cid=hotel1',
      types: ['hotel']
    }
  ]
};

test('resolveProvider returns missing-credentials for google without a key', () => {
  env.placesProvider = 'google';
  env.googlePlacesKey = '';
  assert.equal(resolveProvider(), 'missing-credentials');
});

test('getNearbyPlaces uses Google Places ratings tied to the provider place id', async () => {
  env.placesProvider = 'google';
  env.googlePlacesKey = 'test-key';

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, NOMINATIM_GOA) },
      { match: 'places.googleapis.com', handler: jsonResponse(200, GOOGLE_NEARBY) }
    ])
  );

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'stay' });

  assert.equal(result.available, true);
  assert.equal(result.provider, 'google');
  assert.equal(result.results.length, 1);

  const place = result.results[0];
  assert.equal(place.id, 'google:hotel-1');
  assert.equal(place.rating, 4.4);
  assert.equal(place.reviewCount, 812);
  assert.equal(place.ratingScale, 5);
  assert.equal(place.priceLevel, 3);
  assert.equal(result.meta.hasRatings, true);
});

test('getNearbyPlaces reports missing-credentials when Google is requested without a key', async () => {
  env.placesProvider = 'google';
  env.googlePlacesKey = '';
  setFetchImpl(routeFetch([{ match: 'nominatim', handler: jsonResponse(200, NOMINATIM_GOA) }]));

  const result = await getNearbyPlaces({ destination: 'Goa', category: 'stay' });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'missing-credentials');
});
