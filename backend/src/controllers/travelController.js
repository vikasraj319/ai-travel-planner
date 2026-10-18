const {
  saveTrip,
  chatWithPlanner,
  generateTravelPlan,
  resolveSavedTripDetails
} = require('../services/travelService.js');
const asyncHandler = require('../utils/asyncHandler');
const { getTrips } = require("../services/tripService");
const { ensureProfile } = require("../services/profileService");
const { validateTrip } = require("../models/tripModel");

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
  let saveError = null;

  if (req.user && isUsablePlan) {

    // The prompt parser is best-effort; prefer parsed values but fall back to
    // fields the AI returned inside the generated plan.
    const tripDetails = resolveSavedTripDetails(result.tripDetails, plan);

    if (!tripDetails.destination) {
      // Never persist a trip we cannot even attribute to a destination.
      saveError = 'The itinerary was generated but not saved because no destination could be determined.';
    } else {

      const tripData = {
        destination: tripDetails.destination,
        budget: tripDetails.budget,
        days: tripDetails.days,
        user_id: req.user.id
      };

      try {
        // Never persist incomplete/invalid trips
        validateTrip(tripData);

        // trips.user_id -> profiles.id foreign key requires a profile row
        await ensureProfile(req.user, req.accessToken);

        const savedTrip = await saveTrip(
          tripData,
          plan,
          req.accessToken
        );

        savedTripId = savedTrip?.id ?? null;
      } catch (err) {
        // The AI plan itself succeeded; report the save failure without
        // discarding the generated itinerary.
        console.error('Trip save failed:', err.message || err);
        saveError = err.name === 'ApiError'
          ? err.message
          : 'The itinerary was generated but could not be saved. Please try again.';
      }
    }
  }

  res.status(200).json({
    success: true,
    plan: result.plan,
    meta: {
      source: result.source,
      usedFallback: result.usedFallback
    },
    savedTripId,
    ...(saveError ? { saveError } : {})
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
