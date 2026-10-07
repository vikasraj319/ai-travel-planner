const env = require('./env');

const corsOptions = {
  origin(origin, callback) {
    // Allow tools like Postman or curl where origin is not set.
    if (!origin) return callback(null, true);

    if (env.clientUrls.includes(origin)) {
      return callback(null, true);
    }

    // Deny silently (no CORS headers) instead of throwing a 500
    return callback(null, false);
  },
  credentials: true
};

module.exports = corsOptions;
