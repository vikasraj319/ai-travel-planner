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
      res.status(500).json({
        success: false,
        message: "Supabase authentication service error"
      });
    }
}

async function optionalAuthenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "Invalid Authorization header format"
      });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

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
    console.error('Optional auth middleware error:', err);
    return res.status(500).json({
      success: false,
      message: "Supabase authentication service error"
    });
  }
}

module.exports = {
  authenticateUser,
  optionalAuthenticateUser
};
