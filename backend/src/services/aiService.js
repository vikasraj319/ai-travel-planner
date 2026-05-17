const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');

async function callGemini({ systemPrompt, messages, maxTokens = 900, temperature = 0.7 }) {
  if (!env.gemini.apiKey) {
    return {
      ok: false,
      provider: 'gemini',
      error: 'Missing GEMINI_API_KEY'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

    const conversationText = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: env.gemini.model,
      contents: `${conversationText}`,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        maxOutputTokens: maxTokens
      }
    });

    return {
      ok: true,
      provider: 'gemini',
      text: response.text || ''
    };
  } catch (error) {
    return {
      ok: false,
      provider: 'gemini',
      error: error.message
    };
  }
}

async function generateText(options) {
  if (env.aiProvider === 'gemini') {
    return callGemini(options);
  }

  return {
    ok: false,
    provider: env.aiProvider,
    error: `Unsupported AI_PROVIDER: ${env.aiProvider}`
  };
}

module.exports = {
  generateText
};