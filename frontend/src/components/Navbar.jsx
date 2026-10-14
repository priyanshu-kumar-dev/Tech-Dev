import { Activity, MapPinned, LayoutDashboard, ScanLine, FileText } from "lucide-react";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analyze", label: "Analyze Road", icon: ScanLine },
  { id: "reports", label: "Reports", icon: FileText },
];

export default function Navbar({ page, setPage, backendOnline }) {
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
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-item ${page === id ? "active" : ""}`}
            onClick={() => setPage(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

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