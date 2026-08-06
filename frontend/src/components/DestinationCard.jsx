import { ArrowRight, Clock, MapPin, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import { getValidImageUrl, handleImageError, FALLBACK_IMAGES } from "../utils/imageUtils";

const MotionArticle = motion.article;

export default function DestinationCard({ data, onPlan }) {
  const imgSrc = getValidImageUrl(data?.img || data?.image || data?.imageUrl, "destination");

  return (
    <MotionArticle
      className="dest-card"
      data-region={data.region}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.25 }}
    >
      <img
        className="dest-img"
        src={imgSrc}
        alt={data.full || data.name}
        loading="lazy"
        onError={(e) => handleImageError(e, FALLBACK_IMAGES.destination)}
      />

      <div className="dest-body">
        <div className="dest-tag">
          <MapPin size={15} />
          {data.tag}
        </div>
        <h3 className="dest-name">{data.name}</h3>
        <p className="dest-desc">{data.description}</p>

        <div className="dest-meta">
          <span><Clock size={15} />{data.days}</span>
          <span><WalletCards size={15} />{data.price}</span>
        </div>

        <button
          className="dest-plan-btn"
          onClick={() => onPlan(data.full)}
          type="button"
        >
          Plan this trip
          <ArrowRight size={16} />
        </button>
      </div>
    </MotionArticle>
  );
}

