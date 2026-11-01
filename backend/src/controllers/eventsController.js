const { getEvents } = require('../services/eventsService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/events
 *
 * Query: destination, destinations, lat, lng, startDate, endDate, radiusKm, limit
 * Always responds 200 with a normalized payload. `data.available === false`
 * communicates provider/credential/location failures; `data.events` only ever
 * contains events actually returned by a source (never fabricated).
 */
const getLiveEvents = asyncHandler(async (req, res) => {
  const result = await getEvents(req.validatedQuery || {});

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = { getLiveEvents };
