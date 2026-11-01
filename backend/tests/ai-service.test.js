process.env.NODE_ENV = 'test';

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// The Gemini SDK is replaced before the service under test is loaded, so the
// provider can be driven into every failure mode without network access.
// ---------------------------------------------------------------------------

const genaiPath = require.resolve('@google/genai');

let providerBehaviour = null;

class FakeGoogleGenAI {
  constructor() {
    this.models = {
      generateContent: async () => providerBehaviour()
    };
  }
}

require.cache[genaiPath] = {
  id: genaiPath,
  filename: genaiPath,
  loaded: true,
  children: [],
  paths: [],
  exports: { GoogleGenAI: FakeGoogleGenAI }
};

const env = require('../src/config/env');
const { generateText, parseProviderError, classifyFailure } = require('../src/services/aiService');
const { describeAiFailure } = require('../src/services/travelService');

const originalEnv = {
  apiKey: env.gemini.apiKey,
  model: env.gemini.model,
  aiProvider: env.aiProvider,
  aiMaxAttempts: env.aiMaxAttempts,
  aiRetryBaseDelayMs: env.aiRetryBaseDelayMs,
  aiRetryMaxDelayMs: env.aiRetryMaxDelayMs
};

beforeEach(() => {
  env.gemini.apiKey = 'test-key';
  env.aiProvider = 'gemini';
  env.aiMaxAttempts = 3;
  env.aiRetryBaseDelayMs = 10;
  env.aiRetryMaxDelayMs = 20;
  providerBehaviour = null;
});

afterEach(() => {
  env.gemini.apiKey = originalEnv.apiKey;
  env.gemini.model = originalEnv.model;
  env.aiProvider = originalEnv.aiProvider;
  env.aiMaxAttempts = originalEnv.aiMaxAttempts;
  env.aiRetryBaseDelayMs = originalEnv.aiRetryBaseDelayMs;
  env.aiRetryMaxDelayMs = originalEnv.aiRetryMaxDelayMs;
});

function providerError(payload) {
  return new Error(JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// Error parsing / classification
// ---------------------------------------------------------------------------

test('parseProviderError extracts the code and message from the provider payload', () => {
  const parsed = parseProviderError(
    providerError({
      error: {
        code: 404,
        message: 'This model models/gemini-2.0-flash is no longer available.',
        status: 'NOT_FOUND'
      }
    })
  );

  assert.equal(parsed.status, 404);
  assert.equal(parsed.providerStatus, 'NOT_FOUND');
  assert.match(parsed.message, /no longer available/);
});

test('parseProviderError keeps the raw message when the payload is not JSON', () => {
  const parsed = parseProviderError(new Error('socket hang up'));

  assert.equal(parsed.status, null);
  assert.equal(parsed.message, 'socket hang up');
});

test('classifyFailure detects a retired model', () => {
  assert.equal(
    classifyFailure({
      status: 404,
      providerStatus: 'NOT_FOUND',
      message: 'This model is no longer available.'
    }),
    'model_unavailable'
  );
});

test('classifyFailure detects rate limits and provider overload', () => {
  assert.equal(
    classifyFailure({ status: 429, providerStatus: 'RESOURCE_EXHAUSTED', message: 'quota' }),
    'rate_limit'
  );
  assert.equal(
    classifyFailure({ status: 503, providerStatus: 'UNAVAILABLE', message: 'high demand' }),
    'provider_unavailable'
  );
});

test('classifyFailure detects a timeout', () => {
  assert.equal(
    classifyFailure({ status: null, providerStatus: null, message: 'AI request timed out after 200ms' }),
    'timeout'
  );
});

// ---------------------------------------------------------------------------
// Retry behaviour
// ---------------------------------------------------------------------------

test('a transient provider error is retried and then succeeds', async () => {
  let calls = 0;

  providerBehaviour = async () => {
    calls += 1;
    if (calls === 1) {
      throw providerError({
        error: { code: 503, message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' }
      });
    }
    return { text: 'itinerary' };
  };

  const result = await generateText({
    systemPrompt: 'test',
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 100
  });

  assert.equal(result.ok, true);
  assert.equal(result.text, 'itinerary');
  assert.equal(calls, 2);
  assert.equal(result.attempts, 2);
});

test('a retired model is not retried', async () => {
  let calls = 0;

  providerBehaviour = async () => {
    calls += 1;
    throw providerError({
      error: { code: 404, message: 'This model is no longer available.', status: 'NOT_FOUND' }
    });
  };

  const result = await generateText({
    systemPrompt: 'test',
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 100
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'model_unavailable');
  assert.equal(calls, 1, 'a retired model must not be retried');
});

test('a missing API key fails without calling the provider', async () => {
  env.gemini.apiKey = '';

  let calls = 0;
  providerBehaviour = async () => {
    calls += 1;
    return { text: 'unused' };
  };

  const result = await generateText({
    systemPrompt: 'test',
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 100
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_credentials');
  assert.equal(calls, 0);
});

test('a hanging provider is reported as a timeout and never exceeds the budget', async () => {
  providerBehaviour = () => new Promise(() => {});

  const startedAt = Date.now();
  const result = await generateText({
    systemPrompt: 'test',
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 100,
    timeoutMs: 300
  });
  const elapsed = Date.now() - startedAt;

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'timeout');
  assert.ok(elapsed < 1500, `the call must respect its budget, took ${elapsed}ms`);
});

test('an unsupported provider is reported as such', async () => {
  env.aiProvider = 'openai';

  const result = await generateText({
    systemPrompt: 'test',
    messages: [{ role: 'user', content: 'hi' }]
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unsupported_provider');
});

// ---------------------------------------------------------------------------
// User facing copy
// ---------------------------------------------------------------------------

test('every failure reason has a user facing message', () => {
  const reasons = [
    'missing_credentials',
    'invalid_credentials',
    'model_unavailable',
    'rate_limit',
    'provider_unavailable',
    'timeout',
    'invalid_request',
    'provider_error'
  ];

  for (const reason of reasons) {
    const message = describeAiFailure(reason);
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 0, `missing message for ${reason}`);
  }
});

test('an unknown reason still produces a generic message', () => {
  const message = describeAiFailure('something_else');

  assert.equal(typeof message, 'string');
  assert.ok(message.length > 0);
});
