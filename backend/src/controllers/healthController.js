const env = require('../config/env');

function getHealth(req, res) {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      status: 'ok',
      environment: env.nodeEnv,
      aiProvider: env.aiProvider,
      aiConfigured: Boolean(env.gemini.apiKey),
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = {
  getHealth
};
