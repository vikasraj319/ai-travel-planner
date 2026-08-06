import { MessageSquareText, Route, SlidersHorizontal, TicketCheck } from "lucide-react";
import FeatureCard from "./FeatureCard";

const steps = [
  {
    icon: MessageSquareText,
    eyebrow: "01",
    title: "Describe Your Dream",
    description: "Tell the AI your destination, dates, budget, interests and travel style."
  },
  {
    icon: Route,
    eyebrow: "02",
    title: "AI Crafts Your Plan",
    description: "Get a polished day-by-day route with activities, pacing and trip context."
  },
  {
    icon: SlidersHorizontal,
    eyebrow: "03",
    title: "Refine the Details",
    description: "Ask for edits, swap neighborhoods, adjust budget or change the mood."
  },
  {
    icon: TicketCheck,
    eyebrow: "04",
    title: "Travel Confidently",
    description: "Use the final itinerary as your launchpad for bookings and daily plans."
  }
];

export default function HowItWorks() {
  return (
    <section id="how">
      <div className="section-header-centered">
        <div className="section-eyebrow reveal">The Process</div>
        <h2 className="section-title reveal">Travel planning, reimagined</h2>
      </div>

      <div className="how-grid">
        {steps.map((step, index) => (
          <FeatureCard
            key={step.title}
            icon={step.icon}
            eyebrow={step.eyebrow}
            title={step.title}
            description={step.description}
            delay={index * 0.06}
          />
        ))}
      </div>
    </section>
  );
}
