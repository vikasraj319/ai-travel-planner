import { useState } from "react";
import { ArrowRight, CheckCircle2, MapPin, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { FALLBACK_IMAGES, handleImageError } from "../utils/imageUtils";

const MotionDiv = motion.div;

export default function Hero({ onStart }) {
  const [input, setInput] = useState("");

  function handleStart() {
    if (!input.trim()) return;
    onStart(input);
  }

  return (
    <section id="hero">
      <div className="hero-shell">
        <MotionDiv
          className="hero-content"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="hero-eyebrow">
            <Sparkles size={16} />
            AI-powered travel intelligence
          </div>

          <h1 className="hero-title">
            Plan Your Perfect Trip with <em>AI</em>
          </h1>

          <p className="hero-subtitle">
            Create personalized itineraries based on your destination, budget and travel preferences.
          </p>

          <div className="hero-actions">
            <a className="btn-primary" href="#planner">
              Start planning
              <ArrowRight size={18} />
            </a>
            <a className="btn-secondary" href="#destinations">
              Explore places
            </a>
          </div>

          <div className="hero-planner" aria-label="Quick trip prompt">
            <label className="planner-label" htmlFor="hero-trip-input">
              Where would you like to go?
            </label>

            <div className="planner-input-row">
              <input
                id="hero-trip-input"
                className="planner-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="7 days in Kyoto with temples and food"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStart();
                }}
              />

              <button
                className="planner-btn"
                onClick={handleStart}
                type="button"
              >
                Generate
              </button>
            </div>
          </div>

          <div className="hero-trust">
            {["No signup required", "Instant AI itinerary", "Budget-aware"].map(item => (
              <span key={item}>
                <CheckCircle2 size={16} />
                {item}
              </span>
            ))}
          </div>
        </MotionDiv>

        <MotionDiv
          className="hero-visual"
          initial={{ opacity: 0, x: 26 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.12 }}
        >
          <div className="hero-image-card">
            <img
              src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1100&q=85"
              alt="A bright scenic travel destination"
              onError={(e) => handleImageError(e, FALLBACK_IMAGES.destination)}
            />
          </div>

          <div className="floating-card ai-card">
            <span>AI Recommendation</span>
            <strong>Best time to visit</strong>
            <p>April - June</p>
          </div>

          <div className="floating-card route-card">
            <MapPin size={18} />
            <div>
              <strong>Balanced route</strong>
              <p>Food, culture, hidden gems</p>
            </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
