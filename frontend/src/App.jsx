import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import AnalyzeRoad from "./pages/AnalyzeRoad";
import Reports from "./pages/Reports";
import { checkBackend, fetchReports } from "./services/api";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [backendOnline, setBackendOnline] = useState(false);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");

  const refreshData = useCallback(async () => {
    setRefreshing(true);

    try {
      const health = await checkBackend();
      setBackendOnline(Boolean(health?.success));
      setConnectionMessage("");

      const data = await fetchReports();
      setReports(Array.isArray(data?.reports) ? data.reports : []);
    } catch (error) {
      setBackendOnline(false);
      setConnectionMessage(
        error.message || "Unable to connect to the backend."
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <div className="app-shell">
      <Navbar
        page={page}
        setPage={setPage}
        backendOnline={backendOnline}
      />

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>RoadShield AI</span>
            <span className="breadcrumb-separator">/</span>
            <strong>
              {page === "dashboard"
                ? "Dashboard"
                : page === "analyze"
                  ? "Analyze Road"
                  : "Reports"}
            </strong>
          </div>

          <div className="topbar-right">
            <span className={`status-dot ${backendOnline ? "" : "offline"}`} />
            <span>{backendOnline ? "API Connected" : "API Offline"}</span>
            <button
              className="icon-button"
              onClick={refreshData}
              disabled={refreshing}
              aria-label="Refresh data"
              title="Refresh data"
            >
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            </button>
          </div>
        </header>

        {!backendOnline && (
          <div className="global-error">
            <AlertCircle size={18} />
            <div>
              <strong>Backend connection unavailable</strong>
              <p>
                {connectionMessage ||
                  "Start the backend at http://localhost:5000 and refresh."}
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={refreshData}
              disabled={refreshing}
            >
              Retry
            </button>
          </div>
        )}

        {page === "dashboard" && (
          <Dashboard
            reports={reports}
            setPage={setPage}
            backendOnline={backendOnline}
          />
        )}

        {page === "analyze" && (
          <AnalyzeRoad
            reports={reports}
            setReports={setReports}
            setPage={setPage}
          />
        )}

        {page === "reports" && (
          <Reports
            reports={reports}
            onRefresh={refreshData}
            refreshing={refreshing}
          />
        )}

        <footer className="app-footer">
          <span>RoadShield AI · Road Safety Intelligence</span>
          <span>For inspection support; verify findings before road repairs.</span>
        </footer>
      </main>
    </div>
  );
}