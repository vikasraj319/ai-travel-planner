const { configDotenv } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

configDotenv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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
