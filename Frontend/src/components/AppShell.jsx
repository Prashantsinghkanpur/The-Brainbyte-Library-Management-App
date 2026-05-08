import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/format";
import { LogoButton, LogoPopup } from "./LogoPreview";

function NavIcon({ name, className = "h-4 w-4" }) {
  const iconProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  const icons = {
    home: (
      <svg {...iconProps}>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
    students: (
      <svg {...iconProps}>
        <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    seats: (
      <svg {...iconProps}>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <path d="M5 11h14v9H5z" />
        <path d="M4 20h16" />
      </svg>
    ),
    payments: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    ),
    analytics: (
      <svg {...iconProps}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-3" />
      </svg>
    ),
    settings: (
      <svg {...iconProps}>
        <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.24.38.39.82.39 1.29 0 .47-.15.91-.39 1.29Z" />
      </svg>
    )
  };

  return icons[name] || icons.home;
}

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
  const { token, user, logout, setSession } = useAuth();
  const [libraries, setLibraries] = useState([]);
  const [switchingLibrary, setSwitchingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const [showLogoPopup, setShowLogoPopup] = useState(false);

  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const data = await apiRequest("/auth/libraries", { token });
        setLibraries(data.libraries || []);
      } catch (error) {
        setLibraryError(getErrorMessage(error));
      }
    };

    if (token) {
      loadLibraries();
    }
  }, [token, user?.libraryId]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleLibrarySwitch = async (event) => {
    const libraryId = event.target.value;

    if (!libraryId || libraryId === user?.libraryId) {
      return;
    }

    setSwitchingLibrary(true);
    setLibraryError("");

    try {
      const data = await apiRequest("/auth/libraries/switch", {
        method: "POST",
        token,
        body: { libraryId }
      });

      setSession({ token: data.token, user: data.user });
      navigate("/dashboard");
    } catch (error) {
      setLibraryError(getErrorMessage(error));
    } finally {
      setSwitchingLibrary(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 text-slate-950 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 dark:[&_.bg-white]:bg-slate-900 dark:[&_.bg-slate-50]:bg-slate-800 dark:[&_.bg-slate-100]:bg-slate-800 dark:[&_.border-slate-200]:border-slate-700 dark:[&_.text-slate-950]:text-slate-50 dark:[&_.text-slate-900]:text-slate-100 dark:[&_.text-slate-800]:text-slate-200 dark:[&_.text-slate-700]:text-slate-300 dark:[&_.text-slate-600]:text-slate-300 dark:[&_.text-slate-500]:text-slate-400 lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="app-sidebar sticky top-0 z-20 hidden min-h-screen flex-col gap-7 border-r border-slate-200/90 bg-white/80 px-6 py-7 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 lg:flex">
        <div className="flex items-center gap-3">
          <LogoButton
            buttonClassName="grid h-[4.5rem] w-[4.5rem] place-items-center overflow-hidden rounded-3xl bg-white p-1 shadow-lg shadow-slate-300/30 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/50"
            imageClassName="h-full w-full rounded-2xl object-contain"
            onClick={() => setShowLogoPopup(true)}
          />
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
                <NavIcon name={item.icon} />
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
          <div className="grid gap-2">
            <label className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500" htmlFor="desktop-library-switch">Library</label>
            <select
              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
              disabled={switchingLibrary || libraries.length === 0}
              id="desktop-library-switch"
              onChange={handleLibrarySwitch}
              value={user?.libraryId || ""}
            >
              {libraries.map((library) => (
                <option key={library._id} value={library._id}>
                  {library.name}
                </option>
              ))}
            </select>
            {libraryError ? <p className="m-0 text-xs font-bold text-red-600">{libraryError}</p> : null}
          </div>
          <button className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={handleLogout} type="button">
            Log out
          </button>
        </div>
      </aside>

      <LogoPopup isOpen={showLogoPopup} onClose={() => setShowLogoPopup(false)} />

      <main className="min-w-0 overflow-x-hidden px-4 pb-32 pt-5 sm:px-6 sm:pt-6 lg:px-6 lg:pb-8">
        <header className="mb-5 hidden items-center justify-between lg:flex">
          <div className="min-w-0">
            <h2 className="m-0 break-words text-2xl font-extrabold">{user?.name || "Library Owner"}</h2>
          </div>
          <div className="shrink-0 rounded-full bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-700">{user?.subscriptionStatus || "ACTIVE"}</div>
        </header>
        <div className="mb-4 grid gap-2 lg:hidden">
          <select
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 outline-none"
            disabled={switchingLibrary || libraries.length === 0}
            onChange={handleLibrarySwitch}
            value={user?.libraryId || ""}
            aria-label="Switch library"
          >
            {libraries.map((library) => (
              <option key={library._id} value={library._id}>
                {library.name}
              </option>
            ))}
          </select>
          {libraryError ? <p className="m-0 text-xs font-bold text-red-600">{libraryError}</p> : null}
        </div>
        <Outlet />
      </main>

      <nav className="app-mobile-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white/95 px-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-slate-400/25 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-2 lg:hidden">
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
              <NavIcon name={item.icon} className="h-[1.125rem] w-[1.125rem]" />
            </span>
            <span className="max-w-full truncate">{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
