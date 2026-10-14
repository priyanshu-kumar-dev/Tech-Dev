export default function SeverityBadge({ severity = "Medium" }) {
  const normalized = String(severity).toLowerCase();

  const className = ["critical", "high", "medium", "low"].includes(normalized)
    ? normalized
    : "medium";

  return (
    <span className={`severity-badge ${className}`}>
      <span className="severity-dot" />
      {severity}
    </span>
  );
}