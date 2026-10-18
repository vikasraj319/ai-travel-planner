const ApiError = require('../utils/ApiError');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BUDGET = 2000000000; // stays within Postgres integer range
const MAX_DAYS = 365;
const MAX_DESTINATION_LENGTH = 200;

function validateTrip(trip) {
  if (!trip || typeof trip !== 'object') {
    throw new ApiError(400, 'Trip data is required');
  }

  // User ID must be a valid UUID so it matches auth.uid() / profiles.id
  if (!trip.user_id || typeof trip.user_id !== 'string' || !UUID_REGEX.test(trip.user_id)) {
    throw new ApiError(400, 'A valid user id is required to save a trip');
  }

  // Budget is required by the database (trips.budget is NOT NULL). Never
  // coerce a missing budget into zero; fail early with a clear message.
  if (
    trip.budget === undefined ||
    trip.budget === null ||
    trip.budget === ''
  ) {
    throw new ApiError(400, 'A budget is required to save a trip');
  }

  const budget = Number(trip.budget);

  if (!Number.isFinite(budget) || budget < 0 || budget > MAX_BUDGET) {
    throw new ApiError(400, 'Invalid budget');
  }

  trip.budget = Math.round(budget);

  // Days (optional, but must be a positive integer within a sane range)
  if (
    trip.days !== undefined &&
    trip.days !== null &&
    trip.days !== ''
  ) {
    const days = Number(trip.days);

    if (!Number.isInteger(days) || days <= 0 || days > MAX_DAYS) {
      throw new ApiError(400, `Invalid number of days (must be an integer between 1 and ${MAX_DAYS})`);
    }

    trip.days = days;
  } else {
    trip.days = null;
  }

  // Destination (optional at the type level, but a saved trip without one is useless)
  if (
    trip.destination !== undefined &&
    trip.destination !== null &&
    trip.destination !== ''
  ) {
    trip.destination = String(trip.destination).trim().slice(0, MAX_DESTINATION_LENGTH);

    if (!trip.destination) {
      throw new ApiError(400, 'Destination cannot be empty');
    }
  } else {
    trip.destination = null;
  }

  return trip;
}


function createTripModel(data) {
  return {
    user_id: data.user_id ?? null,
    destination: data.destination ?? null,
    budget: data.budget ?? null,
    days: data.days ?? null,
    created_at: new Date()
  };
}


module.exports = {
  validateTrip,
  createTripModel,
  UUID_REGEX
};
