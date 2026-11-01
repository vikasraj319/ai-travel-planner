import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BedDouble,
  Building2,
  ChevronRight,
  Compass,
  ExternalLink,
  History,
  Landmark,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Star,
  TriangleAlert,
  Utensils
} from "lucide-react";
import { apiUrl } from "../lib/api";

const CATEGORIES = [
  { key: "stay", label: "Stay", icon: BedDouble },
  { key: "eat", label: "Eat", icon: Utensils },
  { key: "facilities", label: "Facilities", icon: Building2 },
  { key: "explore", label: "Explore", icon: Landmark }
];

const PAGE_SIZE = 6;
const MAX_LIMIT = 20;

// Bounded client-side recovery: at most two automatic retries, with a growing
// delay. A manual retry is always available on top of that.
const MAX_AUTO_RETRIES = 2;
const AUTO_RETRY_DELAYS = [2000, 5000];
const REQUEST_TIMEOUT_MS = 20000;

const REASON_MESSAGES = {
  "location-unresolved":
    "We couldn't confidently locate this destination, so location-based discovery is unavailable.",
  "geocoding-failed": "The map service could not look up that location right now.",
  "geocoding-timeout": "The map service took too long to look up that location.",
  "missing-credentials": "Nearby ratings and listings are not configured on this server yet.",
  "rate-limit": "The places provider is rate-limiting requests. Please try again shortly.",
  timeout: "The places provider took too long to respond. Please try again shortly.",
  "budget-exceeded": "The places lookup ran out of time. Please try again.",
  "provider-overloaded": "The places provider is busy right now. Please try again shortly.",
  "provider-unavailable": "The places provider is currently unavailable. Please try again shortly.",
  "provider-error": "The places provider returned an unexpected response."
};

function reasonMessage(reason, detail) {
  if (typeof detail === "string" && detail.trim()) return detail;
  return REASON_MESSAGES[reason] || "Nearby places are unavailable right now.";
}

function formatPriceLevel(level) {
  if (!Number.isFinite(level)) return null;
  if (level <= 0) return "Free";
  return "$".repeat(Math.min(4, level));
}

function PlaceCard({ place, onFocus }) {
  const price = formatPriceLevel(place.priceLevel);
  const link = place.website || place.mapsUrl || place.sourceUrl;
  const hasRating = Number.isFinite(place.rating);

  const handleFocus = () => {
    if (Number.isFinite(place.lat) && Number.isFinite(place.lng) && onFocus) {
      onFocus({ label: place.name, lat: place.lat, lng: place.lng });
    }
  };

  return (
    <article
      className="place-card"
      onClick={handleFocus}
      role={onFocus ? "button" : undefined}
      tabIndex={onFocus ? 0 : undefined}
      onKeyDown={(event) => {
        if (onFocus && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          handleFocus();
        }
      }}
    >
      <div className="place-card-head">
        <h4>{place.name}</h4>
        <span className="place-category">{place.subcategory}</span>
      </div>

      <div className="place-card-meta">
        {hasRating ? (
          <span className="place-rating" title={`${place.rating} out of ${place.ratingScale || 5}`}>
            <Star size={14} fill="currentColor" />
            {place.rating}
            {Number.isFinite(place.ratingScale) ? `/${place.ratingScale}` : ""}
            {Number.isFinite(place.reviewCount) ? (
              <em>({place.reviewCount.toLocaleString()} reviews)</em>
            ) : null}
          </span>
        ) : (
          <span className="place-rating place-rating-empty">No ratings available</span>
        )}
        {place.distance && (
          <span className="place-distance">
            <MapPin size={13} />
            {place.distance}
          </span>
        )}
      </div>

      {place.address && <p className="place-address">{place.address}</p>}

      <div className="place-details">
        {price && <span>{price}</span>}
        {place.openNow !== null && place.openNow !== undefined && (
          <span className={place.openNow ? "place-open" : "place-closed"}>
            {place.openNow ? "Open now" : "Closed"}
          </span>
        )}
        {place.phone && (
          <span>
            <Phone size={12} />
            {place.phone}
          </span>
        )}
      </div>

      <div className="place-card-actions">
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            View listing
            <ExternalLink size={13} />
          </a>
        )}
        {Number.isFinite(place.lat) && (
          <a
            className="place-map-link"
            href={place.mapsUrl || `https://www.google.com/maps?q=${place.lat},${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            Directions
            <ChevronRight size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

export default function NearbyPlaces({ destination, stops = [], onFocusPlace }) {
  const [category, setCategory] = useState("eat");
  const [locationLabel, setLocationLabel] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [data, setData] = useState(null);
  const [lastGood, setLastGood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRetries, setAutoRetries] = useState(0);

  const requestId = useRef(0);
  const loadRef = useRef(null);
  const autoRetryRef = useRef(0);
  const retryTimerRef = useRef(null);
  const abortRef = useRef(null);

  const stopsKey = (stops || []).join("\u0001");

  const locationOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    const main = (destination || "").trim();

    if (main) {
      options.push({ value: "", label: "Whole destination", query: main });
      seen.add(main.toLowerCase());
    }

    for (const stop of stops) {
      const clean = (stop || "").trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({ value: clean, label: clean, query: clean });
    }

    return options;
    // `stops` is rebuilt on each parent render; key on its contents instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, stopsKey]);

  const hasLocation = locationOptions.length > 0;

  const scheduleAutoRetry = useCallback((payload, id) => {
    const retryable = payload?.retryable !== false;
    if (!retryable) return;
    if (autoRetryRef.current >= MAX_AUTO_RETRIES) return;

    const attempt = autoRetryRef.current;
    const delay = AUTO_RETRY_DELAYS[attempt] ?? AUTO_RETRY_DELAYS[AUTO_RETRY_DELAYS.length - 1];

    autoRetryRef.current = attempt + 1;
    setAutoRetries(autoRetryRef.current);

    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      if (id !== requestId.current) return;
      loadRef.current?.();
    }, delay);
  }, []);

  const load = useCallback(async () => {
    if (!hasLocation) {
      setLoading(false);
      setData(null);
      setLastGood(null);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({ category, limit: String(limit) });
      if (destination) params.set("destination", destination);
      if (locationLabel) params.set("location", locationLabel);

      const res = await fetch(apiUrl(`/api/places/nearby?${params.toString()}`), {
        signal: controller.signal
      });
      const body = await res.json().catch(() => ({}));

      if (id !== requestId.current) return;

      if (!res.ok || !body?.success) {
        throw new Error(body?.message || "Nearby discovery request failed");
      }

      const payload = body.data || null;
      setData(payload);

      if (payload?.available) {
        setLastGood(payload);
        autoRetryRef.current = 0;
        setAutoRetries(0);
      } else {
        // The provider answered but could not deliver results.
        scheduleAutoRetry(payload, id);
      }
    } catch (err) {
      if (id !== requestId.current) return;

      if (err?.name === "AbortError") {
        setError("The nearby places request timed out. Please try again.");
      } else {
        console.error(err);
        setError(err?.message || "Nearby discovery request failed");
      }

      scheduleAutoRetry({ retryable: true }, id);
    } finally {
      clearTimeout(timer);
      if (id === requestId.current) setLoading(false);
    }
  }, [category, destination, locationLabel, limit, hasLocation, scheduleAutoRetry]);

  loadRef.current = load;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [category, locationLabel]);

  // A new category or location starts a fresh recovery budget.
  useEffect(() => {
    autoRetryRef.current = 0;
    setAutoRetries(0);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [category, locationLabel]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Keep the selected reference valid when the destination or stops change,
  // so requests never go out without a resolvable location.
  useEffect(() => {
    if (!locationOptions.some((option) => option.value === locationLabel)) {
      setLocationLabel(locationOptions[0]?.value ?? "");
    }
  }, [locationOptions, locationLabel]);

  // Previous results stay on screen while a refresh runs or after a failure,
  // so the section never flashes empty.
  const results = data?.available ? data.results || [] : lastGood?.results || [];
  const hasResults = results.length > 0;
  const canLoadMore = results.length >= limit && limit < MAX_LIMIT;

  const unavailable = Boolean(data && data.available === false);
  const showSkeleton = hasLocation && loading && !hasResults && !error;
  const showEmpty = Boolean(data?.available) && !hasResults && !loading;

  return (
    <section className="discovery-section" aria-label="Nearby places">
      <div className="discovery-header">
        <div>
          <p className="section-eyebrow">Around your itinerary</p>
          <h3 className="discovery-title">Nearby Places</h3>
        </div>

        <div className="discovery-tabs" aria-label="Place categories">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                type="button"
                className={`filter-btn ${category === cat.key ? "active" : ""}`}
                onClick={() => setCategory(cat.key)}
                aria-pressed={category === cat.key}
              >
                <Icon size={14} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {locationOptions.length > 1 && (
        <div className="discovery-controls">
          <label className="discovery-select">
            <MapPin size={15} />
            <select
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
              aria-label="Choose a reference location"
            >
              {locationOptions.map((option) => (
                <option key={option.value || "destination"} value={option.value}>
                  Near {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!hasLocation && (
        <p className="discovery-state">
          <TriangleAlert size={16} />
          Add a destination to see nearby places.
        </p>
      )}

      {showSkeleton && (
        <div className="place-grid" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="place-card place-card-skeleton" />
          ))}
        </div>
      )}

      {hasLocation && error && (
        <p className="discovery-state discovery-state-error">
          <TriangleAlert size={16} />
          {error}
          <button type="button" className="discovery-retry" onClick={() => load()}>
            <RefreshCw size={14} />
            Try again
          </button>
        </p>
      )}

      {hasLocation && !error && unavailable && (
        <p className="discovery-state discovery-state-warning">
          <TriangleAlert size={16} />
          {reasonMessage(data.reason, data.reasonDetail)}
          {data.retryable !== false && (
            <button type="button" className="discovery-retry" onClick={() => load()}>
              <RefreshCw size={14} />
              Try again
            </button>
          )}
        </p>
      )}

      {hasLocation && !error && data?.meta?.stale && (
        <p className="discovery-note discovery-note-stale">
          <History size={13} />
          Showing the last known results while we refresh.
        </p>
      )}

      {hasLocation && !error && data?.available && data.meta?.hasRatings === false && (
        <p className="discovery-note">
          Ratings are not available from OpenStreetMap. Facilities and basic details are shown instead.
        </p>
      )}

      {showEmpty && (
        <p className="discovery-state">
          <Compass size={16} />
          No relevant places found nearby. Try a broader category.
        </p>
      )}

      {hasResults && (
        <div className="place-grid">
          {results.map((place) => (
            <PlaceCard key={place.id} place={place} onFocus={onFocusPlace} />
          ))}
        </div>
      )}

      {(hasResults || data?.available) && (
        <div className="discovery-footer">
          {canLoadMore && (
            <button
              type="button"
              className="discovery-more"
              onClick={() => setLimit((prev) => Math.min(MAX_LIMIT, prev + PAGE_SIZE))}
            >
              Explore more
            </button>
          )}
          {loading && autoRetries > 0 && (
            <span className="discovery-attribution">
              Retrying automatically ({autoRetries}/{MAX_AUTO_RETRIES})…
            </span>
          )}
          {data?.meta?.attribution && (
            <span className="discovery-attribution">
              {data.meta.attribution}
              {data.meta.lastChecked
                ? ` · checked ${new Date(data.meta.lastChecked).toLocaleTimeString()}`
                : ""}
            </span>
          )}
        </div>
      )}

      {loading && hasLocation && (
        <span className="discovery-inline-loading">
          <Loader2 size={13} className="spin" />
        </span>
      )}
    </section>
  );
}
