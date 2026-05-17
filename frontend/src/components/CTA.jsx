export default function CTA() {
  return (
    <section id="cta">

      <div className="cta-bg"></div>

      <div className="cta-content">

        <div className="section-eyebrow reveal" style={{ justifyContent: "center" }}>
          Begin your journey
        </div>

        <h2 className="cta-title reveal">
          Your next adventure<br />
          <em>awaits.</em>
        </h2>

        <p className="cta-subtitle reveal">
          Start planning instantly.
        </p>

        <div className="cta-buttons reveal">

          <button className="btn-primary">
            Start Planning Free
          </button>

          <button className="btn-secondary">
            Explore Destinations
          </button>

        </div>

      </div>
    </section>
  );
}