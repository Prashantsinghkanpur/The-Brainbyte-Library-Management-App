import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

const toneClasses = {
  green: "from-emerald-500 to-teal-600",
  blue: "from-blue-500 to-sky-600",
  purple: "from-violet-500 to-purple-600",
  orange: "from-amber-400 to-orange-500"
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token, user, setSession } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [libraryProfile, setLibraryProfile] = useState(null);
  const [activePromo, setActivePromo] = useState("");
  const [homeMode, setHomeMode] = useState(() => localStorage.getItem("brainbyte-home-mode") || "modern");
  const [actionMessage, setActionMessage] = useState("");
  const [libraryForm, setLibraryForm] = useState({ libraryName: "", phone: "" });
  const [creatingLibrary, setCreatingLibrary] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setError("");

      try {
        const [analyticsData, studentsData, paymentData, profileData] = await Promise.all([
          apiRequest("/analytics/summary", { token }),
          apiRequest("/students?sort=recent", { token }),
          apiRequest("/payments?sort=latest", { token }),
          apiRequest("/settings/profile", { token })
        ]);

        setAnalytics(analyticsData);
        setStudents(studentsData.slice(0, 3));
        setPayments(paymentData.slice(0, 3));
        setLibraryProfile(profileData.library);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      }
    };

    loadDashboard();
  }, [token]);

  const overviewCards = [
    { title: "Active Students", value: analytics?.activeStudents ?? 0, tone: "green" },
    { title: "Total Students", value: analytics?.totalStudents ?? 0, tone: "blue" },
    { title: "Pending Dues", value: analytics?.pendingStudents ?? 0, tone: "purple" },
    { title: "Monthly Earnings", value: formatCurrency(analytics?.monthlyRevenue), tone: "orange" }
  ];
  const referralCode = `BB-${String(user?.id || user?.libraryId || "ADMIN").slice(-6).toUpperCase()}`;
  const libraryName = libraryProfile?.name || "Brainbyte Library";
  const normalizedPhone = String(libraryProfile?.phone || "").replace(/\D/g, "");
  const referralMessage = `Join ${libraryName} with my referral code ${referralCode}. Refer a new admission and earn INR 149 after successful registration.`;
  const communityMessage = `Hi, I want to join the ${libraryName} community for latest updates and library news.`;
  const communityLink = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(communityMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(communityMessage)}`;
  const referralWhatsAppLink = `https://wa.me/?text=${encodeURIComponent(referralMessage)}`;

  const setDashboardMode = (mode) => {
    setHomeMode(mode);
    localStorage.setItem("brainbyte-home-mode", mode);
  };

  const handleShareText = async (message, successText) => {
    setActionMessage("");

    try {
      if (navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
      }

      setActionMessage(successText);
    } catch {
      setActionMessage("Could not share automatically. You can copy the message manually.");
    }
  };

  const handleOpenCommunity = () => {
    window.open(communityLink, "_blank", "noopener,noreferrer");
    setActionMessage("Opening WhatsApp community invite.");
  };

  const openInfoPopup = (type) => {
    setActivePromo(type);
    setActionMessage("");
  };

  const handleLibraryFormChange = (event) => {
    const { name, value } = event.target;
    setLibraryForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateLibrary = async (event) => {
    event.preventDefault();
    setCreatingLibrary(true);
    setError("");
    setActionMessage("");

    try {
      const data = await apiRequest("/auth/libraries", {
        method: "POST",
        token,
        body: libraryForm
      });

      setSession({ token: data.token, user: data.user });
      setLibraryForm({ libraryName: "", phone: "" });
      setActivePromo("");
      setActionMessage(`${data.library.name} workspace created.`);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreatingLibrary(false);
    }
  };

  return (
    <div className="grid min-w-0 max-w-full gap-5 overflow-hidden sm:gap-6">
      <section className="flex items-start justify-between gap-3 pt-3 sm:pt-8 lg:pt-12">
        <div className="min-w-0">
          <h1 className="m-0 text-[2.75rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-7xl">Admin</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-3xl shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 sm:h-16 sm:w-16 sm:rounded-3xl sm:text-4xl" onClick={() => setActivePromo("library")} type="button" aria-label="Add library">
            +
          </button>
          <button className="grid h-14 w-14 place-items-center rounded-full border-4 border-yellow-300 bg-yellow-50 text-2xl font-extrabold text-yellow-600 shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 sm:h-20 sm:w-20 sm:text-3xl" onClick={() => setActivePromo("owner")} type="button" aria-label="Show owner details">
            {(user?.name || "A").slice(0, 1).toUpperCase()}
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
      {actionMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{actionMessage}</div> : null}

      <section className="flex w-fit rounded-[1.35rem] border border-slate-200 bg-white p-1 shadow-lg shadow-slate-300/30">
        <button
          className={homeMode === "classic" ? "min-h-11 rounded-2xl bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20" : "min-h-11 rounded-2xl px-5 font-extrabold text-slate-600"}
          onClick={() => setDashboardMode("classic")}
          type="button"
        >
          Classic
        </button>
        <button
          className={homeMode === "modern" ? "min-h-11 rounded-2xl bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20" : "min-h-11 rounded-2xl px-5 font-extrabold text-slate-600"}
          onClick={() => setDashboardMode("modern")}
          type="button"
        >
          Modern
        </button>
      </section>

      {activePromo ? <button className="fixed inset-0 z-40 cursor-default bg-slate-950/50" onClick={() => setActivePromo("")} type="button" aria-label="Close popup" /> : null}

      <section>
        <h3 className="mb-4 mt-0 text-2xl font-extrabold">Overview</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {overviewCards.map((card) => (
            <article className={`grid min-h-32 min-w-0 content-between overflow-hidden rounded-[1.5rem] bg-gradient-to-br p-4 text-white shadow-xl shadow-slate-300/40 sm:min-h-44 sm:rounded-[1.75rem] sm:p-6 ${toneClasses[card.tone]}`} key={card.title}>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 text-base font-black sm:h-14 sm:w-14 sm:text-lg">{card.title.slice(0, 1)}</div>
              <strong className="block min-w-0 break-words text-2xl font-black leading-none sm:text-4xl">{card.value}</strong>
              <p className="m-0 min-w-0 break-words text-xs font-bold leading-tight min-[380px]:text-sm sm:text-base">{card.title}</p>
            </article>
          ))}
        </div>
      </section>

      <button className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-left text-white shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 sm:gap-4 sm:rounded-[1.75rem] sm:p-5" onClick={() => setActivePromo("refer")} type="button">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 font-black sm:h-14 sm:w-14" aria-hidden="true">R</div>
        <div className="min-w-0">
          <strong className="block break-words text-xl leading-tight sm:text-2xl">Refer & Earn INR 149</strong>
          <p className="m-0 mt-1 break-words text-sm text-white/85 sm:text-base">Boost new admissions through word of mouth.</p>
        </div>
        <span className="ml-auto hidden shrink-0 text-3xl min-[380px]:block sm:text-4xl">&gt;</span>
      </button>

      <button className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-left text-white shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 sm:gap-4 sm:rounded-[1.75rem] sm:p-5" onClick={() => setActivePromo("community")} type="button">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 font-black sm:h-14 sm:w-14" aria-hidden="true">C</div>
        <div className="min-w-0">
          <strong className="block break-words text-xl leading-tight sm:text-2xl">Join Community</strong>
          <p className="m-0 mt-1 break-words text-sm text-white/85 sm:text-base">Get latest updates and library news.</p>
        </div>
        <span className="ml-auto hidden min-h-12 shrink-0 items-center justify-center rounded-full bg-white/20 px-5 font-bold sm:inline-flex">New Member</span>
      </button>

      {activePromo ? (
        <section className="fixed left-1/2 top-24 z-50 grid max-h-[80vh] w-[min(92vw,560px)] -translate-x-1/2 gap-4 overflow-auto rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/30 sm:rounded-[1.75rem] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">{activePromo === "refer" ? "REFERRAL" : activePromo === "community" ? "COMMUNITY" : activePromo === "owner" ? "OWNER" : "NEW LIBRARY"}</p>
              <h3 className="m-0 break-words text-2xl font-extrabold">{activePromo === "refer" ? "Refer & Earn INR 149" : activePromo === "community" ? "Join Community" : activePromo === "owner" ? "Owner Details" : "Add Library"}</h3>
            </div>
            <button className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800" onClick={() => setActivePromo("")} type="button">
              Close
            </button>
          </div>

          {activePromo === "refer" ? (
            <>
              <div className="grid gap-1 rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">Referral Code</span>
                <strong className="break-all text-2xl font-black tracking-wider text-indigo-600 sm:text-3xl">{referralCode}</strong>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">Share Message</span>
                <p className="m-0 mt-1 break-words">{referralMessage}</p>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button className="min-h-12 rounded-full bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20" onClick={() => handleShareText(referralMessage, "Referral message shared.")} type="button">
                  Share Referral
                </button>
                <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-50 px-5 font-bold text-emerald-700" href={referralWhatsAppLink} target="_blank" rel="noreferrer">
                  Share on WhatsApp
                </a>
                <button className="min-h-12 rounded-full border border-slate-200 bg-white px-5 font-bold" onClick={() => handleShareText(referralMessage, "Referral message copied.")} type="button">
                  Copy Message
                </button>
              </div>
            </>
          ) : activePromo === "community" ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">WhatsApp Invite</span>
                <p className="m-0 mt-1 break-words">{communityMessage}</p>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button className="min-h-12 rounded-full bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20" onClick={handleOpenCommunity} type="button">
                  Open WhatsApp
                </button>
                <button className="min-h-12 rounded-full border border-slate-200 bg-white px-5 font-bold" onClick={() => handleShareText(communityMessage, "Community message copied.")} type="button">
                  Copy Invite
                </button>
              </div>
            </>
          ) : activePromo === "owner" ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-3xl bg-yellow-50 p-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-yellow-300 bg-white text-xl font-black text-yellow-600">
                  {(user?.name || "O").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <strong className="block break-words text-xl leading-tight">{user?.name || "Owner"}</strong>
                  <p className="m-0 break-all text-sm font-bold text-slate-500">{user?.email || "-"}</p>
                </div>
              </div>
              <div className="grid gap-3 min-[520px]:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Library</span>
                  <p className="m-0 mt-1 break-words font-bold">{libraryProfile?.name || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Phone</span>
                  <p className="m-0 mt-1 break-words font-bold">{libraryProfile?.phone || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Plan</span>
                  <p className="m-0 mt-1 break-words font-bold">{user?.subscriptionPlan || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Status</span>
                  <p className="m-0 mt-1 break-words font-bold">{user?.subscriptionStatus || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 min-[520px]:col-span-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Renewal Date</span>
                  <p className="m-0 mt-1 break-words font-bold">{formatDate(user?.subscriptionRenewsAt)}</p>
                </div>
              </div>
              <Link className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20 sm:w-fit" to="/settings" onClick={() => setActivePromo("")}>
                Open Settings
              </Link>
            </div>
          ) : activePromo === "qr" ? (
            <div className="grid gap-4">
              <div className="grid place-items-center rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="grid h-44 w-44 grid-cols-5 gap-2 rounded-2xl bg-white p-4 shadow-inner">
                  {Array.from({ length: 25 }, (_, index) => (
                    <span key={index} className={(index + 1) % 2 === 0 || index % 7 === 0 ? "rounded bg-slate-950" : "rounded bg-slate-100"} />
                  ))}
                </div>
              </div>
              <p className="m-0 text-sm font-bold text-slate-500">Use this sample QR placement for library check-in, fee desk, or admission counter.</p>
            </div>
          ) : activePromo === "branding" ? (
            <div className="grid gap-4">
              <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-sky-600 p-5 text-white">
                <strong className="block text-2xl font-black">{libraryName}</strong>
                <p className="m-0 mt-2 font-bold text-white/85">Powered by Brainbyte Library Management</p>
              </div>
              <Link className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-5 font-extrabold text-white sm:w-fit" to="/settings" onClick={() => setActivePromo("")}>
                Edit Branding
              </Link>
            </div>
          ) : activePromo === "help" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="min-h-12 rounded-full bg-green-600 px-5 font-extrabold text-white" onClick={handleOpenCommunity} type="button">
                Chat on WhatsApp
              </button>
              <a className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 font-extrabold text-slate-800" href="mailto:support@brainbyte.app">
                Email Support
              </a>
            </div>
          ) : activePromo === "rate" ? (
            <div className="grid gap-4 text-center">
              <div className="text-3xl font-black text-amber-500">5 Stars</div>
              <p className="m-0 font-bold text-slate-600">Ratings help other library owners trust the app.</p>
              <button className="mx-auto min-h-12 rounded-full bg-amber-700 px-6 font-extrabold text-white" onClick={() => setActionMessage("Play Store link can be added after publishing.")} type="button">
                Rate App
              </button>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={handleCreateLibrary}>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="new-library-name">Library Name</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-name" name="libraryName" value={libraryForm.libraryName} onChange={handleLibraryFormChange} required />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="new-library-phone">Library Phone</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-phone" name="phone" value={libraryForm.phone} onChange={handleLibraryFormChange} required />
              </div>
              <button className="min-h-12 rounded-full bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={creatingLibrary} type="submit">
                {creatingLibrary ? "Creating..." : "Create Library"}
              </button>
            </form>
          )}
        </section>
      ) : null}

      <button className="fixed bottom-24 right-4 z-40 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-teal-700 px-5 text-base font-extrabold text-white shadow-2xl shadow-teal-700/30 sm:hidden" onClick={() => setActivePromo("library")} type="button">
        <span>+</span>
        New Library
      </button>

      {homeMode === "classic" ? (
        <>
          <section className="grid gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-950 shadow-2xl shadow-slate-300/30 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-cyan-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-700">Classic Command</span>
              <h2 className="m-0 mt-5 text-4xl font-black leading-none">Library Control Room</h2>
              <p className="m-0 mt-3 break-words text-lg font-bold text-slate-500">
                {analytics?.activeStudents ?? 0} active | {formatCurrency(analytics?.todayRevenue)} earned today
              </p>
            </div>
            <button className="grid h-16 w-16 place-items-center rounded-3xl bg-slate-950 text-3xl font-black text-white shadow-xl shadow-slate-400/30" onClick={() => navigate("/analytics")} type="button">
              &gt;
            </button>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-2xl font-black">Library Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex min-h-28 items-center gap-4 rounded-[1.5rem] border border-lime-100 bg-lime-50/70 p-5 text-left shadow-lg shadow-slate-300/20" onClick={() => navigate("/students")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white font-black text-lime-700">A</span>
                <span><strong className="block text-2xl font-black">{analytics?.activeStudents ?? 0}</strong><span className="font-extrabold text-slate-500">ACTIVE</span></span>
              </button>
              <button className="flex min-h-28 items-center gap-4 rounded-[1.5rem] border border-cyan-100 bg-cyan-50/70 p-5 text-left shadow-lg shadow-slate-300/20" onClick={() => navigate("/payments")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white font-black text-cyan-700">T</span>
                <span><strong className="block text-2xl font-black">{formatCurrency(analytics?.todayRevenue)}</strong><span className="font-extrabold text-slate-500">TODAY</span></span>
              </button>
              <button className="flex min-h-28 items-center gap-4 rounded-[1.5rem] border border-rose-100 bg-rose-50/70 p-5 text-left shadow-lg shadow-slate-300/20" onClick={() => navigate("/analytics")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white font-black text-rose-700">M</span>
                <span><strong className="block text-2xl font-black">{formatCurrency(analytics?.monthlyRevenue)}</strong><span className="font-extrabold text-slate-500">MONTHLY</span></span>
              </button>
              <button className="flex min-h-28 items-center gap-4 rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-5 text-left shadow-lg shadow-slate-300/20" onClick={() => navigate("/students")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white font-black text-indigo-700">S</span>
                <span><strong className="block text-2xl font-black">{analytics?.totalStudents ?? 0}</strong><span className="font-extrabold text-slate-500">TOTAL</span></span>
              </button>
            </div>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-2xl font-black">Quick Actions</h3>
            <div className="grid gap-4 min-[680px]:grid-cols-3">
              <button className="grid min-h-36 content-between rounded-[1.75rem] bg-slate-950 p-5 text-left text-white shadow-xl shadow-slate-400/30" onClick={() => navigate("/students?new=1")} type="button">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 font-black">+</span>
                <strong className="text-2xl font-black">Add Student</strong>
                <span className="font-bold text-white/85">New admission</span>
              </button>
              <button className="grid min-h-36 content-between rounded-[1.75rem] bg-cyan-700 p-5 text-left text-white shadow-xl shadow-cyan-700/20" onClick={() => navigate("/expenses")} type="button">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 font-black">E</span>
                <strong className="text-2xl font-black">Log Expense</strong>
                <span className="font-bold text-white/85">Track costs</span>
              </button>
              <button className="grid min-h-36 content-between rounded-[1.75rem] bg-lime-600 p-5 text-left text-white shadow-xl shadow-lime-700/20" onClick={() => navigate("/analytics")} type="button">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 font-black">R</span>
                <strong className="text-2xl font-black">View Reports</strong>
                <span className="font-bold text-white/85">Deep insights</span>
              </button>
            </div>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-2xl font-black">Recommended</h3>
            <button className="flex min-h-24 items-center gap-4 rounded-[1.75rem] border border-indigo-100 bg-white p-5 text-left text-slate-950 shadow-xl shadow-slate-300/25" onClick={() => openInfoPopup("refer")} type="button">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 font-black text-indigo-700">R</span>
              <span className="min-w-0 flex-1"><strong className="block text-2xl font-black">Refer & Earn INR 149</strong><span className="font-bold text-slate-500">Get bonus on every successful referral</span></span>
              <span className="text-3xl">&gt;</span>
            </button>
            <button className="flex min-h-24 items-center gap-4 rounded-[1.75rem] border border-rose-100 bg-rose-50/60 p-5 text-left shadow-lg shadow-slate-300/20" onClick={() => navigate("/payments")} type="button">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white font-black text-rose-600">!</span>
              <span className="min-w-0 flex-1"><strong className="block text-xl font-black">Pending Dues</strong><span className="font-bold text-slate-500">{formatCurrency(analytics?.totalDues)} from {analytics?.pendingStudents ?? 0} students</span></span>
              <span className="rounded-full bg-rose-600 px-5 py-3 font-extrabold text-white">Collect</span>
            </button>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-2xl font-black">Manage</h3>
            <div className="grid grid-cols-3 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-300/25">
              {[
                ["Students", "/students", "S"],
                ["Seats", "/seats", "G"],
                ["Payments", "/payments", "P"],
                ["Shifts", "/seats", "L"],
                ["Analytics", "/analytics", "A"],
                ["Student ID", "/students", "ID"]
              ].map(([label, path, icon]) => (
                <button key={label} className="grid min-h-36 place-items-center gap-2 border-b border-r border-slate-100 p-4 font-black transition hover:bg-slate-50" onClick={() => navigate(path)} type="button">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-2xl font-black">Tools & More</h3>
            <div className="grid grid-cols-3 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-300/25">
              {[
                ["WhatsApp", "community", "W"],
                ["QR Code", "qr", "QR"],
                ["Branding", "branding", "B"],
                ["Refer & Earn", "refer", "R"],
                ["Community", "community", "C"]
              ].map(([label, popup, icon]) => (
                <button key={label} className="grid min-h-32 place-items-center gap-2 border-b border-r border-slate-100 p-4 font-black transition hover:bg-slate-50" onClick={() => openInfoPopup(popup)} type="button">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-50 text-lime-700">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <button className="flex min-h-24 items-center gap-4 rounded-[1.75rem] border border-cyan-100 bg-cyan-50/60 p-5 text-left shadow-lg shadow-slate-300/20" onClick={() => openInfoPopup("help")} type="button">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white font-black text-cyan-700">H</span>
            <span className="min-w-0 flex-1"><strong className="block text-xl font-black">Need Help?</strong><span className="font-bold text-slate-500">Support is one message away</span></span>
          </button>

          <button className="flex min-h-24 items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-lg shadow-slate-300/20" onClick={() => openInfoPopup("refer")} type="button">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 font-black text-white">I</span>
            <span className="min-w-0 flex-1"><strong className="block text-xl font-black text-slate-950">Invite a Friend</strong><span className="font-bold text-slate-500">Help other library owners simplify work.</span></span>
          </button>

          <button className="grid gap-3 rounded-[1.75rem] border border-lime-100 bg-lime-50/70 p-6 text-center shadow-lg shadow-slate-300/20" onClick={() => openInfoPopup("rate")} type="button">
            <strong className="text-3xl text-lime-700">5 Stars</strong>
            <span className="text-xl font-black text-slate-950">Enjoying the App?</span>
            <span className="font-bold text-slate-600">Your rating helps us grow.</span>
          </button>

          <p className="m-0 pb-10 text-center font-bold text-slate-500">Made with care in India<br />Version 4.0.1</p>
        </>
      ) : (
      <>
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 grid gap-3 min-[380px]:flex min-[380px]:items-center min-[380px]:justify-between">
          <h3 className="m-0 min-w-0 text-2xl font-extrabold">Recent Students</h3>
          <Link className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 font-bold" to="/students">View All</Link>
        </div>

        <div className="grid gap-4">
          {students.map((student) => (
            <article className="flex gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20 sm:gap-4" key={student._id}>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sky-600 text-lg font-extrabold text-white sm:h-16 sm:w-16 sm:text-xl">{student.name.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block break-words leading-tight">{student.name}</strong>
                    <p className="m-0 text-sm text-slate-500">ID: {student.memberId}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">{student.status}</span>
                </div>
                <div className="mt-3 grid gap-3 min-[520px]:grid-cols-2">
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Joined</span>
                    <p className="m-0 break-words">{formatDate(student.joinedDate)}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Position</span>
                    <p className="m-0 break-words">{student.hallName} - Seat {student.seatNumber}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 grid gap-3 min-[380px]:flex min-[380px]:items-center min-[380px]:justify-between">
          <h3 className="m-0 min-w-0 text-2xl font-extrabold">Latest Payments</h3>
          <Link className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 font-bold" to="/payments">History</Link>
        </div>

        <div className="grid gap-4">
          {payments.map((payment) => (
            <article className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20" key={payment._id}>
              <div className="flex items-start justify-between gap-3">
                <strong className="min-w-0 break-words leading-tight">{payment.student?.name || "Deleted student"}</strong>
                <div className="shrink-0 rounded-2xl bg-teal-50 px-4 py-2 font-extrabold text-teal-700">{payment.method}</div>
              </div>
              <div className="break-words text-3xl font-black text-teal-700 sm:text-4xl">{formatCurrency(payment.amount)}</div>
              <div className="break-words rounded-2xl bg-slate-100 px-4 py-3 text-slate-700">
                {formatDate(payment.membershipStartDate)} - {formatDate(payment.paidTill)}
              </div>
              <p className="m-0 break-words font-bold text-teal-700">Paid on {formatDate(payment.paymentDate)}</p>
            </article>
          ))}
        </div>
      </section>
      </>
      )}
    </div>
  );
}



