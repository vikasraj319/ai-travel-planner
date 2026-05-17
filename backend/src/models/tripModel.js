
 function validateTrip(data) {
  if (!data.destination) throw new Error("Destination is required")
  if (!data.budget || data.budget <= 0) throw new Error("Invalid budget")
  if (!data.days || data.days <= 0) throw new Error("Invalid days")
}

function createTripModel(data) {
  return {
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
