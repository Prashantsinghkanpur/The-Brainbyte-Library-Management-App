import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [libraryProfile, setLibraryProfile] = useState(null);
  const [activePromo, setActivePromo] = useState("");
  const [actionMessage, setActionMessage] = useState("");
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

  return (
    <div className="grid min-w-0 max-w-full gap-5 overflow-hidden sm:gap-6">
      <section className="flex items-start justify-between gap-3 pt-3 sm:pt-8 lg:pt-12">
        <div className="min-w-0">
          <p className="m-0 text-base font-bold text-slate-500 sm:text-xl">Good Morning</p>
          <h1 className="m-0 text-[2.75rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-7xl">Admin</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-3xl shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 sm:h-16 sm:w-16 sm:rounded-3xl sm:text-4xl" to="/students" aria-label="Add student">
            +
          </Link>
          <div className="grid h-14 w-14 place-items-center rounded-full border-4 border-yellow-300 bg-yellow-50 text-2xl font-extrabold text-yellow-600 shadow-xl shadow-slate-300/40 sm:h-20 sm:w-20 sm:text-3xl">
            {(user?.name || "A").slice(0, 1).toUpperCase()}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
      {actionMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{actionMessage}</div> : null}

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
        <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">{activePromo === "refer" ? "REFERRAL" : "COMMUNITY"}</p>
              <h3 className="m-0 break-words text-2xl font-extrabold">{activePromo === "refer" ? "Refer & Earn INR 149" : "Join Community"}</h3>
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
                <button className="min-h-12 rounded-full border border-slate-200 bg-white px-5 font-bold" onClick={() => handleShareText(referralMessage, "Referral message copied.")} type="button">
                  Copy Message
                </button>
              </div>
            </>
          ) : (
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
          )}
        </section>
      ) : null}

      <Link className="fixed bottom-24 right-4 z-40 inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-teal-700 px-5 text-base font-extrabold text-white shadow-2xl shadow-teal-700/30 sm:hidden" to="/students">
        <span>+</span>
        New Member
      </Link>

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
    </div>
  );
}



