// Hermetic environment defaults (only used when backend/.env is absent).
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

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

test('root endpoint responds', async () => {
  const { status, body } = await request('/');
  assert.equal(status, 200);
  assert.equal(body.success, true);
});

test('health endpoint responds', async () => {
  const { status, body } = await request('/api/health');
  assert.equal(status, 200);
  assert.equal(body.data.status, 'ok');
});

test('unknown route returns 404', async () => {
  const { status, body } = await request('/api/does-not-exist');
  assert.equal(status, 404);
  assert.equal(body.success, false);
});

test('GET /api/trips without Authorization returns 401', async () => {
  const { status, body } = await request('/api/trips');
  assert.equal(status, 401);
  assert.equal(body.success, false);
});

test('GET /api/trips with malformed Authorization returns 401', async () => {
  const { status } = await request('/api/trips', {
    headers: { Authorization: 'Token abc' }
  });
  assert.equal(status, 401);
});

test('POST /api/profile without Authorization returns 401', async () => {
  const { status } = await request('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'x' })
  });
  assert.equal(status, 401);
});

test('POST /api/chat without message returns 400 (validation)', async () => {
  const { status, body } = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /message is required/i);
});

test('POST /api/travel-plan with empty body returns 400 (validation)', async () => {
  const { status, body } = await request('/api/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(status, 400);
  assert.match(body.message, /prompt or destination/i);
});

test('POST /api/travel-plan with whitespace-only input returns 400', async () => {
  const { status } = await request('/api/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: '   ', destination: '   ' })
  });
  assert.equal(status, 400);
});

test('POST /api/travel-plan rejects invalid history type', async () => {
  const { status } = await request('/api/travel-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Trip to Goa', history: 'not-an-array' })
  });
  assert.equal(status, 400);
});
