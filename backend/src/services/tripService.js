const { supabase, createSupabaseForToken } = require("../lib/supabase");

async function getTrips(userId, accessToken) {

  // Scope the read to the end user's identity so RLS policies apply
  const client = accessToken
    ? createSupabaseForToken(accessToken)
    : supabase;

  const { data, error } =
    await client
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  getTrips
};
