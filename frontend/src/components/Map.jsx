import { MapPinned } from "lucide-react";

export default function Map({ location }) {
  const query = location || "Kyoto";

  return (
    <div className="map-card">
      <div className="map-card-header">
        <div>
          <span><MapPinned size={17} /> Live route preview</span>
          <strong>{query}</strong>
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
