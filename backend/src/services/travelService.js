const { createSupabaseForToken } = require('../lib/supabase');
const { validateTrip, createTripModel } = require('../models/tripModel');
const { generateText } = require('./aiService');
const { buildMockReply } = require('./mockTravelService');
const { CHAT_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT } = require('../constants/systemPrompts');
const { normalizeHistory, buildTravelPlanPrompt, normalizeText } = require('../utils/promptBuilder');
const { extractTripData, parseAmount } = require('../utils/extractTripData');
const { mapSupabaseError } = require('../utils/supabaseErrors');
const ApiError = require('../utils/ApiError');

async function chatWithPlanner({ message, history = [] }) {
  const messages = [...normalizeHistory(history), { role: 'user', content: message }];

  const aiResult = await generateText({
    systemPrompt: CHAT_SYSTEM_PROMPT,
    messages,
    maxTokens: 900,
    temperature: 0.7
  });

  if (aiResult.ok && aiResult.text) {
    return {
      reply: aiResult.text,
      source: aiResult.provider,
      usedFallback: false
    };
  }

  return {
    reply: buildMockReply(message),
    source: 'mock',
    usedFallback: true,
    error: aiResult.error
  };
}

function extractLandmarkName(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/^(visit|explore|check in at|head to|tour of|walk around|dinner at|lunch at|breakfast at|enjoy|relax at|stop by)\s+/i, '')
    .trim();
}

function enrichPlanWithImageQueries(plan) {
  if (!plan || typeof plan !== 'object') return plan;

  const destination = plan.destination || plan.title || 'Travel';

  if (Array.isArray(plan.days)) {
    plan.days.forEach(day => {
      if (Array.isArray(day.activities)) {
        day.activities.forEach(act => {
          if (!act || typeof act !== 'object') return;

          if (!act.imageSearchQuery || typeof act.imageSearchQuery !== 'string' || !act.imageSearchQuery.trim()) {
            const rawPlace = act.location || extractLandmarkName(act.activity || act.title || '');
            const placeName = rawPlace ? rawPlace.trim() : '';

            if (placeName && destination) {
              if (placeName.toLowerCase().includes(destination.toLowerCase())) {
                act.imageSearchQuery = placeName;
              } else {
                act.imageSearchQuery = `${placeName}, ${destination}`;
              }
            } else if (placeName) {
              act.imageSearchQuery = placeName;
            } else {
              act.imageSearchQuery = destination;
            }
          }
        });
      }
    });
  }

  return plan;
}

function extractTripDetails(payload = {}) {
  const prompt = normalizeText(payload.prompt);
  const parsed = prompt
    ? extractTripData(prompt)
    : { destination: 'Unknown', budget: 0, days: 1 };

  const destination = normalizeText(payload.destination) || parsed.destination;

  const durationMatch = normalizeText(payload.duration).match(/(\d+)/);
  const days = durationMatch ? parseInt(durationMatch[1], 10) : parsed.days;

  // Prefer the user's explicitly provided budget (any currency formatting).
  // Never coerce a missing budget to zero.
  const structuredBudget = parseAmount(normalizeText(payload.budget));
  const budget = structuredBudget !== null
    ? structuredBudget
    : (parsed.budget > 0 ? parsed.budget : null);

  return { destination, budget, days };
}

function isMeaningfulDestination(destination) {
  if (!destination || typeof destination !== 'string') return false;
  const cleaned = destination.trim();
  if (!cleaned) return false;
  return cleaned.toLowerCase() !== 'unknown';
}

/**
 * The prompt parser is best-effort, so fall back to fields the AI included in
 * the generated plan before deciding the trip is not worth saving.
 */
function resolveSavedTripDetails(tripDetails = {}, plan = {}) {
  const destination = isMeaningfulDestination(tripDetails.destination)
    ? tripDetails.destination
    : (normalizeText(plan.destination) || normalizeText(plan.title) || null);

  const planDays = Array.isArray(plan.days)
    ? plan.days.filter((day) => day && typeof day === 'object').length
    : 0;

  let days = Number(tripDetails.days);
  // The parser defaults to 1 day when the request did not mention a duration;
  // prefer the number of days the AI actually produced in that case.
  if (!Number.isInteger(days) || days <= 0 || (days === 1 && planDays > 1)) {
    days = planDays > 0 ? planDays : null;
  }

  let budget = tripDetails.budget === null || tripDetails.budget === undefined
    ? null
    : Number(tripDetails.budget);

  if (!Number.isFinite(budget)) {
    if (plan.budget && typeof plan.budget === 'object' && !Array.isArray(plan.budget)) {
      // The AI is asked to emit currency-formatted strings (e.g. "₹5,000"),
      // so parse each line instead of trusting Number().
      const total = Object.values(plan.budget).reduce(
        (sum, value) => sum + (parseAmount(value) || 0),
        0
      );
      budget = total > 0 ? Math.round(total) : null;
    } else {
      const parsed = parseAmount(plan.budget);
      budget = parsed && parsed > 0 ? Math.round(parsed) : null;
    }
  }

  return { destination, budget, days };
}

async function generateTravelPlan(payload) {

  const userPrompt = buildTravelPlanPrompt(payload);

  // Extracted from the user's request
  const tripDetails = extractTripDetails(payload);

  const prompt = `
${PLAN_SYSTEM_PROMPT}

User request:
${userPrompt}

Trip details:
Destination: ${tripDetails.destination ?? "Not specified"}
Budget: ${tripDetails.budget ?? "Not specified"}
Days: ${tripDetails.days ?? "Not specified"}
`;

  const history = normalizeHistory(payload.history);

  const messages = [
    ...history,
    {
      role: "user",
      content: prompt
    }
  ];

  const aiResult = await generateText({
    systemPrompt: PLAN_SYSTEM_PROMPT,
    messages,
    maxTokens: 4000,
    temperature: 0.7
  });

  if (aiResult.ok && aiResult.text) {

    let cleanText = aiResult.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsedPlan;

    try {

      parsedPlan = JSON.parse(cleanText);

      parsedPlan = enrichPlanWithImageQueries(parsedPlan);

    } catch (err) {

      console.error("Backend parse failed:", err);

      parsedPlan = {
        title: "Generated Itinerary",
        overview: cleanText,
        days: [],
        food: [],
        tips: [],
        budget: {}
      };
    }

    return {
      plan: parsedPlan,
      tripDetails,
      source: aiResult.provider,
      usedFallback: false
    };
  }

  return {
    plan: null,
    tripDetails,
    source: "mock",
    usedFallback: true,
    error: aiResult.error
  };
}

async function saveTrip(data, itinerary, accessToken) {
  if (!accessToken) {
    throw new ApiError(401, 'An authenticated session is required to save a trip');
  }

  if (!itinerary || typeof itinerary !== 'object' || Array.isArray(itinerary)) {
    throw new ApiError(400, 'Cannot save an invalid travel plan');
  }

  validateTrip(data);

  const trip = {
    ...createTripModel(data),

    // The live `trips.itinerary` column is TEXT, so the plan must be stored
    // as a JSON string. tripService parses it back into an object on read.
    itinerary: JSON.stringify(itinerary)
  };

  // Scope the write to the end user's identity so RLS policies apply
  const client = createSupabaseForToken(accessToken);

  let response;

  try {
    response = await client
      .from('trips')
      .insert([trip])
      .select()
      .single();
  } catch (err) {
    throw mapSupabaseError(err, 'Failed to save trip');
  }

  if (response.error) {
    throw mapSupabaseError(response.error, 'Failed to save trip');
  }

  console.log('Trip saved:', response.data?.id);

  return response.data;
}

module.exports = {
  chatWithPlanner,
  generateTravelPlan,
  saveTrip,
  extractTripDetails,
  resolveSavedTripDetails,
};
