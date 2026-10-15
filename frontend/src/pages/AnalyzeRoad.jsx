
import { useState } from "react";
import {
  analyzeRoadImage,
  analyzeRoadVideo,
} from "../services/api";
import UploadForm from "../components/UploadForm";
import DetectionResults from "../components/DetectionResults";
import RoadMap from "../components/RoadMap";

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
          <h1>Analyze Road Damage</h1>
          <p>Upload a road image or video and inspect AI detections.</p>
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="analyze-grid">
        <UploadForm onAnalyze={handleAnalyze} loading={loading} />
        <DetectionResults report={currentReport} />
      </div>

      <RoadMap reports={visibleReports} />

      {currentReport && (
        <button
          className="secondary-button"
          onClick={() => setPage("reports")}
        >
          View all reports
        </button>
      )}
    </div>
  );
}
