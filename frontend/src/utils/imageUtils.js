/**
 * Utility functions for robust image URL resolution and error handling across the application.
 */

// Curated high-resolution fallback travel images from Unsplash (direct CDN URLs)
export const FALLBACK_IMAGES = {
  default: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  destination: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  city: "https://images.unsplash.com/photo-1477959858617-67f30ac4ce78?w=1200&q=80",
  nature: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
  culture: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80"
};

/**
 * Checks if a string is a valid non-empty image URL.
 * Filters out deprecated APIs like source.unsplash.com which now 404.
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  
  // Deprecated unsplash source endpoint returns 404
  if (trimmed.includes("source.unsplash.com")) return false;

  return true;
}

/**
 * Extracts landmark name from activity string (e.g. "Visit Fort Aguada" -> "Fort Aguada").
 */
export function extractLandmarkFromTitle(title) {
  if (!title || typeof title !== "string") return "";
  return title
    .replace(/^(visit|explore|check in at|head to|tour of|walk around|dinner at|lunch at|breakfast at|enjoy|relax at|stop by)\s+/i, "")
    .trim();
}

/**
 * Builds a highly specific landmark search query in the format:
 * "<Landmark/Place Name>, <Destination>"
 */
export function buildActivitySearchQuery(activity, destination = "") {
  if (!activity || typeof activity !== "object") {
    return destination || "travel landmark";
  }

  // 1. Direct imageSearchQuery from AI
  if (activity.imageSearchQuery && typeof activity.imageSearchQuery === "string" && activity.imageSearchQuery.trim()) {
    return activity.imageSearchQuery.trim();
  }

  // 2. Extract landmark name from location or title
  const rawPlace = activity.location || extractLandmarkFromTitle(activity.activity || activity.title || "");
  const placeName = rawPlace ? rawPlace.trim() : "";
  const destName = (destination || "").trim();

  if (placeName && destName) {
    if (placeName.toLowerCase().includes(destName.toLowerCase())) {
      return placeName;
    }
    return `${placeName}, ${destName}`;
  }

  return placeName || destName || "travel landmark";
}

/**
 * Extracts a valid image URL from an activity/destination object checking all common property names.
 * Property order checked: image, imageUrl, photo, thumbnail, img, src.
 * Returns a high-quality fallback if no valid URL is found.
 */
export function getValidImageUrl(item, fallbackKey = "default") {
  if (typeof item === "string" && isValidImageUrl(item)) {
    return item;
  }

  if (item && typeof item === "object") {
    const candidate =
      item.image ||
      item.imageUrl ||
      item.photo ||
      item.thumbnail ||
      item.img ||
      item.src;

    if (isValidImageUrl(candidate)) {
      return candidate;
    }
  }

  // Keyword matching for fallback
  const text = JSON.stringify(item || "").toLowerCase();
  if (text.includes("food") || text.includes("dine") || text.includes("eat") || text.includes("restaurant") || text.includes("ramen") || text.includes("bakery")) {
    return FALLBACK_IMAGES.food;
  }
  if (text.includes("beach") || text.includes("sea") || text.includes("coast") || text.includes("island") || text.includes("surf")) {
    return FALLBACK_IMAGES.beach;
  }
  if (text.includes("city") || text.includes("temple") || text.includes("museum") || text.includes("palace") || text.includes("shrine") || text.includes("tower")) {
    return FALLBACK_IMAGES.culture;
  }
  if (text.includes("mountain") || text.includes("park") || text.includes("hike") || text.includes("nature") || text.includes("trail")) {
    return FALLBACK_IMAGES.nature;
  }

  return FALLBACK_IMAGES[fallbackKey] || FALLBACK_IMAGES.default;
}

/**
 * Helper to attach to img onError events.
 * Prevents infinite looping by unsetting onerror before setting fallback src.
 */
export function handleImageError(event, fallbackUrl = FALLBACK_IMAGES.default) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackUrl;
}
