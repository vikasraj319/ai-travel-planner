const env = require('./env');

const corsOptions = {
  origin(origin, callback) {
    // Allow tools like Postman or curl where origin is not set.
    if (!origin) return callback(null, true);

    if (env.clientUrls.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
};

module.exports = corsOptions;
