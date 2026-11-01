function validateQuery(validatorFn) {
  return (req, res, next) => {
    const validatedQuery = validatorFn(req.query || {});
    req.validatedQuery = validatedQuery;
    next();
  };
}

module.exports = validateQuery;
