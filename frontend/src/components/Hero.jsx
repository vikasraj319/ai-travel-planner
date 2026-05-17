import { useState } from "react";

export default function Hero({ onStart }) {
  const [input, setInput] = useState("");

  function handleStart() {
    if (!input.trim()) return;
    onStart(input);
  }

  return (
    <section id="hero">

      {/* Background elements */}
      <div className="hero-bg"></div>
      <div className="hero-grid"></div>

      {/* Content */}
      <div className="hero-content">

        <div className="hero-eyebrow">
          AI-Powered Travel Intelligence
        </div>

        <h1 className="hero-title">
          Travel beyond<br />
          the <em>ordinary.</em>
        </h1>

        <p className="hero-subtitle">
          Tell us your dream destination. Our AI crafts a bespoke itinerary —
          complete with hidden gems, local experiences, and seamless logistics —
          in seconds.
        </p>

        {/* Planner input */}
        <div className="hero-planner">

          <div className="planner-label">
            ✦ Where would you like to go?
          </div>

          <div className="planner-input-row">

            <input
              className="planner-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 7 days in Kyoto with a focus on temples and food…"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleStart();
              }}
            />

            <button
              className="planner-btn"
              onClick={handleStart}
            >
              Plan Now
            </button>

          </div>

        </div>

        {/* Info tags */}
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            gap: "1.5rem",
            flexWrap: "wrap",
            opacity: 0,
            animation: "fadeUp 1s 1s forwards"
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--mist)" }}>
            ✦ No signup required
          </span>

          <span style={{ fontSize: "0.75rem", color: "var(--mist)" }}>
            ✦ Instant results
          </span>

          <span style={{ fontSize: "0.75rem", color: "var(--mist)" }}>
            ✦ Fully customizable
          </span>
        </div>

      </div>

      {/* Scroll hint */}
      <div className="scroll-hint">
        <div className="scroll-line"></div>
        Scroll to explore
      </div>

    </section>
  );
}