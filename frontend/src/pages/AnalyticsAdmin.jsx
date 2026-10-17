import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  FileSearch,
  FileText,
  MapPinned,
  ShieldAlert,
} from "lucide-react";
import SeverityBadge from "../components/SeverityBadge";
import StatCard from "../components/StatCard";
import { fetchModelPerformance } from "../services/api";

const severityOrder = ["Critical", "High", "Medium", "Low"];

const severityRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const currentDay = new Date();

function getDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getReportSeverity(report) {
  return (report.detections || []).reduce((highest, detection) => {
    const severity = detection.severity;
    return (severityRank[severity] || 0) > (severityRank[highest] || 0)
      ? severity
      : highest;
  }, "");
}

function hasLocation(report) {
  return (
    report.location &&
    Number.isFinite(Number(report.location.latitude)) &&
    Number.isFinite(Number(report.location.longitude))
  );
}

export default function AnalyticsAdmin({ reports = [], setPage }) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [areaLevel, setAreaLevel] = useState("ward");
  const [modelPerformance, setModelPerformance] = useState(null);
  const [performanceError, setPerformanceError] = useState("");

  useEffect(() => {
    let active = true;

    fetchModelPerformance()
      .then((result) => {
        if (active) {
          setModelPerformance(result);
          setPerformanceError("");
        }
      })
      .catch((error) => {
        if (active) {
          setPerformanceError(
            error.response?.data?.message ||
              error.message ||
              "Model performance results are unavailable."
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const analytics = useMemo(() => {
    const detections = reports.flatMap((report) => report.detections || []);
    const severityCounts = Object.fromEntries(
      severityOrder.map((severity) => [
        severity,
        detections.filter((detection) => detection.severity === severity).length,
      ])
    );
    const defectCounts = detections.reduce((counts, detection) => {
      const type = detection.type || "Unknown defect";
      counts.set(type, (counts.get(type) || 0) + 1);
      return counts;
    }, new Map());

    const activity = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(currentDay);
      day.setHours(0, 0, 0, 0);
      day.setDate(currentDay.getDate() - (6 - index));
      const key = getDateKey(day);
      const count = reports.filter((report) => {
        const createdAt = new Date(report.createdAt);
        return (
          !Number.isNaN(createdAt.getTime()) &&
          getDateKey(createdAt) === key
        );
      }).length;

      return {
        label: day.toLocaleDateString(undefined, { weekday: "short" }),
        count,
      };
    });

    return {
      detections,
      severityCounts,
      activity,
      topDefects: [...defectCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      geolocatedReports: reports.filter(hasLocation).length,
      areaConcentrations: reports.reduce((areas, report) => {
        if (!hasLocation(report)) return areas;
        const name =
          areaLevel === "ward"
            ? report.ward || report.city
            : report.city;
        const label =
          name ||
          `${Number(report.location.latitude).toFixed(2)}, ${Number(
            report.location.longitude
          ).toFixed(2)}`;
        const current = areas.get(label) || {
          label,
          reports: 0,
          defects: 0,
          critical: 0,
        };
        current.reports += 1;
        current.defects += (report.detections || []).length;
        current.critical += (report.detections || []).filter(
          (detection) => detection.severity === "Critical"
        ).length;
        areas.set(label, current);
        return areas;
      }, new Map()),
    };
  }, [reports, areaLevel]);

  const maxActivity = Math.max(1, ...analytics.activity.map((day) => day.count));
  const maxDefectCount = Math.max(
    1,
    ...analytics.topDefects.map(([, count]) => count)
  );
  const areaConcentrations = [...analytics.areaConcentrations.values()]
    .sort(
      (left, right) =>
        right.critical - left.critical ||
        right.defects - left.defects ||
        right.reports - left.reports
    )
    .slice(0, 6);
  const showMetric = (value, suffix = "") =>
    value == null ? "Not evaluated" : `${value}${suffix}`;

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports
      .filter((report) => {
        const reportSeverity = getReportSeverity(report);
        const matchesSeverity =
          severityFilter === "All" || reportSeverity === severityFilter;
        const matchesSearch =
          !query ||
          [
            report.originalName,
            report.id,
            ...(report.detections || []).map((detection) => detection.type),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query);

        return matchesSeverity && matchesSearch;
      })
      .slice(0, 8);
  }, [reports, search, severityFilter]);

  return (
    <div className="page-content">
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">INSIGHTS &amp; OPERATIONS</p>
          <h1>Analytics &amp; Operations</h1>
          <p>
            Track reported road conditions and quickly review inspections that
            need attention.
          </p>
        </div>

        <button className="secondary-button" onClick={() => setPage("reports")}>
          <FileText size={16} />
          Open all reports
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Inspection Reports"
          value={reports.length}
          description="Reports returned by the API"
          icon={FileText}
          tone="blue"
        />
        <StatCard
          title="Detected Defects"
          value={analytics.detections.length}
          description="Defect records across all reports"
          icon={AlertTriangle}
          tone="orange"
        />
        <StatCard
          title="Critical & High"
          value={
            analytics.severityCounts.Critical + analytics.severityCounts.High
          }
          description="Highest-severity detections"
          icon={ShieldAlert}
          tone="red"
        />
        <StatCard
          title="Geolocated Reports"
          value={analytics.geolocatedReports}
          description="Reports with valid coordinates"
          icon={MapPinned}
          tone="green"
        />
      </div>

      <section className="panel model-performance-panel">
        <div className="panel-heading">
          <div>
            <h3>Model Performance</h3>
            <p>Only measured inference data is shown; no accuracy is inferred.</p>
          </div>
          <BadgeCheck size={20} />
        </div>
        {performanceError && (
          <div className="error-message" role="alert">
            {performanceError}
          </div>
        )}
        <div className="model-metrics-grid">
          <div>
            <span>Precision</span>
            <strong>{showMetric(modelPerformance?.precision)}</strong>
          </div>
          <div>
            <span>Recall</span>
            <strong>{showMetric(modelPerformance?.recall)}</strong>
          </div>
          <div>
            <span>mAP</span>
            <strong>{showMetric(modelPerformance?.mAP)}</strong>
          </div>
          <div>
            <span>False detections</span>
            <strong>{showMetric(modelPerformance?.falseDetections)}</strong>
          </div>
          <div>
            <span>Average inference time</span>
            <strong>
              {modelPerformance?.averageInferenceTimeMs == null
                ? "No measured runs"
                : `${modelPerformance.averageInferenceTimeMs} ms`}
            </strong>
          </div>
          <div>
            <span>Real inference samples</span>
            <strong>{modelPerformance?.sampleCount ?? "—"}</strong>
          </div>
        </div>
        <p className="analytics-footnote">
          {modelPerformance?.evaluationMessage ||
            "Precision, recall, mAP and false detections remain unavailable until a labeled test-set evaluation is recorded."}
        </p>
      </section>

      <section className="panel area-concentration-panel">
        <div className="panel-heading">
          <div>
            <h3>Damage Concentration</h3>
            <p>Named city/ward groupings, sorted by critical defects and volume</p>
          </div>
          <label className="map-level-control">
            Group by
            <select
              value={areaLevel}
              onChange={(event) => setAreaLevel(event.target.value)}
            >
              <option value="ward">Ward</option>
              <option value="city">City</option>
            </select>
          </label>
        </div>
        {areaConcentrations.length === 0 ? (
          <div className="analytics-empty">
            Add GPS coordinates and city/ward information to reports to compare
            damage concentration by area.
          </div>
        ) : (
          <div className="area-concentration-list">
            {areaConcentrations.map((area) => (
              <div className="area-concentration-row" key={area.label}>
                <strong>{area.label}</strong>
                <span>{area.reports} reports</span>
                <span>{area.defects} defects</span>
                <span>{area.critical} critical</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="analytics-grid">
        <section className="panel analytics-chart-panel">
          <div className="panel-heading">
            <div>
              <h3>Inspection Activity</h3>
              <p>Reports received over the last seven days</p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="analytics-empty">
              Activity will appear here when reports are available.
            </div>
          ) : (
            <>
              <div
                className="activity-chart"
                role="img"
                aria-label="Number of road inspection reports received each day over the last seven days"
              >
                {analytics.activity.map((day) => (
                  <div className="activity-column" key={day.label}>
                    <span className="activity-count">{day.count || ""}</span>
                    <div className="activity-bar-track">
                      <div
                        className="activity-bar"
                        style={{
                          height: day.count
                            ? `${Math.max(8, (day.count / maxActivity) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="activity-label">{day.label}</span>
                  </div>
                ))}
              </div>
              <p className="analytics-footnote">
                Reports without a valid date are not included in this chart.
              </p>
            </>
          )}
        </section>

        <section className="panel analytics-breakdown-panel">
          <div className="panel-heading">
            <div>
              <h3>Severity Breakdown</h3>
              <p>Share of returned defect records</p>
            </div>
          </div>

          {analytics.detections.length === 0 ? (
            <div className="analytics-empty">
              Severity data will appear after defects are detected.
            </div>
          ) : (
            <div className="analytics-severity-list">
              {severityOrder.map((severity) => {
                const count = analytics.severityCounts[severity];
                const percentage =
                  (count / analytics.detections.length) * 100;

                return (
                  <div className="analytics-severity-row" key={severity}>
                    <div className="analytics-severity-label">
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
            </div>
          )}
        </section>
      </div>

      <div className="analytics-grid">
        <section className="panel analytics-defects-panel">
          <div className="panel-heading">
            <div>
              <h3>Most Reported Defects</h3>
              <p>Most frequent types in the available inspection records</p>
            </div>
          </div>

          {analytics.topDefects.length === 0 ? (
            <div className="analytics-empty">
              Defect types will appear here when reports contain detections.
            </div>
          ) : (
            <div className="top-defects-list">
              {analytics.topDefects.map(([type, count]) => (
                <div className="top-defect-row" key={type}>
                  <div className="top-defect-label">
                    <strong>{type}</strong>
                    <span>{count}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill defect-progress"
                      style={{ width: `${(count / maxDefectCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel operations-note-panel">
          <div className="operations-note-icon">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3>Operations overview</h3>
            <p>
              Use the inspection queue below to find urgent reports. Current
              records are reviewed from the connected API; administrators can
              manage the full maintenance lifecycle and repair evidence in
              Reports.
            </p>
            <button
              className="text-button"
              onClick={() => setPage("analyze")}
            >
              Analyze a road image <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </div>

      <section className="panel inspection-queue-panel">
        <div className="panel-heading">
          <div>
            <h3>Inspection Queue</h3>
            <p>Latest reports, ordered by arrival</p>
          </div>
          <button className="text-button" onClick={() => setPage("reports")}>
            View all reports <ArrowRight size={15} />
          </button>
        </div>

        <div className="report-filters">
          <div className="search-field">
            <FileSearch size={17} />
            <input
              aria-label="Search inspection queue"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by defect, image or report ID..."
            />
          </div>
          <select
            aria-label="Filter inspection queue by severity"
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
          >
            <option>All</option>
            {severityOrder.map((severity) => (
              <option key={severity}>{severity}</option>
            ))}
          </select>
        </div>

        {filteredReports.length === 0 ? (
          <div className="empty-state">
            <FileSearch size={28} />
            <h3>No matching inspections</h3>
            <p>Try a different search or severity filter.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Defects</th>
                  <th>Highest severity</th>
                  <th>Location</th>
                  <th>Analysis</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const severity = getReportSeverity(report);

                  return (
                    <tr key={report.id}>
                      <td>
                        <strong>
                          {report.originalName || report.image || "Road report"}
                        </strong>
                        <span className="queue-report-date">
                          {report.createdAt &&
                          !Number.isNaN(new Date(report.createdAt).getTime())
                            ? new Date(report.createdAt).toLocaleDateString()
                            : "Date unavailable"}
                        </span>
                      </td>
                      <td>{report.detections?.length || 0}</td>
                      <td>
                        {severity ? (
                          <SeverityBadge severity={severity} />
                        ) : (
                          <span className="muted-text">No defects</span>
                        )}
                      </td>
                      <td>
                        {hasLocation(report) ? (
                          <span className="table-location">
                            <MapPinned size={14} />
                            {Number(report.location.latitude).toFixed(3)},{" "}
                            {Number(report.location.longitude).toFixed(3)}
                          </span>
                        ) : (
                          <span className="muted-text">Not available</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            report.isSimulated
                              ? "simulated-label"
                              : "analysis-label"
                          }
                        >
                          {report.isSimulated
                            ? "Demo"
                            : report.mode || "Unspecified"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
