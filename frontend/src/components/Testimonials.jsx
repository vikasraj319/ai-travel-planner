import { Star } from "lucide-react";

const testimonials = [
  ["Sarah M.", "The AI suggested hidden places I never found online."],
  ["James R.", "Perfect itinerary pacing, with enough room to wander."],
  ["Anika K.", "It felt like having a local guide in Tokyo."]
];

export default function Testimonials() {
  return (
    <section id="testimonials">
      <div className="section-header-centered">
        <div className="section-eyebrow reveal">After using Horizons</div>
        <h2 className="section-title reveal">Travelers love the extra clarity</h2>
      </div>

      <div className="testi-grid">
        {testimonials.map(([name, text]) => (
          <article className="testi-card reveal" key={name}>
            <div className="testi-stars" aria-label="Five star rating">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} size={16} fill="currentColor" />
              ))}
            </div>
            <p className="testi-text">{text}</p>
            <div className="testi-name">{name}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
