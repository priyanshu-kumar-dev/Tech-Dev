
import { useMemo, useState } from "react";
import {
  Download,
  FileSearch,
  RefreshCw,
  Wrench,
  Camera,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

import SeverityBadge from "../components/SeverityBadge";
import PriorityTable from "../components/PriorityTable";
import { updateReportStatus } from "../services/api";

const CONFIGURED_API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const API_BASE_URL = CONFIGURED_API_URL.replace(/\/+$/, "").endsWith("/api")
  ? CONFIGURED_API_URL.replace(/\/+$/, "")
  : `${CONFIGURED_API_URL.replace(/\/+$/, "")}/api`;

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const STATUS_OPTIONS = {
  Open: ["Reported", "Assigned"],
  Reported: ["Reported", "Assigned"],
  Assigned: ["Assigned", "In Progress", "Reported"],
  "In Progress": ["In Progress", "Assigned", "Repaired"],
  Repaired: ["Repaired", "In Progress", "Verified"],
  Verified: ["Verified", "In Progress"],
};

function getStatus(report) {
  return report.repairStatus === "Open"
    ? "Reported"
    : report.repairStatus || "Reported";
}

function getPhotoUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  return `${SERVER_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

export default function Reports({
  reports = [],
  onRefresh,
  refreshing = false,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [workflow, setWorkflow] = useState({});
  const [photoDrafts, setPhotoDrafts] = useState({});
  const [savingId, setSavingId] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");
  const [notice, setNotice] = useState("");

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = [
        report.originalName,
        report.id,
        report.assignedTeam,
        ...(report.detections || []).map((item) => item.type),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All" ||
        (report.detections || []).some(
          (item) => item.severity === filter,
        );

      return matchesSearch && matchesFilter;
    });
  }, [reports, search, filter]);

  function getDraft(report) {
    return {
      status: getStatus(report),
      assignedTeam: report.assignedTeam || "",
      repairNotes: report.repairNotes || "",
      ...(workflow[report.id] || {}),
    };
  }

  function updateDraft(report, field, value) {
    setWorkflow((previous) => ({
      ...previous,
      [report.id]: {
        ...getDraft(report),
        [field]: value,
      },
    }));
  }

  function updatePhotoDraft(reportId, type, field, value) {
    const key = `${reportId}:${type}`;

    setPhotoDrafts((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] || {}),
        [field]: value,
      },
    }));
  }

  async function saveWorkflow(report) {
    const draft = getDraft(report);

    setSavingId(report.id);
    setNotice("");

    try {
      await updateReportStatus(report.id, {
        repairStatus: draft.status,
        assignedTeam: draft.assignedTeam.trim(),
        repairNotes: draft.repairNotes,
        changedBy: "Field Team",
      });

      setNotice(`Repair workflow saved for report ${report.id}.`);

      setWorkflow((previous) => {
        const next = { ...previous };
        delete next[report.id];
        return next;
      });

      await onRefresh?.();
    } catch (error) {
      setNotice(error.message || "Could not save repair workflow.");
    } finally {
      setSavingId("");
    }
  }

  async function uploadRepairPhoto(report, type) {
    const key = `${report.id}:${type}`;
    const draft = photoDrafts[key] || {};

    if (!draft.file) {
      setNotice(`Select a ${type} repair photo first.`);
      return;
    }

    const formData = new FormData();
    formData.append("photo", draft.file);
    formData.append("type", type);
    formData.append("note", draft.note || "");

    setUploadingKey(key);
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/${encodeURIComponent(report.id)}/repair-photos`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Photo upload failed (${response.status}).`,
        );
      }

      setNotice(
        `${type === "before" ? "Before repair" : "After repair"} photo uploaded successfully.`,
      );

      setPhotoDrafts((previous) => ({
        ...previous,
        [key]: { file: null, note: "" },
      }));

      await onRefresh?.();
    } catch (error) {
      setNotice(
        error.message ||
          "Could not upload the photo. Check that the backend is running.",
      );
    } finally {
      setUploadingKey("");
    }
  }

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
      "Repair Status",
      "Assigned Team",
      "Repair Notes",
      "Simulated",
    ];

    const rows = filteredReports.flatMap((report) =>
      (report.detections || []).map((detection) => [
        report.id,
        report.originalName || report.image || "",
        report.createdAt || "",
        report.location?.latitude ?? report.latitude ?? "",
        report.location?.longitude ?? report.longitude ?? "",
        detection.type || "",
        detection.severity || "",
        detection.priorityScore ?? "",
        getStatus(report),
        report.assignedTeam || "",
        report.repairNotes || "",
        detection.simulated ?? report.isSimulated ?? false,
      ]),
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

  function renderRepairPhotos(report, type) {
    const photos =
      type === "before"
        ? report.beforeRepairPhotos || []
        : report.afterRepairPhotos || [];

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        {photos.map((photo, index) => (
          <div
            key={`${photo.url}-${index}`}
            style={{
              minWidth: 0,
              border: "1px solid var(--border-color, #444)",
              borderRadius: 10,
              padding: 8,
            }}
          >
            <a
              href={getPhotoUrl(photo.url)}
              target="_blank"
              rel="noreferrer"
              title="Open full-size photo"
            >
              <img
                src={getPhotoUrl(photo.url)}
                alt={`${type === "before" ? "Before" : "After"} repair ${index + 1}`}
                loading="lazy"
                style={{
                  display: "block",
                  width: "100%",
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 7,
                }}
              />
            </a>

            <p style={{ fontSize: 12, margin: "8px 0 4px" }}>
              {photo.note || "No photo note"}
            </p>

            <span style={{ fontSize: 11, opacity: 0.7 }}>
              {photo.uploadedAt
                ? new Date(photo.uploadedAt).toLocaleString()
                : ""}
            </span>
          </div>
        ))}

        {photos.length === 0 && (
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            No {type} repair photos uploaded yet.
          </p>
        )}
      </div>
    );
  }

  function renderPhotoUploader(report, type) {
    const key = `${report.id}:${type}`;
    const draft = photoDrafts[key] || {};
    const isUploading = uploadingKey === key;
    const label = type === "before" ? "Before repair" : "After repair";

    return (
      <div
        style={{
          border: "1px solid var(--border-color, #444)",
          borderRadius: 10,
          padding: 14,
          minWidth: 0,
        }}
      >
        <h5
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            margin: "0 0 12px",
            fontSize: 14,
          }}
        >
          <Camera size={16} />
          {label}
        </h5>

        <label style={{ display: "block", fontSize: 13 }}>
          Select image
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              updatePhotoDraft(
                report.id,
                type,
                "file",
                event.target.files?.[0] || null,
              )
            }
            style={{
              display: "block",
              width: "100%",
              marginTop: 8,
              fontSize: 12,
            }}
          />
        </label>

        {draft.file && (
          <p
            style={{
              fontSize: 12,
              margin: "8px 0",
              overflowWrap: "anywhere",
            }}
          >
            Selected: {draft.file.name}
          </p>
        )}

        <label style={{ display: "block", fontSize: 13, marginTop: 10 }}>
          Photo note
          <input
            type="text"
            value={draft.note || ""}
            onChange={(event) =>
              updatePhotoDraft(
                report.id,
                type,
                "note",
                event.target.value,
              )
            }
            placeholder={
              type === "before"
                ? "Original road damage"
                : "Road after repair"
            }
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              marginTop: 6,
            }}
          />
        </label>

        <button
          className="secondary-button"
          onClick={() => uploadRepairPhoto(report, type)}
          disabled={isUploading || !draft.file}
          style={{ marginTop: 12 }}
        >
          <Upload size={15} />
          {isUploading ? "Uploading..." : "Upload photo"}
        </button>
      </div>
    );
  }

  return (
    <div className="page-content reports-page">
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">INSPECTION RECORDS</p>
          <h1>Road Damage Reports</h1>
          <p>
            Review defects, compare repair photos, assign teams and track
            repair progress.
          </p>
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

      {notice && (
        <div className="panel" role="status" style={{ marginBottom: 16 }}>
          {notice}
        </div>
      )}

      <section className="panel reports-panel">
        <div className="report-filters">
          <div className="search-field">
            <FileSearch size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search defect, report ID or assigned team..."
            />
          </div>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
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
            filteredReports.map((report) => {
              const draft = getDraft(report);
              const currentStatus = getStatus(report);
              const options = STATUS_OPTIONS[currentStatus] || [currentStatus];

              return (
                <article className="report-card" key={report.id}>
                  <div className="report-card-top">
                    <div>
                      <h3>
                        {report.originalName || report.image || "Road image"}
                      </h3>
                      <p>Report ID: {report.id || "Unavailable"}</p>
                    </div>

                    {report.isSimulated && (
                      <span className="simulated-label">
                        Simulated results
                      </span>
                    )}
                  </div>

                  <div className="report-meta">
                    <span>
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleString()
                        : "Date unavailable"}
                    </span>

                    <span>
                      {report.location?.latitude != null &&
                      report.location?.longitude != null
                        ? `${report.location.latitude}, ${report.location.longitude}`
                        : report.latitude != null && report.longitude != null
                          ? `${report.latitude}, ${report.longitude}`
                          : "GPS unavailable"}
                    </span>

                    <span>
                      {report.detections?.length || 0} defect records
                    </span>
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

                  <section
                    style={{
                      borderTop: "1px solid var(--border-color, #333)",
                      marginTop: 18,
                      paddingTop: 16,
                    }}
                  >
                    <h4
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        margin: "0 0 12px",
                      }}
                    >
                      <ImageIcon size={17} />
                      Before vs After Repair
                    </h4>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13 }}>
                          Before repair photos
                        </strong>
                        {renderRepairPhotos(report, "before")}
                      </div>

                      <div>
                        <strong style={{ fontSize: 13 }}>
                          After repair photos
                        </strong>
                        {renderRepairPhotos(report, "after")}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                        marginTop: 18,
                      }}
                    >
                      {renderPhotoUploader(report, "before")}
                      {renderPhotoUploader(report, "after")}
                    </div>
                  </section>

                  <div
                    className="repair-workflow"
                    style={{
                      borderTop: "1px solid var(--border-color, #333)",
                      marginTop: 18,
                      paddingTop: 16,
                    }}
                  >
                    <h4
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <Wrench size={17} />
                      Repair workflow
                    </h4>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <label>
                        <span>Repair status</span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            updateDraft(report, "status", event.target.value)
                          }
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: 6,
                          }}
                        >
                          {options.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Responsible team</span>
                        <input
                          value={draft.assignedTeam}
                          onChange={(event) =>
                            updateDraft(
                              report,
                              "assignedTeam",
                              event.target.value,
                            )
                          }
                          placeholder="e.g. Road Repair Team A"
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: 6,
                          }}
                        />
                      </label>

                      <label style={{ gridColumn: "1 / -1" }}>
                        <span>Repair notes</span>
                        <textarea
                          value={draft.repairNotes}
                          onChange={(event) =>
                            updateDraft(
                              report,
                              "repairNotes",
                              event.target.value,
                            )
                          }
                          placeholder="Describe the repair work or verification..."
                          rows={2}
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: 6,
                          }}
                        />
                      </label>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      <button
                        className="primary-button"
                        onClick={() => saveWorkflow(report)}
                        disabled={savingId === report.id}
                      >
                        {savingId === report.id
                          ? "Saving..."
                          : "Save workflow"}
                      </button>

                      {report.repairedAt && (
                        <span>
                          Repaired:{" "}
                          {new Date(report.repairedAt).toLocaleString()}
                        </span>
                      )}

                      {report.verifiedAt && (
                        <span>
                          Verified:{" "}
                          {new Date(report.verifiedAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {report.statusHistory?.length > 0 && (
                      <details style={{ marginTop: 12 }}>
                        <summary>View status history</summary>
                        <ul>
                          {report.statusHistory.map((entry, index) => (
                            <li key={`${entry.status}-${index}`}>
                              <strong>{entry.status}</strong>
                              {" — "}
                              {entry.changedAt
                                ? new Date(entry.changedAt).toLocaleString()
                                : "Date unavailable"}
                              {entry.changedBy ? ` — ${entry.changedBy}` : ""}
                              {entry.note ? ` — ${entry.note}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <PriorityTable reports={filteredReports} />
    </div>
  );
}
