const express = require('express');

const { postChat, postTravelPlan, fetchTrips } = require('../controllers/travelController');
const validateRequest = require('../middleware/validateRequest');
const { validateChatInput, validateTravelPlanInput } = require('../validators/travelValidator');
const { authenticateUser, optionalAuthenticateUser } = require("../middleware/authMiddleware");

const router = express.Router();

router.post('/chat', optionalAuthenticateUser, validateRequest(validateChatInput), postChat);
router.post('/travel-plan', optionalAuthenticateUser, validateRequest(validateTravelPlanInput), postTravelPlan);
router.get("/trips", authenticateUser, fetchTrips);

module.exports = router;

