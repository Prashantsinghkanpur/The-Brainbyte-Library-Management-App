import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/students", label: "Students" },
  { path: "/seats", label: "Seats" },
  { path: "/payments", label: "Payments" },
  { path: "/expenses", label: "Expenses" },
  { path: "/settings", label: "Settings" }
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
        <div>
          <div className="brand-mark">BB</div>
          <h1>Brainbyte Library</h1>
          <p className="sidebar-copy">Manage seats, payments, students, and operations from one place.</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
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
          <div>
            <p className="eyebrow">Library Admin Panel</p>
            <h2>{user?.subscriptionPlan || "Starter"} Plan Workspace</h2>
          </div>
          <div className="status-pill">{user?.subscriptionStatus || "ACTIVE"}</div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
