const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Search candidate locations for .env:
// 1. backend/.env relative to this file
// 2. process.cwd()/.env
// 3. process.cwd()/backend/.env
const candidateEnvPaths = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env")
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

function getOrigins(rawOrigins) {
  // Default origins if CLIENT_URL is not set
  if (!rawOrigins) {
    return [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://ai-travel-planner-gamma-sooty.vercel.app",
    ];
  }

  // Allow multiple origins separated by commas
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",

  port: Number(process.env.PORT) || 5000,

  // Allowed frontend URLs
  clientUrls: getOrigins(process.env.CLIENT_URL),

  // AI Settings
  aiProvider: process.env.AI_PROVIDER || "gemini",
  // Budget for a single chat reply.
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 20000,
  // A full itinerary is a large JSON payload (up to 4000 output tokens) and
  // regularly needs more than the chat budget, so it gets its own deadline.
  aiPlanTimeoutMs: Number(process.env.AI_PLAN_TIMEOUT_MS) || 60000,
  // Bounded retry budget for transient provider failures (429/503/timeouts).
  aiMaxAttempts: Number(process.env.AI_MAX_ATTEMPTS) || 3,
  aiRetryBaseDelayMs: Number(process.env.AI_RETRY_BASE_DELAY_MS) || 500,
  aiRetryMaxDelayMs: Number(process.env.AI_RETRY_MAX_DELAY_MS) || 2000,
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES) || 12,

  // Gemini
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    // Gemini models are retired by Google without notice (a retired model
    // answers with a 404), so the default is pinned to a live model and can
    // be overridden through GEMINI_MODEL.
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },

  // External discovery APIs (nearby places + live events)
  externalApiTimeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS) || 8000,

  // Latency budget for a single discovery request.
  //
  // The provider stage is split into a per-attempt timeout and a total
  // operation budget so that failing over between mirrors can never push the
  // endpoint past the response time it is expected to deliver.
  placesRequestBudgetMs: Number(process.env.PLACES_REQUEST_BUDGET_MS) || 9000,
  placesAttemptTimeoutMs: Number(process.env.PLACES_ATTEMPT_TIMEOUT_MS) || 5000,
  placesMaxAttempts: Number(process.env.PLACES_MAX_ATTEMPTS) || 3,
  placesRetryBaseDelayMs: Number(process.env.PLACES_RETRY_BASE_DELAY_MS) || 300,
  placesRetryMaxDelayMs: Number(process.env.PLACES_RETRY_MAX_DELAY_MS) || 2000,
  geocodeTimeoutMs: Number(process.env.GEOCODE_TIMEOUT_MS) || 5000,

  // Nearby places
  // "auto" -> use Google Places when a key is configured, otherwise OpenStreetMap.
  placesProvider: (process.env.PLACES_PROVIDER || "auto").toLowerCase(),
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY || "",
  overpass: {
    url:
      process.env.OVERPASS_API_URL ||
      "https://overpass-api.de/api/interpreter",
    // Optional comma-separated mirrors, tried in order when the primary
    // Overpass endpoint fails (timeout, 429, 5xx, or malformed response).
    fallbackUrls: (process.env.OVERPASS_FALLBACK_URLS ||
      "https://overpass.kumi.systems/api/interpreter,https://overpass.private.coffee/api/interpreter")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    // Overpass operators (like Nominatim's usage policy) require an
    // identifying User-Agent; requests without one are rejected with 429/500.
    userAgent:
      process.env.OVERPASS_USER_AGENT ||
      process.env.NOMINATIM_USER_AGENT ||
      "HorizonsAITravelPlanner/1.0 (https://github.com/horizons-ai-travel-planner)",
  },
  nominatim: {
    url:
      process.env.NOMINATIM_API_URL ||
      "https://nominatim.openstreetmap.org/search",
    // Nominatim's usage policy requires a descriptive User-Agent.
    userAgent:
      process.env.NOMINATIM_USER_AGENT ||
      "HorizonsAITravelPlanner/1.0 (https://github.com/horizons-ai-travel-planner)",
  },

  // Live events
  // "auto" -> use Ticketmaster when a key is configured, otherwise unavailable.
  eventsProvider: (process.env.EVENTS_PROVIDER || "auto").toLowerCase(),
  ticketmasterKey: process.env.TICKETMASTER_API_KEY || "",
  ticketmaster: {
    url:
      process.env.TICKETMASTER_API_URL ||
      "https://app.ticketmaster.com/discovery/v2/events.json",
  },

  // Cache lifetimes (milliseconds). Kept short to respect provider terms.
  cacheTtl: {
    geocodeMs: Number(process.env.GEOCODE_CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000,
    placesMs: Number(process.env.PLACES_CACHE_TTL_MS) || 12 * 60 * 60 * 1000,
    eventsMs: Number(process.env.EVENTS_CACHE_TTL_MS) || 30 * 60 * 1000,
    // An empty provider answer is re-checked quickly instead of being kept for
    // the full TTL, so a transient empty result cannot stick around.
    placesEmptyMs: Number(process.env.PLACES_EMPTY_CACHE_TTL_MS) || 5 * 60 * 1000,
    // How long a past-TTL entry may still be served (stale-while-revalidate).
    placesStaleMs: Number(process.env.PLACES_STALE_CACHE_TTL_MS) || 6 * 60 * 60 * 1000,
  },

  // Supabase
  supabase: {
    url:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      "",
    publishableKey:
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "",
  },
};

module.exports = env;