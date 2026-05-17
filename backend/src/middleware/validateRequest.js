function validateRequest(validatorFn) {
  return (req, res, next) => {
    const validatedBody = validatorFn(req.body || {});
    req.validatedBody = validatedBody;
    next();
  };
}

module.exports = validateRequest;
