const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

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
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 20000,
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES) || 12,

  // Gemini
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
};

module.exports = env;