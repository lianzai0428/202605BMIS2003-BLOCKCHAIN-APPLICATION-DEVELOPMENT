export default function StatCard({ title, value, description }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{title}</p>
      <h2>{value}</h2>
      {description && <p className="muted">{description}</p>}
    </div>
  );
}