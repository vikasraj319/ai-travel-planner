
import { useRef } from "react";
import { useState } from "react";
import { useEffect } from "react";
import Itinerary from "./components/Itinerary";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Planner from "./components/Planner";
import Destinations from "./components/Destinations";
import Stats from "./components/Stats";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import CTA from "./components/CTA";
import ChatWidget from "./components/ChatWidget";
import Footer from "./components/Footer";
import useReveal from "./hooks/useReveal";
import Map from "./components/Map";
import "./styles.css";

function getItineraryLocation(itinerary) {
  if (!itinerary || typeof itinerary !== "object") return "Kyoto";

  return (
    itinerary.destination ||
    itinerary.location ||
    itinerary.city ||
    itinerary.place ||
    itinerary.title ||
    "Kyoto"
  );
}

export default function App() {
  useReveal();
  const plannerRef = useRef();
  const [itinerary, setItinerary] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");

  useEffect(() => {
    if (itinerary) {
      document
        .getElementById("itinerary")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }
  }, [itinerary]);

  // Listen for destination searches dispatched from the Navbar
  useEffect(() => {
    function handleSearch(e) {
      setDestinationSearch(e.detail || "");
      document
        .getElementById("destinations")
        ?.scrollIntoView({ behavior: "smooth" });
    }

    window.addEventListener("horizons:search", handleSearch);
    return () => window.removeEventListener("horizons:search", handleSearch);
  }, []);

  function handlePlan(text) {
    document
      .getElementById("planner")
      ?.scrollIntoView({ behavior: "smooth" });

    plannerRef.current?.sendMessage(text);
  }

  return (
    <div className="app">
      <Navbar itinerary={itinerary} />
      <Hero onStart={handlePlan} />
      <Stats />
      <HowItWorks />
      <div id="planner" className="planner-section">
        {/* LEFT */}
        <div className="planner-left">
          <Planner ref={plannerRef} onResult={setItinerary} />
        </div>
        {/* RIGHT */}
        <div className="planner-right">
          <Map location={getItineraryLocation(itinerary)} />
        </div>
      </div>
      <Destinations onPlan={handlePlan} searchQuery={destinationSearch} />
      {itinerary && <Itinerary data={itinerary} onPlan={handlePlan} />}
      <Testimonials />
      <CTA />
      <ChatWidget />
      <Footer />
    </div>
  );
}
