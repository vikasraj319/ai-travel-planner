const { saveTrip } = require('../services/travelService.js');
const { createTrip } = require('../services/travelService.js');
const asyncHandler = require('../utils/asyncHandler');
const { chatWithPlanner, generateTravelPlan } = require('../services/travelService');

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
  // 1. Generate AI itinerary
  console.log("postTravelPlan hit");
  console.log(req.validatedBody);
  const result = await generateTravelPlan(req.validatedBody);

  // 2. Save to database
  console.log("AI RESULT:");
  console.log(result);
  const savedTrip = await saveTrip(
    {
      destination: req.validatedBody.destination || "Unknown",
      budget: req.validatedBody.budget || 0,
      days: req.validatedBody.days || 1
    },
    result.plan
  );

  console.log("Trip saved:", savedTrip);

  // 3. Send response
  res.status(200).json({
    success: true,
    message: result.usedFallback
      ? 'Travel plan generated using fallback response'
      : 'Travel plan generated successfully',

    data: {
      plan: result.plan,
      source: result.source,
      usedFallback: result.usedFallback,
      savedTrip
    }
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



module.exports = {
  postChat,
  postTravelPlan,

  generateTrip
};
