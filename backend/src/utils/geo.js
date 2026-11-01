const EARTH_RADIUS_M = 6371008.8;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Parses a single coordinate value only when it was genuinely supplied.
 *
 * `Number(null)` and `Number('')` coerce to 0, which is a valid coordinate,
 * so a naive `Number(lat)` makes missing coordinates look like an explicit
 * request for (0, 0). Returns null when the value is absent or not numeric.
 */
function parseProvidedCoordinate(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Resolves an explicit lat/lng pair from request input.
 * Returns null when either value is missing, non-numeric, or out of range,
 * letting callers fall back to geocoding instead of assuming (0, 0).
 */
function resolveCoordinates(lat, lng) {
  const parsedLat = parseProvidedCoordinate(lat);
  const parsedLng = parseProvidedCoordinate(lng);

  if (parsedLat === null || parsedLng === null) return null;
  if (!isValidCoordinate(parsedLat, parsedLng)) return null;

  return { lat: parsedLat, lng: parsedLng };
}

/** Great-circle distance between two coordinates, in meters. */
function haversineMeters(a, b) {
  if (!a || !b) return null;

  const lat1 = Number(a.lat ?? a.latitude);
  const lng1 = Number(a.lng ?? a.lon ?? a.longitude);
  const lat2 = Number(b.lat ?? b.latitude);
  const lng2 = Number(b.lng ?? b.lon ?? b.longitude);

  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    return null;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Human-readable distance using metric units, consistent across the API. */
function formatDistance(meters) {
  if (!Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

module.exports = {
  EARTH_RADIUS_M,
  isValidCoordinate,
  parseProvidedCoordinate,
  resolveCoordinates,
  haversineMeters,
  formatDistance
};
