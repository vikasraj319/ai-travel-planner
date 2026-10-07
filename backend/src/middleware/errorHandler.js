function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', err.message);
    if (err.details) console.error('Details:', err.details);
  }

  // Only surface intentional client-facing messages (ApiError);
  // never leak internals (DB errors, stack details) for 5xx
  const isClientError = err.name === 'ApiError';

  res.status(statusCode).json({
    success: false,
    message: isClientError ? err.message : 'Internal server error',
    details: isClientError ? (err.details || null) : null,
    stack: process.env.NODE_ENV === 'development' && isClientError ? err.stack : undefined
  });
}

module.exports = errorHandler;
