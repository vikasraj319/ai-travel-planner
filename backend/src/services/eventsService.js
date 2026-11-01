const env = require('../config/env');
const { requestJson } = require('../lib/httpClient');
const { createCache } = require('../lib/cache');
const { haversineMeters, formatDistance, isValidCoordinate, resolveCoordinates } = require('../utils/geo');
const { geocode } = require('./geocodingService');

const eventsCache = createCache({ ttlMs: env.cacheTtl.eventsMs, maxEntries: 400 });

const TM_ATTRIBUTION = 'Ticketmaster';
const DEFAULT_RADIUS_KM = 50;
const DEFAULT_WINDOW_DAYS = 30;

function resolveEventsProvider() {
  if (env.eventsProvider === 'none') return 'none';
  // Both "auto" and an explicit "ticketmaster" require a key.
  return env.ticketmasterKey ? 'ticketmaster' : 'missing-credentials';
}

function stripHtml(value) {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function toDateOnly(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Computes the search window. Trip dates take precedence; when they are
 * missing we fall back to an upcoming window from today so discovery still
 * works without inventing a trip date.
 */
function buildQueryWindow({ startDate, endDate, now = new Date() } = {}) {
  const today = now.toISOString().slice(0, 10);
  const validStart = isValidDateOnly(startDate) ? startDate : null;
  const validEnd = isValidDateOnly(endDate) ? endDate : null;

  if (validStart && validEnd) {
    return {
      hasTripDates: true,
      tripStart: validStart,
      tripEnd: validEnd >= validStart ? validEnd : validStart,
      queryStart: validStart,
      queryEnd: validEnd >= validStart ? validEnd : validStart
    };
  }

  if (validStart) {
    return {
      hasTripDates: true,
      tripStart: validStart,
      tripEnd: validStart,
      queryStart: validStart,
      queryEnd: validStart
    };
  }

  return {
    hasTripDates: false,
    tripStart: null,
    tripEnd: null,
    queryStart: today,
    queryEnd: addDays(today, DEFAULT_WINDOW_DAYS)
  };
}

/** True when [start,end] overlaps [tripStart,tripEnd] (date-granular, UTC-safe). */
function isOverlapping(eventStart, eventEnd, tripStart, tripEnd) {
  if (!eventStart || !tripStart || !tripEnd) return false;
  const end = eventEnd || eventStart;
  return eventStart <= tripEnd && end >= tripStart;
}

function normalizeVenue(venue = {}) {
  const lat = Number(venue.location?.latitude);
  const lng = Number(venue.location?.longitude);
  const addressParts = [venue.address?.line1, venue.city?.name, venue.state?.name, venue.country?.name]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);

  return {
    name: venue.name || null,
    city: venue.city?.name || null,
    country: venue.country?.name || venue.country?.countryCode || null,
    address: addressParts.join(', ') || null,
    lat: isValidCoordinate(lat, lng) ? lat : null,
    lng: isValidCoordinate(lat, lng) ? lng : null,
    url: venue.url || null
  };
}

function pickCategory(classifications) {
  const primary = Array.isArray(classifications) ? classifications[0] : null;
  if (!primary) return 'Event';
  return (
    primary.genre?.name ||
    primary.subGenre?.name ||
    primary.segment?.name ||
    'Event'
  );
}

/** Maps a Ticketmaster event to our normalized event shape. */
function normalizeTicketmasterEvent(event, reference) {
  if (!event || typeof event !== 'object' || !event.id) return null;

  const start = event.dates?.start || {};
  const end = event.dates?.end || {};
  const venue = normalizeVenue(event._embedded?.venues?.[0]);

  const startDate = toDateOnly(start.localDate || start.dateTime);
  const endDate = toDateOnly(end.localDate || end.dateTime);
  const price = Array.isArray(event.priceRanges) ? event.priceRanges[0] : null;

  const dateTBD = Boolean(start.dateTBD);
  const dateTBA = Boolean(start.dateTBA);
  const timeTBA = Boolean(start.timeTBA) || !start.localTime;

  const lat = venue.lat;
  const lng = venue.lng;
  const distanceMeters =
    reference && isValidCoordinate(lat, lng)
      ? haversineMeters(reference, { lat, lng })
      : null;

  return {
    id: `ticketmaster:${event.id}`,
    provider: 'ticketmaster',
    name: event.name || 'Untitled event',
    category: pickCategory(event.classifications),
    description: stripHtml(event.info) || stripHtml(event.pleaseNote),
    startDate: startDate || null,
    endDate: endDate || startDate || null,
    startTime: start.localTime || null,
    timezone: event.dates?.timezone || null,
    dateTBD,
    dateTBA,
    timeTBA,
    sourceStatus: event.dates?.status?.code || null,
    cancelled: String(event.dates?.status?.code || '').toLowerCase() === 'cancelled',
    venue: venue.name,
    venueCity: venue.city,
    venueCountry: venue.country,
    address: venue.address,
    lat,
    lng,
    distanceMeters: Number.isFinite(distanceMeters) ? Math.round(distanceMeters) : null,
    distance: formatDistance(distanceMeters),
    url: event.url || venue.url || null,
    ticketUrl: event.url || null,
    priceMin: Number.isFinite(Number(price?.min)) ? Number(price.min) : null,
    priceMax: Number.isFinite(Number(price?.max)) ? Number(price.max) : null,
    currency: price?.currency || null,
    organizer: event.promoter?.name || null,
    source: 'ticketmaster'
  };
}

/**
 * Assigns an honest classification to an event relative to the trip window.
 * `confirmed` requires a source-provided date inside the trip; `tentative`
 * covers TBA/TBD dates or cancelled/postponed events; `outside-trip` covers
 * genuine upcoming events that simply do not overlap the travel dates.
 */
function classifyEvent(event, window, referenceDate = new Date()) {
  if (!event || !event.startDate) {
    return { classification: 'unverified', overlapsTrip: false };
  }

  const today = referenceDate.toISOString().slice(0, 10);
  const eventEnd = event.endDate || event.startDate;

  if (eventEnd < today) {
    return { classification: 'past', overlapsTrip: false };
  }

  const overlapsTrip =
    window.hasTripDates &&
    isOverlapping(event.startDate, eventEnd, window.tripStart, window.tripEnd);

  const uncertainDate = event.dateTBD || event.dateTBA;
  const uncertain = uncertainDate || event.cancelled;

  if (window.hasTripDates) {
    if (overlapsTrip) {
      return { classification: uncertain ? 'tentative' : 'confirmed', overlapsTrip: true };
    }
    return { classification: 'outside-trip', overlapsTrip: false };
  }

  // No trip dates: everything upcoming is shown, with uncertainty preserved.
  return {
    classification: uncertain ? 'tentative' : 'confirmed',
    overlapsTrip: false
  };
}

function dedupeEvents(events = []) {
  const seen = new Set();
  const kept = [];

  for (const event of events) {
    if (!event || !event.id || seen.has(event.id)) continue;
    seen.add(event.id);
    kept.push(event);
  }

  return kept;
}

function mapProviderError(error) {
  switch (error?.type) {
    case 'timeout':
      return 'timeout';
    case 'rate-limit':
      return 'rate-limit';
    case 'network':
      return 'provider-unavailable';
    default:
      return 'provider-error';
  }
}

async function fetchTicketmasterEvents({ lat, lng, radiusKm, queryStart, queryEnd }) {
  const params = new URLSearchParams({
    apikey: env.ticketmasterKey,
    latlong: `${lat},${lng}`,
    radius: String(radiusKm),
    unit: 'km',
    sort: 'date,asc',
    size: '20',
    startDateTime: `${queryStart}T00:00:00Z`,
    endDateTime: `${queryEnd}T23:59:59Z`
  });

  const response = await requestJson(`${env.ticketmaster.url}?${params.toString()}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    return { ok: false, events: [], error: response.error };
  }

  const events = response.data?._embedded?.events;
  return { ok: true, events: Array.isArray(events) ? events : [] };
}

async function resolveReferences({ lat, lng, destination, destinations }) {
  const coordinates = resolveCoordinates(lat, lng);

  if (coordinates) {
    return [
      {
        lat: coordinates.lat,
        lng: coordinates.lng,
        label: String(destination || 'Selected location').trim()
      }
    ];
  }

  const labels = [];
  if (destination) labels.push(String(destination).trim());
  for (const item of Array.isArray(destinations) ? destinations : []) {
    const clean = String(item || '').trim();
    if (clean && !labels.some((label) => label.toLowerCase() === clean.toLowerCase())) {
      labels.push(clean);
    }
  }

  const references = [];
  for (const label of labels) {
    const geo = await geocode(label);
    if (geo.ok && geo.result) {
      references.push({ lat: geo.result.lat, lng: geo.result.lng, label });
    }
  }

  return references;
}

/**
 * Discover live events for the destination(s) across the trip window.
 * Returns `available: false` (never fabricated data) when the provider is not
 * configured or no location can be resolved.
 */
async function getEvents({
  lat,
  lng,
  destination,
  destinations,
  startDate,
  endDate,
  radiusKm,
  limit,
  now = new Date()
} = {}) {
  const lastChecked = now.toISOString();
  const provider = resolveEventsProvider();
  const window = buildQueryWindow({ startDate, endDate, now });
  const effectiveRadius = Number.isFinite(Number(radiusKm)) && Number(radiusKm) > 0
    ? Math.min(500, Math.round(Number(radiusKm)))
    : DEFAULT_RADIUS_KM;
  const effectiveLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
    ? Math.min(50, Math.round(Number(limit)))
    : 12;

  if (provider === 'none' || provider === 'missing-credentials') {
    return {
      available: false,
      reason: provider === 'none' ? 'provider-disabled' : 'missing-credentials',
      provider: provider === 'none' ? null : 'ticketmaster',
      window: {
        startDate: window.queryStart,
        endDate: window.queryEnd,
        hasTripDates: window.hasTripDates
      },
      references: [],
      events: [],
      upcomingOutsideTrip: [],
      meta: {
        source: null,
        attribution: null,
        lastChecked,
        cached: false,
        count: 0,
        note: 'Event discovery requires a configured events provider.'
      }
    };
  }

  const references = await resolveReferences({ lat, lng, destination, destinations });

  if (references.length === 0) {
    return {
      available: false,
      reason: 'location-unresolved',
      provider,
      window: {
        startDate: window.queryStart,
        endDate: window.queryEnd,
        hasTripDates: window.hasTripDates
      },
      references: [],
      events: [],
      upcomingOutsideTrip: [],
      meta: { source: provider, attribution: TM_ATTRIBUTION, lastChecked, cached: false, count: 0 }
    };
  }

  const cacheKey = [
    'events',
    provider,
    references.map((ref) => `${ref.lat.toFixed(2)},${ref.lng.toFixed(2)}`).join('|'),
    window.queryStart,
    window.queryEnd,
    effectiveRadius
  ].join(':');

  const cached = eventsCache.get(cacheKey);
  if (cached) {
    return { ...cached.value, meta: { ...cached.value.meta, cached: true } };
  }

  const collected = [];
  let providerError = null;

  for (const reference of references) {
    const result = await fetchTicketmasterEvents({
      lat: reference.lat,
      lng: reference.lng,
      radiusKm: effectiveRadius,
      queryStart: window.queryStart,
      queryEnd: window.queryEnd
    });

    if (!result.ok) {
      providerError = providerError || result.error;
      continue;
    }

    for (const raw of result.events) {
      collected.push(normalizeTicketmasterEvent(raw, reference));
    }
  }

  // Only fail the whole request when every reference failed.
  if (collected.length === 0 && providerError) {
    return {
      available: false,
      reason: mapProviderError(providerError),
      provider,
      window: {
        startDate: window.queryStart,
        endDate: window.queryEnd,
        hasTripDates: window.hasTripDates
      },
      references,
      events: [],
      upcomingOutsideTrip: [],
      meta: { source: provider, attribution: TM_ATTRIBUTION, lastChecked, cached: false, count: 0 }
    };
  }

  const normalized = dedupeEvents(collected.filter(Boolean)).map((event) => {
    const { classification, overlapsTrip } = classifyEvent(event, window, now);
    return { ...event, classification, overlapsTrip };
  });

  const upcoming = normalized
    .filter((event) => event.classification !== 'past' && event.classification !== 'unverified')
    .sort((a, b) => {
      if (a.startDate && b.startDate && a.startDate !== b.startDate) {
        return a.startDate < b.startDate ? -1 : 1;
      }
      return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
    });

  const withinTrip = upcoming.filter((event) => event.overlapsTrip);
  const outside = upcoming.filter((event) => !event.overlapsTrip);

  // When the trip has dates, primary results are the overlaps; otherwise all
  // upcoming events are primary (the UI labels the date window accordingly).
  const primary = window.hasTripDates ? withinTrip : upcoming;

  const payload = {
    available: true,
    reason: null,
    provider,
    window: {
      startDate: window.queryStart,
      endDate: window.queryEnd,
      hasTripDates: window.hasTripDates,
      tripStart: window.tripStart,
      tripEnd: window.tripEnd
    },
    references,
    events: primary.slice(0, effectiveLimit),
    upcomingOutsideTrip: window.hasTripDates ? outside.slice(0, effectiveLimit) : [],
    meta: {
      source: provider,
      attribution: TM_ATTRIBUTION,
      lastChecked,
      cached: false,
      count: primary.length,
      hasConfirmed: primary.some((event) => event.classification === 'confirmed'),
      note:
        'Event data from Ticketmaster; coverage is limited to Ticketmaster markets and may not include every local festival or regional event.'
    }
  };

  eventsCache.set(cacheKey, payload);

  return payload;
}

module.exports = {
  getEvents,
  buildQueryWindow,
  classifyEvent,
  isOverlapping,
  normalizeTicketmasterEvent,
  dedupeEvents,
  resolveEventsProvider,
  stripHtml,
  _eventsCache: eventsCache
};
