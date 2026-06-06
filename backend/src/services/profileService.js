const { validateProfile } = require("../models/profileModel");
const {supabase} = require("../lib/supabase");
const profiles = [];

async function saveProfile(profileData) {

  const { data, error } = await supabase
    .from("profiles")
    .insert([profileData])
    .select();

  if (error) {
    throw error;
  }

  return data[0];
}

module.exports = {
  saveProfile
};