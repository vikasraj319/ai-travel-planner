process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { validateTrip, createTripModel } = require('../src/models/tripModel');
const { extractTripDetails, resolveSavedTripDetails } = require('../src/services/travelService');
const { parseTripRow } = require('../src/services/tripService');

const USER_ID = '11111111-2222-3333-4444-555555555555';

test('validateTrip accepts a valid trip', () => {
  const trip = validateTrip({
    user_id: USER_ID,
    destination: '  Goa  ',
    budget: '50000',
    days: '3'
  });

  assert.equal(trip.destination, 'Goa');
  assert.equal(trip.budget, 50000);
  assert.equal(trip.days, 3);
});

test('validateTrip rounds fractional budgets (integer column)', () => {
  const trip = validateTrip({ user_id: USER_ID, destination: 'Goa', budget: 1500.6, days: 2 });
  assert.equal(trip.budget, 1501);
});

test('validateTrip requires a budget (NOT NULL column)', () => {
  assert.throws(
    () => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: '', days: 3 }),
    /budget is required/i
  );
  assert.throws(
    () => validateTrip({ user_id: USER_ID, destination: 'Goa', days: 3 }),
    /budget is required/i
  );
  assert.throws(
    () => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: null, days: 3 }),
    /budget is required/i
  );
});

test('validateTrip allows days to be omitted (resolver supplies a default)', () => {
  const trip = validateTrip({ user_id: USER_ID, destination: 'Goa', budget: 5000 });
  assert.equal(trip.days, null);
});

test('validateTrip rejects invalid budget', () => {
  assert.throws(() => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: 'abc' }), /Invalid budget/);
  assert.throws(() => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: -5 }), /Invalid budget/);
  assert.throws(() => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: 99999999999 }), /Invalid budget/);
});

test('validateTrip rejects invalid days', () => {
  assert.throws(() => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: 100, days: 0 }), /Invalid number of days/);
  assert.throws(() => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: 100, days: 1.5 }), /Invalid number of days/);
  assert.throws(() => validateTrip({ user_id: USER_ID, destination: 'Goa', budget: 100, days: 400 }), /Invalid number of days/);
});

test('validateTrip rejects missing/invalid user id', () => {
  assert.throws(() => validateTrip({ destination: 'Goa', budget: 100, days: 1 }), /valid user id/i);
  assert.throws(() => validateTrip({ user_id: 'not-a-uuid', destination: 'Goa', budget: 100 }), /valid user id/i);
});

test('validateTrip rejects empty destination', () => {
  assert.throws(() => validateTrip({ user_id: USER_ID, destination: '   ', budget: 100 }), /Destination cannot be empty/);
});

test('createTripModel builds a row object', () => {
  const model = createTripModel({ user_id: USER_ID, destination: 'Goa', budget: 100, days: 2 });
  assert.equal(model.user_id, USER_ID);
  assert.equal(model.destination, 'Goa');
  assert.equal(model.budget, 100);
  assert.equal(model.days, 2);
  assert.ok(model.created_at instanceof Date);
});

test('extractTripDetails parses prompt fields', () => {
  const details = extractTripDetails({
    prompt: 'Trip to Goa for 3 days with a budget of 50000 rupees'
  });

  assert.equal(details.destination, 'Goa');
  assert.equal(details.days, 3);
  assert.equal(details.budget, 50000);
});

test('extractTripDetails parses the labeled prompt produced by the form', () => {
  const details = extractTripDetails({
    prompt: 'Create a personalized travel itinerary. Destination: Goa. Number of days: 3. Budget: 5000. Travel style: Relaxed.'
  });

  assert.equal(details.destination, 'Goa');
  assert.equal(details.days, 3);
  assert.equal(details.budget, 5000);
});

test('extractTripDetails prefers structured fields over the prompt', () => {
  const details = extractTripDetails({
    prompt: 'Create a personalized travel itinerary. Destination: Goa. Number of days: 3. Budget: 5000.',
    destination: 'Kyoto',
    duration: '5',
    budget: '₹1,20,000'
  });

  assert.equal(details.destination, 'Kyoto');
  assert.equal(details.days, 5);
  assert.equal(details.budget, 120000);
});

test('resolveSavedTripDetails falls back to generated plan fields', () => {
  const details = resolveSavedTripDetails(
    { destination: 'Unknown', budget: null, days: 1 },
    { destination: 'Tokyo', days: [{}, {}, {}], budget: { stay: '100', food: '50' } }
  );

  assert.equal(details.destination, 'Tokyo');
  assert.equal(details.days, 3);
  assert.equal(details.budget, 150);
});

test('resolveSavedTripDetails parses currency-formatted AI budget', () => {
  const details = resolveSavedTripDetails(
    { destination: 'Unknown', budget: null, days: 1 },
    {
      destination: 'Goa',
      days: [{}, {}],
      budget: { stay: '₹5,000', food: '₹2,500', transport: '₹1,500' }
    }
  );

  assert.equal(details.destination, 'Goa');
  assert.equal(details.days, 2);
  assert.equal(details.budget, 9000);
});

test('resolveSavedTripDetails keeps parser values when meaningful', () => {
  const details = resolveSavedTripDetails(
    { destination: 'Goa', budget: 50000, days: 3 },
    { title: 'ignored' }
  );

  assert.deepEqual(details, { destination: 'Goa', budget: 50000, days: 3 });
});

test('parseTripRow decodes JSON-string itinerary (TEXT column contract)', () => {
  const plan = { title: 'Goa Escape', days: [{ day: 1 }] };
  const row = parseTripRow({ id: '1', itinerary: JSON.stringify(plan) });
  assert.deepEqual(row.itinerary, plan);
});

test('parseTripRow leaves malformed itinerary as a raw string', () => {
  const row = parseTripRow({ id: '1', itinerary: 'not json' });
  assert.equal(row.itinerary, 'not json');
});

test('parseTripRow handles null and pre-parsed itinerary', () => {
  assert.equal(parseTripRow({ id: '1', itinerary: null }).itinerary, null);
  const plan = { title: 'x' };
  assert.deepEqual(parseTripRow({ id: '1', itinerary: plan }).itinerary, plan);
});

test('JSON stringify/parse round-trips a full plan (save/read contract)', () => {
  const plan = {
    title: 'Goa',
    destination: 'Goa',
    budget: { stay: '1000' },
    days: [{ day: 1, activities: [{ time: '09:00', activity: 'Beach' }] }],
    food: ['A', 'B'],
    tips: ['C']
  };

  assert.deepEqual(JSON.parse(JSON.stringify(plan)), plan);
});
