const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getOrigins(rawOrigins) {
  if (!rawOrigins) return ['http://localhost:5500', 'http://127.0.0.1:5500'];

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrls: getOrigins(process.env.CLIENT_URL),
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 20000,
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES) || 12,
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  }
};

module.exports = env;
