import { ArrowRight, Compass } from "lucide-react";

export default function CTA() {
  return (
    <section id="cta">
      <div className="cta-content">
        <div className="cta-icon"><Compass size={24} /></div>
        <div>
          <div className="section-eyebrow reveal">Begin your journey</div>
          <h2 className="cta-title reveal">Your next itinerary can be ready in seconds.</h2>
          <p className="cta-subtitle reveal">
            Start with a destination, a budget, or just a mood. Horizons AI will shape it into a practical trip.
          </p>
        </div>
        <div className="cta-buttons reveal">
          <a className="btn-primary" href="#planner">
            Start Planning Free
            <ArrowRight size={18} />
          </a>
          <a className="btn-secondary" href="#destinations">
            Explore Destinations
          </a>
        </div>
      </div>
    </section>
  );
}
