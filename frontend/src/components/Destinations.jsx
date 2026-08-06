import { useState } from "react";
import DestinationCard from "./DestinationCard";

const DESTINATIONS = [
  {
    name: "Kyoto",
    full: "Kyoto, Japan",
    region: "asia",
    tag: "Asia / Japan",
    days: "7-10 days",
    price: "From $1,850",
    description: "Temple mornings, ramen lanes, mountain shrines and quiet ryokan stays.",
    img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80"
  },
  {
    name: "Paris",
    full: "Paris, France",
    region: "europe",
    tag: "Europe / France",
    days: "4-7 days",
    price: "From $1,400",
    description: "Art-led days, neighborhood bakeries and polished evening walks.",
    img: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80"
  },
  {
    name: "Rio de Janeiro",
    full: "Rio de Janeiro, Brazil",
    region: "americas",
    tag: "Americas / Brazil",
    days: "5-8 days",
    price: "From $1,650",
    description: "Beach energy, rainforest viewpoints and late-night local flavor.",
    img: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80"
  },
  {
    name: "Bali",
    full: "Bali, Indonesia",
    region: "asia",
    tag: "Asia / Indonesia",
    days: "7-14 days",
    price: "From $1,250",
    description: "Rice terraces, design villas, surf breaks and restorative spa rituals.",
    img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80"
  },
  {
    name: "Santorini",
    full: "Santorini, Greece",
    region: "europe",
    tag: "Europe / Greece",
    days: "4-6 days",
    price: "From $1,700",
    description: "Caldera views, cliffside hotels and seafood dinners at sunset.",
    img: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&q=80"
  }
];

export default function Destinations({ onPlan }) {
  const [filter, setFilter] = useState("all");

  const filtered = DESTINATIONS.filter(d =>
    filter === "all" ? true : d.region === filter
  );

  return (
    <section id="destinations">
      <div className="dest-header">
        <div>
          <div className="section-eyebrow">Explore</div>
          <h2 className="section-title">Destination ideas for every pace</h2>
        </div>

        <div className="dest-filter" aria-label="Filter destinations">
          {["all", "asia", "europe", "americas"].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="dest-grid">
        {filtered.map((d) => (
          <DestinationCard key={d.full} data={d} onPlan={onPlan} />
        ))}
      </div>
    </section>
  );
}
