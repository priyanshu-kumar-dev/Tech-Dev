
import { useState } from "react";
import {
  analyzeRoadImage,
  analyzeRoadVideo,
} from "../services/api";
import UploadForm from "../components/UploadForm";
import DetectionResults from "../components/DetectionResults";
import RoadMap from "../components/RoadMap";
import PriorityTable from "../components/PriorityTable";

export default function AnalyzeRoad({ reports, setReports, setPage }) {
  const [loading, setLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAnalyze(data) {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result =
        data.mediaType === "video"
          ? await analyzeRoadVideo(data)
          : await analyzeRoadImage(data);

      if (!result.success || !result.report) {
        throw new Error(result.message || "Analysis did not return a report.");
      }

      setCurrentReport(result.report);

      setReports((previous) => {
        const withoutDuplicate = previous.filter(
          (item) => item.id !== result.report.id
        );
        return [result.report, ...withoutDuplicate];
      });

      setMessage(
        result.message ||
          `${data.mediaType === "video" ? "Video" : "Image"} analysis completed.`
      );
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const visibleReports = currentReport
    ? [
        currentReport,
        ...reports.filter((item) => item.id !== currentReport.id),
      ]
    : reports;

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ROAD INSPECTION</p>
<<<<<<< HEAD
          <h1>Report Road Damage</h1>
          <p>
            Share a road photo and location. The report is saved for the
            responsible team to review.
          </p>
=======
          <h1>Analyze Road Damage</h1>
          <p>Upload a road image or video and inspect AI detections.</p>
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
        </div>
      </div>

      <ol className="citizen-workflow" aria-label="Citizen report workflow">
        <li className="active"><span>1</span>Photo + location</li>
        <li className={currentReport ? "complete" : ""}>
          <span>2</span>AI-assisted assessment
        </li>
        <li className={currentReport ? "active" : ""}>
          <span>3</span>Team verifies &amp; assigns
        </li>
        <li><span>4</span>Repair &amp; resolution</li>
      </ol>

      {message && <div className="success-banner">{message}</div>}
<<<<<<< HEAD
      {currentReport && (
        <section className="report-submitted-banner" role="status">
          <div>
            <strong>Report submitted</strong>
            <p>
              Reference: {currentReport.id} · Status:{" "}
              {currentReport.maintenanceStatus || "Reported"}
            </p>
            <p>
              {currentReport.location
                ? `Location recorded at ${Number(
                    currentReport.location.latitude
                  ).toFixed(5)}, ${Number(
                    currentReport.location.longitude
                  ).toFixed(5)}`
                : "No GPS location was attached. The team can still review the photo."}
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={() => setPage("reports")}
          >
            Track this report
          </button>
        </section>
      )}
      {currentReport?.possibleDuplicateOf && (
        <div className="duplicate-warning" role="status">
          This may be a duplicate of report {currentReport.possibleDuplicateOf}.
          The uploaded image matched and its coordinates are within 100 metres.
        </div>
      )}
=======
      {error && <div className="error-message">{error}</div>}
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70

      <div className="analyze-grid">
        <UploadForm onAnalyze={handleAnalyze} loading={loading} />
        <DetectionResults report={currentReport} />
      </div>

      <RoadMap reports={visibleReports} />
      <PriorityTable reports={visibleReports} />

      {currentReport && (
<<<<<<< HEAD
        <button className="text-button" onClick={() => setPage("dashboard")}>
          Back to dashboard
=======
        <button
          className="secondary-button"
          onClick={() => setPage("reports")}
        >
          View all reports
>>>>>>> 7dcba19d2d2fea1813801286954f60f945d7aa70
        </button>
      )}
    </div>
  );
}
