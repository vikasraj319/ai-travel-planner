const express = require('express');

const { getLiveEvents } = require('../controllers/eventsController');
const validateQuery = require('../middleware/validateQuery');
const { validateEventsQuery } = require('../validators/discoveryValidator');

const router = express.Router();

router.get('/', validateQuery(validateEventsQuery), getLiveEvents);

module.exports = router;
