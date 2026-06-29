import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePlan(data) {
  if (typeof data === "string") {
    return {
      title: "Generated Itinerary",
      overview: data,
      days: [],
      food: [],
      tips: [],
      budget: {}
    };
  }

  return data || {};
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

  const plan = data ? normalizePlan(data) : {};
  const searchQuery = `${plan.destination || "travel"} travel landscape`;

  useEffect(() => {
    async function loadImage() {
      try {
        const response = await fetch(
          apiUrl(`/api/images?query=${encodeURIComponent(searchQuery)}`)
        );
        const result = await response.json();
        setBackgroundImage(result.imageUrl);
      } catch (err) {
        console.error(err);
      }
    }

    if (plan.imagePrompt) {
      loadImage();
    }
  }, [plan.imagePrompt, searchQuery]);

  if (!data) return null;

  const days = toArray(plan.days);
  const food = toArray(plan.food);
  const tips = toArray(plan.tips);
  const budget = plan.budget && typeof plan.budget === "object"
    ? plan.budget
    : {};

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

  return (
    <section id="itinerary"
     className="itinerary-page">
      <div
        className="background-layer"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          // backgroundSize: "cover",
          // backgroundRepeat: "no-repeat",
          // backgroundPosition: "center center"

        }}
      />
      <div className="itin-layout">
        <div className="itin-left">
          <div className="section-eyebrow">
            AI Generated Itinerary
          </div>

          <h2 className="section-title">
            {plan.title || "Your Travel Plan"}
          </h2>

          {plan.overview && (
            <p className="itin-desc">
              {plan.overview}
            </p>
          )}

          <div className="itin-sample">
            {days.length > 0 ? (
              days.map((day, index) => {
                const activities = toArray(day.activities);
                const dayNumber = day.day ?? index + 1;

                return (
                  <article className="itin-day" key={`${dayNumber}-${index}`}>
                    <div className="itin-day-header">
                      <div className="itin-day-num">
                        Day {String(dayNumber).padStart(2, "0")}
                      </div>

                      <h3 className="itin-day-title">
                        {day.title || `Day ${dayNumber}`}
                      </h3>
                    </div>

                    <div className="itin-activities">
                      {activities.length > 0 ? (
                        activities.map((item, activityIndex) => {
                          const activity = normalizeActivity(item);

                          return (
                            <div
                              className="itin-act"
                              key={`${dayNumber}-${activityIndex}`}
                            >
                              <div className="itin-time">
                                {activity.time || "Anytime"}
                              </div>

                              <div className="itin-act-body">
                                <div className="itin-act-name">
                                  {activity.activity || activity.title || "Explore"}
                                </div>

                                {activity.location && (
                                  <div className="itin-act-location">
                                    {activity.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="itin-empty">
                          Details for this day will appear here.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="itin-empty">
                The itinerary is ready, but no day-by-day schedule was returned.
              </p>
            )}
          </div>

          {food.length > 0 && (
            <div className="itin-tags" aria-label="Food recommendations">
              {food.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="itin-tag active"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        <aside className="itin-right">
          <div className="itin-map-placeholder">
            <div className="map-bg"></div>

            <div className="map-label">
              <span className="map-pin">Map</span>
              Route preview
              <span>
                Built from itinerary places
              </span>
            </div>
          </div>

          <div className="itin-summary-card">
            <div className="itin-panel-title">
              Trip Summary
            </div>

            <div className="itin-budget-grid">
              {budgetItems.map(([label, value]) => (
                <div className="itin-budget-item" key={label}>
                  <div className="itin-budget-label">
                    {label}
                  </div>

                  <div className="itin-budget-value">
                    {value || "N/A"}
                  </div>
                </div>
              ))}
            </div>

            {tips.length > 0 && (
              <div className="itin-tips">
                <div className="itin-panel-title">
                  Travel Tips
                </div>

                <ul>
                  {tips.map((tip, index) => (
                    <li key={`${tip}-${index}`}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handlePlanClick}
              className="itin-plan-button"
              type="button"
            >
              Plan Another Trip
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
