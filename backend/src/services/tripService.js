const { createSupabaseForToken } = require("../lib/supabase");
const ApiError = require("../utils/ApiError");
const { mapSupabaseError } = require("../utils/supabaseErrors");

// The live `trips.itinerary` column is TEXT holding a JSON payload.
// Convert it back to an object for API consumers; malformed values are
// passed through as raw strings instead of crashing the list endpoint.
function parseTripRow(row) {
  if (!row || typeof row !== "object") return row;

  const { itinerary } = row;

  if (typeof itinerary === "string" && itinerary.trim()) {
    try {
      return { ...row, itinerary: JSON.parse(itinerary) };
    } catch {
      return row;
    }
  }

  return row;
}

async function getTrips(userId, accessToken) {
  if (!userId) {
    throw new ApiError(400, "User id is required");
  }

  if (!accessToken) {
    throw new ApiError(401, "An authenticated session is required to load trips");
  }

  // Scope the read to the end user's identity so RLS policies apply
  const client = createSupabaseForToken(accessToken);

  let response;

  try {
    response = await client
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false
      });
  } catch (err) {
    throw mapSupabaseError(err, "Failed to load trips");
  }

  if (response.error) {
    throw mapSupabaseError(response.error, "Failed to load trips");
  }

  return (response.data || []).map(parseTripRow);
}

module.exports = {
  getTrips,
  parseTripRow
};
