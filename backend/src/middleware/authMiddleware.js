const { supabase } = require("../lib/supabase");

async function authenticateUser(
  req,
  res,
  next
) {

  try {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Invalid Authorization header format"
      });
    }

    const token =
      authHeader.split(" ")[1];

    const {
      data,
      error
    } = await supabase.auth.getUser(token);

    if (error || !data.user) {

      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });

    }

    req.user = data.user;
    req.accessToken = token;

      return next();

    } catch (err) {
      console.error('Auth middleware error:', err);
      res.status(503).json({
        success: false,
        message: "Authentication service unavailable"
      });
    }
}

async function optionalAuthenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Optional auth: any missing/malformed header just means "anonymous"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const {
      data,
      error
    } = await supabase.auth.getUser(token);

    // Optional auth: stale/invalid tokens fall back to anonymous
    // instead of failing the whole request with 401
    if (error || !data || !data.user) {
      return next();
    }

    req.user = data.user;
    req.accessToken = token;

    return next();
  } catch (err) {
    console.error('Optional auth middleware error:', err);
    // Supabase unreachable: do not block anonymous requests
    return next();
  }
}

module.exports = {
  authenticateUser,
  optionalAuthenticateUser
};
