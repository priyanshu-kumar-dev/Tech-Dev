import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import AnalyzeRoad from "./pages/AnalyzeRoad";
import Reports from "./pages/Reports";
import AuthPage from "./pages/AuthPage";
import AnalyticsAdmin from "./pages/AnalyticsAdmin";
import Footer from "./components/Footer";
import {
  checkBackend,
  fetchCurrentUser,
  fetchReports,
  logOut,
  updateMaintenanceStatus,
  uploadRepairPhoto,
  deleteReport,
} from "./services/api";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");

  const loadData = useCallback(async () => {
    const health = await checkBackend();
    const [data, currentUser] = await Promise.all([
      fetchReports().catch((error) => {
        if (error.response?.status === 503) {
          return { reports: [] };
        }
        throw error;
      }),
      fetchCurrentUser(),
    ]);

    return {
      backendOnline: Boolean(health?.success),
      reports: Array.isArray(data?.reports) ? data.reports : [],
      user: currentUser,
    };
  }, []);

  const applyLoadedData = useCallback((data) => {
    setBackendOnline(data.backendOnline);
    setConnectionMessage("");
    setReports(data.reports);
    setUser(data.user);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      applyLoadedData(await loadData());
    } catch (error) {
      setBackendOnline(false);
      setConnectionMessage(
        error.message || "Unable to connect to the backend."
      );
    }
  }, [applyLoadedData, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleMaintenanceStatusChange = async (reportId, status, assignedTo) => {
    const result = await updateMaintenanceStatus(reportId, status, assignedTo);

    if (!result.success || !result.report) {
      throw new Error(result.message || "Unable to update maintenance status.");
    }

    setReports((previous) =>
      previous.map((report) =>
        report.id === reportId ? result.report : report
      )
    );
  };

  const handleRepairPhotoUpload = async (reportId, image) => {
    const result = await uploadRepairPhoto(reportId, image);
    if (!result.success || !result.report) {
      throw new Error(result.message || "Unable to save the repair photo.");
    }
    setReports((previous) =>
      previous.map((report) =>
        report.id === reportId ? result.report : report
      )
    );
  };

  const handleReportDelete = async (reportId) => {
    const result = await deleteReport(reportId);
    if (!result.success) {
      throw new Error(result.message || "Unable to delete the report.");
    }
    setReports((previous) =>
      previous.filter((report) => report.id !== reportId)
    );
  };

  const signOut = async () => {
    try {
      await logOut();
      setUser(null);
      setPage("dashboard");
      setAccountMessage("");
    } catch (error) {
      setAccountMessage(
        error.response?.data?.message || "Unable to sign out right now."
      );
    }
  };

  useEffect(() => {
    let active = true;

    loadData()
      .then((data) => {
        if (active) {
          applyLoadedData(data);
        }
      })
      .catch((error) => {
        if (active) {
          setBackendOnline(false);
          setConnectionMessage(
            error.message || "Unable to connect to the backend."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [applyLoadedData, loadData]);

  return (
    <div className="app-shell">
      <Navbar
        page={page}
        setPage={setPage}
        backendOnline={backendOnline}
        user={user}
        onSignOut={signOut}
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
                  : page === "reports"
                    ? "Reports"
                    : page === "analytics"
                      ? "Analytics & Operations"
                    : page === "signup"
                      ? "Create account"
                      : "Sign in"}
            </strong>
          </div>

          <div className="topbar-right">
            <span className={`status-dot ${backendOnline ? "" : "offline"}`} />
            <span>{backendOnline ? "API Connected" : "API Offline"}</span>
            <button
              className="icon-button"
              onClick={handleRefresh}
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
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Retry
            </button>
          </div>
        )}

        {accountMessage && (
          <div className="global-error" role="alert">
            <AlertCircle size={18} />
            <p>{accountMessage}</p>
          </div>
        )}

        {(page === "login" || page === "signup") && (
          <AuthPage
            mode={page}
            onAuthenticated={(authenticatedUser) => {
              setUser(authenticatedUser);
              setPage("dashboard");
            }}
            setPage={setPage}
          />
        )}

        {page === "dashboard" && (
          <Dashboard
            reports={reports}
            setPage={setPage}
            backendOnline={backendOnline}
            canManageReports={user?.role === "admin"}
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
            canManageReports={user?.role === "admin"}
            onStatusChange={handleMaintenanceStatusChange}
            onRepairPhotoUpload={handleRepairPhotoUpload}
            onDeleteReport={handleReportDelete}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {page === "analytics" && (
          <AnalyticsAdmin reports={reports} setPage={setPage} />
        )}

        <Footer setPage={setPage} />
      </main>
    </div>
  );
}