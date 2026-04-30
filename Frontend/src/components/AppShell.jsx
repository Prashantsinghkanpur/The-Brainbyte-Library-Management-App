import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/dashboard", label: "Home", short: "Home", icon: "home" },
  { path: "/students", label: "Students", short: "Students", icon: "students" },
  { path: "/seats", label: "Seats", short: "Seats", icon: "seats" },
  { path: "/payments", label: "Payments", short: "Payments", icon: "payments" },
  { path: "/analytics", label: "Analytics", short: "Analytics", icon: "analytics" },
  { path: "/settings", label: "Settings", short: "Settings", icon: "settings" }
];

export default function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-mark">BB</div>
          <div className="brand-copy">
            <h1>Brainbyte</h1>
            <p className="sidebar-copy">Library app</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>
            <strong>{user?.name || "Owner"}</strong>
            <p>{user?.email || "No email"}</p>
          </div>
          <button className="ghost-button" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </aside>

      <main className="page-frame">
        <header className="topbar">
          <div className="topbar-copy">
            <p className="eyebrow">Mobile Workspace</p>
            <h2>{user?.name || "Library Owner"}</h2>
            <p className="section-subtitle">{user?.subscriptionPlan || "Starter"} plan workspace</p>
          </div>
          <div className="status-pill">{user?.subscriptionStatus || "ACTIVE"}</div>
        </header>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? "bottom-link active" : "bottom-link")}
          >
            <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true" />
            <span>{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
