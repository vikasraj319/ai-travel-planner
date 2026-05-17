export default function Footer() {
  return (
    <footer>

      <div className="footer-grid">

        {/* Brand */}
        <div className="footer-brand">
          <div className="footer-logo">
            Hori<span>zons</span>
          </div>

          <p className="footer-tagline">
            AI-powered travel planning for the curious and the bold. Every trip, perfectly crafted.
          </p>
        </div>

        {/* Explore */}
        <div>
          <div className="footer-col-title">Explore</div>

          <div className="footer-links">
            <a href="#destinations">Destinations</a>
            <a href="#planner">AI Planner</a>
            <a href="#how">How It Works</a>
            <a href="#itinerary">Sample Itineraries</a>
          </div>
        </div>

        {/* Company */}
        <div>
          <div className="footer-col-title">Company</div>

          <div className="footer-links">
            <a href="#">About Us</a>
            <a href="#">Blog</a>
            <a href="#">Press</a>
            <a href="#">Careers</a>
          </div>
        </div>

        {/* Support */}
        <div>
          <div className="footer-col-title">Support</div>

          <div className="footer-links">
            <a href="#">Help Center</a>
            <a href="#">Contact</a>
            <a href="#">Community</a>
            <a href="#">API Docs</a>
          </div>
        </div>

      </div>

      {/* Bottom */}
      <div className="footer-bottom">

        <div className="footer-copy">
          © 2026 Horizons AI. All rights reserved.
        </div>

        <div className="footer-legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Cookies</a>
        </div>

      </div>

    </footer>
  );
}