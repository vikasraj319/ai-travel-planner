import { Plane } from "lucide-react";

export default function Footer() {
  return (
    <footer id="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <span><Plane size={20} fill="currentColor" /></span>
            Horizons AI
          </div>

          <p className="footer-tagline">
            AI-powered travel planning for curious travelers who want polished itineraries without the spreadsheet fatigue.
          </p>
        </div>

        <div>
          <div className="footer-col-title">Explore</div>
          <div className="footer-links">
            <a href="#destinations">Destinations</a>
            <a href="#planner">AI Planner</a>
            <a href="#how">How It Works</a>
            <a href="#itinerary">Itineraries</a>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Company</div>
          <div className="footer-links">
            <a href="#how">About</a>
            <a href="#testimonials">Reviews</a>
            <a href="#cta">Start</a>
          </div>
        </div>

        <div>
          <div className="footer-col-title">Support</div>
          <div className="footer-links">
            <a href="mailto:hello@horizons.ai">Contact</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-copy">
          Copyright 2026 Horizons AI. All rights reserved.
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
