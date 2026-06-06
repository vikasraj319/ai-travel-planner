const { configDotenv } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

configDotenv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

module.exports = { supabase: createClient(supabaseUrl, supabaseKey) }