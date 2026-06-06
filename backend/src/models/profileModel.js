function validateProfile(profile) {

  if (!profile.name) {
    throw new Error("Name is required");
  }

  return {
    id: Date.now().toString(),

    name: profile.name,

    email: profile.email || "",

    interests: profile.interests || [],

    travelStyle: profile.travelStyle || "",

    budgetPreference: profile.budgetPreference || "",

    createdAt: new Date()
  };
}

module.exports = {
  validateProfile
};