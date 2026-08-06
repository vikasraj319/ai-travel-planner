const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80";

// Server-side in-memory cache to prevent duplicate API requests
const imageCache = new Map();

/**
 * Calculates a relevance score for a Pexels photo based on search query terms.
 * Heavy weight is given to exact landmark name matches.
 */
function scorePhotoRelevance(photo, query) {
  const alt = (photo.alt || "").toLowerCase();
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && word !== "india" && word !== "japan" && word !== "tour" && word !== "visit");

  let score = 0;

  queryTerms.forEach((term) => {
    if (alt.includes(term)) {
      score += 40;
    }
  });

  // Check if alt contains multiple words from the query consecutively
  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  if (alt.includes(cleanQuery)) {
    score += 80;
  }

  // Slight resolution tie-breaker (max 5 points)
  if (photo.width && photo.height) {
    score += Math.min(5, (photo.width * photo.height) / 5000000);
  }

  return score;
}

/**
 * Fetches images from Pexels using a fallback search chain.
 * Hierarchy:
 * 1. Full Query ("Fort Aguada, Goa, India")
 * 2. Landmark + Destination ("Fort Aguada, Goa")
 * 3. Destination ("Goa")
 */
async function fetchWithFallbackChain(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const parts = query.split(",").map((p) => p.trim()).filter(Boolean);
  const searchQueries = [];

  // 1. Full Query
  searchQueries.push(query);

  // 2. Parts combinations (e.g. Landmark + Destination)
  if (parts.length >= 3) {
    searchQueries.push(`${parts[0]}, ${parts[1]}`);
  }
  if (parts.length >= 2) {
    searchQueries.push(parts[0]);
    searchQueries.push(parts[parts.length - 1]);
  }

  for (const q of searchQueries) {
    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(
          q
        )}&per_page=12&orientation=landscape`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
          // Sort photos by relevance score
          const sorted = data.photos.sort(
            (a, b) => scorePhotoRelevance(b, q) - scorePhotoRelevance(a, q)
          );

          const bestPhoto = sorted[0];
          return {
            imageUrl:
              bestPhoto.src.large2x ||
              bestPhoto.src.original ||
              bestPhoto.src.large ||
              bestPhoto.src.medium,
            photographer: bestPhoto.photographer,
          };
        }
      }
    } catch (err) {
      console.error(`Error searching Pexels for "${q}":`, err.message);
    }
  }

  return null;
}

async function getBackgroundImage(req, res) {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Search query required",
      });
    }

    const cleanCacheKey = query.trim().toLowerCase();

    // 1. Check in-memory cache
    if (imageCache.has(cleanCacheKey)) {
      return res.json(imageCache.get(cleanCacheKey));
    }

    // 2. Fetch via fallback chain
    const result = await fetchWithFallbackChain(query);

    if (result && result.imageUrl) {
      imageCache.set(cleanCacheKey, result);
      return res.json(result);
    }

    // 3. High-quality default fallback
    const fallbackResult = {
      imageUrl: DEFAULT_FALLBACK_IMAGE,
      photographer: "Unsplash",
    };

    imageCache.set(cleanCacheKey, fallbackResult);
    return res.json(fallbackResult);
  } catch (error) {
    console.error("Error in getBackgroundImage:", error);

    res.json({
      imageUrl: DEFAULT_FALLBACK_IMAGE,
      photographer: "Unsplash",
    });
  }
}

module.exports = {
  getBackgroundImage,
};