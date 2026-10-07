function validateTrip(trip) {
  // Budget
  if (
    trip.budget !== undefined &&
    trip.budget !== null &&
    trip.budget !== ""
  ) {
    trip.budget = Number(trip.budget);

    if (Number.isNaN(trip.budget)) {
      throw new Error("Invalid budget");
    }
  } else {
    trip.budget = null;
  }

  // Days
  if (
    trip.days !== undefined &&
    trip.days !== null &&
    trip.days !== ""
  ) {
    trip.days = Number(trip.days);

    if (!Number.isInteger(trip.days) || trip.days <= 0) {
      throw new Error("Invalid number of days");
    }
  } else {
    trip.days = null;
  }

  // Destination
  if (
    trip.destination !== undefined &&
    trip.destination !== null &&
    trip.destination !== ""
  ) {
    trip.destination = String(trip.destination).trim();
  } else {
    trip.destination = null;
  }
}


function createTripModel(data) {
  return {
    user_id: data.user_id ?? null,
    destination: data.destination ?? null,
    budget: data.budget ?? null,
    days: data.days ?? null,
    created_at: new Date()
  };
}


module.exports = {
  validateTrip,
  createTripModel
};