import { motion } from "framer-motion";

const MotionArticle = motion.article;

export default function FeatureCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  delay = 0
}) {
  return (
    <MotionArticle
      className="feature-card reveal"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.45, delay }}
    >
      <div className="feature-icon" aria-hidden="true">
        {Icon && <Icon size={22} strokeWidth={2.2} />}
      </div>
      <p className="feature-eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      <p>{description}</p>
    </MotionArticle>
  );
}
