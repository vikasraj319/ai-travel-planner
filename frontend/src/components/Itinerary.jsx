import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Lightbulb, MapPinned, Utensils } from "lucide-react";
import { apiUrl } from "../lib/api";
import ItineraryCard from "./ItineraryCard";
import NearbyPlaces from "./NearbyPlaces";
import TripEvents from "./TripEvents";
import { FALLBACK_IMAGES, handleImageError, isValidImageUrl } from "../utils/imageUtils";


function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/```(?:json|markdown|text)?/gi, "")
    .trim();
}

function normalizeActivity(activity) {
  if (typeof activity === "string") {
    const text = activity.trim();

    // Support entries such as "09:00 AM - Visit Kiyomizu-dera"
    const timeMatch = text.match(
      /^((?:\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)(?:\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)?)\s*[-–—:]\s*(.+)$/i
    );

    return {
      time: timeMatch ? timeMatch[1].trim() : "",
      activity: timeMatch ? timeMatch[2].trim() : text,
      description: timeMatch ? timeMatch[2].trim() : text,
      location: ""
    };
  }

  if (!activity || typeof activity !== "object") {
    return {
      time: "",
      activity: String(activity ?? ""),
      description: "",
      location: ""
    };
  }

  const title =
    activity.activity ??
    activity.title ??
    activity.name ??
    activity.placeName ??
    activity.task ??
    activity.description ??
    activity.details ??
    "";

  return {
    ...activity,
    time: String(
      activity.time ??
      activity.timing ??
      activity.period ??
      activity.startTime ??
      ""
    ),
    activity: String(title),
    description: String(
      activity.description ??
      activity.details ??
      activity.notes ??
      title
    ),
    location: String(
      activity.location ??
      activity.place ??
      activity.address ??
      ""
    )
  };
}

function parseTextItinerary(value) {
  const text = cleanText(value);
  if (!text) return [];

  // Supports: Day 1:, ## Day 1 - Kyoto, Day 1. Kyoto, etc.
  const headingRegex =
    /^\s{0,3}#{0,3}\s*Day\s+(\d+)\s*(?::|[-–—.)|])?\s*(.*?)\s*$/gim;

  const headings = [...text.matchAll(headingRegex)];

  if (!headings.length) {
    const lines = text
      .split(/\n+/)
      .map(line =>
        line
          .replace(/^\s{0,3}#{1,6}\s*/, "")
          .replace(/^\s*[-*•✦]\s*/, "")
          .trim()
      )
      .filter(Boolean);

    if (!lines.length) return [];

    return [{
      day: 1,
      title: "Day 1",
      activities: lines.map((line, index) => ({
        time: "",
        activity: line,
        description: line
      }))
    }];
  }

  return headings.map((heading, index) => {
    const dayNumber = Number(heading[1]) || index + 1;
    const contentStart = heading.index + heading[0].length;
    const contentEnd =
      index + 1 < headings.length
        ? headings[index + 1].index
        : text.length;

    const content = text.slice(contentStart, contentEnd).trim();

    const title = heading[2]
      .replace(/[*_`#]/g, "")
      .trim() || `Day ${dayNumber}`;

    const lines = content
      .split(/\n+/)
      .map(line =>
        line
          .replace(/^\s{0,3}#{1,6}\s*/, "")
          .replace(/^\s*(?:[-*•✦]|\d+[.)])\s*/, "")
          .replace(/\*\*/g, "")
          .trim()
      )
      .filter(Boolean);

    const activities = lines.map(line => {
      const match = line.match(
        /^(Morning|Afternoon|Evening|Night|Breakfast|Lunch|Dinner)\s*:\s*(.*)$/i
      );

      if (match) {
        return {
          time: match[1],
          activity: match[2].trim(),
          description: match[2].trim()
        };
      }

      return {
        time: "",
        activity: line,
        description: line
      };
    }).filter(item => item.activity);

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
        const parsed = parseTextItinerary(day);

        // Preserve a complete day heading if the string contains one.
        if (parsed.length === 1) {
          return parsed[0];
        }

        return {
          day: index + 1,
          title: `Day ${index + 1}`,
          activities: [{
            time: "",
            activity: day.trim(),
            description: day.trim()
          }]
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
        day.activities ??
        day.schedule ??
        day.items ??
        day.plan ??
        day.events ??
        day.tasks ??
        [];

      const activities = typeof rawActivities === "string"
        ? rawActivities
            .split(/\n+/)
            .map(item => item.replace(/^\s*[-*•✦]\s*/, "").trim())
            .filter(Boolean)
            .map(normalizeActivity)
        : toArray(rawActivities).map(normalizeActivity);

      return {
        ...day,
        day: Number(day.day ?? day.dayNumber ?? day.number) || index + 1,
        title: day.title || day.name || `Day ${index + 1}`,
        activities
      };
    });
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, day], index) => {
      const dayNumber = Number(key.replace(/\D/g, "")) || index + 1;

      if (typeof day === "string") {
        const parsed = parseTextItinerary(day);

        return parsed.length === 1
          ? { ...parsed[0], day: dayNumber }
          : {
              day: dayNumber,
              title: key,
              activities: [normalizeActivity(day)]
            };
      }

      const rawActivities =
        day?.activities ??
        day?.schedule ??
        day?.items ??
        day?.events ??
        day?.plan ??
        (Array.isArray(day) ? day : []);

      return {
        ...(day && !Array.isArray(day) ? day : {}),
        day: dayNumber,
        title: day?.title || day?.name || `Day ${dayNumber}`,
        activities: typeof rawActivities === "string"
          ? rawActivities.split(/\n+/)
              .map(item => item.trim())
              .filter(Boolean)
              .map(normalizeActivity)
          : toArray(rawActivities).map(normalizeActivity)
      };
    });
  }

  return [];
}

function displayText(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    return String(
      value.name ??
      value.title ??
      value.description ??
      value.text ??
      value.activity ??
      ""
    );
  }

  return "";
}

function normalizePlan(data) {
  let unwrapped =
    data?.plan ??
    data?.itinerary ??
    data?.data?.plan ??
    data?.data?.itinerary ??
    data?.data ??
    data;

  // Handle JSON returned as a string.
  if (typeof unwrapped === "string") {
    const cleaned = cleanText(unwrapped);

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object") {
        unwrapped = parsed;
      } else {
        return {
          title: "Generated Itinerary",
          overview: cleaned,
          days: parseTextItinerary(cleaned),
          food: [],
          tips: [],
          budget: {}
        };
      }
    } catch {
      return {
        title: "Generated Itinerary",
        overview: cleaned,
        days: parseTextItinerary(cleaned),
        food: [],
        tips: [],
        budget: {}
      };
    }
  }

  if (!unwrapped || typeof unwrapped !== "object") return {};

  const rawDays =
    unwrapped.days ??
    unwrapped.dayByDay ??
    unwrapped.dailyPlan ??
    unwrapped.schedule ??
    unwrapped.itinerary ??
    unwrapped.activities ??
    [];

  const days = normalizeDays(rawDays);

  return {
    ...unwrapped,
    destination:
      unwrapped.destination ||
      unwrapped.location ||
      unwrapped.city ||
      unwrapped.place ||
      "",
    title: unwrapped.title || "Your Travel Plan",
    overview:
      unwrapped.overview ||
      unwrapped.summary ||
      unwrapped.description ||
      "",
    days,
    food: toArray(unwrapped.food ?? unwrapped.foodRecommendations),
    tips: toArray(unwrapped.tips ?? unwrapped.travelTips),
    budget: unwrapped.budget || {}
  };
}


export default function Itinerary({ data, onPlan, tripMeta, onFocusPlace }) {
  const [backgroundImage, setBackgroundImage] = useState("");
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const plan = data ? normalizePlan(data) : {};
  const searchQuery = `${plan.destination || plan.title || "travel"} travel landscape`;

  useEffect(() => {
    setActiveDayIndex(0);
  }, [data]);

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

  const destination = plan.destination || tripMeta?.destination || "";

  const stops = (() => {
    const seen = new Set();
    const collected = [];

    days.forEach((day) => {
      (day?.activities || []).forEach((activity) => {
        const raw = typeof activity === "string" ? "" : (activity?.location || "");
        const clean = String(raw).trim();
        if (!clean) return;
        const key = clean.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        collected.push(clean);
      });
    });

    return collected.slice(0, 6);
  })();

  const safeActiveDayIndex = days[activeDayIndex] ? activeDayIndex : 0;
  const activeDay = days[safeActiveDayIndex] || days[0];
  const activeActivities = toArray(activeDay?.activities)
    .map(normalizeActivity)
    .filter(activity => activity.activity || activity.description || activity.location);

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
                  {food.map((item, index) => {
                      const text = displayText(item);
                      if (!text) return null;
                      return (
                        <span key={`${text}-${index}`} className="itin-tag">
                          {text}
                        </span>
                      );
                    })}
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
                  {tips.map((tip, index) => {
                      const text = displayText(tip);
                      if (!text) return null;
                      return <li key={`${text}-${index}`}>➤ {text}</li>;
                    })}
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

      {(destination || stops.length > 0) && (
        <div className="itin-discovery">
          <NearbyPlaces
            destination={destination}
            stops={stops}
            onFocusPlace={onFocusPlace}
          />
          <TripEvents
            destination={destination}
            destinations={stops.slice(0, 2)}
            startDate={tripMeta?.startDate}
            endDate={tripMeta?.endDate}
          />
        </div>
      )}
    </section>
  );
}
