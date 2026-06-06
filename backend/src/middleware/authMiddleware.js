const { supabase } = require("../lib/supabase");

async function authenticateUser(
  req,
  res,
  next
) {

  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        success: false,
        message: "No token provided"
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

    next();

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Authentication failed"
    });

  }
}

module.exports = {
  authenticateUser
};