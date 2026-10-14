import { TrendingUp } from "lucide-react";

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "blue",
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}>
          <Icon size={21} />
        </div>
        <span className="stat-trend">
          <TrendingUp size={14} />
          Live data
        </span>
      </div>

      <p className="stat-title">{title}</p>
      <h2 className="stat-value">{value}</h2>
      <p className="stat-description">{description}</p>
    </article>
  );
}