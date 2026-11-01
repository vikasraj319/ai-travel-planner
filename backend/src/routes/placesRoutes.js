const express = require('express');

const { getNearby } = require('../controllers/placesController');
const validateQuery = require('../middleware/validateQuery');
const { validateNearbyQuery } = require('../validators/discoveryValidator');

const router = express.Router();

router.get('/nearby', validateQuery(validateNearbyQuery), getNearby);

module.exports = router;
