import { useState } from "react";
import DestinationCard from "./DestinationCard";

const DESTINATIONS = [
  {
    name: "Kyoto",
    full: "Kyoto, Japan",
    region: "asia",
    tag: "Asia · Japan",
    season: "🌸 Spring · Autumn",
    days: "7–10 days",
    img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80"
  },
  {
    name: "Paris",
    full: "Paris, France",
    region: "europe",
    tag: "Europe · France",
    season: "🥐 Year-round",
    days: "4–7 days",
    img: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=600&q=80"
  },
  {
    name: "Rio de Janeiro",
    full: "Rio de Janeiro, Brazil",
    region: "americas",
    tag: "Americas · Brazil",
    season: "☀️ Summer",
    days: "5–8 days",
    img: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&q=80"
  },
  {
    name: "Bali",
    full: "Bali, Indonesia",
    region: "asia",
    tag: "Asia · Indonesia",
    season: "🌴 Dry season",
    days: "7–14 days",
    img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80"
  },
  {
    name: "Santorini",
    full: "Santorini, Greece",
    region: "europe",
    tag: "Europe · Greece",
    season: "🌊 Summer",
    days: "4–6 days",
    img: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80"
  }
];

export default function Destinations({ onPlan }) {
  const [filter, setFilter] = useState("all");

  const filtered = DESTINATIONS.filter(d =>
    filter === "all" ? true : d.region === filter
  );

  return (
    <section id="destinations">

      {/* Header */}
      <div className="dest-header">
        <div>
          <div className="section-eyebrow">Explore</div>
          <h2 className="section-title">
            Popular <em>destinations</em>
          </h2>
        </div>

        {/* Filters */}
        <div className="dest-filter">
          {["all", "asia", "europe", "americas"].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="dest-grid">
        {filtered.map((d, i) => (
          <DestinationCard key={i} data={d} onPlan={onPlan} />
        ))}
      </div>

    </section>
  );
}