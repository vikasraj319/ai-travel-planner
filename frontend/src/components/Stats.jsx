export default function Stats() {
  return (
    <div className="stats-bar">

      <div className="stat reveal">
        <div className="stat-num">190+</div>
        <div className="stat-label">Countries Covered</div>
      </div>

      <div className="stat reveal" style={{ transitionDelay: "0.1s" }}>
        <div className="stat-num">50K+</div>
        <div className="stat-label">Itineraries Created</div>
      </div>

      <div className="stat reveal" style={{ transitionDelay: "0.2s" }}>
        <div className="stat-num">4.9★</div>
        <div className="stat-label">Average Rating</div>
      </div>

      <div className="stat reveal" style={{ transitionDelay: "0.3s" }}>
        <div className="stat-num">2s</div>
        <div className="stat-label">Average Plan Time</div>
      </div>

    </div>
  );
}