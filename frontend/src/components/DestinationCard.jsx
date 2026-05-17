export default function DestinationCard({ data, onPlan }) {
  return (
    <div className="dest-card" data-region={data.region}>
      <img className="dest-img" src={data.img} alt={data.name} />

      <div className="dest-overlay">
        <div className="dest-tag">{data.tag}</div>
        <div className="dest-name">{data.name}</div>

        <div className="dest-meta">
          <span>{data.season}</span>
          <span>{data.days}</span>
        </div>

        <button
          className="dest-plan-btn"
          onClick={() => onPlan(data.full)}
        >
          Plan this trip →
        </button>
      </div>
    </div>
  );
}