import {
  AlertTriangle,
  CheckCircle2,
  MapPinned,
  ScanLine,
  ArrowRight,
} from "lucide-react";
import StatCard from "../components/StatCard";
import RoadMap from "../components/RoadMap";
import PriorityTable from "../components/PriorityTable";
import SeverityBadge from "../components/SeverityBadge";

export default function Dashboard({ reports = [], setPage, backendOnline }) {
  const detections = reports.flatMap((report) =>
    (report.detections || []).map((detection) => ({
      ...detection,
      simulated: detection.simulated ?? report.isSimulated ?? false,
    }))
  );

  const criticalCount = detections.filter(
    (item) => item.severity === "Critical"
  ).length;

  const highCount = detections.filter(
    (item) => item.severity === "High"
  ).length;

  const locatedCount = reports.filter(
    (report) =>
      report.location &&
      Number.isFinite(Number(report.location.latitude)) &&
      Number.isFinite(Number(report.location.longitude))
  ).length;

  const recentReports = reports.slice(0, 5);

  return (
    <div className="page-content">
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">ROAD SAFETY INTELLIGENCE</p>
          <h1>Road Condition Dashboard</h1>
          <p>
            Monitor road defects, location data and maintenance priorities.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setPage("analyze")}
        >
          <ScanLine size={17} />
          Analyze new road
        </button>
      </div>

      <div className="connection-banner">
        <span
          className={`status-dot ${backendOnline ? "" : "offline"}`}
        />
        <strong>{backendOnline ? "Backend online" : "Backend disconnected"}</strong>
        <span>
          {backendOnline
            ? "API responded successfully."
            : "Start the backend server to analyze images."}
        </span>
        <span className="demo-indicator">AI status depends on model integration</span>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Defects"
          value={detections.length}
          description="Records returned by analysis"
          icon={AlertTriangle}
          tone="blue"
        />
        <StatCard
          title="Critical Defects"
          value={criticalCount}
          description="Require urgent safety review"
          icon={AlertTriangle}
          tone="red"
        />
        <StatCard
          title="High Severity"
          value={highCount}
          description="Prioritize for inspection"
          icon={ScanLine}
          tone="orange"
        />
        <StatCard
          title="Geolocated Reports"
          value={locatedCount}
          description="Reports with coordinates"
          icon={MapPinned}
          tone="green"
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel severity-overview">
          <div className="panel-heading">
            <div>
              <h3>Severity Distribution</h3>
              <p>Based on available defect records</p>
            </div>
            <AlertTriangle size={20} />
          </div>

          {["Critical", "High", "Medium", "Low"].map((severity) => {
            const count = detections.filter(
              (item) => item.severity === severity
            ).length;
            const percentage = detections.length
              ? (count / detections.length) * 100
              : 0;

            return (
              <div className="severity-row" key={severity}>
                <div className="severity-row-label">
                  <SeverityBadge severity={severity} />
                  <strong>{count}</strong>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${severity.toLowerCase()}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="data-note">
            <CheckCircle2 size={16} />
            Counts are calculated from returned records, not estimated totals.
          </div>
        </section>

        <section className="panel quick-actions">
          <div className="panel-heading">
            <div>
              <h3>Quick Actions</h3>
              <p>Continue your road inspection workflow</p>
            </div>
          </div>

          <button
            className="quick-action-item"
            onClick={() => setPage("analyze")}
          >
            <div className="quick-action-icon blue">
              <ScanLine size={19} />
            </div>
            <div>
              <strong>Analyze a road image</strong>
              <p>Upload an image and inspect detections</p>
            </div>
            <ArrowRight size={18} />
          </button>

          <button
            className="quick-action-item"
            onClick={() => setPage("reports")}
          >
            <div className="quick-action-icon green">
              <MapPinned size={19} />
            </div>
            <div>
              <strong>View reports and priority</strong>
              <p>Review defects and export CSV</p>
            </div>
            <ArrowRight size={18} />
          </button>
        </section>
      </div>

      <RoadMap reports={reports} />

      <PriorityTable reports={reports} />

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <h3>Recent Reports</h3>
            <p>Latest analysis records returned by the API</p>
          </div>
          <button
            className="text-button"
            onClick={() => setPage("reports")}
          >
            View all <ArrowRight size={15} />
          </button>
        </div>

        {recentReports.length === 0 ? (
          <div className="table-empty">
            No reports yet. Start by analyzing a road image.
          </div>
        ) : (
          <div className="recent-list">
            {recentReports.map((report) => (
              <div className="recent-item" key={report.id}>
                <div className="recent-icon">
                  <ScanLine size={18} />
                </div>
                <div className="recent-details">
                  <strong>{report.originalName || report.image || "Road report"}</strong>
                  <span>
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleString()
                      : "Date unavailable"}
                  </span>
                </div>
                <span className="recent-count">
                  {report.detections?.length || 0} defects
                </span>
                {report.isSimulated && (
                  <span className="simulated-label">Demo</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}