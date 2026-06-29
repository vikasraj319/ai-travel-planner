
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
import Footer from "./components/Footer";
import useReveal from "./hooks/useReveal";
import Map from "./components/Map";
import "./styles.css";

export default function App() {
  useReveal();
  const plannerRef = useRef();
  const [itinerary, setItinerary] = useState(null);
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

  function handlePlan(text) {
    document
      .getElementById("planner")
      ?.scrollIntoView({ behavior: "smooth" });

    plannerRef.current?.sendMessage(text);
  }

  function handleHeroStart(text) {
  document
    .getElementById("planner")
    ?.scrollIntoView({ behavior: "smooth" });

  plannerRef.current?.sendMessage(text);
}

  return (
    <div className="app">
      <Navbar />
      <Hero onStart={handleHeroStart} />
      <Stats />
      <HowItWorks />
      <div id="planner" className="planner-section">
        {/* LEFT */}
        <div className="planner-left">
          <Planner ref={plannerRef} onResult={setItinerary} />
        </div>
        {/* RIGHT */}
        <div className="planner-right">
          <Map location={itinerary?.title || "Kyoto"} />
        </div>
      </div>
      <Destinations onPlan={handlePlan} />
      {itinerary && <Itinerary data={itinerary} onPlan={handlePlan} />}
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
