import {
  Activity,
  BarChart3,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Map,
  MapPinned,
  ScanLine,
  UserPlus,
  Wrench,
} from "lucide-react";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, page: "dashboard" },
  { id: "analyze", label: "Analyze Road", icon: ScanLine, page: "analyze" },
  { id: "reports", label: "Reports", icon: FileText, page: "reports" },
  { id: "live-map", label: "Live Map", icon: Map, page: "dashboard" },
  { id: "analytics", label: "Analytics", icon: BarChart3, page: "analytics" },
  { id: "maintenance", label: "Maintenance", icon: Wrench, page: "reports" },
];

export default function Navbar({
  page,
  setPage,
  backendOnline,
  user,
  onSignOut,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Activity size={25} />
        </div>
        <div>
          <h2>RoadShield <span>AI</span></h2>
          <p>Road Intelligence Platform</p>
        </div>
      </div>

      <div className="nav-label">WORKSPACE</div>

      <nav className="nav-list">
        {navigation.map(({ id, label, icon: Icon, page: targetPage }) => (
          <button
            key={id}
            className={`nav-item ${page === id ? "active" : ""}`}
            onClick={() => {
              setPage(targetPage);
              if (id === "live-map") {
                window.setTimeout(() => {
                  document.getElementById("dashboard-map")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 0);
              } else {
                window.history.replaceState(null, "", window.location.pathname);
              }
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="account-nav">
        {user ? (
          <>
            <div className="account-summary">
              <span className="account-avatar">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
              <span className="account-details">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </span>
            </div>
            <button className="account-action" onClick={onSignOut}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <>
            <button
              className={`account-action ${page === "login" ? "active" : ""}`}
              onClick={() => setPage("login")}
            >
              <LogIn size={16} />
              <span>Sign in</span>
            </button>
            <button
              className={`account-action ${page === "signup" ? "active" : ""}`}
              onClick={() => setPage("signup")}
            >
              <UserPlus size={16} />
              <span>Create account</span>
            </button>
          </>
        )}
      </div>

      <div className="sidebar-bottom">
        <div className="system-card">
          <div className="system-heading">
            <MapPinned size={18} />
            <strong>System Status</strong>
          </div>
          <div className="status-line">
            <span className={`status-dot ${backendOnline ? "" : "offline"}`} />
            {backendOnline ? "Backend Connected" : "Backend Offline"}
          </div>
          <p>Detection mode depends on the connected AI model.</p>
        </div>
        <p className="sidebar-footer">ROADSHIELD AI · HACKATHON DEMO</p>
      </div>
    </aside>
  );
}