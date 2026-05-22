import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FloatingToastStack from "../components/FloatingToastStack";
import { useAuth } from "../context/AuthContext";
import { useTimedAlerts } from "../hooks/useTimedAlerts";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";
import { isProductOwner } from "../lib/productOwner";
import { getTrialState } from "../lib/subscription";

const SYSTEM_MESSAGE_TEMPLATES = [
  {
    id: "welcome",
    title: "Welcome Message",
    status: "LIVE",
    summary: "Edit welcome and onboarding text.",
    body: "Hello {student_name}, welcome to {library_name}. Your admission is confirmed for seat {seat_number} in {hall_name}. Plan: {plan}. Access is active till {paid_till}. Thank you for joining us."
  },
  {
    id: "payment-confirmation",
    title: "Payment Confirmation",
    status: "PLANNED",
    summary: "Use after payment confirmation automation is added.",
    body: "Dear {student_name}, we received your payment of {amount}. Your access is active till {paid_till}. Thank you for choosing {library_name}."
  },
  {
    id: "fee-reminder",
    title: "Fee Reminder",
    status: "LIVE",
    summary: "Edit fee reminder and due follow-up text.",
    body: "Hello {student_name}, this is a reminder from {library_name}. Your seat {seat_number} in {hall_name} is linked to the {plan} plan. Your paid period is till {paid_till}. Please renew on time to avoid interruption."
  },
  {
    id: "inactive-alert",
    title: "Inactive Alert",
    status: "PLANNED",
    summary: "Prepared for future inactivity alerts.",
    body: "Hello {student_name}, our records show your activity is inactive. Please contact {library_name} if you want to resume your seat access."
  }
];

const APP_SUBSCRIPTION_PLANS = [
  {
    key: "12_MONTHS",
    label: "Yearly Plan",
    price: 1999,
    periodLabel: "/year",
    badge: "Best Value",
    note: "One payment for the full year with the strongest savings."
  },
  {
    key: "6_MONTHS",
    label: "Half Yearly Plan",
    price: 1199,
    periodLabel: "/6 months",
    badge: "",
    note: "A smart middle option for growing libraries."
  },
  {
    key: "1_MONTH",
    label: "Monthly Plan",
    price: 249,
    periodLabel: "/month",
    badge: "",
    note: "Flexible monthly access with all Pro features."
  }
];

const PRO_SUBSCRIPTION_FEATURES = [
  {
    icon: "users",
    title: "Add Unlimited Students",
    description: "No limit on student records or active seats."
  },
  {
    icon: "whatsapp",
    title: "Auto WhatsApp Reminders",
    description: "Send fee due reminders faster and more consistently."
  },
  {
    icon: "doc",
    title: "Send Fee Receipts",
    description: "Share payment proof directly with students and parents."
  },
  {
    icon: "shield",
    title: "100% Safe Data",
    description: "Your library records stay protected and organized."
  }
];

const SUBSCRIPTION_PLAN_THEMES = {
  "12_MONTHS": {
    activeCard: "border-yellow-300 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.2),_rgba(255,255,255,0.06)_36%,_rgba(15,23,42,0.92)_100%)] shadow-[0_24px_55px_rgba(250,204,21,0.16)]",
    inactiveCard: "border-yellow-200/15 bg-[linear-gradient(135deg,rgba(30,41,59,0.94),rgba(49,46,129,0.8))] shadow-[0_18px_45px_rgba(15,23,42,0.22)]",
    accentText: "text-yellow-200",
    noteText: "text-emerald-300",
    dot: "border-yellow-200/30 bg-yellow-300/14 text-yellow-100"
  },
  "6_MONTHS": {
    activeCard: "border-cyan-300 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_rgba(255,255,255,0.06)_34%,_rgba(17,24,39,0.92)_100%)] shadow-[0_24px_55px_rgba(34,211,238,0.16)]",
    inactiveCard: "border-cyan-200/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,41,59,0.82)_45%,rgba(14,116,144,0.48))] shadow-[0_18px_45px_rgba(8,47,73,0.28)]",
    accentText: "text-cyan-100",
    noteText: "text-cyan-200",
    dot: "border-cyan-200/30 bg-cyan-300/12 text-cyan-100"
  },
  "1_MONTH": {
    activeCard: "border-fuchsia-300 bg-[radial-gradient(circle_at_top_left,_rgba(232,121,249,0.2),_rgba(255,255,255,0.06)_34%,_rgba(17,24,39,0.92)_100%)] shadow-[0_24px_55px_rgba(232,121,249,0.16)]",
    inactiveCard: "border-fuchsia-200/15 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(51,65,85,0.82)_40%,rgba(91,33,182,0.42))] shadow-[0_18px_45px_rgba(49,46,129,0.28)]",
    accentText: "text-fuchsia-100",
    noteText: "text-fuchsia-100/90",
    dot: "border-fuchsia-200/30 bg-fuchsia-300/12 text-fuchsia-100"
  }
};

const PRO_FEATURE_THEMES = [
  "border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(15,23,42,0.72))] text-cyan-100",
  "border-emerald-300/20 bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(15,23,42,0.72))] text-emerald-100",
  "border-amber-300/20 bg-[linear-gradient(135deg,rgba(250,204,21,0.18),rgba(15,23,42,0.72))] text-amber-100",
  "border-fuchsia-300/20 bg-[linear-gradient(135deg,rgba(232,121,249,0.18),rgba(15,23,42,0.72))] text-fuchsia-100"
];

const DEFAULT_SHIFT_SETTINGS = [
  { id: "full_day", name: "Full Day", startTime: "08:00", endTime: "20:00", feeAmount: "" },
  { id: "morning", name: "Morning", startTime: "06:00", endTime: "12:00", feeAmount: "" },
  { id: "evening", name: "Evening", startTime: "16:00", endTime: "22:00", feeAmount: "" }
];

const SUPPORT_WHATSAPP_NUMBER = "917800686839";
const SUPPORT_WHATSAPP_LABEL = "+91 78006 86839";
const SUPPORT_EMAIL = "prashantsingh2557@gmail.com";
const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
const SUPPORT_EMAIL_URL = `mailto:${SUPPORT_EMAIL}`;
const OFFICIAL_WEBSITE_URL = "https://brainbyte.app";
const APP_VERSION_LABEL = "Version 1.0.0 (Basic)";
const APP_MADE_BY_LABEL = "made by Prashant singh";

const initialProfile = {
  id: "",
  name: "",
  email: "",
  phone: "",
  libraryName: "",
  seatCount: "",
  address: "",
  logoDataUrl: ""
};

const initialOwnerGrantForm = {
  email: "",
  grantMode: "plan",
  plan: "12_MONTHS",
  durationDays: "",
  renewsAt: "",
  note: "",
  ownerSecret: "",
  manualFee: "0"
};

const createQrImageUrl = (url, size = 420) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;

const getTemplatesStorageKey = (libraryId) => `brainbyte-message-templates-${libraryId || "default"}`;
const getShiftStorageKey = (libraryId) => `brainbyte-shift-settings-${libraryId || "default"}`;

const getLibraryInitials = (profile) => (profile.libraryName || profile.name || "BB").slice(0, 2).toUpperCase();

const getThemeLabel = (themeMode) => {
  if (themeMode === "SYSTEM") return "System";
  if (themeMode === "DARK") return "Dark";
  return "Light";
};

const getSubscriptionSummary = (subscriptionStatus, subscriptionPlan, renewsInDays, trialState) => {
  if (subscriptionPlan === "PRO" && subscriptionStatus === "ACTIVE") {
    return `Renews in ${renewsInDays ?? 0} days`;
  }

  if (trialState?.isKnown && trialState.isActive) {
    const remainingHours = Math.max(0, Math.ceil(trialState.remainingMs / (1000 * 60 * 60)));
    return `${remainingHours} trial hours left`;
  }

  if (trialState?.isKnown) {
    return "Trial ended. Upgrade to restore the dashboard.";
  }

  return `${subscriptionStatus} member`;
};

const compressLogoFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const size = 256;
      const scale = Math.min(size / image.width, size / image.height);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = size;
      canvas.height = size;
      context.clearRect(0, 0, size, size);
      context.drawImage(image, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/webp", 0.86));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read this image."));
    };

    image.src = objectUrl;
  });

const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    document.body.appendChild(script);
  });

function SettingsIcon({ name }) {
  const iconProps = {
    className: "h-6 w-6",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  const icons = {
    user: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20a6 6 0 0 1 12 0" />
      </svg>
    ),
    sparkle: (
      <svg {...iconProps}>
        <path d="M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3z" />
        <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
        <path d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13z" />
      </svg>
    ),
    card: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
    history: (
      <svg {...iconProps}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 3v6h6" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
    restore: (
      <svg {...iconProps}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 3v6h6" />
      </svg>
    ),
    theme: (
      <svg {...iconProps}>
        <path d="M12 3a9 9 0 1 0 9 9c0-.3 0-.6-.1-.9A7 7 0 0 1 12 3z" />
      </svg>
    ),
    branch: (
      <svg {...iconProps}>
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 10h1" />
        <path d="M9 14h1" />
        <path d="M14 10h1" />
        <path d="M14 14h1" />
      </svg>
    ),
    wand: (
      <svg {...iconProps}>
        <path d="m3 21 9-9" />
        <path d="M14.5 4.5 19 9" />
        <path d="m12 6 1-3 1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
      </svg>
    ),
    upload: (
      <svg {...iconProps}>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </svg>
    ),
    logout: (
      <svg {...iconProps}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    qr: (
      <svg {...iconProps}>
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M15 15h1" />
        <path d="M19 15h1" />
        <path d="M15 19h5" />
        <path d="M17 13v5" />
      </svg>
    ),
    globe: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a15 15 0 0 1 0 18" />
        <path d="M12 3a15 15 0 0 0 0 18" />
      </svg>
    ),
    whatsapp: (
      <svg {...iconProps}>
        <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.5L3 20l1.1-5.2A8.5 8.5 0 1 1 21 11.5z" />
        <path d="M9 8.8c.2-.5.4-.5.7-.5h.6c.2 0 .5 0 .7.5s.8 1.9.8 2.1c.1.2.1.4 0 .6-.1.2-.2.3-.4.5l-.5.5c-.2.1-.3.3-.1.6.2.3.8 1.3 1.8 2 .6.6 1.4 1 1.7 1.1.3.2.5.1.7-.1l.8-.9c.2-.2.4-.2.7-.1l1.7.8c.3.1.5.2.6.4.1.2.1 1-.2 1.9-.3.8-1.6 1.6-2.3 1.7-.6.1-1.4.2-4-1-3.2-1.5-5.2-5.1-5.4-5.4-.2-.3-1.3-1.7-1.3-3.2 0-1.5.8-2.2 1.1-2.5.3-.3.6-.4.8-.4" />
      </svg>
    ),
    doc: (
      <svg {...iconProps}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    ),
    clock: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    mail: (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
    star: (
      <svg {...iconProps}>
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z" />
      </svg>
    ),
    users: (
      <svg {...iconProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.3a3.5 3.5 0 0 1 0 6.7" />
      </svg>
    ),
    shield: (
      <svg {...iconProps}>
        <path d="M12 3l7 3v5c0 4.5-2.8 7.9-7 10-4.2-2.1-7-5.5-7-10V6l7-3z" />
        <path d="m9.5 12 1.8 1.8L15 10" />
      </svg>
    ),
    trash: (
      <svg {...iconProps}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 14h10l1-14" />
        <path d="M10 10v6" />
        <path d="M14 10v6" />
      </svg>
    ),
    chevron: (
      <svg {...iconProps}>
        <path d="m9 6 6 6-6 6" />
      </svg>
    ),
    close: (
      <svg {...iconProps}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    )
  };

  return icons[name] || icons.user;
}

function SectionLabel({ children }) {
  return <h2 className="m-0 px-1 text-xs font-black uppercase tracking-[0.22em] text-slate-700 min-[380px]:text-sm min-[380px]:tracking-[0.28em]">{children}</h2>;
}

function IconBadge({ icon, tone = "teal" }) {
  const tones = {
    teal: "bg-teal-50 text-teal-700",
    blue: "bg-sky-50 text-sky-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-500"
  };

  return (
    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] min-[380px]:h-14 min-[380px]:w-14 min-[380px]:rounded-[1.15rem] sm:h-16 sm:w-16 sm:rounded-[1.35rem] ${tones[tone] || tones.teal}`}>
      <SettingsIcon name={icon} />
    </span>
  );
}

function SettingsGroup({ children }) {
  return <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-xl shadow-slate-300/15 min-[380px]:rounded-[1.6rem] sm:rounded-[2rem]">{children}</div>;
}

function SettingsRow({
  icon,
  tone,
  title,
  description,
  href,
  target,
  rel,
  onClick,
  danger = false,
  value,
  isLast = false,
  hideChevron = false
}) {
  const sharedClassName = `flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition hover:bg-slate-50 min-[380px]:gap-4 min-[380px]:px-4 min-[380px]:py-4 sm:px-5 sm:py-5 dark:hover:bg-slate-800 ${isLast ? "" : "border-b border-slate-100"}`;
  const content = (
    <>
      <IconBadge icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <strong className={`block break-words text-[0.95rem] font-extrabold leading-tight min-[380px]:text-base sm:text-[1.05rem] ${danger ? "text-red-500" : "text-slate-950"}`}>{title}</strong>
        {description ? <p className="m-0 mt-1 break-words text-xs text-slate-500 min-[380px]:text-sm">{description}</p> : null}
      </div>
      <div className="shrink-0 text-slate-300">
        {value ? <span className="mr-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400 min-[380px]:mr-2 min-[380px]:text-xs min-[380px]:tracking-[0.14em]">{value}</span> : null}
        {hideChevron ? null : <SettingsIcon name="chevron" />}
      </div>
    </>
  );

  if (href) {
    return (
      <a className={sharedClassName} href={href} onClick={onClick} rel={rel} target={target}>
        {content}
      </a>
    );
  }

  return (
    <button
      className={sharedClassName}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
}

function ModalFrame({ title, subtitle, onClose, children, panelClassName = "", overlayClassName = "", hideHeader = false }) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60]">
      <button className={`app-modal-overlay absolute inset-0 bg-slate-950/50 ${overlayClassName}`.trim()} onClick={onClose} type="button" aria-label="Close settings popup" />
      <div className="relative z-10 flex min-h-full items-stretch justify-center sm:items-start sm:p-5">
        <section className={`app-modal-panel relative grid h-[100dvh] w-full grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden bg-white p-4 shadow-2xl shadow-slate-950/30 min-[380px]:gap-4 min-[380px]:p-4 sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[760px] sm:rounded-[2rem] sm:border sm:border-slate-200 sm:p-5 ${panelClassName}`.trim()}>
          {hideHeader ? null : (
            <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between min-[430px]:gap-4">
              <div className="min-w-0">
                <h3 className="m-0 break-words text-xl font-extrabold text-slate-950 min-[380px]:text-2xl">{title}</h3>
                {subtitle ? <p className="m-0 mt-1 break-words text-sm text-slate-500">{subtitle}</p> : null}
              </div>
              <button className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 min-[430px]:text-base" onClick={onClose} type="button">
                Close
              </button>
            </div>
          )}
          <div className="grid min-h-0 gap-3 overflow-y-auto overscroll-contain pr-1">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { token, patchUser, user, logout, setSession } = useAuth();
  const { error, success, setError, setSuccess } = useTimedAlerts();
  const [profile, setProfile] = useState(initialProfile);
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [themeMode, setThemeMode] = useState(user?.themeMode || "SYSTEM");
  const [submitting, setSubmitting] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [switchingLibrary, setSwitchingLibrary] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState("");
  const [selectedPlanKey, setSelectedPlanKey] = useState("12_MONTHS");
  const [activeModal, setActiveModal] = useState("");
  const [expandedTemplateId, setExpandedTemplateId] = useState("welcome");
  const [copiedItem, setCopiedItem] = useState("");
  const [qrRefreshKey, setQrRefreshKey] = useState(0);
  const [messageTemplates, setMessageTemplates] = useState(SYSTEM_MESSAGE_TEMPLATES);
  const [shiftSettings, setShiftSettings] = useState(DEFAULT_SHIFT_SETTINGS);
  const [ownerGrantForm, setOwnerGrantForm] = useState(initialOwnerGrantForm);
  const [grantingComplimentary, setGrantingComplimentary] = useState(false);
  const [showOwnerGrantSecret, setShowOwnerGrantSecret] = useState(false);

  const subscriptionStatus = subscription?.status || user?.subscriptionStatus || "ACTIVE";
  const subscriptionPlan = subscription?.plan || user?.subscriptionPlan || "PRO";
  const renewsAt = subscription?.renewsAt || user?.subscriptionRenewsAt;
  const isProActive = subscriptionPlan === "PRO" && subscriptionStatus === "ACTIVE";
  const showProductOwnerTools = isProductOwner(user);
  const libraryId = user?.libraryId || profile.id;
  const trialState = getTrialState(subscription?.trialEndsAt ? subscription : user);
  const accessEndsAt = isProActive ? renewsAt : trialState.endsAt;
  const qrPublicUrl =
    typeof window !== "undefined" && libraryId
      ? `${window.location.origin}/public/qr/seats/${libraryId}`
      : "";
  const qrImageUrl = qrPublicUrl ? `${createQrImageUrl(qrPublicUrl, 420)}&t=${qrRefreshKey}` : "";
  const qrPrintUrl = qrPublicUrl ? `${createQrImageUrl(qrPublicUrl, 1200)}&t=${qrRefreshKey}` : "";
  const selectedPlan = APP_SUBSCRIPTION_PLANS.find((plan) => plan.key === selectedPlanKey) || APP_SUBSCRIPTION_PLANS[0];

  const syncSubscriptionIntoAuth = (subscriptionData) => {
    if (!subscriptionData) return;

    patchUser((currentUser) => ({
      ...currentUser,
      subscriptionPlan: subscriptionData.plan,
      subscriptionStatus: subscriptionData.status,
      subscriptionRenewsAt: subscriptionData.renewsAt
    }));
  };

  const loadSettings = async () => {
    setError("");

    const [profileResult, subscriptionResult, historyResult, librariesResult] = await Promise.allSettled([
      apiRequest("/settings/profile", { token }),
      apiRequest("/settings/subscription", { token }),
      apiRequest("/settings/billing-history", { token }),
      apiRequest("/auth/libraries", { token })
    ]);

    if (profileResult.status === "fulfilled") {
      const profileData = profileResult.value;

      setProfile({
        id: profileData.library.id || "",
        name: profileData.user.name || "",
        email: profileData.user.email || "",
        phone: profileData.library.phone || "",
        libraryName: profileData.library.name || "",
        seatCount: profileData.library.seatCount || "",
        address: profileData.library.address || "",
        logoDataUrl: profileData.library.logoDataUrl || ""
      });
      setThemeMode(profileData.user.themeMode || "SYSTEM");
    }

    if (subscriptionResult.status === "fulfilled") {
      setSubscription(subscriptionResult.value);
    }

    if (historyResult.status === "fulfilled") {
      setBillingHistory(historyResult.value.slice(0, 20));
    } else {
      setBillingHistory([]);
    }

    if (librariesResult.status === "fulfilled") {
      setLibraries(librariesResult.value.libraries || []);
    } else {
      setLibraries([]);
    }

    if (profileResult.status === "fulfilled" || subscriptionResult.status === "fulfilled") {
      patchUser((currentUser) => ({
        ...currentUser,
        ...(profileResult.status === "fulfilled" ? profileResult.value.user : {}),
        ...(subscriptionResult.status === "fulfilled"
          ? {
              subscriptionPlan: subscriptionResult.value.plan,
              subscriptionStatus: subscriptionResult.value.status,
              subscriptionRenewsAt: subscriptionResult.value.renewsAt
            }
          : {})
      }));
    }

    if (profileResult.status === "rejected" && subscriptionResult.status === "rejected") {
      setError(getErrorMessage(subscriptionResult.reason || profileResult.reason));
      return;
    }

    if (subscriptionResult.status === "rejected") {
      setError("Subscription details could not be refreshed right now, but the rest of settings is available.");
      return;
    }

    if (profileResult.status === "rejected") {
      setError("Profile details could not be refreshed right now, but subscription controls are still available.");
    }
  };

  useEffect(() => {
    loadSettings();
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedTemplates = window.localStorage.getItem(getTemplatesStorageKey(libraryId));
      setMessageTemplates(storedTemplates ? JSON.parse(storedTemplates) : SYSTEM_MESSAGE_TEMPLATES);
    } catch {
      setMessageTemplates(SYSTEM_MESSAGE_TEMPLATES);
    }

    try {
      const storedShifts = window.localStorage.getItem(getShiftStorageKey(libraryId));
      setShiftSettings(storedShifts ? JSON.parse(storedShifts) : DEFAULT_SHIFT_SETTINGS);
    } catch {
      setShiftSettings(DEFAULT_SHIFT_SETTINGS);
    }
  }, [libraryId]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const applyProfileResponse = (data) => {
    setProfile({
      id: data.library.id || "",
      name: data.user.name || "",
      email: data.user.email || "",
      phone: data.library.phone || "",
      libraryName: data.library.name || "",
      seatCount: data.library.seatCount || "",
      address: data.library.address || "",
      logoDataUrl: data.library.logoDataUrl || ""
    });
    patchUser((currentUser) => ({
      ...currentUser,
      ...data.user
    }));
  };

  const saveProfile = async (nextProfile, successMessage) => {
    const data = await apiRequest("/settings/profile", {
      method: "PATCH",
      token,
      body: nextProfile
    });

    applyProfileResponse(data);
    setSuccess(successMessage);
    setError("");
  };

  const rememberCopiedItem = (key) => {
    setCopiedItem(key);
    window.setTimeout(() => {
      setCopiedItem((current) => (current === key ? "" : current));
    }, 1800);
  };

  const handleCopyText = async (value, key, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      rememberCopiedItem(key);
      setSuccess(successMessage);
      setError("");
    } catch {
      setError("Could not copy right now. Please try again.");
    }
  };

  const handleTemplateBodyChange = (templateId, value) => {
    setMessageTemplates((current) =>
      current.map((template) =>
        template.id === templateId
          ? { ...template, body: value }
          : template
      )
    );
  };

  const handleSaveTemplate = (templateId) => {
    const nextTemplates = [...messageTemplates];

    if (typeof window !== "undefined") {
      window.localStorage.setItem(getTemplatesStorageKey(libraryId), JSON.stringify(nextTemplates));
    }

    const template = nextTemplates.find((item) => item.id === templateId);
    setSuccess(`${template?.title || "Template"} updated successfully.`);
    setError("");
  };

  const handleShiftChange = (shiftId, field, value) => {
    setShiftSettings((current) =>
      current.map((shift) =>
        shift.id === shiftId
          ? { ...shift, [field]: value }
          : shift
      )
    );
  };

  const handleAddShift = () => {
    setShiftSettings((current) => ([
      ...current,
      {
        id: `custom_${Date.now()}`,
        name: "",
        startTime: "",
        endTime: "",
        feeAmount: ""
      }
    ]));
  };

  const handleRemoveShift = (shiftId) => {
    setShiftSettings((current) => current.filter((shift) => shift.id !== shiftId));
  };

  const handleSaveShiftSettings = () => {
    const cleanedShifts = shiftSettings
      .map((shift) => ({
        ...shift,
        name: String(shift.name || "").trim(),
        startTime: String(shift.startTime || "").trim(),
        endTime: String(shift.endTime || "").trim(),
        feeAmount: String(shift.feeAmount || "").trim()
      }))
      .filter((shift) => shift.name && shift.startTime && shift.endTime);

    setShiftSettings(cleanedShifts.length > 0 ? cleanedShifts : DEFAULT_SHIFT_SETTINGS);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        getShiftStorageKey(libraryId),
        JSON.stringify(cleanedShifts.length > 0 ? cleanedShifts : DEFAULT_SHIFT_SETTINGS)
      );
    }

    setSuccess("Shift timings updated successfully.");
    setError("");
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setSuccess("");
    setSavingLogo(true);

    try {
      const logoDataUrl = await compressLogoFile(file);
      const nextProfile = { ...profile, logoDataUrl };
      setProfile(nextProfile);
      await saveProfile(nextProfile, "Library logo updated successfully.");
    } catch (logoError) {
      setError(getErrorMessage(logoError));
    } finally {
      setSavingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    setError("");
    setSuccess("");
    setSavingLogo(true);

    const nextProfile = { ...profile, logoDataUrl: "" };
    setProfile(nextProfile);

    try {
      await saveProfile(nextProfile, "Library logo removed.");
    } catch (removeError) {
      setError(getErrorMessage(removeError));
    } finally {
      setSavingLogo(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await saveProfile(profile, "Profile updated successfully.");
      setActiveModal("");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleThemeSubmit = async (mode) => {
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/settings/appearance", {
        method: "PATCH",
        token,
        body: { themeMode: mode }
      });
      setThemeMode(data.themeMode);
      patchUser((currentUser) => ({
        ...currentUser,
        themeMode: data.themeMode
      }));
      setSuccess("Appearance updated successfully.");
      setActiveModal("");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  const handleOwnerGrantChange = (event) => {
    const { name, value } = event.target;
    setOwnerGrantForm((current) => ({ ...current, [name]: value }));
  };

  const handleOpenOwnerGrant = () => {
    setOwnerGrantForm(initialOwnerGrantForm);
    setShowOwnerGrantSecret(false);
    setActiveModal("owner-grant");
    setError("");
    setSuccess("");
  };

  const handleOwnerGrantSubmit = async (event) => {
    event.preventDefault();

    const targetEmail = String(ownerGrantForm.email || "").trim().toLowerCase();
    const ownerSecret = String(ownerGrantForm.ownerSecret || "").trim();
    const note = String(ownerGrantForm.note || "").trim();

    if (!targetEmail) {
      setError("Customer email is required.");
      return;
    }

    if (!ownerSecret) {
      setError("Owner secret is required.");
      return;
    }

    setGrantingComplimentary(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        email: targetEmail,
        note,
        manualFee: Number(ownerGrantForm.manualFee || 0),
        startsFromCurrentExpiry: true
      };

      if (ownerGrantForm.grantMode === "days") {
        payload.durationDays = Number(ownerGrantForm.durationDays || 0);
      } else if (ownerGrantForm.grantMode === "date") {
        if (!ownerGrantForm.renewsAt) {
          throw new Error("Exact expiry date is required.");
        }

        const parsedRenewsAt = new Date(ownerGrantForm.renewsAt);
        if (Number.isNaN(parsedRenewsAt.getTime())) {
          throw new Error("Enter a valid expiry date.");
        }

        payload.renewsAt = parsedRenewsAt.toISOString();
      } else {
        payload.plan = ownerGrantForm.plan;
      }

      const data = await apiRequest("/settings/subscription/grant", {
        method: "POST",
        token,
        headers: {
          "x-product-owner-secret": ownerSecret
        },
        body: payload
      });

      if (String(user?.email || "").trim().toLowerCase() === targetEmail) {
        setSubscription(data.subscription);
        syncSubscriptionIntoAuth(data.subscription);
      }

      setSuccess(`Complimentary Pro granted to ${data.targetUser?.email || targetEmail}.`);
      setActiveModal("");
      setOwnerGrantForm(initialOwnerGrantForm);
    } catch (grantError) {
      setError(getErrorMessage(grantError));
    } finally {
      setGrantingComplimentary(false);
    }
  };

  const handleSubscriptionAction = async (action) => {
    setSubscriptionAction(action);
    setError("");
    setSuccess("");

    try {
      if (action === "RENEW") {
        await loadRazorpayCheckout();

        const order = await apiRequest("/settings/subscription/order", {
          method: "POST",
          token,
          body: { plan: selectedPlanKey }
        });

        if (!window.Razorpay || !order?.keyId || !order?.orderId) {
          throw new Error("Payment checkout is not configured right now. Please try again shortly or contact support.");
        }

        const paymentResult = await new Promise((resolve, reject) => {
          const checkout = new window.Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: order.name,
            description: order.description,
            order_id: order.orderId,
            prefill: {
              name: profile.name || user?.name || "",
              email: profile.email || user?.email || "",
              contact: profile.phone || ""
            },
            notes: {
              libraryName: profile.libraryName || ""
            },
            theme: {
              color: "#0f766e"
            },
            handler: resolve,
            modal: {
              ondismiss: () => reject(new Error("Payment checkout was closed before completion."))
            }
          });

          checkout.on("payment.failed", (response) => {
            reject(new Error(response.error?.description || "Payment failed"));
          });

          checkout.open();
        });

        const data = await apiRequest("/settings/subscription/verify", {
          method: "POST",
          token,
          body: paymentResult
        });

        setSubscription(data);
        syncSubscriptionIntoAuth(data);

        setSuccess(`Payment successful. Pro membership renewed on the ${selectedPlan.label} plan.`);
        await loadSettings();
        return;
      }

      const data = await apiRequest("/settings/subscription", {
        method: "PATCH",
        token,
        body: { action }
      });

      setSubscription(data);
      syncSubscriptionIntoAuth(data);

      setSuccess(
        action === "RESTORE"
          ? "Paid purchase synced successfully."
          : "Subscription updated successfully."
      );
      await loadSettings();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubscriptionAction("");
    }
  };

  const handleLibrarySwitch = async (event) => {
    const nextLibraryId = event.target.value;

    if (!nextLibraryId || nextLibraryId === user?.libraryId) {
      return;
    }

    setSwitchingLibrary(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/auth/libraries/switch", {
        method: "POST",
        token,
        body: { libraryId: nextLibraryId }
      });

      setSession({ token: data.token, user: data.user });
      setSuccess(`${data.library.name} is now active.`);
      setActiveModal("");
      navigate("/settings", { replace: true });
    } catch (switchError) {
      setError(getErrorMessage(switchError));
    } finally {
      setSwitchingLibrary(false);
    }
  };

  const handleShareQr = async () => {
    if (!qrPublicUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile.libraryName || "Library"} QR Access`,
          text: `Check live seat availability for ${profile.libraryName || "our library"}.`,
          url: qrPublicUrl
        });
        setSuccess("QR access link shared successfully.");
        setError("");
        return;
      }

      await handleCopyText(qrPublicUrl, "qr-link", "QR access link copied.");
    } catch {
      setError("Could not share the QR access link.");
    }
  };

  const handlePlaceholderOpen = (modalKey) => {
    setActiveModal(modalKey);
    setError("");
  };

  const handlePlaceholderAction = (message) => {
    setSuccess(message);
    setError("");
    setActiveModal("");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const summarySubtitle = getSubscriptionSummary(
    subscriptionStatus,
    subscriptionPlan,
    subscription?.renewsInDays,
    trialState
  );

  return (
    <div className="grid gap-4 pb-6 sm:gap-6">
      <FloatingToastStack error={error} success={success} />

      <section className="pt-1 sm:pt-2">
        <h1 className="m-0 text-[2rem] font-black leading-[0.95] text-slate-950 min-[380px]:text-[2.8rem] sm:text-5xl">Settings</h1>
        <p className="m-0 mt-2 text-sm font-semibold text-slate-500 sm:mt-3 sm:text-base">Manage your account and preferences</p>
      </section>

      <button
        className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-white px-3.5 py-4 text-left shadow-xl shadow-slate-300/15 transition hover:-translate-y-0.5 hover:bg-slate-50 min-[380px]:gap-4 min-[380px]:rounded-[1.6rem] min-[380px]:px-4 min-[380px]:py-5 sm:rounded-[2rem] sm:px-5 sm:py-6 dark:hover:bg-slate-800"
        onClick={() => setActiveModal("profile")}
        type="button"
      >
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[1rem] border-2 border-yellow-300 bg-white text-lg font-black text-yellow-600 min-[380px]:h-16 min-[380px]:w-16 min-[380px]:rounded-[1.2rem] min-[380px]:text-xl sm:h-20 sm:w-20 sm:rounded-[1.65rem] sm:text-2xl">
          {profile.logoDataUrl ? (
            <img className="h-full w-full object-contain" src={profile.logoDataUrl} alt={`${profile.libraryName || "Library"} logo`} />
          ) : (
            getLibraryInitials(profile)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block break-words text-[1.15rem] font-black leading-tight text-slate-950 min-[380px]:text-[1.4rem] sm:text-[2rem] sm:leading-none">{profile.name || "Admin"}</strong>
          <p className="m-0 mt-1 break-all text-xs font-semibold text-slate-600 min-[380px]:mt-2 min-[380px]:text-sm sm:text-base">{profile.email || "No email"}</p>
          <span className={isProActive ? "mt-2 inline-flex rounded-full bg-yellow-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-yellow-600 min-[380px]:mt-3 min-[380px]:px-3 min-[380px]:py-2 min-[380px]:text-xs min-[380px]:tracking-[0.16em]" : "mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-600 min-[380px]:mt-3 min-[380px]:px-3 min-[380px]:py-2 min-[380px]:text-xs min-[380px]:tracking-[0.16em]"}>
            {isProActive ? "Pro Member" : trialState.isKnown && trialState.isActive ? "Trial Active" : `${subscriptionStatus} Member`}
          </span>
        </div>
        <span className="shrink-0 text-slate-300">
          <SettingsIcon name="chevron" />
        </span>
      </button>

      <div className="grid gap-4">
        <SectionLabel>Subscription</SectionLabel>

        <button
          className="relative overflow-hidden rounded-[1.35rem] bg-[linear-gradient(135deg,#0f172a_0%,#172554_42%,#0f766e_100%)] px-3.5 py-4 text-left text-white shadow-[0_24px_55px_rgba(8,47,73,0.28)] transition hover:-translate-y-0.5 min-[380px]:rounded-[1.6rem] min-[380px]:px-4 min-[380px]:py-5 sm:rounded-[2rem] sm:px-5 sm:py-6"
          onClick={() => setActiveModal("subscription")}
          type="button"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.26),transparent_38%)]" />
          <div className="absolute -right-10 top-0 h-24 w-24 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative flex items-center gap-3 min-[380px]:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] border border-white/15 bg-white/12 backdrop-blur min-[380px]:h-14 min-[380px]:w-14 min-[380px]:rounded-[1.15rem] sm:h-16 sm:w-16 sm:rounded-[1.35rem]">
              <SettingsIcon name="sparkle" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="inline-flex rounded-full border border-yellow-300/25 bg-yellow-300/14 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-yellow-200 min-[380px]:text-[11px]">
                Premium Access
              </span>
              <strong className="mt-2 block break-words text-[1.2rem] font-black leading-tight min-[380px]:text-[1.45rem] sm:text-[1.95rem] sm:leading-none">You are {subscriptionPlan}</strong>
              <p className="m-0 mt-1 break-words text-sm font-semibold text-white/90 min-[380px]:mt-2 min-[380px]:text-base sm:text-lg">{summarySubtitle}</p>
            </div>
            <span className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/15 px-3 text-[10px] font-extrabold uppercase tracking-[0.14em] backdrop-blur min-[380px]:min-h-12 min-[380px]:px-4 min-[380px]:text-xs sm:px-5 sm:text-sm">
              View Pro
            </span>
          </div>
        </button>

        <SettingsGroup>
          <SettingsRow
            icon="card"
            tone="teal"
            title="Manage Subscription"
            description="View your plan or billing history"
            onClick={() => setActiveModal("subscription")}
          />
          <SettingsRow
            icon="history"
            tone="blue"
            title="Billing History"
            description="View transaction statements"
            onClick={() => setActiveModal("billing")}
          />
          <SettingsRow
            icon="restore"
            tone="blue"
            title="Restore Purchases"
            description="Recover your premium status"
            onClick={() => handleSubscriptionAction("RESTORE")}
            isLast
          />
        </SettingsGroup>
      </div>

      {showProductOwnerTools ? (
        <div className="grid gap-4">
          <SectionLabel>Product Owner</SectionLabel>
          <SettingsGroup>
            <SettingsRow
              icon="shield"
              tone="amber"
              title="Grant Complimentary Pro"
              description="Owner-only tool to unlock Pro without checkout"
              onClick={handleOpenOwnerGrant}
              isLast
            />
          </SettingsGroup>
        </div>
      ) : null}

      <div className="grid gap-4">
        <SectionLabel>Appearance</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="theme"
            tone="teal"
            title="Theme Mode"
            description={`Currently: ${getThemeLabel(themeMode)}`}
            onClick={() => setActiveModal("theme")}
            isLast
          />
        </SettingsGroup>
      </div>

      <div className="grid gap-4">
        <SectionLabel>Account</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="user"
            tone="teal"
            title="Edit Profile"
            description="Name, email, and contact details"
            onClick={() => setActiveModal("profile")}
          />
          <SettingsRow
            icon="branch"
            tone="amber"
            title="Branch Switcher"
            description="Manage multiple libraries"
            onClick={() => setActiveModal("branch")}
          />
          <SettingsRow
            icon="wand"
            tone="purple"
            title="Library Branding"
            description="Upload logo for invoices and receipts"
            onClick={() => setActiveModal("branding")}
          />
          <SettingsRow
            icon="upload"
            tone="teal"
            title="Bulk Student Import"
            description="Import multiple students via CSV"
            onClick={() => handlePlaceholderOpen("import")}
          />
          <SettingsRow
            icon="logout"
            tone="red"
            title="Sign Out"
            description="Log out from this device"
            onClick={() => setActiveModal("logout")}
            danger
            isLast
          />
        </SettingsGroup>
      </div>

      <div className="grid gap-4">
        <SectionLabel>Digital Access</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="qr"
            tone="teal"
            title="Library QR Code"
            description="Real-time seat availability for students"
            onClick={() => setActiveModal("qr")}
            isLast
          />
        </SettingsGroup>
      </div>

      <div className="grid gap-4">
        <SectionLabel>Resources</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="globe"
            tone="teal"
            title="Official Website"
            description="brainbyte.app"
            href={OFFICIAL_WEBSITE_URL}
            rel="noreferrer"
            target="_blank"
            isLast
          />
        </SettingsGroup>
      </div>

      <div className="grid gap-4">
        <SectionLabel>Automation</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="whatsapp"
            tone="green"
            title="WhatsApp Notifications"
            description="Manage alerts and connection"
            onClick={() => handlePlaceholderOpen("whatsapp")}
          />
          <SettingsRow
            icon="doc"
            tone="teal"
            title="Message Templates"
            description="Edit welcome and reminder texts"
            onClick={() => setActiveModal("templates")}
          />
          <SettingsRow
            icon="clock"
            tone="purple"
            title="Shift Management"
            description="Configure timings and slot fees"
            onClick={() => handlePlaceholderOpen("shift")}
            isLast
          />
        </SettingsGroup>
      </div>

      <div className="grid gap-4">
        <SectionLabel>Support & Feedback</SectionLabel>
        <SettingsGroup>
          <SettingsRow
            icon="whatsapp"
            tone="green"
            title="Contact on WhatsApp"
            description={SUPPORT_WHATSAPP_LABEL}
            href={SUPPORT_WHATSAPP_URL}
            rel="noreferrer"
            target="_blank"
          />
          <SettingsRow
            icon="mail"
            tone="blue"
            title="Email Support"
            description={SUPPORT_EMAIL}
            href={SUPPORT_EMAIL_URL}
          />
          <SettingsRow
            icon="star"
            tone="amber"
            title="Rate App"
            description="Show some love on the store"
            onClick={() => handlePlaceholderAction("Store rating link is not configured yet.")}
            isLast
          />
        </SettingsGroup>
      </div>

      <div className="grid gap-4">
        <SectionLabel>Data & Security</SectionLabel>
        <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/15 min-[380px]:rounded-[1.6rem] min-[380px]:p-4 sm:rounded-[2rem] sm:p-5">
          <p className="m-0 text-sm font-semibold leading-7 text-slate-700 min-[380px]:text-base min-[380px]:leading-8 sm:text-lg sm:leading-9">
            Deleting your account will permanently remove all your library data, student records, and subscription history. This action cannot be undone.
          </p>
          <button
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[1rem] border border-red-100 bg-red-50 px-4 text-sm font-black text-red-500 transition hover:-translate-y-0.5 min-[380px]:mt-5 min-[380px]:rounded-[1.2rem] min-[380px]:px-5 min-[380px]:text-base sm:mt-6 sm:min-h-14 sm:rounded-[1.4rem] sm:text-xl"
            onClick={() => setActiveModal("delete")}
            type="button"
          >
            Delete Account Permanently
          </button>
        </div>
      </div>

      <footer className="pb-6 pt-2 text-center sm:pt-3">
        <p className="m-0 text-base font-black text-slate-500 min-[380px]:text-lg sm:text-xl">{APP_VERSION_LABEL}</p>
        <p className="m-0 mt-2 text-sm font-black text-slate-400">{APP_MADE_BY_LABEL}</p>
      </footer>

      {activeModal === "profile" ? (
        <ModalFrame title="Edit Profile" subtitle="Update owner, library, and contact details." onClose={() => setActiveModal("")}>
          <form className="grid gap-4" onSubmit={handleProfileSubmit}>
            <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 min-[380px]:rounded-[1.4rem] min-[380px]:p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:rounded-[1.75rem]">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1rem] border-2 border-yellow-300 bg-white text-xl font-black text-yellow-600 min-[380px]:h-20 min-[380px]:w-20 min-[380px]:rounded-[1.35rem] min-[380px]:text-2xl">
                {profile.logoDataUrl ? (
                  <img className="h-full w-full object-contain" src={profile.logoDataUrl} alt={`${profile.libraryName || "Library"} logo preview`} />
                ) : (
                  getLibraryInitials(profile)
                )}
              </div>
              <div className="flex flex-col gap-2 min-[380px]:flex-row min-[380px]:flex-wrap min-[380px]:gap-3">
                <label className={savingLogo ? "inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-teal-700 px-4 py-2 text-sm font-extrabold text-white opacity-70 shadow-lg shadow-teal-700/20 min-[380px]:w-auto" : "inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full bg-teal-700 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 min-[380px]:w-auto"}>
                  {savingLogo ? "Saving..." : "Upload Logo"}
                  <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={savingLogo} onChange={handleLogoChange} />
                </label>
                {profile.logoDataUrl ? (
                  <button className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 min-[380px]:w-auto" type="button" disabled={savingLogo} onClick={handleLogoRemove}>
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 min-[520px]:grid-cols-2">
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="settings-name">Owner Name</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-name" name="name" value={profile.name} onChange={handleProfileChange} />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="settings-libraryName">Library Name</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-libraryName" name="libraryName" value={profile.libraryName} onChange={handleProfileChange} />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="settings-email">Email</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-email" name="email" type="email" value={profile.email} onChange={handleProfileChange} />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="settings-phone">Phone</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-phone" name="phone" value={profile.phone} onChange={handleProfileChange} />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="settings-seatCount">Library Seats</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-seatCount" name="seatCount" type="number" min="1" value={profile.seatCount} onChange={handleProfileChange} />
              </div>
              <div className="grid gap-2 min-[520px]:col-span-2">
                <label className="font-semibold text-slate-600" htmlFor="settings-address">Library Address</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-address" name="address" value={profile.address} onChange={handleProfileChange} />
              </div>
            </div>

            <button className="min-h-12 w-full rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Update Profile"}
            </button>
          </form>
        </ModalFrame>
      ) : null}

      {activeModal === "branding" ? (
        <ModalFrame title="Library Branding" subtitle="Upload your library logo for profile, invoices, and receipts." onClose={() => setActiveModal("")}>
          <div className="grid gap-4">
            <div className="grid place-items-center rounded-[2rem] border border-slate-200 bg-slate-50 p-8">
              <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-[1.75rem] border-2 border-yellow-300 bg-white text-4xl font-black text-yellow-600">
                {profile.logoDataUrl ? (
                  <img className="h-full w-full object-contain" src={profile.logoDataUrl} alt={`${profile.libraryName || "Library"} logo preview`} />
                ) : (
                  getLibraryInitials(profile)
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className={savingLogo ? "inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white opacity-70 shadow-lg shadow-teal-700/20" : "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5"}>
                {savingLogo ? "Saving..." : "Upload Logo"}
                <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={savingLogo} onChange={handleLogoChange} />
              </label>
              {profile.logoDataUrl ? (
                <button className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800" disabled={savingLogo} onClick={handleLogoRemove} type="button">
                  Remove Logo
                </button>
              ) : null}
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "branch" ? (
        <ModalFrame title="Branch Switcher" subtitle="Manage multiple libraries from one owner account." onClose={() => setActiveModal("")}>
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Active Library</span>
              <select
                className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                disabled={switchingLibrary || libraries.length === 0}
                onChange={handleLibrarySwitch}
                value={user?.libraryId || ""}
              >
                {libraries.map((library) => (
                  <option key={library._id} value={library._id}>
                    {library.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3">
              {libraries.map((library) => (
                <div className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4" key={library._id}>
                  <div className="min-w-0">
                    <strong className="block break-words text-slate-950">{library.name}</strong>
                    <p className="m-0 mt-1 break-words text-sm text-slate-500">{library.address || "Address not added"}</p>
                  </div>
                  {user?.libraryId === library._id ? <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Active</span> : null}
                </div>
              ))}
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "subscription" ? (
        <ModalFrame
          title="Manage Subscription"
          subtitle="View plan, renew dates, and subscription controls."
          onClose={() => setActiveModal("")}
          hideHeader
          panelClassName="h-[100dvh] w-screen max-w-[100vw] overflow-hidden rounded-none border-slate-800 bg-slate-950 p-0 text-white shadow-[0_35px_120px_rgba(2,6,23,0.72)] min-h-0 sm:h-[calc(100dvh-2.5rem)] sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[980px] sm:rounded-[2rem] sm:border flex flex-col"
          overlayClassName="bg-slate-950/75 backdrop-blur-sm"
        >
          <div className="relative h-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
            <div className="absolute -left-10 top-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-yellow-300/10 blur-3xl" />

            <div className="relative grid h-full gap-5 overflow-y-auto px-4 pb-5 pt-4 min-[380px]:px-5 min-[380px]:pb-6 min-[380px]:pt-5 sm:px-8 sm:pb-8 sm:pt-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300 min-[380px]:text-[11px]">
                    Premium Access
                    <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] text-slate-950">PRO</span>
                  </div>
                  <h3 className="m-0 mt-4 break-words text-[2rem] font-black leading-none text-white min-[380px]:text-[2.45rem] sm:text-[3.3rem]">BrainByte Pro</h3>
                  <p className="m-0 mt-3 max-w-2xl break-words text-sm font-medium text-slate-300 min-[380px]:text-base">
                    Upgrade your library with smart reminders, premium communication tools, better billing flow, and a cleaner owner experience.
                  </p>
                </div>

                <button
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-slate-200 transition hover:bg-white/20"
                  onClick={() => setActiveModal("")}
                  type="button"
                  aria-label="Close subscription popup"
                >
                  <SettingsIcon name="close" />
                </button>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(30,41,59,0.82)_36%,rgba(8,145,178,0.18)_100%)] p-4 shadow-[0_24px_65px_rgba(8,47,73,0.32)] backdrop-blur min-[380px]:p-5 sm:rounded-[2.2rem] sm:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.14),transparent_32%)]" />
                <div className="relative grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(30,41,59,0.68))] p-4 shadow-2xl shadow-slate-950/40 backdrop-blur min-[380px]:p-5 sm:rounded-[2rem] sm:p-6">
                    <div className="absolute inset-x-5 top-5 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
                    <div className="grid gap-4 pt-4 sm:grid-cols-[1.05fr_0.95fr] sm:pt-5">
                      <div className="grid gap-3">
                        <div>
                          <p className="m-0 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/80 min-[380px]:text-[11px]">Current Status</p>
                          <strong className="mt-2 block break-words text-2xl font-black text-white min-[380px]:text-[2rem]">You are {subscriptionPlan}</strong>
                          <p className="m-0 mt-2 break-words text-sm font-medium text-slate-300 min-[380px]:text-base">{summarySubtitle}</p>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(30,41,59,0.9))] p-4">
                          <p className="m-0 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isProActive ? "Renewal Date" : "Trial Ends"}</p>
                          <strong className="mt-2 block text-lg font-extrabold text-white min-[380px]:text-xl">{accessEndsAt ? formatDate(accessEndsAt) : "Starts after payment"}</strong>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="rounded-[1.4rem] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.2),rgba(59,130,246,0.16))] p-4">
                          <p className="m-0 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/80">Built For</p>
                          <strong className="mt-2 block text-lg font-extrabold text-white">Serious Library Owners</strong>
                          <p className="m-0 mt-2 text-sm text-slate-300">One place to manage memberships, reminders, receipts, and growth.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-[1.2rem] border border-emerald-300/15 bg-[linear-gradient(180deg,rgba(52,211,153,0.18),rgba(30,41,59,0.55))] p-3 text-center">
                            <strong className="block text-lg font-black text-white">24x7</strong>
                            <span className="text-[11px] font-semibold text-slate-300">Access</span>
                          </div>
                          <div className="rounded-[1.2rem] border border-yellow-300/15 bg-[linear-gradient(180deg,rgba(250,204,21,0.18),rgba(30,41,59,0.55))] p-3 text-center">
                            <strong className="block text-lg font-black text-white">3</strong>
                            <span className="text-[11px] font-semibold text-slate-300">Plans</span>
                          </div>
                          <div className="rounded-[1.2rem] border border-fuchsia-300/15 bg-[linear-gradient(180deg,rgba(232,121,249,0.16),rgba(30,41,59,0.55))] p-3 text-center">
                            <strong className="block text-lg font-black text-white">Pro</strong>
                            <span className="text-[11px] font-semibold text-slate-300">Tools</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {PRO_SUBSCRIPTION_FEATURES.map((feature, index) => (
                      <div className={`flex items-start gap-3 rounded-[1.5rem] border p-4 shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur ${PRO_FEATURE_THEMES[index % PRO_FEATURE_THEMES.length]}`} key={feature.title}>
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.1rem] border border-white/10 bg-white/10">
                          <SettingsIcon name={feature.icon} />
                        </span>
                        <div className="min-w-0">
                          <strong className="block break-words text-base font-extrabold text-white">{feature.title}</strong>
                          <p className="m-0 mt-1 break-words text-sm text-white/75">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                {APP_SUBSCRIPTION_PLANS.map((plan) => {
                  const active = plan.key === selectedPlanKey;
                  const theme = SUBSCRIPTION_PLAN_THEMES[plan.key] || SUBSCRIPTION_PLAN_THEMES["1_MONTH"];

                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => setSelectedPlanKey(plan.key)}
                      disabled={Boolean(subscriptionAction)}
                      className={`rounded-[1.8rem] p-4 text-left transition hover:-translate-y-0.5 min-[380px]:p-5 ${active ? `border-2 ${theme.activeCard}` : `border ${theme.inactiveCard} hover:bg-white/10`}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className={`break-words text-xl font-black min-[380px]:text-[1.7rem] ${active ? theme.accentText : "text-white"}`}>{plan.label}</strong>
                            {plan.badge ? <span className="rounded-full bg-yellow-300 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{plan.badge}</span> : null}
                          </div>
                          <div className="mt-3 flex flex-wrap items-end gap-2">
                            <span className="text-4xl font-black leading-none text-white min-[380px]:text-[3.2rem]">{formatCurrency(plan.price)}</span>
                            <span className="pb-1 text-sm font-bold text-slate-300/85 min-[380px]:text-base">{plan.periodLabel}</span>
                          </div>
                          <p className={`m-0 mt-3 break-words text-sm font-semibold min-[380px]:text-base ${active ? theme.noteText : "text-slate-200/88"}`}>{plan.note}</p>
                        </div>

                        <span className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-black uppercase tracking-[0.16em] ${active ? "bg-yellow-300 text-slate-950" : theme.dot}`}>
                          {active ? "ON" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[1.8rem] border border-fuchsia-300/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(76,29,149,0.28),rgba(15,23,42,0.72))] p-4 shadow-[0_18px_45px_rgba(49,46,129,0.28)] backdrop-blur min-[380px]:p-5">
                <strong className="block text-center text-2xl font-black text-white">Need Help?</strong>
                <p className="m-0 mt-2 text-center text-sm text-slate-300 min-[380px]:text-base">Questions about Pro plans? Chat with us directly.</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <a
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 font-extrabold text-white transition hover:-translate-y-0.5"
                    href={SUPPORT_WHATSAPP_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <SettingsIcon name="whatsapp" />
                    WhatsApp
                  </a>
                  <a
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-3 font-extrabold text-white transition hover:-translate-y-0.5"
                    href={SUPPORT_EMAIL_URL}
                  >
                    <SettingsIcon name="mail" />
                    Email
                  </a>
                </div>

                <div className="mt-4 grid gap-2 text-center text-sm text-slate-400">
                  <span>{SUPPORT_WHATSAPP_LABEL}</span>
                  <span>{SUPPORT_EMAIL}</span>
                </div>
              </div>

              <div className="grid gap-3 border-t border-white/10 pt-4 sm:pt-5">
                <button
                  className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-300 px-6 py-4 text-lg font-black text-slate-950 shadow-[0_18px_45px_rgba(250,204,21,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(subscriptionAction)}
                  onClick={() => handleSubscriptionAction("RENEW")}
                  type="button"
                >
                  {subscriptionAction === "RENEW" ? "Opening..." : isProActive ? "Renew Pro Access" : "Unlock Pro Access"}
                </button>
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  disabled={Boolean(subscriptionAction)}
                  onClick={() => handleSubscriptionAction("RESTORE")}
                  type="button"
                >
                  {subscriptionAction === "RESTORE" ? "Syncing..." : "Restore Purchase"}
                </button>
                <button
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-6 py-3 font-extrabold text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/15"
                  onClick={() => setActiveModal("billing")}
                  type="button"
                >
                  View Billing History
                </button>
                <p className="m-0 text-center text-xs font-semibold tracking-[0.08em] text-slate-400 min-[380px]:text-sm">
                  Secure payment flow. Your current app functionality remains unchanged.
                </p>
              </div>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "billing" ? (
        <ModalFrame title="Billing History" subtitle="Recent subscription transactions and statements." onClose={() => setActiveModal("")}>
          <div className="grid gap-3">
            {billingHistory.length > 0 ? (
              billingHistory.map((item) => (
                <div className="grid gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={item.id}>
                  <strong className="block break-all text-slate-950">{item.reference}</strong>
                  <p className="m-0 break-words text-sm text-slate-500">
                    {formatDate(item.paymentDate)} | {item.method} | {item.status}
                  </p>
                  <span className="font-extrabold text-teal-700">{formatCurrency(item.amount)}</span>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                No billing history is available yet.
              </div>
            )}
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "theme" ? (
        <ModalFrame title="Theme Mode" subtitle="Choose how the app should look on this device." onClose={() => setActiveModal("")}>
          <div className="grid gap-3">
            {["LIGHT", "DARK", "SYSTEM"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={themeMode === mode ? "flex items-center justify-between rounded-[1.2rem] border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm font-extrabold text-teal-700 min-[380px]:rounded-[1.5rem] min-[380px]:px-5 min-[380px]:py-4 min-[380px]:text-base" : "flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-extrabold text-slate-800 min-[380px]:rounded-[1.5rem] min-[380px]:px-5 min-[380px]:py-4 min-[380px]:text-base"}
                onClick={() => handleThemeSubmit(mode)}
              >
                <span>{getThemeLabel(mode)}</span>
                {themeMode === mode ? <span className="rounded-full bg-teal-100 px-3 py-1 text-xs uppercase tracking-[0.14em]">Active</span> : null}
              </button>
            ))}
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "qr" ? (
        <ModalFrame title="Library QR Code" subtitle="Share real-time vacant seats with students." onClose={() => setActiveModal("")}>
          {qrPublicUrl ? (
            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <div className="mx-auto w-full max-w-md rounded-[2rem] border border-teal-100 bg-white p-5 text-center shadow-lg shadow-slate-300/15">
                  <img className="mx-auto w-full max-w-[18rem] rounded-[1.75rem] border border-slate-100 bg-white p-3" src={qrImageUrl} alt={`${profile.libraryName || "Library"} vacant seats QR code`} />
                  <a className="mt-4 inline-flex text-sm font-extrabold uppercase tracking-[0.18em] text-teal-700 underline underline-offset-4" href={qrPublicUrl} rel="noreferrer" target="_blank">
                    Preview Page
                  </a>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Public URL</span>
                <p className="m-0 mt-2 break-all text-sm text-slate-700">{qrPublicUrl}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5" onClick={() => setQrRefreshKey((current) => current + 1)} type="button">
                  Regenerate QR
                </button>
                <button className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleCopyText(qrPublicUrl, "qr-link", "QR access link copied.")} type="button">
                  {copiedItem === "qr-link" ? "Copied" : "Copy Link"}
                </button>
                <button className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={handleShareQr} type="button">
                  Share QR
                </button>
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  href={qrPrintUrl}
                  onClick={() => {
                    setSuccess("High-resolution QR opened in a new tab.");
                    setError("");
                  }}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Print QR
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500">
              QR access will appear here once your library profile is loaded.
            </div>
          )}
        </ModalFrame>
      ) : null}

      {activeModal === "templates" ? (
        <ModalFrame title="Message Templates" subtitle="Edit welcome, reminder, and automation texts." onClose={() => setActiveModal("")}>
          <div className="grid gap-3">
            {messageTemplates.map((template) => {
              const isExpanded = expandedTemplateId === template.id;
              const isLive = template.status === "LIVE";

              return (
                <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/10" key={template.id}>
                  <button className="flex w-full items-start gap-3 text-left" onClick={() => setExpandedTemplateId(isExpanded ? "" : template.id)} type="button">
                    <IconBadge icon="doc" tone={isLive ? "teal" : "amber"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="break-words text-xl font-extrabold text-slate-950">{template.title}</strong>
                        <span className={isLive ? "rounded-full bg-teal-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-teal-700" : "rounded-full bg-amber-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-amber-700"}>
                          {template.status}
                        </span>
                      </div>
                      <p className="m-0 mt-1 break-words text-sm text-slate-500">{template.summary}</p>
                    </div>
                    <span className="shrink-0 text-slate-300">
                      <SettingsIcon name="chevron" />
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
                      <textarea
                        className="min-h-32 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                        value={template.body}
                        onChange={(event) => handleTemplateBodyChange(template.id, event.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        {["{student_name}", "{seat_number}", "{hall_name}", "{plan}", "{paid_till}", "{library_name}", "{amount}"].map((tokenValue) => (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-slate-600" key={`${template.id}-${tokenValue}`}>
                            {tokenValue}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-teal-700 px-5 py-2 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5" onClick={() => handleSaveTemplate(template.id)} type="button">
                          Save Template
                        </button>
                        <button className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => handleCopyText(template.body, `template-${template.id}`, `${template.title} copied.`)} type="button">
                          {copiedItem === `template-${template.id}` ? "Copied" : "Copy Template"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "import" ? (
        <ModalFrame title="Bulk Student Import" subtitle="CSV import screen can be connected here." onClose={() => setActiveModal("")}>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-base font-semibold leading-8 text-slate-700">
            This design entry is ready, but CSV import is not implemented in the current backend or frontend flow yet.
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "whatsapp" ? (
        <ModalFrame title="WhatsApp Notifications" subtitle="Manage alerts and WhatsApp connection." onClose={() => setActiveModal("")}>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-base font-semibold leading-8 text-slate-700">
            Student messaging links already exist in the app. Full WhatsApp automation settings are not connected yet.
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "shift" ? (
        <ModalFrame title="Shift Management" subtitle="Configure timings and slot fees." onClose={() => setActiveModal("")}>
          <div className="grid gap-4">
            {shiftSettings.map((shift, index) => (
              <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={shift.id}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-lg font-extrabold text-slate-950">Shift {index + 1}</strong>
                  {shiftSettings.length > 1 ? (
                    <button className="rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-500 transition hover:-translate-y-0.5" onClick={() => handleRemoveShift(shift.id)} type="button">
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 min-[520px]:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="font-semibold text-slate-600">Shift Name</label>
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                      value={shift.name}
                      onChange={(event) => handleShiftChange(shift.id, "name", event.target.value)}
                      placeholder="Morning / Evening / Custom"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="font-semibold text-slate-600">Fee Amount</label>
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                      type="number"
                      min="0"
                      value={shift.feeAmount}
                      onChange={(event) => handleShiftChange(shift.id, "feeAmount", event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="font-semibold text-slate-600">Start Time</label>
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                      type="time"
                      value={shift.startTime}
                      onChange={(event) => handleShiftChange(shift.id, "startTime", event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="font-semibold text-slate-600">End Time</label>
                    <input
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                      type="time"
                      value={shift.endTime}
                      onChange={(event) => handleShiftChange(shift.id, "endTime", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <button className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={handleAddShift} type="button">
                Add Timing
              </button>
              <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5" onClick={handleSaveShiftSettings} type="button">
                Save Shift Settings
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-semibold leading-7 text-slate-600">
              These shift timings are owner-controlled and saved for this library on this device right now.
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "owner-grant" ? (
        <ModalFrame title="Grant Complimentary Pro" subtitle="Visible only to configured product owner emails." onClose={() => setActiveModal("")}>
          <form className="grid gap-4" onSubmit={handleOwnerGrantSubmit}>
            <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-800 min-[380px]:text-base">
              This tool bypasses checkout and grants Pro access directly. Use it only for trusted complimentary access cases.
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Customer Email</span>
              <input
                className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                name="email"
                onChange={handleOwnerGrantChange}
                placeholder="customer@example.com"
                type="email"
                value={ownerGrantForm.email}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Grant Method</span>
              <select
                className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                name="grantMode"
                onChange={handleOwnerGrantChange}
                value={ownerGrantForm.grantMode}
              >
                <option value="plan">Use subscription plan</option>
                <option value="days">Use custom days</option>
                <option value="date">Set exact expiry date</option>
              </select>
            </label>

            {ownerGrantForm.grantMode === "plan" ? (
              <label className="grid gap-2">
                <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Plan</span>
                <select
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  name="plan"
                  onChange={handleOwnerGrantChange}
                  value={ownerGrantForm.plan}
                >
                  {APP_SUBSCRIPTION_PLANS.map((plan) => (
                    <option key={plan.key} value={plan.key}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {ownerGrantForm.grantMode === "days" ? (
              <label className="grid gap-2">
                <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Custom Days</span>
                <input
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  min="1"
                  name="durationDays"
                  onChange={handleOwnerGrantChange}
                  placeholder="90"
                  type="number"
                  value={ownerGrantForm.durationDays}
                />
              </label>
            ) : null}

            {ownerGrantForm.grantMode === "date" ? (
              <label className="grid gap-2">
                <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Exact Expiry Date</span>
                <input
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  name="renewsAt"
                  onChange={handleOwnerGrantChange}
                  type="datetime-local"
                  value={ownerGrantForm.renewsAt}
                />
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Reason / Note</span>
              <textarea
                className="min-h-28 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                maxLength="300"
                name="note"
                onChange={handleOwnerGrantChange}
                placeholder="Why are you granting complimentary access?"
                value={ownerGrantForm.note}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Owner Secret</span>
              <div className="relative">
                <input
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 pr-24 font-semibold text-slate-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  name="ownerSecret"
                  onChange={handleOwnerGrantChange}
                  placeholder="Enter owner secret before grant"
                  type={showOwnerGrantSecret ? "text" : "password"}
                  value={ownerGrantForm.ownerSecret}
                />
                <button
                  className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setShowOwnerGrantSecret((current) => !current)}
                  type="button"
                >
                  {showOwnerGrantSecret ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">Manual Fee</span>
              <input
                className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                min="0"
                name="manualFee"
                onChange={handleOwnerGrantChange}
                placeholder="0 for free access"
                step="0.01"
                type="number"
                value={ownerGrantForm.manualFee}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"
                onClick={() => setActiveModal("")}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-600 px-5 py-3 font-extrabold text-white shadow-lg shadow-amber-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={grantingComplimentary}
                type="submit"
              >
                {grantingComplimentary ? "Granting..." : "Grant Complimentary Pro"}
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {activeModal === "delete" ? (
        <ModalFrame title="Delete Account" subtitle="This action permanently removes your data." onClose={() => setActiveModal("")}>
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-red-100 bg-red-50 p-5 text-base font-semibold leading-8 text-red-600">
              Account deletion UI is shown here as requested, but permanent delete is not connected to backend logic yet.
            </div>
            <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-red-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5" onClick={() => handlePlaceholderAction("Delete account is not available yet in the current backend.")} type="button">
              Delete Account Permanently
            </button>
          </div>
        </ModalFrame>
      ) : null}

      {activeModal === "logout" ? (
        <ModalFrame title="Confirm Sign Out" subtitle="Are you sure you want to log out from this device?" onClose={() => setActiveModal("")}>
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 text-base font-semibold leading-8 text-amber-700">
              You will need to log in again to access your library dashboard on this device.
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"
                onClick={() => setActiveModal("")}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-red-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5"
                onClick={handleLogout}
                type="button"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </div>
  );
}
