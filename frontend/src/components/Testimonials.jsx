export default function Testimonials() {
  return (
    <section id="testimonials">

      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div className="section-eyebrow reveal" style={{ justifyContent: "center" }}>
          After using Horizons
        </div>

        <h2 className="section-title reveal">
          Travelers <em>love us</em>
        </h2>
      </div>

      <div className="testi-grid">

        <div className="testi-card reveal">
          <div className="testi-stars">★★★★★</div>
          <p className="testi-text">
            The AI suggested hidden places I never found online.
          </p>
          <div className="testi-name">Sarah M.</div>
        </div>

        <div className="testi-card reveal">
          <div className="testi-stars">★★★★★</div>
          <p className="testi-text">
            Perfect itinerary pacing — not rushed at all.
          </p>
          <div className="testi-name">James R.</div>
        </div>

        <div className="testi-card reveal">
          <div className="testi-stars">★★★★★</div>
          <p className="testi-text">
            Like having a local guide in Tokyo.
          </p>
          <div className="testi-name">Anika K.</div>
        </div>

      </div>
    </section>
  );
}