const { saveProfile } = require('../services/profileService');

const createProfile = async (req, res) => {
  try {

    console.log("USER:", req.user);
    console.log("BODY:", req.body);

    const profileData = {
      id: req.user.id,
      username: req.body.username,
      full_name: req.body.full_name,
      bio: req.body.bio,
      country: req.body.country
    };

    const profile = await saveProfile(profileData);

    res.status(201).json({
      success: true,
      data: profile
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

module.exports = {
  createProfile
};