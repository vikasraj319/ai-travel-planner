const express = require('express');
const { generateTrip } = require('../controllers/travelController');

const { postChat, postTravelPlan, fetchTrips } = require('../controllers/travelController');
const validateRequest = require('../middleware/validateRequest');
const { validateChatInput, validateTravelPlanInput } = require('../validators/travelValidator');
const { authenticateUser, optionalAuthenticateUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.post('/chat', validateRequest(validateChatInput), postChat);
router.post('/travel-plan', optionalAuthenticateUser, validateRequest(validateTravelPlanInput), postTravelPlan);
router.post('/generate-trip', generateTrip);
router.get("/trips", authenticateUser, fetchTrips);

module.exports = router;

