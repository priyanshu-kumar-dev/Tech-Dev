import { AlertTriangle, ShieldCheck, Wrench } from "lucide-react";
import SeverityBadge from "./SeverityBadge";

export default function DetectionResults({ report }) {
  if (!report) {
    return (
      <section className="panel empty-state">
        <div className="empty-icon">
          <ShieldCheck size={30} />
        </div>
        <h3>No analysis selected</h3>
        <p>Upload a road image to see its analysis report here.</p>
      </section>
    );
  }

  const detections = report.detections || [];

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Detection Results</h3>
          <p>{detections.length} defect record(s) returned by the backend</p>
        </div>
        <AlertTriangle size={21} />
      </div>

      {report.isSimulated && (
        <div className="warning-banner">
          Demo results: these detections are simulated, not predictions from a
          trained image model.
        </div>
      )}

      {detections.length === 0 ? (
        <p className="muted-text">No defect records were returned.</p>
      ) : (
        <div className="detection-list">
          {detections.map((item, index) => (
            <article className="detection-item" key={item.id || index}>
              <div className="detection-number">{index + 1}</div>

              <div className="detection-content">
                <div className="detection-title-row">
                  <strong>{item.type || "Unknown defect"}</strong>
                  <SeverityBadge severity={item.severity} />
                </div>

                {item.simulated || report.isSimulated ? (
                  <div className="confidence-line">
                    Illustrative demo score — not an AI confidence result
                  </div>
                ) : (
                  <div className="confidence-line">
                    Model confidence:{" "}
                    {Number.isFinite(Number(item.confidence))
                      ? `${Math.round(
                          Number(item.confidence) <= 1
                            ? Number(item.confidence) * 100
                            : Number(item.confidence)
                        )}%`
                      : "Not provided"}
                  </div>
                )}

                {item.priorityScore != null && (
                  <div className="score-line">
                    Priority score: <strong>{item.priorityScore}/100</strong>
                  </div>
                )}

                <div className="repair-action">
                  <Wrench size={15} />
                  {item.repairAction || "Manual road inspection recommended"}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="field-hint">
        Confidence is displayed only for model-generated detections. Severity
        and priority are recommendations, not a substitute for a professional
        road-safety inspection.
      </p>
    </section>
  );
}