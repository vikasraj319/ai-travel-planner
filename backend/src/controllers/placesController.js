const { getNearbyPlaces } = require('../services/nearbyPlacesService');
const { createLogger } = require('../lib/logger');
const asyncHandler = require('../utils/asyncHandler');

const log = createLogger('places-api');

/**
 * GET /api/places/nearby
 *
 * Query: category, destination, location, lat, lng, radius, limit
 * Always responds 200 with a normalized payload; `data.available === false`
 * communicates provider/credential/location failures without breaking the
 * client's optional discovery UI.
 */
const getNearby = asyncHandler(async (req, res) => {
  // When the browser goes away there is no point in keeping the upstream
  // provider request alive, so the client disconnect aborts it.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  const startedAt = Date.now();
  const result = await getNearbyPlaces({ ...(req.validatedQuery || {}), signal: controller.signal });

  const durationMs = Date.now() - startedAt;

  log.info('request completed', {
    category: result.category,
    provider: result.provider,
    available: result.available,
    reason: result.reason,
    count: result.results?.length ?? 0,
    cached: result.meta?.cached ?? false,
    stale: result.meta?.stale ?? false,
    attempts: result.meta?.attempts ?? 0,
    durationMs
  });

  // The browser may have disconnected while the provider was being queried.
  if (controller.signal.aborted) return;

  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = { getNearby };
