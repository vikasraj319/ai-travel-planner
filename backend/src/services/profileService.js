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

module.exports = {
  saveProfile
};
