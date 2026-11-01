process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  haversineMeters,
  formatDistance,
  isValidCoordinate,
  parseProvidedCoordinate,
  resolveCoordinates
} = require('../src/utils/geo');

test('isValidCoordinate accepts real coordinates', () => {
  assert.equal(isValidCoordinate(15.2993, 74.124), true);
  assert.equal(isValidCoordinate(-90, 180), true);
});

test('isValidCoordinate rejects out-of-range and non-numeric values', () => {
  assert.equal(isValidCoordinate(91, 0), false);
  assert.equal(isValidCoordinate(0, 181), false);
  assert.equal(isValidCoordinate(NaN, 0), false);
  assert.equal(isValidCoordinate('abc', 0), false);
  assert.equal(isValidCoordinate(null, null), false);
});

test('parseProvidedCoordinate treats absent values as null, not 0', () => {
  // Number(null) and Number('') are 0, which is a valid coordinate; these must
  // not be mistaken for an explicit (0, 0) request.
  assert.equal(parseProvidedCoordinate(null), null);
  assert.equal(parseProvidedCoordinate(undefined), null);
  assert.equal(parseProvidedCoordinate(''), null);
  assert.equal(parseProvidedCoordinate('   '), null);
  assert.equal(parseProvidedCoordinate('abc'), null);
  assert.equal(parseProvidedCoordinate(0), 0);
  assert.equal(parseProvidedCoordinate('0'), 0);
  assert.equal(parseProvidedCoordinate(15.3), 15.3);
  assert.equal(parseProvidedCoordinate('15.3'), 15.3);
});

test('resolveCoordinates returns null for missing input but honours real (0,0)', () => {
  assert.equal(resolveCoordinates(null, null), null);
  assert.equal(resolveCoordinates(undefined, undefined), null);
  assert.equal(resolveCoordinates('', ''), null);
  assert.equal(resolveCoordinates(15.3, null), null);
  assert.equal(resolveCoordinates(null, 74.1), null);
  assert.equal(resolveCoordinates(999, 0), null);
  // A genuine explicit (0, 0) is still allowed.
  assert.deepEqual(resolveCoordinates(0, 0), { lat: 0, lng: 0 });
  assert.deepEqual(resolveCoordinates('15.3', '74.1'), { lat: 15.3, lng: 74.1 });
});

test('haversineMeters returns 0 for identical points', () => {
  assert.equal(haversineMeters({ lat: 15.3, lng: 74.1 }, { lat: 15.3, lng: 74.1 }), 0);
});

test('haversineMeters approximates one degree of latitude (~111 km)', () => {
  const distance = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(distance > 110000 && distance < 112000, `unexpected distance: ${distance}`);
});

test('haversineMeters returns null for invalid input', () => {
  assert.equal(haversineMeters({ lat: 0, lng: 0 }, { lat: 'x', lng: 0 }), null);
  assert.equal(haversineMeters(null, { lat: 0, lng: 0 }), null);
});

test('formatDistance uses meters below 1 km and kilometers above', () => {
  assert.equal(formatDistance(450), '450 m');
  assert.equal(formatDistance(1500), '1.5 km');
  assert.equal(formatDistance(25000), '25 km');
  assert.equal(formatDistance(NaN), null);
});
