const ApiError = require('../utils/ApiError');
const { normalizeText } = require('../utils/promptBuilder');
const { isValidCategory, DEFAULT_CATEGORY, PLACE_CATEGORIES } = require('../constants/placeCategories');

const MAX_LOCATION_LENGTH = 120;
const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 50000;
const MAX_PLACES_LIMIT = 20;
const MAX_EVENTS_LIMIT = 50;
const MAX_DESTINATIONS = 5;

function ensureOptionalText(value, fieldName, maxLength = MAX_LOCATION_LENGTH) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new ApiError(400, `${fieldName} must be a string`);
  }
  const cleaned = normalizeText(value);
  if (cleaned.length > maxLength) {
    throw new ApiError(400, `${fieldName} must be at most ${maxLength} characters`);
  }
  return cleaned;
}

function parseNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new ApiError(400, `${fieldName} must be a number`);
  }
  return num;
}

function parseLatLng({ lat, lng }) {
  const parsedLat = parseNumber(lat, 'lat');
  const parsedLng = parseNumber(lng, 'lng');

  const hasLat = parsedLat !== null;
  const hasLng = parsedLng !== null;

  if (hasLat !== hasLng) {
    throw new ApiError(400, 'Provide both lat and lng together');
  }

  if (hasLat && hasLng) {
    if (parsedLat < -90 || parsedLat > 90) {
      throw new ApiError(400, 'lat must be between -90 and 90');
    }
    if (parsedLng < -180 || parsedLng > 180) {
      throw new ApiError(400, 'lng must be between -180 and 180');
    }
  }

  return { lat: hasLat ? parsedLat : null, lng: hasLng ? parsedLng : null };
}

function parseRadius(value, { min, max, fieldName }) {
  const parsed = parseNumber(value, fieldName);
  if (parsed === null) return null;
  if (parsed < min || parsed > max) {
    throw new ApiError(400, `${fieldName} must be between ${min} and ${max}`);
  }
  return parsed;
}

function parseLimit(value, max, fieldName = 'limit') {
  const parsed = parseNumber(value, fieldName);
  if (parsed === null) return null;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ApiError(400, `${fieldName} must be an integer between 1 and ${max}`);
  }
  return parsed;
}

function parseDateOnly(value, fieldName) {
  const cleaned = ensureOptionalText(value, fieldName, 40);
  if (!cleaned) return '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format`);
  }

  const date = new Date(`${cleaned}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== cleaned) {
    throw new ApiError(400, `${fieldName} is not a valid calendar date`);
  }

  return cleaned;
}

function validateNearbyQuery(query = {}) {
  const categoryRaw = ensureOptionalText(query.category, 'category', 40);
  const category = categoryRaw ? categoryRaw.toLowerCase() : DEFAULT_CATEGORY;

  if (categoryRaw && !isValidCategory(category)) {
    throw new ApiError(
      400,
      `category must be one of: ${Object.keys(PLACE_CATEGORIES).join(', ')}`
    );
  }

  const { lat, lng } = parseLatLng(query);
  const location = ensureOptionalText(query.location, 'location');
  const destination = ensureOptionalText(query.destination, 'destination');

  if (lat === null && !location && !destination) {
    throw new ApiError(400, 'Provide lat/lng, location, or destination');
  }

  const radius = parseRadius(query.radius, {
    min: MIN_RADIUS_M,
    max: MAX_RADIUS_M,
    fieldName: 'radius'
  });

  const limit = parseLimit(query.limit, MAX_PLACES_LIMIT);

  return { category, lat, lng, location, destination, radius, limit };
}

function validateEventsQuery(query = {}) {
  const { lat, lng } = parseLatLng(query);
  const destination = ensureOptionalText(query.destination, 'destination');

  const destinationsRaw = ensureOptionalText(query.destinations, 'destinations', 400);
  const destinations = destinationsRaw
    ? destinationsRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  if (destinations.length > MAX_DESTINATIONS) {
    throw new ApiError(400, `destinations can contain at most ${MAX_DESTINATIONS} entries`);
  }

  if (lat === null && !destination && destinations.length === 0) {
    throw new ApiError(400, 'Provide lat/lng, destination, or destinations');
  }

  const startDate = parseDateOnly(query.startDate, 'startDate');
  const endDate = parseDateOnly(query.endDate, 'endDate');

  if (startDate && endDate && endDate < startDate) {
    throw new ApiError(400, 'endDate must be on or after startDate');
  }

  const radiusKm = parseRadius(query.radiusKm, {
    min: 1,
    max: 500,
    fieldName: 'radiusKm'
  });

  const limit = parseLimit(query.limit, MAX_EVENTS_LIMIT);

  return { lat, lng, destination, destinations, startDate, endDate, radiusKm, limit };
}

module.exports = {
  validateNearbyQuery,
  validateEventsQuery,
  parseLatLng,
  parseDateOnly,
  parseRadius,
  parseLimit
};
