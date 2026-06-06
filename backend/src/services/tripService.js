const { supabase } = require("../lib/supabase");

async function getTrips(userId) {

  const { data, error } =
    await supabase
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