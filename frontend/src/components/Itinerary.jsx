export default function Itinerary({ data, onPlan }) {
  console.log("ITINERARY DATA:", data);

  if (!data) return null;

  function handlePlanClick() {
    document.getElementById("chatInput")?.focus();

    document
      .getElementById("planner")
      ?.scrollIntoView({ behavior: "smooth" });

    onPlan?.("Plan a trip for me");
  }

  return (
    <section id="itinerary">
      <div className="itin-layout">

        {/* LEFT */}
        <div className="itin-left">

          <div className="section-eyebrow">
            AI Generated Itinerary
          </div>

          <h2 className="section-title">
            {data.title}
          </h2>

          <p className="itin-desc">
            {data.overview}
          </p>

          <div className="itin-sample">

            {/* DYNAMIC DAYS */}
            {data.days?.map((day) => (

              <div className="itin-day" key={day.day}>

                <div className="itin-day-num">
                  Day {String(day.day).padStart(2, "0")}
                </div>

                <div className="itin-day-title">
                  {day.title}
                </div>

                <div className="itin-activities">

                  {day.activities?.map((activity, i) => (

                    <div className="itin-act" key={i}>

                      <div className="itin-time">
                        {activity.time}
                      </div>

                      {activity.activity}

                    </div>

                  ))}

                </div>

              </div>

            ))}

          </div>

          {/* FOOD TAGS */}
          <div className="itin-tags ">

            {data.food?.map((food, i) => (

              <span
                key={i}
                className="itin-tag active"
              >
                {food}
              </span>

            ))}

          </div>

        </div>

        {/* RIGHT */}
        <div className="itin-right">

          {/* MAP */}
          <div className="itin-map-placeholder ">

            <div className="map-bg"></div>

            <div className="map-label">

              <span className="map-pin">📍</span>

              Interactive map preview

              <br />

              <span
                style={{
                  fontSize: "0.85rem",
                  fontFamily: "DM Sans, sans-serif"
                }}
              >
                Generated with each itinerary
              </span>

            </div>

          </div>

          {/* SUMMARY CARD */}
          <div
            className="itin-summary-card"
            style={{
              marginTop: "2rem",
              padding: "1.5rem",
              border: "1px solid rgba(201,169,110,0.15)",
              borderRadius: "3px",
              transitionDelay: "0.2s"
            }}
          >

            <div
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--gold)",
                marginBottom: "1rem"
              }}
            >
              Trip Summary
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem"
              }}
            >

              {/* STAY */}
              <div>

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--mist)"
                  }}
                >
                  Stay
                </div>

                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500
                  }}
                >
                  {data.budget?.stay || "N/A"}
                </div>

              </div>

              {/* FOOD */}
              <div>

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--mist)"
                  }}
                >
                  Food
                </div>

                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500
                  }}
                >
                  {data.budget?.food || "N/A"}
                </div>

              </div>

              {/* TRANSPORT */}
              <div>

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--mist)"
                  }}
                >
                  Transport
                </div>

                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500
                  }}
                >
                  {data.budget?.transport || "N/A"}
                </div>

              </div>

              {/* ACTIVITIES */}
              <div>

                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--mist)"
                  }}
                >
                  Activities
                </div>

                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500
                  }}
                >
                  {data.budget?.activities || "N/A"}
                </div>

              </div>

            </div>

            {/* TIPS */}
            <div style={{ marginTop: "2rem" }}>

              <div
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  marginBottom: "1rem"
                }}
              >
                Travel Tips
              </div>

              <ul
                style={{
                  paddingLeft: "1rem",
                  lineHeight: "1.8"
                }}
              >

                {data.tips?.map((tip, i) => (

                  <li key={i}>
                    {tip}
                  </li>

                ))}

              </ul>

            </div>

            {/* BUTTON */}
            <button
              onClick={handlePlanClick}
              style={{
                width: "100%",
                marginTop: "2rem",
                padding: "0.85rem",
                background: "transparent",
                border: "1px solid var(--gold)",
                color: "var(--gold)",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                fontSize: "0.78rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                borderRadius: "1px"
              }}
            >
              Plan Another Trip →
            </button>

          </div>

        </div>

      </div>
    </section>
  );
}