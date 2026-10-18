const ApiError = require('./ApiError');

const DATA_ERROR_CODES = new Set([
  '22P02', // invalid text representation (bad uuid, bad number)
  '22007', // invalid datetime
  '22008', // invalid datetime format
  '22023', // invalid parameter value
  '22001', // string too long
  '42804', // column type mismatch
  '42601' // syntax error in generated SQL (should not happen, but never leak)
]);

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';
const NOT_NULL_VIOLATION = '23502';
const RLS_VIOLATION = '42501';

function isNetworkError(error) {
  if (!error) return false;
  const message = String(error.message || '');
  const causeCode = String(error.cause?.code || '');
  return (
    error instanceof TypeError ||
    /fetch failed|network|socket hang up|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(message) ||
    /ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(causeCode)
  );
}

/**
 * Translates a Supabase/PostgREST/Postgres error into an ApiError with an
 * appropriate HTTP status code. Never leaks raw database details.
 */
function mapSupabaseError(error, fallbackMessage = 'Database operation failed') {
  if (!error) return null;

  if (isNetworkError(error)) {
    console.error('Supabase network error:', error.message || error);
    return new ApiError(503, 'Database service is unavailable. Please try again later.');
  }

  const code = String(error.code || '');
  const message = String(error.message || '');

  if (code === RLS_VIOLATION || /row-level security policy/i.test(message)) {
    console.error('Supabase RLS violation:', code, message);
    return new ApiError(403, 'You do not have permission to perform this operation');
  }

  if (code === 'PGRST301' || /jwt (?:expired|invalid)/i.test(message)) {
    return new ApiError(401, 'Invalid or expired session');
  }

  if (code === UNIQUE_VIOLATION) {
    return new ApiError(409, 'A record with this value already exists');
  }

  if (code === FOREIGN_KEY_VIOLATION) {
    return new ApiError(409, 'The referenced record does not exist');
  }

  if (code === NOT_NULL_VIOLATION) {
    // The raw message names the offending column (e.g. `column "budget"`),
    // which is essential for diagnosis. Log it server-side only.
    console.error('Supabase not-null violation:', code, message, error.details || '');
    return new ApiError(400, 'A required field was missing from the request');
  }

  if (DATA_ERROR_CODES.has(code)) {
    console.error('Supabase data error:', code, message);
    return new ApiError(400, 'The provided data is not in a valid format');
  }

  if (/does not exist/i.test(message) && /relation|column/i.test(message)) {
    console.error('Supabase schema error:', code, message);
    return new ApiError(500, 'Database schema mismatch. Run the latest migration.');
  }

  console.error('Unmapped Supabase error:', code, message, error.details || '');
  return new ApiError(500, fallbackMessage);
}

module.exports = {
  mapSupabaseError,
  isNetworkError
};
