import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { path: "/dashboard", label: "Home", short: "Home", icon: "H" },
  { path: "/students", label: "Students", short: "Students", icon: "S" },
  { path: "/seats", label: "Seats", short: "Seats", icon: "G" },
  { path: "/payments", label: "Payments", short: "Payments", icon: "P" },
  { path: "/analytics", label: "Analytics", short: "Analytics", icon: "A" },
  { path: "/settings", label: "Settings", short: "Settings", icon: "T" }
];

export default function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 text-slate-950 lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="sticky top-0 z-20 hidden min-h-screen flex-col gap-7 border-r border-slate-200/90 bg-white/80 px-6 py-7 backdrop-blur lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-500 font-extrabold text-white shadow-lg shadow-teal-700/15">BB</div>
          <div>
            <h1 className="m-0 text-xl font-extrabold">Brainbyte</h1>
            <p className="m-0 text-sm text-slate-500">Library app</p>
          </div>
        </div>

        <nav className="grid gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition hover:-translate-y-0.5 ${
                  isActive ? "bg-teal-50 text-teal-700" : "text-slate-700 hover:bg-white"
                }`
              }
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-xs font-extrabold" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/30">
          <div>
            <strong>{user?.name || "Owner"}</strong>
            <p className="m-0 break-all text-sm text-slate-500">{user?.email || "No email"}</p>
          </div>
          <button className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 overflow-x-hidden px-4 pb-32 pt-5 sm:px-6 sm:pt-6 lg:px-6 lg:pb-8">
        <header className="mb-5 hidden items-center justify-between lg:flex">
          <div className="min-w-0">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">Mobile Workspace</p>
            <h2 className="m-0 break-words text-2xl font-extrabold">{user?.name || "Library Owner"}</h2>
            <p className="m-0 break-words text-sm text-slate-500">{user?.subscriptionPlan || "Starter"} plan workspace</p>
          </div>
          <div className="shrink-0 rounded-full bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700">{user?.subscriptionStatus || "ACTIVE"}</div>
        </header>
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white/95 px-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-slate-400/25 backdrop-blur sm:px-2 lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `grid min-w-0 justify-items-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-bold transition min-[380px]:text-[10px] ${
                isActive ? "text-teal-700" : "text-slate-500"
              }`
            }
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-xs font-extrabold min-[380px]:h-9 min-[380px]:w-9" aria-hidden="true">
              {item.icon}
            </span>
            <span className="max-w-full truncate">{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
