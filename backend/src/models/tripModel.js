
 function validateTrip(trip) {

  // Auto fallback budget
  if (
    trip.budget === undefined ||
    trip.budget === null ||
    trip.budget === ""
  ) {
    trip.budget = 0;
  }

  // Convert string → number
  trip.budget = Number(trip.budget);

  // Final validation
  if (isNaN(trip.budget)) {
    throw new Error("Invalid budget");
  }

}

function createTripModel(data) {
  return {
    user_id: data.user_id,
    destination: data.destination,
    budget: Number(data.budget),
    days: Number(data.days),
    created_at: new Date()
  }
}

module.exports = {
  validateTrip,
  createTripModel 
}
