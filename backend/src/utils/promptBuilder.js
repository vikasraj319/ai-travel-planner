const env = require('../config/env');

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: normalizeText(item.content)
    }))
    .filter((item) => item.content)
    .slice(-env.maxHistoryMessages);
}

function buildTravelPlanPrompt(payload) {
  const prompt = normalizeText(payload.prompt);
  if (prompt) return prompt;

  const interests = Array.isArray(payload.interests)
    ? payload.interests.filter(Boolean).join(', ')
    : normalizeText(payload.interests);

  const lines = [
    'Create a travel plan with the following details:',
    `Destination: ${normalizeText(payload.destination) || 'Not provided'}`,
    `Duration: ${normalizeText(payload.duration) || 'Not provided'}`,
    `Budget: ${normalizeText(payload.budget) || 'Not provided'}`,
    `Travel style: ${normalizeText(payload.travelStyle) || 'Not provided'}`,
    `Companions: ${normalizeText(payload.companions) || 'Not provided'}`,
    `Start date: ${normalizeText(payload.startDate) || 'Not provided'}`,
    `Interests: ${interests || 'Not provided'}`
  ];

  if (normalizeText(payload.notes)) {
    lines.push(`Extra notes: ${normalizeText(payload.notes)}`);
  }

  lines.push('Make reasonable assumptions where information is missing.');

  return lines.join('\n');
}

module.exports = {
  normalizeText,
  normalizeHistory,
  buildTravelPlanPrompt
};
