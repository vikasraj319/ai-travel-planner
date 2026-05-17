const express = require('express');
const { generateTrip } = require('../controllers/travelController');

const { postChat, postTravelPlan } = require('../controllers/travelController');
const validateRequest = require('../middleware/validateRequest');
const { validateChatInput, validateTravelPlanInput } = require('../validators/travelValidator');

const router = express.Router();

router.post('/chat', validateRequest(validateChatInput), postChat);
router.post('/travel-plan', validateRequest(validateTravelPlanInput), postTravelPlan);
router.post('/generate-trip', generateTrip);

module.exports = router;

