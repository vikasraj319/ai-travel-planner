const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

const supabaseUrl = env.supabase.url;
const supabaseKey = env.supabase.publishableKey;

function createSupabaseForToken(token) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

module.exports = {
  supabase: createClient(supabaseUrl, supabaseKey),
  createSupabaseForToken
}