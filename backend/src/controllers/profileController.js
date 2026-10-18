const { saveProfile } = require('../services/profileService');
const asyncHandler = require('../utils/asyncHandler');

const createProfile = asyncHandler(async (req, res) => {
  const fullName = typeof req.body.full_name === 'string' ? req.body.full_name.trim() : '';
  const username = (typeof req.body.username === 'string' ? req.body.username.trim() : '') || fullName;

  // Omit empty optional fields instead of writing empty strings
  const profileData = { id: req.user.id };

  if (username) profileData.username = username;
  if (fullName) profileData.full_name = fullName;

  for (const field of ['bio', 'country', 'travel_style', 'budget_preference', 'interests']) {
    const value = req.body[field];
    if (typeof value === 'string' ? value.trim() : value !== undefined && value !== null) {
      profileData[field] = value;
    }
  }

  const profile = await saveProfile(profileData, req.accessToken);

  res.status(201).json({
    success: true,
    data: profile
  });
});

module.exports = {
  createProfile
};
