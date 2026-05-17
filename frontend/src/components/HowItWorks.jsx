export default function HowItWorks() {
  return (
    <section id="how">

      <div className="section-eyebrow reveal">The Process</div>

      <h2 className="section-title reveal">
        Travel planning,<br />
        <em>reimagined</em>
      </h2>

      <div className="how-grid">

        <div className="how-step reveal">
          <div className="how-num">01</div>
          <div className="how-title">Describe Your Dream</div>
          <p className="how-desc">
            Tell our AI your destination, dates, interests, and travel style.
          </p>
        </div>

        <div className="how-step reveal" style={{ transitionDelay: "0.15s" }}>
          <div className="how-num">02</div>
          <div className="how-title">AI Crafts Your Plan</div>
          <p className="how-desc">
            Full itinerary with activities, restaurants, and logistics.
          </p>
        </div>

        <div className="how-step reveal" style={{ transitionDelay: "0.3s" }}>
          <div className="how-num">03</div>
          <div className="how-title">Refine & Personalize</div>
          <p className="how-desc">
            Modify your plan in real time with AI.
          </p>
        </div>

        <div className="how-step reveal" style={{ transitionDelay: "0.45s" }}>
          <div className="how-num">04</div>
          <div className="how-title">Pack & Depart</div>
          <p className="how-desc">
            Export your trip and travel confidently.
          </p>
        </div>

      </div>
    </section>
  );
}