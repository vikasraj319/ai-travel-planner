import { useState, useEffect } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  function toggleMenu() {
    setMenuOpen(prev => !prev);
  }

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <nav id="navbar" className={scrolled ? "scrolled" : ""}>
        <a href="#" className="nav-logo">
          Hori<span>zons</span>
        </a>

        <div className="nav-links">
          <a href="#how">How It Works</a>
          <a href="#destinations">Destinations</a>
          <a href="#planner">AI Planner</a>
          <a href="#itinerary">Itineraries</a>
          <a href="#planner" className="nav-cta">Start Planning</a>
        </div>

        <button className="nav-hamburger" onClick={toggleMenu}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <button className="mobile-close" onClick={toggleMenu}>✕</button>

        <a href="#how" onClick={toggleMenu}>How It Works</a>
        <a href="#destinations" onClick={toggleMenu}>Destinations</a>
        <a href="#planner" onClick={toggleMenu}>AI Planner</a>
        <a href="#itinerary" onClick={toggleMenu}>Itineraries</a>
      </div>
    </>
  );
}