const ApiError = require('../utils/ApiError');
const { normalizeText } = require('../utils/promptBuilder');

function ensureString(value, fieldName, { required = false, maxLength = 2000 } = {}) {
  if (value === undefined || value === null) {
    if (required) {
      throw new ApiError(400, `${fieldName} is required`);
    }
    return '';
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, `${fieldName} must be a string`);
  }

  const cleaned = normalizeText(value);

  if (required && !cleaned) {
    throw new ApiError(400, `${fieldName} cannot be empty`);
  }

  if (cleaned.length > maxLength) {
    throw new ApiError(400, `${fieldName} must be at most ${maxLength} characters`);
  }

  return cleaned;
}

function ensureHistory(history) {
  if (history === undefined) return [];

  if (!Array.isArray(history)) {
    throw new ApiError(400, 'history must be an array');
  }

  if (history.length > 20) {
    throw new ApiError(400, 'history can contain at most 20 messages');
  }

  return history.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new ApiError(400, `history[${index}] must be an object`);
    }

    const role = item.role;
    if (!['user', 'assistant'].includes(role)) {
      throw new ApiError(400, `history[${index}].role must be "user" or "assistant"`);
    }

    const content = ensureString(item.content, `history[${index}].content`, {
      required: true,
      maxLength: 4000
    });

    return { role, content };
  });
}

function ensureInterests(interests) {
  if (interests === undefined) return [];

  if (Array.isArray(interests)) {
    return interests
      .map((item, index) => ensureString(item, `interests[${index}]`, { maxLength: 100 }))
      .filter(Boolean)
      .slice(0, 10);
  }

  if (typeof interests === 'string') {
    return interests
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  throw new ApiError(400, 'interests must be a string or an array of strings');
}

function validateChatInput(body) {
  return {
    message: ensureString(body.message, 'message', { required: true, maxLength: 2000 }),
    history: ensureHistory(body.history)
  };
}

function validateTravelPlanInput(body) {
  const prompt = ensureString(body.prompt, 'prompt', { maxLength: 2500 });
  const destination = ensureString(body.destination, 'destination', { maxLength: 120 });

  if (!prompt && !destination) {
    throw new ApiError(400, 'Provide either prompt or destination');
  }

  return {
    prompt,
    destination,
    duration: ensureString(body.duration, 'duration', { maxLength: 80 }),
    budget: ensureString(body.budget, 'budget', { maxLength: 80 }),
    travelStyle: ensureString(body.travelStyle, 'travelStyle', { maxLength: 80 }),
    companions: ensureString(body.companions, 'companions', { maxLength: 80 }),
    startDate: ensureString(body.startDate, 'startDate', { maxLength: 80 }),
    notes: ensureString(body.notes, 'notes', { maxLength: 600 }),
    interests: ensureInterests(body.interests),
    history: ensureHistory(body.history)
  };
}

module.exports = {
  validateChatInput,
  validateTravelPlanInput
};
