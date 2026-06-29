const { saveTrip, createTrip, chatWithPlanner, generateTravelPlan } = require('../services/travelService.js');
const asyncHandler = require('../utils/asyncHandler');
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

  const result = await generateTravelPlan(req.validatedBody);

  const plan = result.plan;

  let savedTripId = null;

  // Only save to DB if user is authenticated
  if (req.user) {
    const budgetTotal = plan.budget && typeof plan.budget === "object"
      ? Object.values(plan.budget).reduce((sum, v) => sum + (Number(v) || 0), 0)
      : Number(plan.budget) || 0;

    const tripData = {
      destination: plan.destination || plan.title || "Unknown",
      budget: budgetTotal,
      days: plan.days?.length || 1,
      user_id: req.user.id
    };

    const savedTrip = await saveTrip(tripData, result.plan);
    savedTripId = savedTrip.id;
  }

  res.status(200).json({
    success: true,
    plan: result.plan,
    meta: {
      source: result.source,
      usedFallback: result.usedFallback
    },
    savedTripId
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
