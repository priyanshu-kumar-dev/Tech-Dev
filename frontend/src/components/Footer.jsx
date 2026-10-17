
const currentYear = new Date().getFullYear();

export default function Footer({ setPage }) {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h3>
            <span className="footer-icon">🛣️</span> RoadGuard AI
          </h3>
          <p>Road Safety Intelligence</p>
          <p className="footer-description">
            Smarter roads through AI-powered damage detection,
            severity analysis, and location-based reporting.
          </p>
        </div>

        <div className="footer-links">
          <h4>Quick Links</h4>
          <button type="button" onClick={() => setPage?.("dashboard")}>Home</button>
          <button type="button" onClick={() => setPage?.("dashboard")}>Dashboard</button>
          <button type="button" onClick={() => setPage?.("analyze")}>Report Road Damage</button>
        </div>

        <div className="footer-info">
          <h4>Road Safety First</h4>
          <p>
            AI-generated findings are for inspection support.
            Verify all results before planning road repairs.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {currentYear} RoadGuard AI. All rights reserved.
        </span>
        <span>Built for safer roads with AI 💙</span>
      </div>
    </footer>
  );
}
