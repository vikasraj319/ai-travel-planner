import { useEffect, useState } from "react";
import { Clock, MapPin, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { apiUrl } from "../lib/api";
import {
  buildActivitySearchQuery,
  FALLBACK_IMAGES,
  getValidImageUrl,
  handleImageError,
  isValidImageUrl
} from "../utils/imageUtils";

const MotionArticle = motion.article;

// Client-side cache to avoid repeated image network requests for the same landmark
const clientImageCache = new Map();

export default function ItineraryCard({ activity, index, destination }) {
  const title = activity?.activity || activity?.title || "Explore";
  const description =
    activity?.description ||
    activity?.details ||
    "A thoughtfully paced stop selected for the rhythm of this trip.";
  const cost =
    activity?.estimatedCost ||
    activity?.cost ||
    activity?.price ||
    activity?.budget ||
    "Flexible";

  const directImage =
    activity?.image ||
    activity?.imageUrl ||
    activity?.photo ||
    activity?.thumbnail ||
    activity?.img ||
    activity?.src;

  const initialImage = isValidImageUrl(directImage)
    ? directImage
    : getValidImageUrl(activity, "culture");

  const [cardImage, setCardImage] = useState(initialImage);

  const searchQuery = buildActivitySearchQuery(activity, destination);

  useEffect(() => {
    // If activity already has an explicit direct image URL, use it
    if (isValidImageUrl(directImage)) {
      setCardImage(directImage);
      return;
    }

    if (!searchQuery) return;

    // Check client-side memory cache first
    const cacheKey = searchQuery.toLowerCase().trim();
    if (clientImageCache.has(cacheKey)) {
      setCardImage(clientImageCache.get(cacheKey));
      return;
    }

    let isMounted = true;

    async function fetchLandmarkImage() {
      try {
        const response = await fetch(
          apiUrl(`/api/images?query=${encodeURIComponent(searchQuery)}`)
        );
        const data = await response.json();

        if (isMounted && data.imageUrl && isValidImageUrl(data.imageUrl)) {
          clientImageCache.set(cacheKey, data.imageUrl);
          setCardImage(data.imageUrl);
        }
      } catch (err) {
        console.error(`Failed to fetch image for query "${searchQuery}":`, err);
      }
    }

    fetchLandmarkImage();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, directImage]);

  return (
    <MotionArticle
      className="itinerary-card"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <div className="itinerary-card-media">
        <img
          src={cardImage}
          alt={title}
          loading="lazy"
          onError={(e) => handleImageError(e, FALLBACK_IMAGES.culture)}
        />
      </div>
      <div className="itinerary-card-content">
        <div className="itinerary-card-top">
          <span><Clock size={15} />{activity?.time || "Anytime"}</span>
          <span><WalletCards size={15} />{cost}</span>
        </div>
        <h4>{title}</h4>
        {activity?.location && (
          <p className="itinerary-location">
            <MapPin size={15} />
            {activity.location}
          </p>
        )}
        <p className="itinerary-description">{description}</p>
      </div>
    </MotionArticle>
  );
}
