const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

const supabaseUrl = env.supabase.url;
const supabaseKey = env.supabase.publishableKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env ' +
      '(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_URL / ' +
      'VITE_SUPABASE_ANON_KEY are also accepted).'
  );
}

function createSupabaseForToken(token) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = {
  supabase: createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }),
  createSupabaseForToken
}
