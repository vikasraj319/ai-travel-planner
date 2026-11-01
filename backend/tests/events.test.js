process.env.NODE_ENV = 'test';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const env = require('../src/config/env');
const { setFetchImpl } = require('../src/lib/httpClient');
const { _geocodeCache } = require('../src/services/geocodingService');
const {
  getEvents,
  buildQueryWindow,
  classifyEvent,
  isOverlapping,
  normalizeTicketmasterEvent,
  dedupeEvents,
  stripHtml,
  _eventsCache
} = require('../src/services/eventsService');

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

function nominatim(lat, lng, name) {
  return [{ lat: String(lat), lon: String(lng), display_name: `${name}, India`, name, type: 'city' }];
}

const TM_EVENTS = {
  _embedded: {
    events: [
      {
        id: 'evt-1',
        name: 'Goa Music Festival',
        url: 'https://www.ticketmaster.com/evt-1',
        info: '<p>A <b>live</b> music festival</p>',
        dates: {
          start: { localDate: '2026-05-02', localTime: '18:00:00', dateTime: '2026-05-02T18:00:00Z' },
          end: { localDate: '2026-05-03' },
          timezone: 'Asia/Kolkata',
          status: { code: 'onsale' }
        },
        classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }],
        priceRanges: [{ min: 50, max: 200, currency: 'USD' }],
        promoter: { name: 'Goa Events Co' },
        _embedded: {
          venues: [
            {
              name: 'Beach Arena',
              address: { line1: 'Beach Road' },
              city: { name: 'Goa' },
              country: { name: 'India' },
              location: { latitude: '15.31', longitude: '74.12' },
              url: 'https://venue.example'
            }
          ]
        }
      },
      {
        id: 'evt-2',
        name: 'Long Past Show',
        dates: { start: { localDate: '2020-01-01' }, status: { code: 'offsale' } },
        _embedded: { venues: [{ name: 'Old Hall', location: { latitude: '15.3', longitude: '74.1' } }] }
      },
      {
        id: 'evt-3',
        name: 'Next Year Festival',
        dates: { start: { localDate: '2027-01-01' }, status: { code: 'onsale' } },
        _embedded: { venues: [{ name: 'Far Ground', location: { latitude: '15.4', longitude: '74.2' } }] }
      }
    ]
  }
};

const NOW = new Date('2026-04-01T00:00:00Z');
const TRIP = { startDate: '2026-05-01', endDate: '2026-05-05' };

beforeEach(() => {
  _geocodeCache.clear();
  _eventsCache.clear();
});

afterEach(() => {
  setFetchImpl(null);
  env.eventsProvider = 'auto';
  env.ticketmasterKey = '';
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test('buildQueryWindow uses the trip dates when provided', () => {
  const window = buildQueryWindow({ startDate: '2026-05-01', endDate: '2026-05-05', now: NOW });
  assert.equal(window.hasTripDates, true);
  assert.equal(window.queryStart, '2026-05-01');
  assert.equal(window.queryEnd, '2026-05-05');
});

test('buildQueryWindow falls back to an upcoming window when dates are missing', () => {
  const window = buildQueryWindow({ now: NOW });
  assert.equal(window.hasTripDates, false);
  assert.equal(window.queryStart, '2026-04-01');
  assert.equal(window.queryEnd, '2026-05-01');
});

test('buildQueryWindow accepts a start date without an end date', () => {
  const window = buildQueryWindow({ startDate: '2026-05-01', now: NOW });
  assert.equal(window.hasTripDates, true);
  assert.equal(window.queryStart, '2026-05-01');
  assert.equal(window.queryEnd, '2026-05-01');
});

test('isOverlapping compares date ranges inclusively', () => {
  assert.equal(isOverlapping('2026-05-02', '2026-05-03', '2026-05-01', '2026-05-05'), true);
  assert.equal(isOverlapping('2026-04-28', '2026-04-30', '2026-05-01', '2026-05-05'), false);
  assert.equal(isOverlapping('2026-05-05', '2026-05-06', '2026-05-01', '2026-05-05'), true);
});

test('classifyEvent distinguishes confirmed, tentative, past and outside-trip', () => {
  const window = buildQueryWindow({ ...TRIP, now: NOW });

  assert.equal(
    classifyEvent({ startDate: '2026-05-02', endDate: '2026-05-02' }, window, NOW).classification,
    'confirmed'
  );
  assert.equal(
    classifyEvent({ startDate: '2026-05-02', dateTBD: true }, window, NOW).classification,
    'tentative'
  );
  assert.equal(
    classifyEvent({ startDate: '2020-01-01' }, window, NOW).classification,
    'past'
  );
  assert.equal(
    classifyEvent({ startDate: '2027-01-01' }, window, NOW).classification,
    'outside-trip'
  );
});

test('classifyEvent never marks an unconfirmed (TBD) recurring date as confirmed without trip dates', () => {
  const window = buildQueryWindow({ now: NOW });
  const result = classifyEvent({ startDate: '2026-06-01', dateTBD: true, name: 'Annual Festival' }, window, NOW);
  assert.equal(result.classification, 'tentative');
});

test('stripHtml removes markup and entities from provider text', () => {
  assert.equal(stripHtml('<p>A <b>live</b>&nbsp;show &amp; more</p>'), 'A live show & more');
  assert.equal(stripHtml(null), null);
});

test('normalizeTicketmasterEvent maps provider fields and computes distance', () => {
  const raw = TM_EVENTS._embedded.events[0];
  const event = normalizeTicketmasterEvent(raw, { lat: 15.2993, lng: 74.124 });

  assert.equal(event.id, 'ticketmaster:evt-1');
  assert.equal(event.name, 'Goa Music Festival');
  assert.equal(event.category, 'Rock');
  assert.equal(event.description, 'A live music festival');
  assert.equal(event.startDate, '2026-05-02');
  assert.equal(event.endDate, '2026-05-03');
  assert.equal(event.startTime, '18:00:00');
  assert.equal(event.timezone, 'Asia/Kolkata');
  assert.equal(event.venue, 'Beach Arena');
  assert.equal(event.priceMin, 50);
  assert.equal(event.priceMax, 200);
  assert.equal(event.currency, 'USD');
  assert.equal(event.ticketUrl, 'https://www.ticketmaster.com/evt-1');
  assert.ok(event.distanceMeters >= 0);
});

test('normalizeTicketmasterEvent returns null for malformed input', () => {
  assert.equal(normalizeTicketmasterEvent(null, null), null);
  assert.equal(normalizeTicketmasterEvent({ name: 'no id' }, null), null);
});

test('dedupeEvents keeps the first occurrence per provider id', () => {
  const deduped = dedupeEvents([
    { id: 'a', name: 'One' },
    { id: 'a', name: 'Duplicate' },
    { id: 'b', name: 'Two' }
  ]);
  assert.deepEqual(deduped.map((event) => event.id), ['a', 'b']);
});

// ---------------------------------------------------------------------------
// Service integration (mocked provider)
// ---------------------------------------------------------------------------

test('getEvents returns only events overlapping the trip and excludes past events', async () => {
  env.eventsProvider = 'auto';
  env.ticketmasterKey = 'test-key';

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, nominatim(15.2993, 74.124, 'Goa')) },
      { match: 'ticketmaster', handler: jsonResponse(200, TM_EVENTS) }
    ])
  );

  const result = await getEvents({ destination: 'Goa', ...TRIP, now: NOW });

  assert.equal(result.available, true);
  assert.equal(result.provider, 'ticketmaster');
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].id, 'ticketmaster:evt-1');
  assert.equal(result.events[0].classification, 'confirmed');

  // Past event excluded entirely.
  assert.ok(!result.events.some((event) => event.id === 'ticketmaster:evt-2'));

  // Non-overlapping future event offered separately.
  assert.equal(result.upcomingOutsideTrip.length, 1);
  assert.equal(result.upcomingOutsideTrip[0].id, 'ticketmaster:evt-3');
  assert.equal(result.meta.hasConfirmed, true);
});

test('getEvents marks a TBD overlap as tentative rather than confirmed', async () => {
  env.ticketmasterKey = 'test-key';

  const tbd = {
    _embedded: {
      events: [
        {
          id: 'festival-tbd',
          name: 'Annual Harvest Festival',
          dates: { start: { localDate: '2026-05-02', dateTBD: true }, status: { code: 'onsale' } },
          _embedded: { venues: [{ name: 'Town Square', location: { latitude: '15.3', longitude: '74.1' } }] }
        }
      ]
    }
  };

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, nominatim(15.2993, 74.124, 'Goa')) },
      { match: 'ticketmaster', handler: jsonResponse(200, tbd) }
    ])
  );

  const result = await getEvents({ destination: 'Goa', ...TRIP, now: NOW });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].classification, 'tentative');
  assert.equal(result.meta.hasConfirmed, false);
});

test('getEvents resolves multiple cities and dedupes events across them', async () => {
  env.ticketmasterKey = 'test-key';

  const shared = {
    _embedded: {
      events: [
        {
          id: 'shared-event',
          name: 'Shared Concert',
          url: 'https://ticketmaster.com/shared-event',
          dates: { start: { localDate: '2026-05-03' }, status: { code: 'onsale' } },
          _embedded: { venues: [{ name: 'Central Hall', location: { latitude: '15.3', longitude: '74.1' } }] }
        }
      ]
    }
  };

  setFetchImpl(
    routeFetch([
      {
        match: 'nominatim',
        handler: (url) => {
          const decoded = decodeURIComponent(url);
          if (decoded.includes('Panaji')) return jsonResponse(200, nominatim(15.49, 73.83, 'Panaji'));
          if (decoded.includes('Margao')) return jsonResponse(200, nominatim(15.27, 73.96, 'Margao'));
          return jsonResponse(200, nominatim(15.2993, 74.124, 'Goa'));
        }
      },
      { match: 'ticketmaster', handler: jsonResponse(200, shared) }
    ])
  );

  const result = await getEvents({
    destination: 'Goa',
    destinations: ['Panaji', 'Margao'],
    ...TRIP,
    now: NOW
  });

  assert.equal(result.references.length, 3);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].id, 'ticketmaster:shared-event');
});

test('getEvents geocodes the destination when lat/lng are null (not 0,0)', async () => {
  env.ticketmasterKey = 'test-key';

  let geocoded = false;
  let ticketmasterUrl = '';

  setFetchImpl(
    routeFetch([
      {
        match: 'nominatim',
        handler: () => {
          geocoded = true;
          return jsonResponse(200, nominatim(15.2993, 74.124, 'Goa'));
        }
      },
      {
        match: 'ticketmaster',
        handler: (url) => {
          ticketmasterUrl = String(url);
          return jsonResponse(200, TM_EVENTS);
        }
      }
    ])
  );

  // The HTTP validator passes null (not undefined) for absent coordinates.
  const result = await getEvents({ lat: null, lng: null, destination: 'Goa', ...TRIP, now: NOW });

  assert.equal(geocoded, true, 'destination should be geocoded');
  assert.equal(result.available, true);
  assert.equal(result.references.length, 1);
  assert.ok(result.references[0].lat > 15 && result.references[0].lat < 16);
  assert.ok(result.references[0].lng > 73 && result.references[0].lng < 75);
  // The provider request must use the geocoded location, not (0,0).
  assert.doesNotMatch(ticketmasterUrl, /latlong=0,0(&|$)/);
});

test('getEvents honours explicit coordinates when supplied', async () => {
  env.ticketmasterKey = 'test-key';

  let geocoded = false;

  setFetchImpl(
    routeFetch([
      {
        match: 'nominatim',
        handler: () => {
          geocoded = true;
          return jsonResponse(200, nominatim(15.2993, 74.124, 'Goa'));
        }
      },
      { match: 'ticketmaster', handler: jsonResponse(200, TM_EVENTS) }
    ])
  );

  const result = await getEvents({ lat: 15.5, lng: 73.8, destination: 'Goa', ...TRIP, now: NOW });

  assert.equal(geocoded, false);
  assert.equal(result.references[0].lat, 15.5);
  assert.equal(result.references[0].lng, 73.8);
});

test('getEvents handles an event without a ticket link', async () => {
  env.ticketmasterKey = 'test-key';

  const noLink = {
    _embedded: {
      events: [
        {
          id: 'no-link',
          name: 'Community Gathering',
          dates: { start: { localDate: '2026-05-02' }, status: { code: 'onsale' } },
          _embedded: { venues: [{ name: 'Park', location: { latitude: '15.3', longitude: '74.1' } }] }
        }
      ]
    }
  };

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, nominatim(15.2993, 74.124, 'Goa')) },
      { match: 'ticketmaster', handler: jsonResponse(200, noLink) }
    ])
  );

  const result = await getEvents({ destination: 'Goa', ...TRIP, now: NOW });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].ticketUrl, null);
  assert.equal(result.events[0].url, null);
});

test('getEvents reports unavailable when event data cannot be retrieved', async () => {
  env.ticketmasterKey = 'test-key';

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, nominatim(15.2993, 74.124, 'Goa')) },
      { match: 'ticketmaster', handler: jsonResponse(500, { fault: 'server error' }) }
    ])
  );

  const result = await getEvents({ destination: 'Goa', ...TRIP, now: NOW });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'provider-error');
  assert.deepEqual(result.events, []);
});

test('getEvents reports unsupported/unresolvable destinations honestly', async () => {
  env.ticketmasterKey = 'test-key';
  setFetchImpl(routeFetch([{ match: 'nominatim', handler: jsonResponse(200, []) }]));

  const result = await getEvents({ destination: 'Atlantis', ...TRIP, now: NOW });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'location-unresolved');
});

test('getEvents reports missing credentials when no API key is configured', async () => {
  env.ticketmasterKey = '';
  setFetchImpl(routeFetch([]));

  const result = await getEvents({ destination: 'Goa', ...TRIP, now: NOW });
  assert.equal(result.available, false);
  assert.equal(result.reason, 'missing-credentials');
});

test('getEvents interprets multi-day events and time zones correctly', async () => {
  env.ticketmasterKey = 'test-key';

  const multiDay = {
    _embedded: {
      events: [
        {
          id: 'multi',
          name: 'Five Day Expo',
          dates: {
            start: { localDate: '2026-04-30', localTime: '09:00:00' },
            end: { localDate: '2026-05-04' },
            timezone: 'Asia/Kolkata',
            status: { code: 'onsale' }
          },
          _embedded: { venues: [{ name: 'Expo Center', location: { latitude: '15.3', longitude: '74.1' } }] }
        }
      ]
    }
  };

  setFetchImpl(
    routeFetch([
      { match: 'nominatim', handler: jsonResponse(200, nominatim(15.2993, 74.124, 'Goa')) },
      { match: 'ticketmaster', handler: jsonResponse(200, multiDay) }
    ])
  );

  const result = await getEvents({ destination: 'Goa', ...TRIP, now: NOW });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].startDate, '2026-04-30');
  assert.equal(result.events[0].endDate, '2026-05-04');
  assert.equal(result.events[0].timezone, 'Asia/Kolkata');
  assert.equal(result.events[0].classification, 'confirmed');
});
