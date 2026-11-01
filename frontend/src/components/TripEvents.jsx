import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Ticket,
  TriangleAlert
} from "lucide-react";
import { apiUrl } from "../lib/api";

function reasonMessage(reason) {
  switch (reason) {
    case "location-unresolved":
      return "We couldn't confidently locate this destination, so event discovery is unavailable.";
    case "missing-credentials":
      return "Live event discovery is not configured on this server yet.";
    case "provider-disabled":
      return "Live event discovery is turned off.";
    case "rate-limit":
      return "The events provider is rate-limiting requests. Please try again shortly.";
    case "timeout":
      return "The events provider timed out. Please try again shortly.";
    case "provider-unavailable":
      return "The events provider is currently unavailable.";
    case "provider-error":
      return "The events provider returned an unexpected response.";
    default:
      return "Live events are unavailable right now.";
  }
}

function formatDateRange(event) {
  const { startDate, endDate } = event;
  if (!startDate) return "Date to be confirmed";

  const format = (value) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });
  };

  if (endDate && endDate !== startDate) {
    return `${format(startDate)} – ${format(endDate)}`;
  }

  return format(startDate);
}

function EventCard({ event }) {
  const isTentative = event.classification === "tentative";
  const link = event.url || event.ticketUrl;
  const location = [event.venue, event.venueCity].filter(Boolean).join(", ");

  return (
    <article className="event-card">
      <div className="event-card-head">
        <h4>{event.name}</h4>
        <span className={`event-badge ${isTentative ? "tentative" : "confirmed"}`}>
          {isTentative ? "Tentative" : "Confirmed"}
        </span>
      </div>

      <div className="event-card-meta">
        <span>
          <CalendarDays size={14} />
          {formatDateRange(event)}
          {event.startTime ? ` · ${event.startTime.slice(0, 5)}` : ""}
        </span>
        {event.distance && (
          <span>
            <MapPin size={14} />
            {event.distance}
          </span>
        )}
      </div>

      {location && <p className="event-venue">{location}</p>}
      {event.description && <p className="event-description">{event.description}</p>}

      <div className="event-card-footer">
        <span className="event-category">{event.category}</span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer">
            {event.ticketUrl ? "Tickets" : "Details"}
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </article>
  );
}

export default function TripEvents({ destination, destinations = [], startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!destination) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ destination, limit: "8" });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const extras = destinations.filter(Boolean).slice(0, 4);
      if (extras.length) params.set("destinations", extras.join(","));

      const res = await fetch(apiUrl(`/api/events?${params.toString()}`));
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "Event discovery request failed");
      }

      setData(body.data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Event discovery request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [destination, destinations, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const events = data?.events || [];
  const outside = data?.upcomingOutsideTrip || [];

  return (
    <section className="discovery-section" aria-label="Events during your trip">
      <div className="discovery-header">
        <div>
          <p className="section-eyebrow">Live &amp; local</p>
          <h3 className="discovery-title">Events During Your Trip</h3>
        </div>
        {data?.window?.hasTripDates && data.window.startDate && (
          <span className="event-window">
            {data.window.startDate}
            {data.window.endDate && data.window.endDate !== data.window.startDate
              ? ` → ${data.window.endDate}`
              : ""}
          </span>
        )}
      </div>

      {loading && (
        <div className="event-grid" aria-busy="true">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="event-card event-card-skeleton" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="discovery-state discovery-state-error">
          <TriangleAlert size={16} />
          {error}
          <button type="button" className="discovery-retry" onClick={load}>
            <RefreshCw size={14} />
            Retry
          </button>
        </p>
      )}

      {!loading && !error && data && !data.available && (
        <p className="discovery-state">
          <TriangleAlert size={16} />
          {reasonMessage(data.reason)}
        </p>
      )}

      {!loading && !error && data && data.available && (
        <>
          {events.length === 0 ? (
            <p className="discovery-state">
              <Compass size={16} />
              {data.window?.hasTripDates
                ? "No confirmed events overlap your travel dates. You can still explore the destination's general events."
                : "No upcoming events were found for this destination right now."}
            </p>
          ) : (
            <div className="event-grid">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {outside.length > 0 && (
            <div className="event-outside">
              <p className="event-outside-title">
                <Ticket size={15} />
                Other upcoming events (outside your travel dates)
              </p>
              <div className="event-grid">
                {outside.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          <div className="discovery-footer">
            {data.meta?.note && <span className="discovery-attribution">{data.meta.note}</span>}
            {data.meta?.lastChecked && (
              <span className="discovery-attribution">
                checked {new Date(data.meta.lastChecked).toLocaleString()}
              </span>
            )}
          </div>
        </>
      )}

      {loading && (
        <span className="discovery-inline-loading">
          <Loader2 size={13} className="spin" />
        </span>
      )}
    </section>
  );
}
