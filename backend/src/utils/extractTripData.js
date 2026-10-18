// Parses a numeric amount out of values that may contain currency symbols,
// thousands separators, or trailing words (e.g. "₹5,000", "1,500.50 USD",
// "5000 - 10000"). Returns the first number found, or null when there is none.
function parseAmount(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const match = value.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;

  const amount = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : null;
}

// Reads a "Label: value" style field from free text, e.g. "Destination: Goa".
function extractLabeledValue(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:\\-]\\s*([^\\n.;]+)`, 'i');
    const match = text.match(pattern);

    if (match && match[1]) {
      const value = match[1].trim();
      if (value) return value;
    }
  }

  return '';
}

function cleanupDestination(destination) {
  return destination
    .replace(/[.\s]+$/g, '')
    .replace(/\s+\b(trip|vacation|holiday|travel|itinerary)\b.*$/i, '')
    .replace(/\s+(with|under|budget|for|in|to)\b.*$/i, '')
    .replace(/\d+\s*(day|days|night|nights).*$/i, '')
    .trim();
}

function extractTripData(prompt) {

  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();

  // =========================
  // DAYS EXTRACTION
  // =========================

  let days = 1;

  const labeledDays = extractLabeledValue(text, ['number of days', 'days', 'duration']);
  const labeledDaysMatch = labeledDays.match(/(\d+)/);

  if (labeledDaysMatch) {
    days = parseInt(labeledDaysMatch[1], 10);
  } else {
    const daysMatch = lower.match(
      /(\d+)\s*(day|days|night|nights)/i
    );

    if (daysMatch) {
      days = parseInt(daysMatch[1]);
    }
  }

  // =========================
  // BUDGET EXTRACTION
  // =========================

  let budget = 0;

  const labeledBudget = extractLabeledValue(text, ['budget']);
  const labeledBudgetAmount = parseAmount(labeledBudget);

  if (labeledBudgetAmount !== null) {
    budget = labeledBudgetAmount;
  } else {

    const budgetPatterns = [

      // budget 50000 / budget: 50000 / budget of ₹50,000
      /budget\s*(?:of|is)?\s*[:\-]?\s*(?:[₹$€£]|rs\.?|rupees|inr|usd|eur|euro)?\s*([\d,]+(?:\.\d+)?)/i,

      // under 50000
      /under\s*(?:[₹$€£]|rs\.?|rupees|inr|usd|eur|euro)?\s*([\d,]+(?:\.\d+)?)/i,

      // within 50000
      /within\s*(?:[₹$€£]|rs\.?|rupees|inr|usd|eur|euro)?\s*([\d,]+(?:\.\d+)?)/i,

      // for 50000 rupees / 50000 USD
      /([\d,]+(?:\.\d+)?)\s*(?:[₹$€£]|rs\.?|rupees|inr|usd|eur|euro)/i
    ];

    for (const pattern of budgetPatterns) {

      const match = lower.match(pattern);

      if (match && match[1]) {

        const amount = parseAmount(match[1]);

        if (amount !== null) {
          budget = amount;
          break;
        }
      }
    }
  }

  // =========================
  // DESTINATION EXTRACTION
  // =========================

  let destination = 'Unknown';

  const labeledDestination = extractLabeledValue(text, ['destination', 'location', 'place']);

  if (labeledDestination) {

    destination = labeledDestination;

  } else {

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

        destination = cleanupDestination(match[1]);

        break;
      }
    }
  }

  // =========================
  // CLEANUP
  // =========================

  destination = cleanupDestination(destination);

  if (destination) {
    destination =
      destination.charAt(0).toUpperCase() +
      destination.slice(1);
  } else {
    destination = 'Unknown';
  }

  return {
    destination,
    budget,
    days
  };
}

module.exports = {
  extractTripData,
  parseAmount
};
