import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FloatingToastStack from "../components/FloatingToastStack";
import { useAuth } from "../context/AuthContext";
import { useTimedAlerts } from "../hooks/useTimedAlerts";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

const toDateInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getTodayDateInput = () => toDateInputDate(new Date());

const createInitialMemberForm = () => ({
  name: "",
  phone: "",
  parentName: "",
  parentPhone: "",
  seatNumber: "",
  hallName: "",
  plan: "1 Month",
  feeAmount: "",
  shift: "FULL_DAY",
  joinedDate: getTodayDateInput(),
  paidTill: "",
  notes: ""
});

const initialMemberForm = createInitialMemberForm();

const initialLibraryForm = {
  libraryName: "",
  phone: "",
  address: "",
  seatCount: "",
  subscriptionAmount: "500",
  paymentScope: "NEW_LIBRARY",
  paymentMethod: "CASH",
  paymentReference: ""
};

const toneClasses = {
  green: "from-emerald-500 to-teal-600",
  blue: "from-blue-500 to-sky-600",
  purple: "from-violet-500 to-purple-600",
  orange: "from-amber-400 to-orange-500"
};

const getTenDigitPhone = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);
const isTenDigitPhone = (value) => /^\d{10}$/.test(String(value || ""));

const getPlanDays = (plan) => {
  const months = Number(String(plan || "").match(/\d+/)?.[0] || 0);
  return months > 0 ? months * 30 : 0;
};

const getPaidTillFromPlan = (startDate, plan) => {
  const days = getPlanDays(plan);
  const date = new Date(startDate);

  if (!days || Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days - 1);
  return toDateInputDate(date);
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token, user, setSession } = useAuth();
  const { error, success, setError, setSuccess } = useTimedAlerts();
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [libraryProfile, setLibraryProfile] = useState(null);
  const [ownerLibraries, setOwnerLibraries] = useState([]);
  const [activePromo, setActivePromo] = useState("");
  const [homeMode, setHomeMode] = useState(() => localStorage.getItem("brainbyte-home-mode") || "modern");
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [libraryForm, setLibraryForm] = useState(initialLibraryForm);
  const [creatingMember, setCreatingMember] = useState(false);
  const [creatingLibrary, setCreatingLibrary] = useState(false);

  const loadDashboard = async () => {
    setError("");

    try {
      const [analyticsData, studentsData, paymentData, profileData, librariesData] = await Promise.all([
        apiRequest("/analytics/summary", { token }),
        apiRequest("/students?sort=recent", { token }),
        apiRequest("/payments?sort=latest", { token }),
        apiRequest("/settings/profile", { token }),
        apiRequest("/auth/libraries", { token })
      ]);

      setAnalytics(analyticsData);
      setStudents(studentsData.slice(0, 3));
      setPayments(paymentData.slice(0, 3));
      setLibraryProfile(profileData.library);
      setOwnerLibraries(librariesData.libraries || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token]);

  const overviewCards = [
    { title: "Active Students", value: analytics?.activeStudents ?? 0, tone: "green" },
    { title: "Total Students", value: analytics?.totalStudents ?? 0, tone: "blue" },
    { title: "Pending Dues", value: analytics?.pendingStudents ?? 0, tone: "purple" },
    { title: "Monthly Earnings", value: formatCurrency(analytics?.monthlyRevenue), tone: "orange" }
  ];
  const classicManageItems = [
    ["Students", () => navigate("/students"), "S"],
    ["Seats", () => navigate("/seats"), "G"],
    ["Payments", () => navigate("/payments"), "P"],
    ["Shifts", () => navigate("/seats"), "L"],
    ["Analytics", () => navigate("/analytics"), "A"],
    ["Student ID", () => navigate("/students"), "ID"]
  ];
  const classicToolsItems = [
    ["Community", () => openInfoPopup("community"), "C"],
    ["QR Code", () => openInfoPopup("qr"), "QR"],
    ["Branding", () => openInfoPopup("branding"), "B"],
    ["Owner", () => openInfoPopup("owner"), "O"],
    ["Support", () => openInfoPopup("help"), "H"],
    ["Settings", () => navigate("/settings"), "ST"]
  ];
  const referralCode = `BB-${String(user?.id || user?.libraryId || "ADMIN").slice(-6).toUpperCase()}`;
  const libraryName = libraryProfile?.name || "Brainbyte Library";
  const libraryAddress = libraryProfile?.address || "Address not added";
  const libraryInitials = libraryName.slice(0, 2).toUpperCase();
  const normalizedPhone = String(libraryProfile?.phone || "").replace(/\D/g, "");
  const referralMessage = `Join ${libraryName} with my referral code ${referralCode}. Refer a new admission and earn INR 149 after successful registration.`;
  const communityMessage = `Hi, I want to join the ${libraryName} community for latest updates and library news.`;
  const communityLink = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(communityMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(communityMessage)}`;
  const referralWhatsAppLink = `https://wa.me/?text=${encodeURIComponent(referralMessage)}`;
  const popupMeta = {
    refer: ["REFERRAL", "Refer & Earn INR 149"],
    community: ["COMMUNITY", "Join Community"],
    owner: ["OWNER", "Owner Details"],
    qr: ["QR CODE", "Library QR Code"],
    branding: ["BRANDING", "Library Branding"],
    help: ["SUPPORT", "Need Help?"],
    rate: ["RATING", "Enjoying the App?"],
    member: ["NEW MEMBER", "Add Member"],
    library: ["NEW LIBRARY", "Add Library"]
  };
  const [popupEyebrow, popupTitle] = popupMeta[activePromo] || popupMeta.member;
  const managedLibraryCount = user?.managedLibraryIds?.length || 1;
  const paymentLibraryCount = libraryForm.paymentScope === "ALL_LIBRARIES" ? managedLibraryCount + 1 : 1;
  const newLibrarySeatCount = Number(libraryForm.seatCount || 0);
  const existingSeatCount = ownerLibraries.reduce((sum, library) => sum + Math.max(1, Number(library.seatCount || 0)), 0);
  const billedSeatCount = libraryForm.paymentScope === "ALL_LIBRARIES"
    ? existingSeatCount + newLibrarySeatCount
    : newLibrarySeatCount;
  const newLibraryPaymentTotal = Number(libraryForm.subscriptionAmount || 0) * billedSeatCount;

  const setDashboardMode = (mode) => {
    setHomeMode(mode);
    localStorage.setItem("brainbyte-home-mode", mode);
  };

  const handleShareText = async (message, successText) => {
    setSuccess("");

    try {
      if (navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
      }

      setSuccess(successText);
    } catch {
      setSuccess("Could not share automatically. You can copy the message manually.");
    }
  };

  const handleOpenCommunity = () => {
    window.open(communityLink, "_blank", "noopener,noreferrer");
    setSuccess("Opening WhatsApp community invite.");
  };

  const openInfoPopup = (type) => {
    setActivePromo(type);
    setSuccess("");
  };

  const handleMemberFormChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "phone" || name === "parentPhone" ? getTenDigitPhone(value) : value;
    setMemberForm((current) => {
      const nextForm = { ...current, [name]: nextValue };

      if ((name === "joinedDate" || name === "plan") && !current.paidTill) {
        nextForm.paidTill = getPaidTillFromPlan(nextForm.joinedDate, nextForm.plan);
      }

      return nextForm;
    });
  };

  const handleLibraryFormChange = (event) => {
    const { name, value } = event.target;
    setLibraryForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateLibrary = async (event) => {
    event.preventDefault();
    setCreatingLibrary(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/auth/libraries", {
        method: "POST",
        token,
        body: {
          ...libraryForm,
          seatCount: Number(libraryForm.seatCount),
          subscriptionAmount: Number(libraryForm.subscriptionAmount)
        }
      });

      setSession({ token: data.token, user: data.user });
      setLibraryForm(initialLibraryForm);
      setActivePromo("");
      setSuccess(`${data.library.name} added with ${data.library.seatCount} seats. ${formatCurrency(data.payment.totalAmount)} collected for ${data.payment.libraryCount} librar${data.payment.libraryCount === 1 ? "y" : "ies"}.`);
      navigate("/dashboard", { replace: true });
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreatingLibrary(false);
    }
  };

  const handleCreateMember = async (event) => {
    event.preventDefault();
    setCreatingMember(true);
    setError("");
    setSuccess("");

    if (!isTenDigitPhone(memberForm.phone)) {
      setError("Member phone number must be exactly 10 digits.");
      setCreatingMember(false);
      return;
    }

    if (memberForm.parentPhone && !isTenDigitPhone(memberForm.parentPhone)) {
      setError("Parent phone number must be exactly 10 digits.");
      setCreatingMember(false);
      return;
    }

    if (!memberForm.joinedDate) {
      setError("Joining date is required.");
      setCreatingMember(false);
      return;
    }

    const payload = {
      ...memberForm,
      membershipStartDate: memberForm.joinedDate,
      paidTill: memberForm.paidTill || getPaidTillFromPlan(memberForm.joinedDate, memberForm.plan) || undefined,
      feeAmount: memberForm.feeAmount === "" ? undefined : Number(memberForm.feeAmount),
      seatNumber: Number(memberForm.seatNumber)
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "" || payload[key] === undefined) {
        delete payload[key];
      }
    });

    try {
      const student = await apiRequest("/students", {
        method: "POST",
        token,
        body: payload
      });

      setMemberForm(createInitialMemberForm());
      setActivePromo("");
      setSuccess(`${student.name} added as a new member.`);
      loadDashboard();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreatingMember(false);
    }
  };

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden sm:gap-6">
      <FloatingToastStack error={error} success={success} />

      <section className="flex items-start justify-between gap-3 pt-1 sm:pt-8 lg:pt-12">
        <div className="min-w-0">
          <h1 className="m-0 text-[2rem] font-black leading-none text-slate-950 min-[380px]:text-[2.8rem] sm:text-7xl">Admin</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border-4 border-yellow-300 bg-yellow-50 text-xl font-extrabold text-yellow-600 shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 min-[380px]:h-14 min-[380px]:w-14 min-[380px]:text-2xl sm:h-20 sm:w-20 sm:text-3xl" onClick={() => setActivePromo("owner")} type="button" aria-label="Show owner details">
            {libraryProfile?.logoDataUrl ? (
              <img className="h-full w-full object-contain" src={libraryProfile.logoDataUrl} alt={`${libraryName} logo`} />
            ) : (
              (user?.name || "A").slice(0, 1).toUpperCase()
            )}
          </button>
        </div>
      </section>

      <section className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/30 min-[380px]:gap-4 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[1rem] border-4 border-yellow-300 bg-yellow-50 text-base font-black text-yellow-600 min-[380px]:h-16 min-[380px]:w-16 min-[380px]:rounded-3xl min-[380px]:text-xl">
          {libraryProfile?.logoDataUrl ? (
            <img className="h-full w-full object-contain" src={libraryProfile.logoDataUrl} alt={`${libraryName} logo`} />
          ) : (
            libraryInitials
          )}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">Current Library</p>
          <h2 className="m-0 mt-1 break-words text-lg font-black text-slate-950 min-[380px]:text-2xl sm:text-3xl">{libraryName}</h2>
          <p className="m-0 mt-1 break-words text-xs font-bold text-slate-500 min-[380px]:mt-2 min-[380px]:text-sm sm:text-base">{libraryAddress}</p>
        </div>
      </section>

      <section className="flex w-full rounded-[1.15rem] border border-slate-200 bg-white p-1 shadow-lg shadow-slate-300/30 min-[380px]:w-fit min-[380px]:rounded-[1.35rem]">
        <button
          className={homeMode === "classic" ? "min-h-11 flex-1 rounded-[0.9rem] bg-teal-700 px-4 text-sm font-extrabold text-white shadow-lg shadow-teal-700/20 min-[380px]:rounded-2xl min-[380px]:px-5" : "min-h-11 flex-1 rounded-[0.9rem] px-4 text-sm font-extrabold text-slate-600 min-[380px]:rounded-2xl min-[380px]:px-5"}
          onClick={() => setDashboardMode("classic")}
          type="button"
        >
          Classic
        </button>
        <button
          className={homeMode === "modern" ? "min-h-11 flex-1 rounded-[0.9rem] bg-teal-700 px-4 text-sm font-extrabold text-white shadow-lg shadow-teal-700/20 min-[380px]:rounded-2xl min-[380px]:px-5" : "min-h-11 flex-1 rounded-[0.9rem] px-4 text-sm font-extrabold text-slate-600 min-[380px]:rounded-2xl min-[380px]:px-5"}
          onClick={() => setDashboardMode("modern")}
          type="button"
        >
          Modern
        </button>
      </section>

      {activePromo ? <button className="fixed inset-0 z-40 cursor-default bg-slate-950/50" onClick={() => setActivePromo("")} type="button" aria-label="Close popup" /> : null}

      <section>
        <h3 className="mb-3 mt-0 text-xl font-extrabold min-[380px]:mb-4 min-[380px]:text-2xl">Overview</h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {overviewCards.map((card) => (
            <article className={`grid min-h-28 min-w-0 content-between overflow-hidden rounded-[1.2rem] bg-gradient-to-br p-3 text-white shadow-xl shadow-slate-300/40 min-[380px]:min-h-32 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:min-h-44 sm:rounded-[1.75rem] sm:p-6 ${toneClasses[card.tone]}`} key={card.title}>
              <div className="grid h-9 w-9 place-items-center rounded-[0.9rem] bg-white/20 text-sm font-black min-[380px]:h-11 min-[380px]:w-11 min-[380px]:rounded-2xl min-[380px]:text-base sm:h-14 sm:w-14 sm:text-lg">{card.title.slice(0, 1)}</div>
              <strong className="block min-w-0 break-words text-xl font-black leading-none min-[380px]:text-2xl sm:text-4xl">{card.value}</strong>
              <p className="m-0 min-w-0 break-words text-xs font-bold leading-tight min-[380px]:text-sm sm:text-base">{card.title}</p>
            </article>
          ))}
        </div>
      </section>

      <button className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.2rem] bg-gradient-to-br from-teal-600 to-sky-600 p-3.5 text-left text-white shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:gap-4 sm:rounded-[1.75rem] sm:p-5" onClick={() => navigate("/students?new=1")} type="button">

        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl font-black sm:h-14 sm:w-14" aria-hidden="true">+</div>
        <div className="min-w-0">
          <strong className="block break-words text-lg leading-tight min-[380px]:text-xl sm:text-2xl">New Member</strong>
          <p className="m-0 mt-1 break-words text-sm text-white/85 sm:text-base">Add admission details in a popup.</p>
        </div>
        <span className="ml-auto hidden shrink-0 text-3xl min-[380px]:block sm:text-4xl">&gt;</span>
      </button>

      <button className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.2rem] bg-gradient-to-br from-indigo-500 to-violet-600 p-3.5 text-left text-white shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:gap-4 sm:rounded-[1.75rem] sm:p-5" onClick={() => setActivePromo("refer")} type="button">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 font-black sm:h-14 sm:w-14" aria-hidden="true">R</div>
        <div className="min-w-0">
          <strong className="block break-words text-lg leading-tight min-[380px]:text-xl sm:text-2xl">Refer & Earn INR 149</strong>
          <p className="m-0 mt-1 break-words text-sm text-white/85 sm:text-base">Boost new admissions through word of mouth.</p>
        </div>
        <span className="ml-auto hidden shrink-0 text-3xl min-[380px]:block sm:text-4xl">&gt;</span>
      </button>

      <button className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.2rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-3.5 text-left text-white shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:gap-4 sm:rounded-[1.75rem] sm:p-5" onClick={() => setActivePromo("community")} type="button">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 font-black sm:h-14 sm:w-14" aria-hidden="true">C</div>
        <div className="min-w-0">
          <strong className="block break-words text-lg leading-tight min-[380px]:text-xl sm:text-2xl">Join Community</strong>
          <p className="m-0 mt-1 break-words text-sm text-white/85 sm:text-base">Get latest updates and library news.</p>
        </div>
        <span className="ml-auto hidden shrink-0 text-3xl min-[380px]:block sm:text-4xl">&gt;</span>
      </button>

      <button className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-3.5 text-left shadow-xl shadow-slate-300/40 transition hover:-translate-y-0.5 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:gap-4 sm:rounded-[1.75rem] sm:p-5" onClick={() => setActivePromo("library")} type="button">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 font-black text-teal-700 sm:h-14 sm:w-14" aria-hidden="true">L</div>
        <div className="min-w-0">
          <strong className="block break-words text-lg leading-tight text-slate-950 min-[380px]:text-xl sm:text-2xl">Add Library</strong>
          <p className="m-0 mt-1 break-words text-sm text-slate-500 sm:text-base">Create another library with seat-based payment.</p>
        </div>
        <span className="ml-auto hidden shrink-0 text-3xl text-slate-400 min-[380px]:block sm:text-4xl">&gt;</span>
      </button>

      {activePromo ? (
        <section className="fixed left-1/2 top-3 z-50 grid max-h-[88vh] w-[min(96vw,560px)] -translate-x-1/2 gap-3 overflow-auto rounded-[1.25rem] border border-slate-200 bg-white p-3.5 shadow-2xl shadow-slate-950/30 min-[380px]:top-4 min-[380px]:w-[min(94vw,560px)] min-[380px]:gap-4 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:top-6 sm:rounded-[1.75rem] sm:p-5">
          <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between min-[430px]:gap-4">
            <div className="min-w-0">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">{popupEyebrow}</p>
              <h3 className="m-0 break-words text-xl font-extrabold min-[380px]:text-2xl">{popupTitle}</h3>
            </div>
            <button className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 min-[430px]:text-base" onClick={() => setActivePromo("")} type="button">
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
                  <div className="mt-2 flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-yellow-300 bg-yellow-50 text-sm font-black text-yellow-600">
                      {libraryProfile?.logoDataUrl ? (
                        <img className="h-full w-full object-contain" src={libraryProfile.logoDataUrl} alt={`${libraryName} logo`} />
                      ) : (
                        libraryInitials
                      )}
                    </div>
                    <p className="m-0 min-w-0 break-words font-bold">{libraryProfile?.name || "-"}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Phone</span>
                  <p className="m-0 mt-1 break-words font-bold">{libraryProfile?.phone || "-"}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Seats</span>
                  <p className="m-0 mt-1 break-words font-bold">{libraryProfile?.seatCount || "-"}</p>
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
              <p className="m-0 text-sm font-bold text-slate-500">Use this QR to let visitors view only the vacant seats in your library.</p>
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
              <button className="mx-auto min-h-12 rounded-full bg-amber-700 px-6 font-extrabold text-white" onClick={() => setSuccess("Play Store link can be added after publishing.")} type="button">
                Rate App
              </button>
            </div>
          ) : activePromo === "library" ? (
            <form className="grid gap-4" onSubmit={handleCreateLibrary}>
              <div className="rounded-3xl border border-teal-100 bg-teal-50 p-4">
                <p className="m-0 text-sm font-bold text-teal-800">
                  This adds another library under the same admin login. Choose whether payment is only for the new library or for all libraries.
                </p>
              </div>
              <div className="grid gap-4 min-[520px]:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-name">Library Name</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-name" name="libraryName" value={libraryForm.libraryName} onChange={handleLibraryFormChange} required />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-phone">Library Phone</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-phone" name="phone" value={libraryForm.phone} onChange={handleLibraryFormChange} required />
                </div>
                <div className="grid gap-2 min-[520px]:col-span-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-address">Library Address</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-address" name="address" value={libraryForm.address} onChange={handleLibraryFormChange} />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-seats">Library Seats</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-seats" name="seatCount" type="number" min="1" value={libraryForm.seatCount} onChange={handleLibraryFormChange} required />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-amount">Amount Per Seat</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-amount" name="subscriptionAmount" type="number" min="1" value={libraryForm.subscriptionAmount} onChange={handleLibraryFormChange} required />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-scope">Payment For</label>
                  <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-scope" name="paymentScope" value={libraryForm.paymentScope} onChange={handleLibraryFormChange}>
                    <option value="NEW_LIBRARY">New library only</option>
                    <option value="ALL_LIBRARIES">All libraries</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-method">Payment Method</label>
                  <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-method" name="paymentMethod" value={libraryForm.paymentMethod} onChange={handleLibraryFormChange}>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                <div className="grid gap-2 min-[520px]:col-span-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-library-reference">Payment Reference</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-library-reference" name="paymentReference" placeholder="UPI ID, receipt number, or note" value={libraryForm.paymentReference} onChange={handleLibraryFormChange} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <span className="font-bold text-slate-600">{paymentLibraryCount} librar{paymentLibraryCount === 1 ? "y" : "ies"} | {billedSeatCount || 0} seats x {formatCurrency(libraryForm.subscriptionAmount || 0)}</span>
                <strong className="text-xl font-black text-teal-700">Total {formatCurrency(newLibraryPaymentTotal)}</strong>
              </div>
              <button className="min-h-12 rounded-full bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={creatingLibrary} type="submit">
                {creatingLibrary ? "Creating..." : "Add Library & Payment"}
              </button>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={handleCreateMember}>
              <div className="grid gap-4 min-[520px]:grid-cols-2">
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-name">Name</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-name" name="name" value={memberForm.name} onChange={handleMemberFormChange} required />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-phone">Phone</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-phone" name="phone" type="tel" inputMode="numeric" maxLength="10" pattern="\d{10}" title="Enter exactly 10 digits" value={memberForm.phone} onChange={handleMemberFormChange} required />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-seat">Seat Number</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-seat" name="seatNumber" type="number" min="1" value={memberForm.seatNumber} onChange={handleMemberFormChange} required />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-hall">Hall Name</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-hall" name="hallName" placeholder="Main Hall" value={memberForm.hallName} onChange={handleMemberFormChange} />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-joinedDate">Joining Date</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-joinedDate" name="joinedDate" type="date" value={memberForm.joinedDate} onChange={handleMemberFormChange} required />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-plan">Plan</label>
                  <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-plan" name="plan" value={memberForm.plan} onChange={handleMemberFormChange} required>
                    <option value="1 Month">1 Month</option>
                    <option value="2 Months">2 Months</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="12 Months">12 Months</option>
                    <option value="Trial">Trial</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-fee">Fee Amount</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-fee" name="feeAmount" type="number" min="0" value={memberForm.feeAmount} onChange={handleMemberFormChange} />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-shift">Shift</label>
                  <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-shift" name="shift" value={memberForm.shift} onChange={handleMemberFormChange}>
                    <option value="FULL_DAY">Full Day</option>
                    <option value="MORNING">Morning</option>
                    <option value="EVENING">Evening</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-paidTill">Paid Till</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-paidTill" name="paidTill" type="date" value={memberForm.paidTill} onChange={handleMemberFormChange} />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-parentName">Parent Name</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-parentName" name="parentName" value={memberForm.parentName} onChange={handleMemberFormChange} />
                </div>
                <div className="grid gap-2">
                  <label className="font-semibold text-slate-600" htmlFor="new-member-parentPhone">Parent Number</label>
                  <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-parentPhone" name="parentPhone" type="tel" inputMode="numeric" maxLength="10" pattern="\d{10}" title="Enter exactly 10 digits" value={memberForm.parentPhone} onChange={handleMemberFormChange} />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="new-member-notes">Notes</label>
                <textarea className="min-h-24 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="new-member-notes" name="notes" value={memberForm.notes} onChange={handleMemberFormChange} />
              </div>
              <button className="min-h-12 rounded-full bg-teal-700 px-5 font-extrabold text-white shadow-lg shadow-teal-700/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={creatingMember} type="submit">
                {creatingMember ? "Saving..." : "Add Member"}
              </button>
            </form>
          )}
        </section>
      ) : null}

      <button className="fixed bottom-24 right-3 z-40 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-700 px-4 text-sm font-extrabold text-white shadow-2xl shadow-teal-700/30 transition hover:-translate-y-0.5 min-[380px]:right-4 min-[380px]:min-h-14 min-[380px]:px-5 min-[380px]:text-base lg:bottom-6" onClick={() => navigate("/students?new=1")} type="button">

        <span>+</span>
        New Member
      </button>

      {homeMode === "classic" ? (
        <>
          <section className="grid gap-4 overflow-hidden rounded-[1.35rem] border border-blue-400/30 bg-gradient-to-br from-zinc-950 via-slate-900 to-blue-950 p-4 text-white shadow-2xl shadow-blue-950/30 min-[380px]:rounded-[1.6rem] min-[380px]:p-5 min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center sm:gap-5 sm:rounded-[2rem] sm:p-6">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-blue-400/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-100">Classic Suite</span>
              <h2 className="m-0 mt-4 text-2xl font-black leading-none min-[380px]:text-3xl sm:mt-5 sm:text-4xl">Owner Console</h2>
              <p className="m-0 mt-2 break-words text-sm font-bold text-blue-100/80 min-[380px]:mt-3 min-[380px]:text-base sm:text-lg">
                {analytics?.activeStudents ?? 0} active | {formatCurrency(analytics?.todayRevenue)} earned today
              </p>
            </div>
            <button className="grid h-16 w-16 place-items-center rounded-3xl bg-amber-300 text-3xl font-black text-zinc-950 shadow-xl shadow-amber-300/25" onClick={() => navigate("/analytics")} type="button">
              &gt;
            </button>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">Library Overview</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button className="flex min-h-24 items-center gap-3 rounded-[1.2rem] border border-emerald-400/25 bg-zinc-950 p-3.5 text-left text-white shadow-lg shadow-emerald-950/20 min-[380px]:min-h-28 min-[380px]:gap-4 min-[380px]:rounded-[1.5rem] min-[380px]:p-5" onClick={() => navigate("/students")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/15 font-black text-emerald-200">A</span>
                <span><strong className="block text-2xl font-black">{analytics?.activeStudents ?? 0}</strong><span className="font-extrabold text-slate-500">ACTIVE</span></span>
              </button>
              <button className="flex min-h-24 items-center gap-3 rounded-[1.2rem] border border-blue-400/25 bg-zinc-950 p-3.5 text-left text-white shadow-lg shadow-blue-950/20 min-[380px]:min-h-28 min-[380px]:gap-4 min-[380px]:rounded-[1.5rem] min-[380px]:p-5" onClick={() => navigate("/payments")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-400/15 font-black text-blue-200">T</span>
                <span><strong className="block text-2xl font-black">{formatCurrency(analytics?.todayRevenue)}</strong><span className="font-extrabold text-slate-500">TODAY</span></span>
              </button>
              <button className="flex min-h-24 items-center gap-3 rounded-[1.2rem] border border-fuchsia-400/25 bg-zinc-950 p-3.5 text-left text-white shadow-lg shadow-fuchsia-950/20 min-[380px]:min-h-28 min-[380px]:gap-4 min-[380px]:rounded-[1.5rem] min-[380px]:p-5" onClick={() => navigate("/analytics")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-fuchsia-400/15 font-black text-fuchsia-200">M</span>
                <span><strong className="block text-2xl font-black">{formatCurrency(analytics?.monthlyRevenue)}</strong><span className="font-extrabold text-slate-500">MONTHLY</span></span>
              </button>
              <button className="flex min-h-24 items-center gap-3 rounded-[1.2rem] border border-amber-300/30 bg-zinc-950 p-3.5 text-left text-white shadow-lg shadow-amber-950/20 min-[380px]:min-h-28 min-[380px]:gap-4 min-[380px]:rounded-[1.5rem] min-[380px]:p-5" onClick={() => navigate("/students")} type="button">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-300/15 font-black text-amber-200">S</span>
                <span><strong className="block text-2xl font-black">{analytics?.totalStudents ?? 0}</strong><span className="font-extrabold text-slate-500">TOTAL</span></span>
              </button>
            </div>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">Quick Actions</h3>
            <div className="grid gap-4 min-[680px]:grid-cols-3">
              <button className="grid min-h-28 content-between rounded-[1.25rem] border border-blue-400/20 bg-gradient-to-br from-zinc-950 to-blue-950 p-4 text-left text-white shadow-xl shadow-blue-950/25 min-[380px]:min-h-36 min-[380px]:rounded-[1.75rem] min-[380px]:p-5" onClick={() => setActivePromo("member")} type="button">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-400/15 font-black text-blue-100">+</span>
                <strong className="text-2xl font-black">Add Student</strong>
                <span className="font-bold text-white/85">New admission</span>
              </button>
              <button className="grid min-h-28 content-between rounded-[1.25rem] border border-amber-300/20 bg-gradient-to-br from-zinc-950 to-amber-950 p-4 text-left text-white shadow-xl shadow-amber-950/25 min-[380px]:min-h-36 min-[380px]:rounded-[1.75rem] min-[380px]:p-5" onClick={() => navigate("/expenses")} type="button">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/15 font-black text-amber-100">E</span>
                <strong className="text-2xl font-black">Log Expense</strong>
                <span className="font-bold text-white/85">Track costs</span>
              </button>
              <button className="grid min-h-28 content-between rounded-[1.25rem] border border-fuchsia-400/20 bg-gradient-to-br from-zinc-950 to-fuchsia-950 p-4 text-left text-white shadow-xl shadow-fuchsia-950/25 min-[380px]:min-h-36 min-[380px]:rounded-[1.75rem] min-[380px]:p-5" onClick={() => navigate("/analytics")} type="button">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fuchsia-400/15 font-black text-fuchsia-100">R</span>
                <strong className="text-2xl font-black">View Reports</strong>
                <span className="font-bold text-white/85">Deep insights</span>
              </button>
            </div>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">Recommended</h3>
            <button className="flex min-h-20 items-center gap-3 rounded-[1.25rem] border border-blue-400/25 bg-zinc-950 p-4 text-left text-white shadow-xl shadow-blue-950/25 min-[380px]:min-h-24 min-[380px]:gap-4 min-[380px]:rounded-[1.75rem] min-[380px]:p-5" onClick={() => openInfoPopup("refer")} type="button">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-400/15 font-black text-blue-100">R</span>
              <span className="min-w-0 flex-1"><strong className="block text-2xl font-black">Refer & Earn INR 149</strong><span className="font-bold text-blue-100/70">Get bonus on every successful referral</span></span>
              <span className="text-3xl">&gt;</span>
            </button>
            <button className="flex min-h-20 items-center gap-3 rounded-[1.25rem] border border-rose-400/25 bg-rose-950 p-4 text-left text-white shadow-lg shadow-rose-950/25 min-[380px]:min-h-24 min-[380px]:gap-4 min-[380px]:rounded-[1.75rem] min-[380px]:p-5" onClick={() => navigate("/payments")} type="button">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 font-black text-rose-100">!</span>
              <span className="min-w-0 flex-1"><strong className="block text-xl font-black">Pending Dues</strong><span className="font-bold text-rose-100/70">{formatCurrency(analytics?.totalDues)} from {analytics?.pendingStudents ?? 0} students</span></span>
              <span className="rounded-full bg-white px-5 py-3 font-extrabold text-rose-800">Collect</span>
            </button>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">Manage</h3>
            <div className="grid grid-cols-3 overflow-hidden rounded-[1.25rem] border border-zinc-800 bg-zinc-950 text-white shadow-xl shadow-zinc-950/25 min-[380px]:rounded-[1.75rem]">
              {classicManageItems.map(([label, onClick, icon]) => (
                <button key={label} className="grid min-h-24 place-items-center gap-1.5 border-b border-r border-zinc-800 p-2.5 text-xs font-black transition hover:bg-zinc-900 min-[380px]:min-h-36 min-[380px]:gap-2 min-[380px]:p-4 min-[380px]:text-base" onClick={onClick} type="button">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-400/15 text-blue-100 min-[380px]:h-14 min-[380px]:w-14 min-[380px]:rounded-2xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-4">
            <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">Tools & More</h3>
            <div className="grid grid-cols-3 overflow-hidden rounded-[1.25rem] border border-zinc-800 bg-zinc-950 text-white shadow-xl shadow-zinc-950/25 min-[380px]:rounded-[1.75rem]">
              {classicToolsItems.map(([label, onClick, icon]) => (
                <button key={label} className="grid min-h-24 place-items-center gap-1.5 border-b border-r border-zinc-800 p-2.5 text-xs font-black transition hover:bg-zinc-900 min-[380px]:min-h-32 min-[380px]:gap-2 min-[380px]:p-4 min-[380px]:text-base" onClick={onClick} type="button">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/15 text-amber-100 min-[380px]:h-14 min-[380px]:w-14 min-[380px]:rounded-2xl">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <button className="grid gap-2 rounded-[1.25rem] border border-amber-300/25 bg-amber-950 p-4 text-center text-white shadow-lg shadow-amber-950/25 min-[380px]:gap-3 min-[380px]:rounded-[1.75rem] min-[380px]:p-6" onClick={() => openInfoPopup("rate")} type="button">
            <strong className="text-2xl text-amber-200 min-[380px]:text-3xl">5 Stars</strong>
            <span className="text-lg font-black min-[380px]:text-xl">Enjoying the App?</span>
            <span className="font-bold text-amber-100/70">Your rating helps us grow.</span>
          </button>

          <p className="m-0 pb-10 text-center font-bold text-slate-500">Brainbyte Library Suite<br />Version 4.0.1</p>
        </>
      ) : (
      <>
      <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/40 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 grid gap-3 min-[380px]:flex min-[380px]:items-center min-[380px]:justify-between">
          <h3 className="m-0 min-w-0 text-xl font-extrabold min-[380px]:text-2xl">Recent Students</h3>
          <Link className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold" to="/students">View All</Link>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {students.map((student) => (
            <article className="flex gap-3 rounded-[1.2rem] border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-300/20 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:gap-4" key={student._id}>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[0.9rem] bg-sky-600 text-base font-extrabold text-white min-[380px]:h-14 min-[380px]:w-14 min-[380px]:rounded-2xl min-[380px]:text-lg sm:h-16 sm:w-16 sm:text-xl">{student.name.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block break-words leading-tight">{student.name}</strong>
                    <p className="m-0 text-sm text-slate-500">ID: {student.memberId}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 min-[380px]:px-3 min-[380px]:text-xs">{student.status}</span>
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

      <section className="rounded-[1.25rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/40 min-[380px]:rounded-[1.5rem] min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 grid gap-3 min-[380px]:flex min-[380px]:items-center min-[380px]:justify-between">
          <h3 className="m-0 min-w-0 text-xl font-extrabold min-[380px]:text-2xl">Latest Payments</h3>
          <Link className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold" to="/payments">History</Link>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {payments.map((payment) => (
            <article className="grid gap-3 rounded-[1.2rem] border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-300/20 min-[380px]:rounded-[1.5rem] min-[380px]:p-4" key={payment._id}>
              <div className="flex items-start justify-between gap-3">
                <strong className="min-w-0 break-words leading-tight">{payment.student?.name || "Deleted student"}</strong>
                <div className="shrink-0 rounded-2xl bg-teal-50 px-3 py-1.5 text-xs font-extrabold text-teal-700 min-[380px]:px-4 min-[380px]:py-2 min-[380px]:text-sm">{payment.method}</div>
              </div>
              <div className="break-words text-2xl font-black text-teal-700 min-[380px]:text-3xl sm:text-4xl">{formatCurrency(payment.amount)}</div>
              <div className="break-words rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 sm:text-base">
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
