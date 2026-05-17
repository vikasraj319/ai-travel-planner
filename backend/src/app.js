const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { saveTrip } = require('./services/travelService');
const corsOptions = require('./config/corsOptions');
const healthRoutes = require('./routes/healthRoutes');
const travelRoutes = require('./routes/travelRoutes');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Horizons backend is running'
  });
});

app.post('/api/save-trip', async (req, res) => {
  try {
    const { destination, itinerary } = req.body;

    const result = await saveTrip(
      { destination },
      itinerary
    );

    res.json({
      success: true,
      data: result
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.use('/api', healthRoutes);
app.use('/api', travelRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
