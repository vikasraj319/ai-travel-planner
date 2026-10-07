const { createSupabaseForToken, supabase } = require("../lib/supabase");

async function saveProfile(profileData, accessToken) {
  const client = accessToken
    ? createSupabaseForToken(accessToken)
    : supabase;

  const { data, error } = await client
    .from("profiles")
    .upsert(profileData, {
      onConflict: "id"
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// trips.user_id has a foreign key to profiles.id, so a profile row must
// exist before a trip can be saved. Creates a minimal row if missing.
async function ensureProfile(user, accessToken) {
  if (!accessToken) return;

  const client = createSupabaseForToken(accessToken);

  const fullName = user?.user_metadata?.full_name || "";
  const username = fullName || (user?.email || "").split("@")[0] || "traveler";

  const { error } = await client
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

  if (error) {
    throw error;
  }
}

module.exports = {
  saveProfile,
  ensureProfile
};
