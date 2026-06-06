function extractTripData(prompt) {

  const text = prompt.trim();
  const lower = text.toLowerCase();

  // =========================
  // DAYS EXTRACTION
  // =========================

  let days = 1;

  const daysMatch = lower.match(
    /(\d+)\s*(day|days|night|nights)/i
  );

  if (daysMatch) {
    days = parseInt(daysMatch[1]);
  }

  // =========================
  // BUDGET EXTRACTION
  // =========================

  let budget = 0;

  const budgetPatterns = [

    // budget 50000
    /budget\s*(of)?\s*(₹|rs|rupees|inr|\$|usd|eur|euro)?\s*(\d+)/i,

    // under 50000
    /under\s*(₹|rs|rupees|inr|\$|usd|eur|euro)?\s*(\d+)/i,

    // within 50000
    /within\s*(₹|rs|rupees|inr|\$|usd|eur|euro)?\s*(\d+)/i,

    // for 50000 rupees
    /(\d+)\s*(₹|rs|rupees|inr|\$|usd|eur|euro)/i
  ];

  for (const pattern of budgetPatterns) {

    const match = lower.match(pattern);

    if (match) {

      const number = match.find(v =>
        /^\d+$/.test(v)
      );

      if (number) {
        budget = parseInt(number);
        break;
      }
    }
  }

  // =========================
  // DESTINATION EXTRACTION
  // =========================

  let destination = "Unknown";

  const destinationPatterns = [

    // trip to goa
    /(?:trip|travel|vacation|holiday)?\s*to\s+([a-zA-Z\s]+)/i,

    // vacation in tokyo
    /(?:trip|travel|vacation|holiday)?\s*in\s+([a-zA-Z\s]+)/i,

    // paris for 5 days
    /^([a-zA-Z\s]+?)\s*(for|under|with|\d+\s*day|\d+\s*night|$)/i
  ];

  for (const pattern of destinationPatterns) {

    const match = text.match(pattern);

    if (match && match[1]) {

      destination = match[1]
        .replace(/with.*$/i, "")
        .replace(/under.*$/i, "")
        .replace(/budget.*$/i, "")
        .replace(/for.*$/i, "")
        .replace(/\d+\s*(day|days|night|nights).*$/i, "")
        .trim();

      break;
    }
  }

  // =========================
  // CLEANUP
  // =========================

  destination =
    destination.charAt(0).toUpperCase() +
    destination.slice(1);

  return {
    destination,
    budget,
    days
  };
}

module.exports = {
  extractTripData
};