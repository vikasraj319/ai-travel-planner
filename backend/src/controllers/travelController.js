const { saveTrip } = require('../services/travelService.js');
const { createTrip } = require('../services/travelService.js');
const asyncHandler = require('../utils/asyncHandler');
const { chatWithPlanner, generateTravelPlan } = require('../services/travelService');
const { extractTripData } = require('../utils/extractTripData');
const { getTrips } = require("../services/tripService");

const postChat = asyncHandler(async (req, res) => {
  const result = await chatWithPlanner(req.validatedBody);

  res.status(200).json({
    success: true,
    message: result.usedFallback
      ? 'Chat reply generated using fallback response'
      : 'Chat reply generated successfully',
    data: {
      reply: result.reply,
      source: result.source,
      usedFallback: result.usedFallback
    }
  });
});

const postTravelPlan = asyncHandler(async (req, res) => {

  // Generate itinerary
  const result = await generateTravelPlan(req.validatedBody);

  // Save to DB
  const tripData = extractTripData(req.validatedBody.prompt);

  console.log("EXTRACTED:", tripData);

  const savedTrip = await saveTrip(
    tripData,
    result.plan
  );

  // Send CLEAN frontend response
  res.status(200).json({
    success: true,

    plan: result.plan,

    meta: {
      source: result.source,
      usedFallback: result.usedFallback
    },

    savedTripId: savedTrip.id
  });
});

 const generateTrip = async (req, res) => {
  try {
    const trip = await createTrip(req.body)
    res.status(201).json(trip)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const fetchTrips = asyncHandler(
  async (req, res) => {

    const userId = req.user.id;

    const trips =
      await getTrips(userId);

    res.status(200).json({
      success: true,
      trips
    });

  }
);


module.exports = {
  postChat,
  postTravelPlan,
  fetchTrips,
  generateTrip
};
