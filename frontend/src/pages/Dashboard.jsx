import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Lightbulb,
  MapPin,
  ScanLine,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import RoadMap from "../components/RoadMap";
import PriorityTable from "../components/PriorityTable";

const metricConfig = [
  {
    title: "Road defects",
    icon: ScanLine,
    tone: "blue",
    change: "TOTAL",
    caption: "from all reports",
    points: "0,25 10,21 20,22 30,15 40,18 50,12 60,14 70,8 80,11 90,3",
  },
  {
    title: "Critical risk",
    icon: CircleAlert,
    tone: "red",
    change: "URGENT",
    caption: "critical severity",
    points: "0,24 10,19 20,21 30,14 40,16 50,9 60,13 70,5 80,8 90,1",
  },
  {
    title: "Awaiting repair",
    icon: Clock3,
    tone: "orange",
    change: "OPEN",
    caption: "not yet resolved",
    points: "0,19 10,13 20,20 30,11 40,16 50,10 60,14 70,6 80,9 90,2",
  },
  {
    title: "Verified repairs",
    icon: Check,
    tone: "green",
    change: "DONE",
    caption: "marked resolved",
    points: "0,22 10,20 20,13 30,16 40,9 50,12 60,5 70,9 80,4 90,0",
  },
];

function MetricCard({ metric, value }) {
  const Icon = metric.icon;

  return (
    <article className="dashboard-metric">
      <div className={`dashboard-metric-icon ${metric.tone}`}>
        <Icon size={19} />
      </div>
      <div className="dashboard-metric-copy">
        <h2>{metric.title}</h2>
        <div className="dashboard-metric-bottom">
          <strong>{value}</strong>
          <span className={`dashboard-trend ${metric.tone}`}>
            {metric.change}
          </span>
        </div>
        <span className="dashboard-metric-caption">{metric.caption}</span>
      </div>
      <svg className={`dashboard-sparkline ${metric.tone}`} viewBox="0 0 90 28" aria-hidden="true">
        <polyline points={metric.points} />
      </svg>
    </article>
  );
}

export default function Dashboard({
  reports = [],
  setPage,
  backendOnline,
}) {
  const detections = reports.flatMap((report) =>
    (report.detections || []).map((detection) => ({
      ...detection,
      simulated: detection.simulated ?? report.isSimulated ?? false,
    }))
  );
  const criticalCount = detections.filter(
    (detection) => detection.severity === "Critical"
  ).length;
  const awaitingRepair = reports.filter(
    (report) =>
      report.maintenanceStatus !== "Resolved" &&
      report.maintenanceStatus !== "In Progress"
  ).length;
  const inProgressReports = reports.filter(
    (report) => report.maintenanceStatus === "In Progress"
  ).length;
  const resolvedReports = reports.filter(
    (report) => report.maintenanceStatus === "Resolved"
  ).length;
  const criticalAlerts = reports.filter(
    (report) =>
      !report.isSimulated &&
      report.maintenanceStatus !== "Resolved" &&
      (report.detections || []).some(
        (detection) => detection.severity === "Critical"
      )
  ).length;
  const milestoneCounts = [
    reports.length,
    reports.filter((report) =>
      ["Verified", "Assigned", "In Progress", "Resolved"].includes(
        report.maintenanceStatus
      )
    ).length,
    reports.filter((report) =>
      ["Assigned", "In Progress", "Resolved"].includes(
        report.maintenanceStatus
      )
    ).length,
    reports.filter((report) => report.maintenanceStatus === "In Progress")
      .length,
    resolvedReports,
  ];
  const completedPercent = reports.length
    ? Math.round((resolvedReports / reports.length) * 100)
    : 0;

  return (
    <div className="page-content dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">ROAD INTELLIGENCE CENTER</p>
          <h1>Detect damage. Prioritize risk. Verify repairs.</h1>
          <p>
            AI-powered road damage detection, severity mapping and maintenance
            tracking for safer and better roads.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setPage("analyze")}
        >
          <ScanLine size={17} />
          Analyze new road
          <ArrowRight size={16} />
        </button>
        <div className="dashboard-model-status">
          <span className="model-status-icon"><Activity size={22} /></span>
          <span>
            <strong><i /> AI Model Status</strong>
            <small>{backendOnline ? "API reachable · model may vary" : "API connection unavailable"}</small>
            <small>Model availability depends on deployment</small>
          </span>
          <ArrowRight size={16} />
        </div>
      </section>

      <section className="dashboard-metrics" aria-label="Road report metrics">
        {metricConfig.map((metric, index) => (
          <MetricCard
            key={metric.title}
            metric={metric}
            value={[
              detections.length,
              criticalCount,
              awaitingRepair,
              resolvedReports,
            ][index]}
          />
        ))}
      </section>

      <div className="dashboard-overview-grid">
        <div id="dashboard-map" className="dashboard-map-slot">
          <RoadMap reports={reports} />
        </div>
        <div className="dashboard-priority-slot">
          <PriorityTable reports={reports} setPage={setPage} />
        </div>
      </div>

      <div className="dashboard-lower-grid">
        <section className="panel dashboard-lifecycle">
          <div className="dashboard-section-heading">
            <div className="dashboard-section-icon"><Wrench size={19} /></div>
            <div>
              <h2>Maintenance lifecycle</h2>
              <p>Track the progress from report to resolution</p>
            </div>
            <button
              className="text-button"
              onClick={() => setPage("reports")}
            >
              View reports <ArrowRight size={14} />
            </button>
          </div>
          <ol className="lifecycle-steps">
            {["Reported", "Verified", "Assigned", "Repair in progress", "Resolved"].map(
              (label, index) => (
                <li
                  key={label}
                  className={milestoneCounts[index] ? "has-progress" : ""}
                >
                  <span className={`lifecycle-marker ${index === 3 ? "working" : ""}`}>
                    {index === 3 ? <Wrench size={17} /> : <Check size={18} />}
                  </span>
                  <strong>{label}</strong>
                  <small>{milestoneCounts[index]} {index === 0 ? "reports" : "verified"}</small>
                </li>
              )
            )}
          </ol>
        </section>

        <section className="panel dashboard-impact">
          <div className="dashboard-section-heading">
            <div className="dashboard-section-icon"><Activity size={19} /></div>
            <div>
              <h2>Repair impact</h2>
              <p>Report resolution progress</p>
            </div>
          </div>
          <div className="impact-content">
            <div
              className="impact-ring"
              style={{ "--completion": `${completedPercent}%` }}
              aria-label={`${completedPercent}% of reports resolved`}
            >
              <strong>{completedPercent}%</strong>
              <span>completed</span>
            </div>
            <div className="impact-legend">
              <span><i className="resolved-dot" /> Resolved <strong>{resolvedReports}</strong></span>
              <span><i className="progress-dot" /> In progress <strong>{inProgressReports}</strong></span>
              <span><i className="pending-dot" /> Awaiting repair <strong>{awaitingRepair}</strong></span>
              <small>Total reports <strong>{reports.length}</strong></small>
            </div>
          </div>
        </section>

        <section className="panel dashboard-insight">
          <div className="dashboard-section-heading">
            <div className="dashboard-section-icon insight"><Lightbulb size={19} /></div>
            <div>
              <h2>AI insight</h2>
              <p>Priority recommendations</p>
            </div>
            <span className="insight-tag">LIVE</span>
          </div>
          <div className="insight-message">
            <ShieldAlert size={19} />
            <div>
              <strong>
                {criticalAlerts
                  ? `${criticalAlerts} critical report${criticalAlerts === 1 ? "" : "s"} need inspection`
                  : "No critical reports need inspection"}
              </strong>
              <p>
                {criticalAlerts
                  ? "Review high-priority locations to help prevent further damage."
                  : "New critical issues will be highlighted here when reported."}
              </p>
              <button onClick={() => setPage("reports")}>
                Review priority queue <ArrowRight size={13} />
              </button>
            </div>
          </div>
          <div className="dashboard-api-footnote">
            <MapPin size={13} />
            {backendOnline ? "Connected to the RoadShield API" : "Connect the API to sync live road reports"}
          </div>
        </section>
      </div>

      {reports.length === 0 && (
        <p className="dashboard-data-note">
          <CheckCircle2 size={14} />
          Dashboard metrics are calculated from reports returned by the API.
          Analyze a road image to start tracking maintenance progress.
        </p>
      )}
    </div>
  );
}
