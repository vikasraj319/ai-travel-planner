export default function Stats() {
  const stats = [
    ["190+", "Countries covered"],
    ["50K+", "Itineraries created"],
    ["4.9/5", "Average rating"],
    ["2 sec", "Average plan time"]
  ];

  return (
    <div className="stats-bar" aria-label="Horizons AI statistics">
      {stats.map(([value, label], index) => (
        <div className="stat reveal" style={{ transitionDelay: `${index * 0.1}s` }} key={label}>
          <div className="stat-num">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
