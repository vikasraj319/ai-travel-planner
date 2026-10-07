import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Lightbulb, MapPinned, Utensils } from "lucide-react";
import { apiUrl } from "../lib/api";
import ItineraryCard from "./ItineraryCard";
import { FALLBACK_IMAGES, handleImageError, isValidImageUrl } from "../utils/imageUtils";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseTextItinerary(text) {
  if (!text || typeof text !== "string") return [];

  const sections = text
    .split(/(?=Day\s+\d+\s*:)/gi)
    .map(section => section.trim())
    .filter(section => /^Day\s+\d+\s*:/i.test(section));

  return sections.map((section, index) => {
    const [, dayValue, rest = ""] = section.match(/^Day\s+(\d+)\s*:\s*([\s\S]*)$/i) || [];
    const dayNumber = Number(dayValue) || index + 1;
    const lines = rest
      .split(/\n+/)
      .map(line => line.replace(/^[-*•✦]\s*/, "").trim())
      .filter(Boolean);

    const title = lines[0]?.slice(0, 80) || `Day ${dayNumber}`;
    const activities = (lines.length ? lines : [rest])
      .flatMap(line => line.split(/(?<=\.)\s+(?=[A-Z])/))
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((item, activityIndex) => ({
        time: activityIndex === 0 ? "Morning" : activityIndex === 1 ? "Afternoon" : "Evening",
        activity: item.replace(/\.$/, ""),
        description: item
      }));

    return {
      day: dayNumber,
      title,
      activities
    };
  });
}

function normalizeDays(value) {
  if (typeof value === "string") {
    return parseTextItinerary(value);
  }

  if (Array.isArray(value)) {
    return value.map((day, index) => {
      if (typeof day === "string") {
        return {
          day: index + 1,
          title: `Day ${index + 1}`,
          activities: parseTextItinerary(`Day ${index + 1}: ${day}`)[0]?.activities || [
            { time: "", activity: day }
          ]
        };
      }

      if (!day || typeof day !== "object") {
        return {
          day: index + 1,
          title: `Day ${index + 1}`,
          activities: []
        };
      }

      const rawActivities =
        day.activities ||
        day.schedule ||
        day.items ||
        day.plan ||
        day.events ||
        [];

      return {
        ...day,
        day: day.day ?? day.dayNumber ?? index + 1,
        title: day.title || day.name || `Day ${day.day ?? index + 1}`,
        activities: typeof rawActivities === "string"
          ? parseTextItinerary(`Day ${index + 1}: ${rawActivities}`)[0]?.activities || [
              { time: "", activity: rawActivities }
            ]
          : toArray(rawActivities)
      };
    });
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, day], index) => ({
      day: Number(key.replace(/\D/g, "")) || index + 1,
      title: key,
      activities: typeof day === "string"
        ? parseTextItinerary(`Day ${index + 1}: ${day}`)[0]?.activities || [
            { time: "", activity: day }
          ]
        : toArray(day?.activities || day?.schedule || day?.items || day)
    }));
  }

  return [];
}

function normalizePlan(data) {
  const unwrapped = data?.plan || data?.itinerary || data;

  if (typeof unwrapped === "string") {
    return {
      title: "Generated Itinerary",
      overview: unwrapped,
      days: parseTextItinerary(unwrapped),
      food: [],
      tips: [],
      budget: {}
    };
  }

  if (!unwrapped || typeof unwrapped !== "object") return {};

  const days = normalizeDays(
    unwrapped.days ||
    unwrapped.itinerary ||
    unwrapped.schedule ||
    unwrapped.dayByDay ||
    unwrapped.dailyPlan
  );

  return {
    ...unwrapped,
    destination:
      unwrapped.destination ||
      unwrapped.location ||
      unwrapped.city ||
      unwrapped.place ||
      "",
    overview:
      unwrapped.overview ||
      unwrapped.summary ||
      unwrapped.description ||
      "",
    days
  };
}

function normalizeActivity(activity) {
  if (typeof activity === "string") {
    return {
      time: "",
      activity,
      location: ""
    };
  }

  return activity || {};
}

export default function Itinerary({ data, onPlan }) {
  const [backgroundImage, setBackgroundImage] = useState("");
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const plan = data ? normalizePlan(data) : {};
  const searchQuery = `${plan.destination || plan.title || "travel"} travel landscape`;

  useEffect(() => {
    async function loadImage() {
      try {
        const response = await fetch(
          apiUrl(`/api/images?query=${encodeURIComponent(searchQuery)}`)
        );
        const result = await response.json();
        if (result.imageUrl && isValidImageUrl(result.imageUrl)) {
          setBackgroundImage(result.imageUrl);
        } else {
          setBackgroundImage(FALLBACK_IMAGES.destination);
        }
      } catch (err) {
        console.error(err);
        setBackgroundImage(FALLBACK_IMAGES.destination);
      }
    }

    loadImage();
  }, [searchQuery]);

  const days = normalizeDays(plan.days);
  const food = toArray(plan.food);
  const tips = toArray(plan.tips);
  const budget = plan.budget && typeof plan.budget === "object"
    ? plan.budget
    : {};

  const safeActiveDayIndex = days[activeDayIndex] ? activeDayIndex : 0;
  const activeDay = days[safeActiveDayIndex] || days[0];
  const activeActivities = normalizeDays([activeDay])[0]?.activities.map(normalizeActivity) || [];

  const budgetItems = [
    ["Stay", budget.stay],
    ["Food", budget.food],
    ["Transport", budget.transport],
    ["Activities", budget.activities]
  ];

  function handlePlanClick() {
    document
      .getElementById("planner")
      ?.scrollIntoView({ behavior: "smooth" });

    onPlan?.("Plan another trip for me");
  }

  if (!data) return null;

  return (
    <section id="itinerary" className="itinerary-page">
      <div className="itinerary-hero">
        <div>
          <p className="section-eyebrow">AI Generated Itinerary</p>
          <h2 className="section-title">{plan.title || "Your Travel Plan"}</h2>
          {plan.overview && <p className="itin-desc">{plan.overview}</p>}
        </div>
        <div className="itinerary-hero-image">
          <img
            src={backgroundImage || FALLBACK_IMAGES.destination}
            alt={plan.destination || plan.title || "Travel destination"}
            onError={(e) => handleImageError(e, FALLBACK_IMAGES.destination)}
          />
        </div>
      </div>

      <div className="itin-layout">
        <div className="itin-left">
          {days.length > 0 ? (
            <>
              <div className="day-tabs" role="tablist" aria-label="Itinerary days">
                {days.map((day, index) => {
                  const dayNumber = day.day ?? index + 1;
                  return (
                    <button
                      key={`${dayNumber}-${index}`}
                      className={`day-tab ${safeActiveDayIndex === index ? "active" : ""}`}
                      onClick={() => setActiveDayIndex(index)}
                      type="button"
                      role="tab"
                      aria-selected={safeActiveDayIndex === index}
                    >
                      Day {dayNumber}
                    </button>
                  );
                })}
              </div>

              <div className="day-heading">
                <span><CalendarDays size={18} /> Day {(activeDay?.day ?? safeActiveDayIndex + 1)}</span>
                <h3>{activeDay?.title || `Day ${safeActiveDayIndex + 1}`}</h3>
              </div>

              <div className="timeline">
                {activeActivities.length > 0 ? (
                  activeActivities.map((activity, index) => (
                    <ItineraryCard
                      key={`${safeActiveDayIndex}-${index}`}
                      activity={activity}
                      index={index}
                      destination={plan.destination}
                    />
                  ))
                ) : (
                  <p className="itin-empty">Details for this day will appear here.</p>
                )}
              </div>
            </>
          ) : (
            <p className="itin-empty">The itinerary is ready, but no day-by-day schedule was returned.</p>
          )}
        </div>

        <aside className="itin-right">
          <div className="itin-summary-card">
            <div className="itin-panel-title">
              <MapPinned size={18} />
              Trip Summary
            </div>

            <div className="itin-budget-grid">
              {budgetItems.map(([label, value]) => (
                <div className="itin-budget-item" key={label}>
                  <div className="itin-budget-label">{label}</div>
                  <div className="itin-budget-value">{value || "N/A"}</div>
                </div>
              ))}
            </div>

            {food.length > 0 && (
              <div className="itin-side-section">
                <div className="itin-panel-title">
                  <Utensils size={18} />
                  Food Picks
                </div>
                <div className="itin-tags" aria-label="Food recommendations">
                  {food.map((item, index) => (
                    <span key={`${item}-${index}`} className="itin-tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {tips.length > 0 && (
              <div className="itin-side-section">
                <div className="itin-panel-title">
                  <Lightbulb size={18} />
                  Travel Tips
                </div>
                <ul className="itin-tips">
                  {tips.map((tip, index) => (
                    <li key={`${tip}-${index}`}>➤ {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={handlePlanClick} className="itin-plan-button" type="button">
              Plan Another Trip
              <ArrowRight size={18} />
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
