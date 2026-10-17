import { ArrowRight, MapPin, ScanLine } from "lucide-react";
import {
  calculateRiskScore,
  getPriorityQueueReports,
  getReportSeverity,
  hasValidLocation,
} from "../utils/riskScore";
import { getAssetUrl } from "../services/api";
import SeverityBadge from "./SeverityBadge";

function getLocationLabel(report) {
  const parts = [report.ward, report.city].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (!hasValidLocation(report.location)) return "Location needs verification";
  return `${Number(report.location.latitude).toFixed(3)}, ${Number(
    report.location.longitude
  ).toFixed(3)}`;
}

export default function PriorityTable({ reports = [], setPage }) {
  const rows = getPriorityQueueReports(reports).slice(0, 4);

  return (
    <section className="panel table-panel dashboard-priority-panel">
      <div className="panel-heading dashboard-priority-heading">
        <div>
          <h2>Priority queue</h2>
          <p>Highest priority road damage reports</p>
        </div>
        <button className="text-button" onClick={() => setPage?.("reports")}>
          View all reports <ArrowRight size={14} />
        </button>
      </div>

      <p className="priority-score-note">
        Prototype triage score for inspection support; not a validated safety-risk prediction.
      </p>

      {rows.length === 0 ? (
        <div className="table-empty dashboard-priority-empty">
          No unresolved reports need review. New reports will appear here.
        </div>
      ) : (
        <div className="table-scroll dashboard-priority-scroll">
          <table className="dashboard-priority-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Report / location</th>
                <th>Severity</th>
                <th>Risk</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((report, index) => {
                const risk = calculateRiskScore(report);
                const severity = getReportSeverity(report);
                const label =
                  risk.topDetection?.type || report.originalName || "Road report";

                return (
                  <tr key={report.id}>
                    <td className="priority-rank">{index + 1}</td>
                    <td>
                      <div className="priority-report-cell">
                        {report.imageUrl ? (
                          <img
                            className="priority-report-image"
                            src={getAssetUrl(report.imageUrl)}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="priority-report-image priority-report-placeholder">
                            <ScanLine size={16} />
                          </span>
                        )}
                        <span>
                          <strong>{label}</strong>
                          <small>
                            <MapPin size={12} /> {getLocationLabel(report)}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td><SeverityBadge severity={severity} /></td>
                    <td>
                      <strong className={`priority-risk ${severity.toLowerCase()}`}>
                        {risk.score}
                      </strong>
                    </td>
                    <td className="priority-reported">
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
