import { ArrowUpDown, MapPin } from "lucide-react";
import SeverityBadge from "./SeverityBadge";

const severityRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export default function PriorityTable({ reports = [] }) {
  const rows = reports
    .flatMap((report) =>
      (report.detections || []).map((detection, index) => ({
        id: detection.id || `${report.id}-${index}`,
        type: detection.type || "Road defect",
        severity: detection.severity || "Medium",
        priorityScore: Number(detection.priorityScore) || 0,
        location: report.location,
        repairAction: detection.repairAction || "Manual inspection required",
        createdAt: report.createdAt,
        simulated: detection.simulated ?? report.isSimulated ?? false,
      }))
    )
    .sort(
      (a, b) =>
        (severityRank[b.severity] || 0) -
          (severityRank[a.severity] || 0) ||
        b.priorityScore - a.priorityScore
    );

  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h3>Repair Priority</h3>
          <p>Highest-severity records are listed first</p>
        </div>
        <ArrowUpDown size={20} />
      </div>

      {rows.length === 0 ? (
        <div className="table-empty">
          No reports yet. Analyze a road image to create records.
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Defect</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Location</th>
                <th>Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.type}</strong>
                    {row.simulated && (
                      <span className="simulated-label">Demo</span>
                    )}
                  </td>
                  <td>
                    <SeverityBadge severity={row.severity} />
                  </td>
                  <td>
                    <strong>{row.priorityScore}/100</strong>
                  </td>
                  <td>
                    {row.location ? (
                      <span className="table-location">
                        <MapPin size={14} />
                        {Number(row.location.latitude).toFixed(3)},{" "}
                        {Number(row.location.longitude).toFixed(3)}
                      </span>
                    ) : (
                      <span className="muted-text">Not available</span>
                    )}
                  </td>
                  <td>{row.repairAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}