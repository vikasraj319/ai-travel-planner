const { createSupabaseForToken } = require("../lib/supabase");
const ApiError = require("../utils/ApiError");
const { mapSupabaseError } = require("../utils/supabaseErrors");

async function saveProfile(profileData, accessToken) {
  if (!accessToken) {
    throw new ApiError(401, "An authenticated session is required");
  }

  const client = createSupabaseForToken(accessToken);

  let response;

  try {
    response = await client
      .from("profiles")
      .upsert(profileData, {
        onConflict: "id"
      })
      .select()
      .single();
  } catch (err) {
    throw mapSupabaseError(err, "Failed to save profile");
  }

  if (response.error) {
    throw mapSupabaseError(response.error, "Failed to save profile");
  }

  return response.data;
}

// trips.user_id has a foreign key to profiles.id, so a profile row must
// exist before a trip can be saved. Creates a minimal row if missing.
async function ensureProfile(user, accessToken) {
  if (!accessToken || !user?.id) return;

  const client = createSupabaseForToken(accessToken);

  const fullName = user?.user_metadata?.full_name || "";
  const username = fullName || (user?.email || "").split("@")[0] || "traveler";

  let response;

  try {
    response = await client
      .from("profiles")
      .upsert(
        {
          id: user.id,
          username,
          full_name: fullName || username
        },
        {
          onConflict: "id",
          ignoreDuplicates: true
        }
      );
  } catch (err) {
    throw mapSupabaseError(err, "Failed to prepare user profile");
  }

  if (response.error) {
    throw mapSupabaseError(response.error, "Failed to prepare user profile");
  }
}

module.exports = {
  saveProfile,
  ensureProfile
};
