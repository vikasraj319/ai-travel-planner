const { normalizeText } = require('../utils/promptBuilder');

function buildMockReply(userInput) {
  const cleanInput = normalizeText(userInput) || 'your trip';

  return `That sounds like a beautiful trip idea — ${cleanInput} has a lot of potential. Here's a starter plan you can build on:\n\nDay 1: Arrive, settle in, and explore the most walkable central neighborhood. Choose one landmark area, one café stop, and a relaxed dinner nearby.\n\nDay 2: Focus on the signature experience of the destination — for example culture, food, beaches, or historic sites. Keep the morning for must-sees and leave the evening flexible.\n\nDay 3: Add one hidden gem, one local food experience, and one slower scenic moment so the itinerary does not feel rushed.\n\n✦ Food idea: Try a well-rated local restaurant for lunch and a more atmospheric place for dinner.\n✦ Insider tip: Book major attractions early and keep one half-day unplanned for spontaneous discoveries.\n✦ Practical tip: Stay in a central area to reduce transport time.\n\nIf you want, tell me the destination, number of days, budget, and travel vibe, and I’ll turn this into a much more specific itinerary.`;
}

function buildMockPlan(payload) {
  const destination = normalizeText(payload.destination) || 'your destination';
  const duration = normalizeText(payload.duration) || 'a few days';
  const budget = normalizeText(payload.budget) || 'a flexible budget';
  const interests = Array.isArray(payload.interests) && payload.interests.length
    ? payload.interests.join(', ')
    : 'sightseeing, food, and local experiences';

  return `Here is a sample travel plan for ${destination} over ${duration}. I assumed ${budget} and interests around ${interests}.\n\nDay 1: Arrive, check in, and explore the main neighborhood near your stay. Enjoy a relaxed dinner and an easy evening walk.\n\nDay 2: Visit the destination's top cultural or scenic highlights in the morning, then spend the evening trying a signature local food experience.\n\nDay 3: Slow down with a hidden gem, a local market or café, and one memorable sunset or night activity.\n\n✦ Stay central if possible.\n✦ Keep some buffer time for transport and rest.\n✦ Book any high-demand activities in advance.\n\nSend me more details and I can refine this into a highly specific itinerary.`;
}

module.exports = {
  buildMockReply,
  buildMockPlan
};
