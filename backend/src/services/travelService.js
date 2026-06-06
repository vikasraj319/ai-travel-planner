const { supabase } = require('../lib/supabase');
const { validateTrip, createTripModel } = require('../models/tripmodel');
const { generateText } = require('./aiService');
const { buildMockReply, buildMockPlan } = require('./mockTravelService');
const { CHAT_SYSTEM_PROMPT, PLAN_SYSTEM_PROMPT } = require('../constants/systemPrompts');
const { normalizeHistory, buildTravelPlanPrompt } = require('../utils/promptBuilder');

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

async function generateTravelPlan(payload) {
  const userPrompt = buildTravelPlanPrompt(payload);

  const prompt = `
  ${PLAN_SYSTEM_PROMPT}

  User request:
  ${userPrompt}
  `;
  const history = normalizeHistory(payload.history);
  const messages = [...history, { role: 'user', content: prompt }];

  const aiResult = await generateText({
    systemPrompt: PLAN_SYSTEM_PROMPT,
    messages,
    maxTokens: 4000,
    temperature: 0.7
  });

  console.log("===== AI RESULT =====");
  console.log(JSON.stringify(aiResult, null, 2));
  console.log("=====================");

  if (aiResult.ok && aiResult.text) {
     let cleanText = aiResult.text;

    cleanText = cleanText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    let parsedPlan;

    try {

      parsedPlan = JSON.parse(cleanText);

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
      source: aiResult.provider,
      usedFallback: false
    };
  }

  return {
    plan: "AI is temporarily unavialable. Please try agian later",
    source: 'mock',
    usedFallback: true,
    error: aiResult.error
  };
}

async function createTrip(data) {
  // 1. Validate input
  validateTrip(data)

  // 2. Generate AI itinerary
  const itinerary = await generateTravelPlan(data)

  // 3. Prepare trip object
  const trip = {
    ...createTripModel(data),
    itinerary: JSON.stringify(itinerary)
  }

  // 4. Save to Supabase
  const { data: result, error } = await supabase
    .from('trips')
    .insert([trip])
    .select()

  if (error) throw error

  return result[0]
}

async function saveTrip(data, itinerary) {
  try {

    validateTrip(data);

    const trip = {
      ...createTripModel(data),

      // IMPORTANT:
      // store plain text, NOT JSON.stringify
      itinerary
    };

    const { data: result, error } = await supabase
      .from('trips')
      .insert([trip])
      .select();

    if (error) {
      console.error("SUPABASE ERROR:", error);
      throw error;
    }

    console.log("Trip saved:", result);

    return result[0];

  } catch (err) {
    console.error("SAVE ERROR:", err);
    throw err;
  }
}

module.exports = {
  chatWithPlanner,
  generateTravelPlan,
  createTrip,
  saveTrip,
};
