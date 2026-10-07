const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const corsOptions = require('./config/corsOptions');
const healthRoutes = require('./routes/healthRoutes');
const travelRoutes = require('./routes/travelRoutes');
const profileRoutes = require('./routes/profileRoutes');
const imageRoutes = require("./routes/imageRoutes");
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

// Higher budget for image lookups (heavily cached, called once per landmark)
const imageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many image requests. Please try again later.'
  }
});

// Tighter budget for the unauthenticated AI chat endpoint (cost control)
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many chat requests. Please try again later.'
  }
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use('/api/images', imageLimiter, imageRoutes);
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Horizons backend is running'
  });
});

app.use('/api', healthRoutes);
app.use('/api/chat', chatLimiter);
app.use('/api', travelRoutes);
app.use('/api', profileRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
