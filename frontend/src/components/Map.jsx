export default function Map({ location }) {
  const query = location || "Kyoto";

  return (
    <div className="map-container">
      <iframe
        title="map"
        src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
        loading="lazy"
      />
    </div>
  );
}