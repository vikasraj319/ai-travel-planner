import { ExternalLink, MapPin, MapPinned, Navigation } from "lucide-react";

export default function Map({ location }) {
  const query = location || "Kyoto";

  return (
    <div className="map-card">
      <div className="map-card-header">
        <div>
          <span><MapPinned size={17} /> Live route preview</span>
          <strong>{query}</strong>
        </div>
        <div className="map-actions">
          <div className="map-location-pill">
            <MapPin size={17} />
            <span>{query === "Kyoto" ? "Kyoto, Japan" : query}</span>
          </div>
          <button type="button" aria-label="Open map externally">
            <ExternalLink size={20} />
          </button>
          <button type="button" aria-label="Center route">
            <Navigation size={20} fill="currentColor" />
          </button>
        </div>
      </div>
      <div className="map-container">
        <iframe
          title="map"
          src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
          loading="lazy"
        />
      </div>
    </div>
  );
}
