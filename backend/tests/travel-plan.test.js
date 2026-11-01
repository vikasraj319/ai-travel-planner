// The AI provider is stubbed so the travel-plan endpoint can be exercised
// hermetically: both the success path and the provider-failure path.
process.env.NODE_ENV = 'test';

const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const genaiPath = require.resolve('@google/genai');

let providerText = '';

class FakeGoogleGenAI {
  constructor() {
    this.models = {
      generateContent: async () => ({ text: providerText })
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
const { setFetchImpl } = require('../src/lib/httpClient');
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const originalApiKey = env.gemini.apiKey;

beforeEach(() => {
  env.gemini.apiKey = 'test-key';
  providerText = JSON.stringify({
    title: 'Goa Getaway',
    destination: 'Goa',
    overview: 'Three days on the coast.',
    days: [
      { day: 1, activities: [{ time: '09:00', activity: 'Walk the beach road' }] },
      { day: 2, activities: [{ time: '10:00', activity: 'Visit the old town' }] },
      { day: 3, activities: [{ time: '11:00', activity: 'Sunset at the fort' }] }
    ],
    food: ['Local seafood'],
    tips: ['Rent a scooter'],
    budget: { stay: '2000', food: '1000' }
  });

  // Any discovery call would throw, so a request that succeeds proves the
  // travel-plan endpoint does not depend on the discovery providers.
  setFetchImpl(async (url) => {
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
});

afterEach(() => {
  env.gemini.apiKey = originalApiKey;
  setFetchImpl(null);
});

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

test('a generated plan is returned without touching the discovery providers', async () => {
  const { status, body } = await request('/api/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Trip to Goa for 3 days', destination: 'Goa' })
  });

  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.plan.title, 'Goa Getaway');
  assert.equal(body.plan.days.length, 3);
  assert.equal(body.meta.usedFallback, false);
  assert.equal(body.trip.destination, 'Goa');
});

test('POST /api/travel-plan reports a provider failure instead of an empty plan', async () => {
  // An empty key short-circuits the provider call.
  env.gemini.apiKey = '';

  const { status, body } = await request('/api/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Trip to Goa for 3 days', destination: 'Goa' })
  });

  assert.equal(status, 503);
  assert.equal(body.success, false);
  assert.equal(body.plan, undefined);
  assert.match(body.message, /try again/i);
});
