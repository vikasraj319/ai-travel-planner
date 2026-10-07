const { saveTrip, chatWithPlanner, generateTravelPlan } = require('../services/travelService.js');
const asyncHandler = require('../utils/asyncHandler');
const { getTrips } = require("../services/tripService");
const { ensureProfile } = require("../services/profileService");

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

  const isUsablePlan =
    plan &&
    typeof plan === "object" &&
    !Array.isArray(plan);

  let savedTripId = null;

  if (req.user && isUsablePlan) {

    const tripData = {
      destination: result.tripDetails.destination,
      budget: result.tripDetails.budget,
      days: result.tripDetails.days,
      user_id: req.user.id
    };

    // trips.user_id -> profiles.id foreign key requires a profile row
    await ensureProfile(req.user, req.accessToken);

    const savedTrip = await saveTrip(
      tripData,
      result.plan,
      req.accessToken
    );

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

 const fetchTrips = asyncHandler(
  async (req, res) => {

    const userId = req.user.id;

    const trips =
      await getTrips(userId, req.accessToken);

    res.status(200).json({
      success: true,
      trips
    });

  }
);


module.exports = {
  postChat,
  postTravelPlan,
  fetchTrips
};
