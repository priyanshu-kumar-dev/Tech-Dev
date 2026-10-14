import { useMemo, useState } from "react";
import { Download, FileSearch, RefreshCw } from "lucide-react";
import SeverityBadge from "../components/SeverityBadge";
import PriorityTable from "../components/PriorityTable";

export default function Reports({ reports = [], onRefresh, refreshing }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = [
        report.originalName,
        report.id,
        ...(report.detections || []).map((item) => item.type),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" ||
        (report.detections || []).some(
          (item) => item.severity === filter
        );

      return matchesSearch && matchesFilter;
    });
  }, [reports, search, filter]);

  function downloadCSV() {
    const header = [
      "Report ID",
      "Image",
      "Created At",
      "Latitude",
      "Longitude",
      "Defect Type",
      "Severity",
      "Priority Score",
      "Repair Action",
      "Simulated",
    ];

    const rows = filteredReports.flatMap((report) =>
      (report.detections || []).map((detection) => [
        report.id,
        report.originalName || report.image || "",
        report.createdAt || "",
        report.location?.latitude ?? "",
        report.location?.longitude ?? "",
        detection.type || "",
        detection.severity || "",
        detection.priorityScore ?? "",
        detection.repairAction || "",
        detection.simulated ?? report.isSimulated ?? false,
      ])
    );

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "roadshield-reports.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-content">
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">INSPECTION RECORDS</p>
          <h1>Road Damage Reports</h1>
          <p>Review recorded defects and export available results.</p>
        </div>

        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button className="primary-button" onClick={downloadCSV}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <section className="panel reports-panel">
        <div className="report-filters">
          <div className="search-field">
            <FileSearch size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by defect, image or report ID..."
            />
          </div>

          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>

        <div className="reports-list">
          {filteredReports.length === 0 ? (
            <div className="empty-state">
              <FileSearch size={28} />
              <h3>No matching reports</h3>
              <p>Analyze an image or change your search filters.</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <article className="report-card" key={report.id}>
                <div className="report-card-top">
                  <div>
                    <h3>{report.originalName || report.image || "Road image"}</h3>
                    <p>
                      Report ID: {report.id || "Unavailable"}
                    </p>
                  </div>
                  {report.isSimulated && (
                    <span className="simulated-label">Simulated results</span>
                  )}
                </div>

                <div className="report-meta">
                  <span>
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleString()
                      : "Date unavailable"}
                  </span>
                  <span>
                    {report.location
                      ? `${report.location.latitude}, ${report.location.longitude}`
                      : "GPS unavailable"}
                  </span>
                  <span>{report.detections?.length || 0} defect records</span>
                </div>

                <div className="report-defects">
                  {(report.detections || []).map((detection, index) => (
                    <div
                      className="report-defect"
                      key={detection.id || index}
                    >
                      <span>{detection.type || "Unknown defect"}</span>
                      <SeverityBadge severity={detection.severity} />
                      <span>
                        Priority: {detection.priorityScore ?? "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <PriorityTable reports={filteredReports} />
    </div>
  );
}