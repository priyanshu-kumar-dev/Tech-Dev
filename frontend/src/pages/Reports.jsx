import { useMemo, useState } from "react";
import {
  Download,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  Upload,
  Trash2,
} from "lucide-react";
import SeverityBadge from "../components/SeverityBadge";
import PriorityTable from "../components/PriorityTable";
import { getAssetUrl } from "../services/api";

const maintenanceStatuses = [
  "Reported",
  "Verified",
  "Assigned",
  "In Progress",
  "Resolved",
];

export default function Reports({
  reports = [],
  canManageReports = false,
  onStatusChange,
  onRepairPhotoUpload,
  onDeleteReport,
  onRefresh,
  refreshing,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [updatingReportId, setUpdatingReportId] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [assignedNames, setAssignedNames] = useState({});
  const [uploadingReportId, setUploadingReportId] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);

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

  async function changeStatus(report, status) {
    setUpdatingReportId(report.id);
    setStatusError("");

    try {
      await onStatusChange(
        report.id,
        status,
        assignedNames[report.id] ?? report.assignedTo ?? ""
      );
    } catch (error) {
      setStatusError(
        error.response?.data?.message ||
          error.message ||
          "Unable to update maintenance status."
      );
    } finally {
      setUpdatingReportId(null);
    }
  }

  async function uploadRepairPhoto(report, file) {
    if (!file) return;
    setUploadingReportId(report.id);
    setStatusError("");
    try {
      await onRepairPhotoUpload(report.id, file);
    } catch (error) {
      setStatusError(
        error.response?.data?.message ||
          error.message ||
          "Unable to upload the repair photo."
      );
    } finally {
      setUploadingReportId(null);
    }
  }

  async function deleteReport(report) {
    if (!window.confirm("Permanently delete this report and its uploaded images?")) {
      return;
    }

    setDeletingReportId(report.id);
    setStatusError("");
    try {
      await onDeleteReport(report.id);
    } catch (error) {
      setStatusError(
        error.response?.data?.message ||
          error.message ||
          "Unable to delete the report."
      );
    } finally {
      setDeletingReportId(null);
    }
  }

  function downloadCSV() {
    const header = [
      "Report ID",
      "Image",
      "Created At",
      "Maintenance Status",
      "Assignee",
      "City",
      "Ward",
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
        report.maintenanceStatus || "Reported",
        report.assignedTo || "",
        report.city || "",
        report.ward || "",
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

        {statusError && (
          <div className="error-message" role="alert">
            {statusError}
          </div>
        )}

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
                  {canManageReports && (
                    <button
                      type="button"
                      className="delete-report-button"
                      onClick={() => deleteReport(report)}
                      disabled={deletingReportId === report.id}
                    >
                      <Trash2 size={14} />
                      {deletingReportId === report.id ? "Deleting..." : "Delete"}
                    </button>
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
                  {(report.city || report.ward) && (
                    <span>
                      {[report.city, report.ward].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>

                {report.possibleDuplicateOf && (
                  <div className="duplicate-warning" role="status">
                    Possible duplicate of report {report.possibleDuplicateOf}; same
                    image hash and coordinates within 100 m.
                  </div>
                )}

                <div className="maintenance-status-row">
                  <strong>Maintenance status</strong>
                  {canManageReports ? (
                    <label className="maintenance-status-control">
                      <ShieldCheck size={15} />
                      <select
                        aria-label={`Maintenance status for ${report.originalName || report.id}`}
                        value={report.maintenanceStatus || "Reported"}
                        onChange={(event) =>
                          changeStatus(report, event.target.value)
                        }
                        disabled={updatingReportId === report.id}
                      >
                        {maintenanceStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <input
                        aria-label={`Assignee for ${report.originalName || report.id}`}
                        value={
                          assignedNames[report.id] ?? report.assignedTo ?? ""
                        }
                        onChange={(event) =>
                          setAssignedNames((previous) => ({
                            ...previous,
                            [report.id]: event.target.value,
                          }))
                        }
                        placeholder="Assignee (required for Assigned)"
                        maxLength={120}
                      />
                      {updatingReportId === report.id && (
                        <span className="muted-text">Saving...</span>
                      )}
                    </label>
                  ) : (
                    <>
                      <span className="maintenance-status-value">
                        {report.maintenanceStatus || "Reported"}
                      </span>
                      {report.assignedTo && (
                        <span>Assigned to {report.assignedTo}</span>
                      )}
                    </>
                  )}
                </div>

                <div className="lifecycle-history">
                  <strong>Lifecycle</strong>
                  <div>
                    {(report.statusHistory || []).map((entry, index) => (
                      <span
                        key={`${entry.status}-${entry.changedAt}-${index}`}
                        title={`${entry.changedAt ? new Date(entry.changedAt).toLocaleString() : "Time unavailable"} · ${entry.changedBy || "system"}`}
                      >
                        {entry.status}
                      </span>
                    ))}
                    {!(report.statusHistory || []).length && (
                      <span>{report.maintenanceStatus || "Reported"}</span>
                    )}
                  </div>
                </div>

                {canManageReports && (
                  <label className="repair-photo-upload">
                    <Upload size={15} />
                    {uploadingReportId === report.id
                      ? "Uploading repair photo..."
                      : "Add repair-after photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingReportId === report.id}
                      onChange={(event) => {
                        uploadRepairPhoto(report, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}

                {(report.imageUrl || report.repairImageUrl) && (
                  <div className="before-after-grid">
                    {report.imageUrl && (
                      <figure>
                        <img
                          src={getAssetUrl(report.imageUrl)}
                          alt="Road before repair"
                          loading="lazy"
                        />
                        <figcaption>Before repair</figcaption>
                      </figure>
                    )}
                    {report.repairImageUrl ? (
                      <figure>
                        <img
                          src={getAssetUrl(report.repairImageUrl)}
                          alt="Road after repair"
                          loading="lazy"
                        />
                        <figcaption>After repair</figcaption>
                      </figure>
                    ) : (
                      <p className="muted-text">
                        Before/after comparison appears after a repair photo is
                        uploaded.
                      </p>
                    )}
                  </div>
                )}

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