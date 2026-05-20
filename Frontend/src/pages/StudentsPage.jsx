import { useEffect, useState } from "react";
import AppModal from "../components/AppModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useLocation, useNavigate } from "react-router-dom";
import FloatingToastStack from "../components/FloatingToastStack";
import SkeletonBlock from "../components/SkeletonBlock";
import { useAuth } from "../context/AuthContext";
import { useTimedAlerts } from "../hooks/useTimedAlerts";
import { apiRequest } from "../lib/api";
import { withMinimumDelay } from "../lib/async";
import { buildCacheKey, readCachedValue, writeCachedValue } from "../lib/cache";
import { formatCurrency, formatDate, getErrorMessage, toDateInputValue } from "../lib/format";
import { getPaymentMessageActions, getStudentMessageActions } from "../lib/messages";

const toDateInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const getTodayDateInput = () => toDateInputDate(new Date());

const createInitialForm = () => ({
  name: "",
  phone: "",
  email: "",
  address: "",
  parentName: "",
  parentPhone: "",
  seatNumber: "",
  plan: "1 Month",
  feeAmount: "",
  paidTill: "",
  hallName: "",
  shift: "FULL_DAY",
  joinedDate: getTodayDateInput(),
  membershipStartDate: "",
  notes: ""
});

const initialForm = createInitialForm();

const initialFilters = {
  search: "",
  status: "",
  shift: "",
  hallName: "",
  paymentStatus: "",
  sort: "recent"
};

const DIRECTORY_CACHE_MAX_AGE = 5 * 60 * 1000;

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

const getSeatOccupancyLabel = (paidTill) => {
  if (!paidTill) return { text: "No paid date added", tone: "slate" };

  const endDate = new Date(paidTill);

  if (Number.isNaN(endDate.getTime())) return { text: "No paid date added", tone: "slate" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const days = Math.round((endDate - today) / 86400000);

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return { text: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`, tone: "red" };
  }

  if (days === 0) return { text: "Seat occupied until today", tone: "amber" };

  return { text: `${days} day${days === 1 ? "" : "s"} left for occupied seat`, tone: "green" };
};

const occupancyToneClasses = {
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-600"
};

const shiftLabelMap = {
  FULL_DAY: "Full Day",
  MORNING: "Morning",
  EVENING: "Evening",
  CUSTOM: "Custom"
};

const formatShiftLabel = (shift) => shiftLabelMap[shift] || String(shift || "Shift").replace(/_/g, " ");
const getSeatDisplay = (hallName, seatNumber) => (
  Number.isInteger(Number(seatNumber)) && Number(seatNumber) > 0
    ? `${hallName || "Hall"} - #${seatNumber}`
    : "Unallocated"
);

const buildStudentFilterQuery = (filters) => {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });

  return searchParams.toString();
};

const buildFormerSearchQuery = (search) => {
  const searchParams = new URLSearchParams();

  if (search) {
    searchParams.set("search", search);
  }

  return searchParams.toString();
};

function DirectoryIcon({ name, className = "h-4 w-4" }) {
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
    search: (
      <svg {...iconProps}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
    clock: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    check: (
      <svg {...iconProps}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    ),
    alert: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
      </svg>
    ),
    phone: (
      <svg {...iconProps}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.77 19.77 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.77 19.77 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.39 2.55a2 2 0 0 1-.57 1.71L7.1 9.81a16 16 0 0 0 7.09 7.09l1.83-1.83a2 2 0 0 1 1.71-.57l2.55.39A2 2 0 0 1 22 16.92Z" />
      </svg>
    ),
    status: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01" />
        <path d="M11 12h1v4h1" />
      </svg>
    ),
    calendar: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    ),
    pin: (
      <svg {...iconProps}>
        <path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
    eye: (
      <svg {...iconProps}>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    edit: (
      <svg {...iconProps}>
        <path d="M12 20h9" />
        <path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z" />
      </svg>
    ),
    archive: (
      <svg {...iconProps}>
        <path d="M3 7h18" />
        <path d="M5 7v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
        <path d="M9 11h6" />
        <path d="M4 4h16v3H4z" />
      </svg>
    ),
    whatsapp: (
      <svg {...iconProps}>
        <path d="M20 11.5A8.5 8.5 0 0 1 7.48 19l-4.48 1 1.08-4.36A8.5 8.5 0 1 1 20 11.5Z" />
        <path d="M9 9.5c.22 1.27 1.82 3.72 4.25 4.5" />
        <path d="M13.25 14c.55.22 1.35.06 1.75-.5" />
      </svg>
    ),
    message: (
      <svg {...iconProps}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
    copy: (
      <svg {...iconProps}>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
    sparkles: (
      <svg {...iconProps}>
        <path d="M12 3v4" />
        <path d="M12 17v4" />
        <path d="M3 12h4" />
        <path d="M17 12h4" />
        <path d="m5.64 5.64 2.83 2.83" />
        <path d="m15.53 15.53 2.83 2.83" />
        <path d="m5.64 18.36 2.83-2.83" />
        <path d="m15.53 8.47 2.83-2.83" />
      </svg>
    ),
    credit: (
      <svg {...iconProps}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
    wallet: (
      <svg {...iconProps}>
        <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5v-9Z" />
        <path d="M3 8h14a2 2 0 0 1 2 2v1H3" />
        <path d="M16 13h.01" />
      </svg>
    ),
    plus: (
      <svg {...iconProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    )
  };

  return icons[name] || null;
}

function FilterChip({ active, icon, children, onClick }) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.2rem] border px-4 py-2.5 text-sm font-extrabold transition ${
        active
          ? "border-teal-700 bg-teal-700 text-white shadow-lg shadow-teal-700/20"
          : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon ? <DirectoryIcon className="h-4 w-4" name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

function StudentInfoTile({ icon, label, value, valueClassName = "" }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
        <DirectoryIcon className="h-3.5 w-3.5 text-teal-700" name={icon} />
        {label}
      </span>
      <p className={`m-0 mt-2 break-words text-[0.96rem] font-extrabold leading-tight text-slate-900 sm:text-base ${valueClassName}`}>{value}</p>
    </div>
  );
}

function StudentTag({ icon, children, tone = "slate" }) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700"
  };

  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] ${toneClasses[tone]}`}>
      {icon ? <DirectoryIcon className="h-3.5 w-3.5" name={icon} /> : null}
      <span>{children}</span>
    </span>
  );
}

function StudentActionButton({ as: Component = "button", tone = "neutral", icon, children, className = "", ...props }) {
  const toneClasses = {
    neutral: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    teal: "border border-teal-700 bg-teal-700 text-white shadow-lg shadow-teal-700/20",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    sky: "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    danger: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
  };

  return (
    <Component
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[1rem] px-3 py-2 text-xs font-extrabold transition hover:-translate-y-0.5 ${toneClasses[tone]} ${className}`}
      {...props}
    >
      {icon ? <DirectoryIcon className="h-3.5 w-3.5" name={icon} /> : null}
      <span>{children}</span>
    </Component>
  );
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const { error, success, setError, setSuccess } = useTimedAlerts();
  const [students, setStudents] = useState([]);
  const [formerMembers, setFormerMembers] = useState([]);
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [formerSearch, setFormerSearch] = useState("");
  const [directoryView, setDirectoryView] = useState("active");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFormerMembers, setLoadingFormerMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [archivingId, setArchivingId] = useState("");
  const [deletingFormerId, setDeletingFormerId] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [formerDeleteTarget, setFormerDeleteTarget] = useState(null);
  const [sendingReceiptId, setSendingReceiptId] = useState("");
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [showStudentForm, setShowStudentForm] = useState(false);
  const routeSearchParams = new URLSearchParams(location.search);
  const requestedStudentId = location.state?.studentId || routeSearchParams.get("studentId") || "";
  const shouldOpenNewStudentForm = routeSearchParams.get("new") === "1";
  const hasDirectorySnapshot = students.length > 0 || halls.length > 0;
  const hasFormerMemberSnapshot = formerMembers.length > 0;
  const showStudentDetailModal = Boolean(viewingStudent) || (Boolean(requestedStudentId) && loadingStudentDetail);

  const loadData = async (activeFilters = filters) => {
    setError("");
    const searchQuery = buildStudentFilterQuery(activeFilters);
    const cacheKey = buildCacheKey("students", user?.libraryId || "default", searchQuery || "all");
    const cachedSnapshot = readCachedValue(cacheKey, {
      maxAgeMs: DIRECTORY_CACHE_MAX_AGE,
      allowExpired: true
    });

    if (cachedSnapshot) {
      setStudents(cachedSnapshot.students || []);
      setHalls(cachedSnapshot.halls || []);
      setLoading(false);
    } else if (!hasDirectorySnapshot) {
      setLoading(true);
    }

    try {
      const [studentsData, hallsData] = await withMinimumDelay(Promise.all([
        apiRequest(`/students${searchQuery ? `?${searchQuery}` : ""}`, { token }),
        apiRequest("/seats/halls", { token })
      ]), cachedSnapshot || hasDirectorySnapshot ? 0 : 340);

      setStudents(studentsData);
      setHalls(hallsData);
      writeCachedValue(cacheKey, {
        students: studentsData,
        halls: hallsData
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const loadFormerMembers = async (search = formerSearch) => {
    setError("");
    const searchQuery = buildFormerSearchQuery(search);
    const cacheKey = buildCacheKey("former-members", user?.libraryId || "default", searchQuery || "all");
    const cachedMembers = readCachedValue(cacheKey, {
      maxAgeMs: DIRECTORY_CACHE_MAX_AGE,
      allowExpired: true
    });

    if (cachedMembers) {
      setFormerMembers(cachedMembers);
      setLoadingFormerMembers(false);
    } else if (!hasFormerMemberSnapshot) {
      setLoadingFormerMembers(true);
    }

    try {
      const data = await withMinimumDelay(
        apiRequest(`/students/former-members${searchQuery ? `?${searchQuery}` : ""}`, { token }),
        cachedMembers || hasFormerMemberSnapshot ? 0 : 280
      );
      setFormerMembers(data);
      writeCachedValue(cacheKey, data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingFormerMembers(false);
    }
  };

  useEffect(() => {
    loadData(initialFilters);
    loadFormerMembers("");

    if (shouldOpenNewStudentForm) {
      setShowStudentForm(true);
    }
  }, [token, user?.libraryId]);

  useEffect(() => {
    if (!requestedStudentId) return;
    handleViewById(requestedStudentId, { clearRequest: true });
  }, [requestedStudentId, token]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };

      if (name !== "search") {
        loadData(nextFilters);
      }

      return nextFilters;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadData();
  };

  const handleFormerSearchSubmit = (event) => {
    event.preventDefault();
    loadFormerMembers();
  };

  const showStudentsSkeleton = loading && students.length === 0;
  const showFormerMembersSkeleton = loadingFormerMembers && formerMembers.length === 0;

  const applyQuickFilter = (nextValues) => {
    setFilters((current) => {
      const nextFilters = { ...current, ...nextValues };
      loadData(nextFilters);
      return nextFilters;
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === "phone" || name === "parentPhone" ? getTenDigitPhone(value) : value;
    setForm((current) => {
      const nextForm = { ...current, [name]: nextValue };

      if ((name === "joinedDate" || name === "plan") && !current.paidTill) {
        nextForm.paidTill = getPaidTillFromPlan(nextForm.joinedDate, nextForm.plan);
      }

      return nextForm;
    });
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId("");
  };

  const openStudentForm = () => {
    resetForm();
    setShowStudentForm(true);
  };

  const closeStudentForm = () => {
    resetForm();
    setShowStudentForm(false);
  };

  const clearStudentRouteRequest = () => {
    if (!requestedStudentId) return;

    routeSearchParams.delete("studentId");
    const nextSearch = routeSearchParams.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : ""
      },
      { replace: true, state: null }
    );
  };

  const handleView = async (student) => {
    setLoadingStudentDetail(true);
    setError("");
    setViewingStudent(null);

    try {
      const studentDetail = await apiRequest(`/students/${student._id}`, { token });
      setViewingStudent(studentDetail);
    } catch (viewError) {
      setError(getErrorMessage(viewError));
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const handleViewById = async (studentId, { clearRequest = false } = {}) => {
    if (!studentId) return;

    setLoadingStudentDetail(true);
    setError("");
    setViewingStudent(null);

    try {
      const studentDetail = await apiRequest(`/students/${studentId}`, { token });
      setViewingStudent(studentDetail);

      if (clearRequest) {
        clearStudentRouteRequest();
      }
    } catch (viewError) {
      setError(getErrorMessage(viewError));
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const handleEdit = (student) => {
    setEditingId(student._id);
    setForm({
      name: student.name || "",
      phone: student.phone || "",
      email: student.email || "",
      address: student.address || "",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      seatNumber: student.seatNumber || "",
      plan: student.plan || "",
      feeAmount: student.feeAmount ?? "",
      paidTill: toDateInputValue(student.paidTill),
      hallName: student.hallName || "",
      shift: student.shift || "FULL_DAY",
      joinedDate: toDateInputValue(student.joinedDate),
      membershipStartDate: toDateInputValue(student.membershipStartDate),
      notes: student.notes || ""
    });
    setShowStudentForm(true);
    setViewingStudent(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!isTenDigitPhone(form.phone)) {
      setError("Student phone number must be exactly 10 digits.");
      setSubmitting(false);
      return;
    }

    if (form.parentPhone && !isTenDigitPhone(form.parentPhone)) {
      setError("Parent phone number must be exactly 10 digits.");
      setSubmitting(false);
      return;
    }

    if (!form.joinedDate) {
      setError("Joining date is required.");
      setSubmitting(false);
      return;
    }

    const payload = {
      ...form,
      membershipStartDate: form.membershipStartDate || form.joinedDate,
      paidTill: form.paidTill || getPaidTillFromPlan(form.joinedDate, form.plan) || undefined,
      feeAmount: form.feeAmount === "" ? undefined : Number(form.feeAmount),
      seatNumber: Number(form.seatNumber)
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "" || payload[key] === undefined) {
        delete payload[key];
      }
    });

    try {
      if (editingId) {
        await apiRequest(`/students/${editingId}`, {
          method: "PATCH",
          token,
          body: payload
        });
        setSuccess("Student updated successfully.");
      } else {
        await apiRequest("/students", {
          method: "POST",
          token,
          body: payload
        });
        setSuccess("Student added successfully.");
      }

      resetForm();
      setShowStudentForm(false);
      loadData();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = async (student, type) => {
    const actions = getStudentMessageActions(student);
    const message = type === "welcome" ? actions.welcomeMessage : actions.reminderMessage;

    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(`${student._id}-${type}`);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setError("Could not copy the message. You can still use WhatsApp or SMS directly.");
    }
  };

  const openArchiveDialog = (student) => {
    if (!student?._id) return;
    setArchiveTarget(student);
  };

  const handleArchiveStudent = async () => {
    if (!archiveTarget?._id) return;

    setArchivingId(archiveTarget._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/students/${archiveTarget._id}`, { method: "DELETE", token });
      setSuccess("Student moved to former members. Seat is now vacant.");
      setArchiveTarget(null);
      setViewingStudent(null);
      await Promise.all([loadData(), loadFormerMembers()]);
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    } finally {
      setArchivingId("");
    }
  };

  const openFormerDeleteDialog = (member) => {
    if (!member?._id) return;
    setFormerDeleteTarget(member);
  };

  const handlePermanentDeleteFormerMember = async () => {
    if (!formerDeleteTarget?._id) return;

    setDeletingFormerId(formerDeleteTarget._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/students/former-members/${formerDeleteTarget._id}`, { method: "DELETE", token });
      setSuccess("Former member permanently deleted.");
      setFormerDeleteTarget(null);
      await loadFormerMembers();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingFormerId("");
    }
  };

  const handlePay = (student) => {
    navigate(`/payments?studentId=${student._id}`);
  };

  const handleSendFeeReceipt = async (student) => {
    if (!student?._id) return;

    setSendingReceiptId(student._id);
    setError("");
    setSuccess("");
    const receiptPopup = window.open("", "_blank");

    try {
      const paymentData = await apiRequest(`/payments?studentId=${student._id}&sort=latest&limit=1`, { token });
      const latestPayment = paymentData?.[0];

      if (!latestPayment) {
        receiptPopup?.close();
        setError("No payment record found for this student yet.");
        return;
      }

      if (!student.phone) {
        receiptPopup?.close();
        setError("Student phone number is missing, so receipt could not be opened.");
        return;
      }

      const paymentMessage = getPaymentMessageActions(student, latestPayment);
      if (receiptPopup) {
        receiptPopup.location.href = paymentMessage.feeSubmissionLinks.whatsapp;
      } else {
        window.open(paymentMessage.feeSubmissionLinks.whatsapp, "_blank", "noopener,noreferrer");
      }
      setSuccess("Fee receipt message opened in WhatsApp.");
    } catch (receiptError) {
      receiptPopup?.close();
      setError(getErrorMessage(receiptError));
    } finally {
      setSendingReceiptId("");
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6">
      <FloatingToastStack error={error} success={success} />
      <ConfirmDialog
        isLoading={Boolean(archivingId)}
        isOpen={Boolean(archiveTarget)}
        title={`Move ${archiveTarget?.name || "student"} to former members?`}
        description={`This will archive ${archiveTarget?.name || "this student"} and free ${getSeatDisplay(archiveTarget?.hallName, archiveTarget?.seatNumber)} for a new admission.`}
        confirmLabel="Move to Former"
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveStudent}
        tone="danger"
      />
      <ConfirmDialog
        isLoading={Boolean(deletingFormerId)}
        isOpen={Boolean(formerDeleteTarget)}
        title={`Delete ${formerDeleteTarget?.name || "former member"} forever?`}
        description="This permanently removes the former member record. This action cannot be undone."
        confirmLabel="Permanent Delete"
        onClose={() => setFormerDeleteTarget(null)}
        onConfirm={handlePermanentDeleteFormerMember}
        tone="danger"
      />

      <section className="grid gap-5 pt-2 sm:pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.26em] text-slate-500">MANAGEMENT</p>
            <h1 className="m-0 mt-2 text-[2.8rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-6xl">Directory</h1>
          </div>
          <div className="grid min-h-[5.5rem] min-w-[5.5rem] shrink-0 place-items-center rounded-[1.6rem] bg-teal-50 p-3 text-center text-teal-700">
            <strong className="text-3xl leading-none">{directoryView === "active" ? students.length : formerMembers.length}</strong>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.22em]">{directoryView === "active" ? "Profiles" : "Former"}</span>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <FilterChip active={directoryView === "active"} onClick={() => setDirectoryView("active")}>Active Members</FilterChip>
              <FilterChip active={directoryView === "former"} onClick={() => { setDirectoryView("former"); loadFormerMembers(); }}>Former Members</FilterChip>
            </div>

            <p className="m-0 px-1 text-sm font-bold text-slate-500">
              {students.length} active | {formerMembers.length} former
            </p>

            {directoryView === "active" ? (
              <>
                <form onSubmit={handleSearchSubmit}>
                  <label className="relative block">
                    <span className="sr-only">Search students</span>
                    <DirectoryIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-700" name="search" />
                    <input
                      className="min-h-[4.25rem] w-full rounded-[1.7rem] border border-slate-200 bg-white pl-14 pr-4 text-base font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                      name="search"
                      placeholder="Search by name or number..."
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                  </label>
                </form>

                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-3">
                    <FilterChip active={!filters.shift} onClick={() => applyQuickFilter({ shift: "" })}>All Shifts</FilterChip>
                    <FilterChip active={filters.shift === "FULL_DAY"} icon="sparkles" onClick={() => applyQuickFilter({ shift: filters.shift === "FULL_DAY" ? "" : "FULL_DAY" })}>
                      Full Day
                    </FilterChip>
                  </div>

                  <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    <FilterChip active={filters.sort === "recent"} icon="clock" onClick={() => applyQuickFilter({ sort: "recent", paymentStatus: "", status: "" })}>
                      Recent
                    </FilterChip>
                    <FilterChip active={filters.paymentStatus === "PAID"} icon="check" onClick={() => applyQuickFilter({ paymentStatus: filters.paymentStatus === "PAID" ? "" : "PAID", status: "" })}>
                      Paid
                    </FilterChip>
                    <FilterChip active={filters.paymentStatus === "DUE"} icon="alert" onClick={() => applyQuickFilter({ paymentStatus: filters.paymentStatus === "DUE" ? "" : "DUE", status: "" })}>
                      Dues
                    </FilterChip>
                    <FilterChip active={filters.status === "ACTIVE"} icon="status" onClick={() => applyQuickFilter({ status: filters.status === "ACTIVE" ? "" : "ACTIVE", paymentStatus: "" })}>
                      Active
                    </FilterChip>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {showStudentDetailModal ? (
        <AppModal
          eyebrow={viewingStudent ? `Member #${viewingStudent.memberId}` : "Loading Member"}
          isOpen={showStudentDetailModal}
          maxWidthClassName="max-w-[760px]"
          onClose={() => {
            setViewingStudent(null);
            clearStudentRouteRequest();
          }}
          title={viewingStudent?.name || "Opening student details"}
        >
          {!viewingStudent ? (
            <>
              <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:gap-4">
                <SkeletonBlock className="h-16 w-16 shrink-0 rounded-2xl sm:h-20 sm:w-20 sm:rounded-3xl" />
                <div className="grid min-w-0 flex-1 gap-2">
                  <SkeletonBlock className="h-5 w-28 rounded-full" />
                  <SkeletonBlock className="h-4 w-40 rounded-full" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SkeletonBlock className="h-8 w-20 rounded-full" />
                    <SkeletonBlock className="h-8 w-24 rounded-full" />
                    <SkeletonBlock className="h-8 w-32 rounded-full" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 10 }, (_, index) => (
                  <div className="rounded-3xl border border-slate-200 bg-white p-4" key={index}>
                    <SkeletonBlock className="h-3 w-20 rounded-full" />
                    <SkeletonBlock className="mt-3 h-5 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            </>
          ) : (
          <>
          <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-sky-600 text-xl font-extrabold text-white sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">{viewingStudent.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <strong>{viewingStudent.plan}</strong>
              <p className="m-0 break-words text-sm text-slate-500 sm:text-base">
                {getSeatDisplay(viewingStudent.hallName, viewingStudent.seatNumber)} | {viewingStudent.shift}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">{viewingStudent.status}</span>
                <span className="inline-flex items-center justify-center rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">{formatCurrency(viewingStudent.feeAmount)}</span>
                <span className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-extrabold ${occupancyToneClasses[getSeatOccupancyLabel(viewingStudent.paidTill).tone]}`}>
                  {getSeatOccupancyLabel(viewingStudent.paidTill).text}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Phone</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.phone}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Email</span>
              <p className="m-0 mt-1 break-all">{viewingStudent.email || "-"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Parent Name</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.parentName || "-"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Parent Number</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.parentPhone || "-"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Plan</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.plan}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Fee Amount</span>
              <p className="m-0 mt-1 break-words">{formatCurrency(viewingStudent.feeAmount)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Seat</span>
              <p className="m-0 mt-1 break-words">{getSeatDisplay(viewingStudent.hallName, viewingStudent.seatNumber)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Shift</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.shift}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:col-span-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Address</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.address || "-"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Status</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.status}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Joined Date</span>
              <p className="m-0 mt-1 break-words">{formatDate(viewingStudent.joinedDate)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Membership Start</span>
              <p className="m-0 mt-1 break-words">{formatDate(viewingStudent.membershipStartDate)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Paid Till</span>
              <p className="m-0 mt-1 break-words">{formatDate(viewingStudent.paidTill)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Seat Occupancy</span>
              <p className="m-0 mt-1 break-words">{getSeatOccupancyLabel(viewingStudent.paidTill).text}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Created</span>
              <p className="m-0 mt-1 break-words">{formatDate(viewingStudent.createdAt)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Last Updated</span>
              <p className="m-0 mt-1 break-words">{formatDate(viewingStudent.updatedAt)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">System ID</span>
              <p className="m-0 mt-1 break-all">{viewingStudent._id}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Notes</span>
            <p className="m-0 mt-1 break-words">{viewingStudent.notes || "No notes added."}</p>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => handleEdit(viewingStudent)} type="button">
              Edit Student
            </button>
            <button className="min-h-12 rounded-full bg-red-600 px-5 py-3 font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={archivingId === viewingStudent._id} onClick={() => openArchiveDialog(viewingStudent)} type="button">
              {archivingId === viewingStudent._id ? "Moving..." : "Move to Former"}
            </button>
            <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => setViewingStudent(null)} type="button">
              Back to List
            </button>
          </div>
          </>
          )}
        </AppModal>
      ) : null}

      {directoryView === "active" ? (
      <section className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-2xl font-extrabold text-slate-950">Profiles</h3>
            <p className="m-0 mt-1 text-sm font-bold text-slate-500">Mobile layout updated to match the student directory style more closely.</p>
          </div>
          <StudentActionButton className="hidden shrink-0 sm:inline-flex min-h-12 px-5 py-3 text-sm" icon="plus" onClick={openStudentForm} tone="teal" type="button">
            New Member
          </StudentActionButton>
        </div>

        <div className="grid gap-4">
          {showStudentsSkeleton
            ? Array.from({ length: 3 }, (_, index) => (
                <article className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.35)]" key={index}>
                  <div className="flex items-start gap-3">
                    <SkeletonBlock className="h-14 w-14 shrink-0 rounded-[1.15rem] sm:h-16 sm:w-16" />
                    <div className="grid min-w-0 flex-1 gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="grid min-w-0 gap-2">
                          <SkeletonBlock className="h-5 w-32 rounded-full" />
                          <SkeletonBlock className="h-3 w-20 rounded-full" />
                        </div>
                        <SkeletonBlock className="h-6 w-16 rounded-full" />
                      </div>
                      <SkeletonBlock className="h-3 w-40 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {Array.from({ length: 4 }, (_, tileIndex) => (
                      <SkeletonBlock className="h-20 rounded-[1.25rem]" key={tileIndex} />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from({ length: 5 }, (_, tagIndex) => (
                      <SkeletonBlock className="h-8 w-24 rounded-full" key={tagIndex} />
                    ))}
                  </div>
                </article>
              ))
            : students.map((student) => {
                const actions = getStudentMessageActions(student);
                const occupancy = getSeatOccupancyLabel(student.paidTill);

                return (
                  <article className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-[0_14px_36px_-28px_rgba(15,23,42,0.35)]" key={student._id}>
                    <div className="flex items-start gap-3 border-b border-slate-100 px-3.5 py-4 sm:px-4">
                      <div className="relative shrink-0">
                        <div className="grid h-14 w-14 place-items-center rounded-[1.15rem] bg-gradient-to-br from-sky-600 to-cyan-500 text-lg font-extrabold text-white shadow-[0_16px_30px_-20px_rgba(2,132,199,0.9)] sm:h-16 sm:w-16 sm:rounded-[1.3rem] sm:text-xl">
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <strong className="block break-words text-[1.2rem] font-black leading-tight text-slate-950 sm:text-[1.35rem]">{student.name}</strong>
                            <p className="m-0 mt-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Member ID: #{student.memberId}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-700">
                            {student.status}
                          </span>
                        </div>
                        {student.parentName || student.parentPhone ? (
                          <p className="m-0 mt-2 truncate text-xs font-semibold text-slate-500">
                            Parent: {student.parentName || "-"}{student.parentPhone ? ` | ${student.parentPhone}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 px-3.5 py-3 sm:px-4">
                      <StudentInfoTile icon="phone" label="Phone" value={student.phone} />
                      <StudentInfoTile
                        icon="status"
                        label="Status"
                        value={student.status}
                        valueClassName={student.status === "Active" || student.status === "ACTIVE" ? "text-emerald-600" : ""}
                      />
                      <StudentInfoTile icon="calendar" label="Joined" value={formatDate(student.joinedDate)} />
                      <StudentInfoTile icon="pin" label="Seat" value={getSeatDisplay(student.hallName, student.seatNumber)} />
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3.5 py-3 sm:px-4">
                      <StudentTag icon="sparkles" tone="teal">{formatShiftLabel(student.shift)}</StudentTag>
                      <StudentTag icon="wallet" tone="slate">{formatCurrency(student.feeAmount)}</StudentTag>
                      <StudentTag icon="credit" tone="sky">{student.plan}</StudentTag>
                      <StudentTag icon="calendar" tone="slate">
                        {formatDate(student.membershipStartDate)} - {formatDate(student.paidTill)}
                      </StudentTag>
                      <span className={`inline-flex min-h-8 items-center rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] ${occupancyToneClasses[occupancy.tone]}`}>
                        {occupancy.text}
                      </span>
                    </div>

                    <div className="grid gap-2 border-t border-slate-100 px-3.5 py-3 sm:px-4">
                      <div className="grid grid-cols-3 gap-2">
                        <StudentActionButton className="px-2" disabled={loadingStudentDetail} icon="eye" onClick={() => handleView(student)} type="button">
                          {loadingStudentDetail ? "Opening..." : "View"}
                        </StudentActionButton>
                        <StudentActionButton className="px-2" icon="edit" onClick={() => handleEdit(student)} type="button">
                          Edit
                        </StudentActionButton>
                        <StudentActionButton className="px-2" icon="wallet" onClick={() => handlePay(student)} tone="teal" type="button">
                          Pay
                        </StudentActionButton>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <StudentActionButton
                          as="a"
                          href={actions.welcomeLinks.whatsapp}
                          icon="whatsapp"
                          rel="noreferrer"
                          target="_blank"
                          tone="success"
                        >
                          WA Welcome
                        </StudentActionButton>
                        <StudentActionButton
                          as="a"
                          href={actions.welcomeLinks.sms}
                          icon="message"
                          tone="sky"
                        >
                          SMS Welcome
                        </StudentActionButton>
                        <StudentActionButton
                          className="px-1"
                          disabled={sendingReceiptId === student._id}
                          icon="wallet"
                          onClick={() => handleSendFeeReceipt(student)}
                          tone="teal"
                          type="button"
                        >
                          {sendingReceiptId === student._id ? "..." : "Receipt"}
                        </StudentActionButton>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <StudentActionButton
                          as="a"
                          href={actions.reminderLinks.whatsapp}
                          icon="whatsapp"
                          rel="noreferrer"
                          target="_blank"
                          tone="success"
                        >
                          WA Reminder
                        </StudentActionButton>
                        <StudentActionButton as="a" href={actions.reminderLinks.sms} icon="message" tone="sky">
                          SMS Reminder
                        </StudentActionButton>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <StudentActionButton icon="copy" onClick={() => handleCopyMessage(student, "welcome")} type="button">
                          {copiedId === `${student._id}-welcome` ? "Copied Welcome" : "Copy Welcome"}
                        </StudentActionButton>
                        <StudentActionButton icon="copy" onClick={() => handleCopyMessage(student, "reminder")} type="button">
                          {copiedId === `${student._id}-reminder` ? "Copied Reminder" : "Copy Reminder"}
                        </StudentActionButton>
                      </div>
                    </div>
                  </article>
                );
              })}
          {!loading && students.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No students found for the current filters.</div> : null}
        </div>
      </section>
      ) : (
      <section className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40">
        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="m-0 text-2xl font-extrabold">Former Members</h3>
            <p className="m-0 mt-1 text-sm font-bold text-slate-500">Archived students keep their data here while their seats stay vacant.</p>
          </div>
          <form className="grid gap-2 sm:w-80" onSubmit={handleFormerSearchSubmit}>
            <input
              className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              name="formerSearch"
              placeholder="Search former members..."
              value={formerSearch}
              onChange={(event) => setFormerSearch(event.target.value)}
            />
          </form>
        </div>

        <div className="grid gap-4">
          {showFormerMembersSkeleton
            ? Array.from({ length: 2 }, (_, index) => (
                <article className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/25 sm:rounded-[1.75rem] sm:p-5" key={index}>
                  <div className="flex items-start gap-3">
                    <SkeletonBlock className="h-14 w-14 shrink-0 rounded-2xl sm:h-20 sm:w-20 sm:rounded-3xl" />
                    <div className="grid min-w-0 flex-1 gap-2">
                      <SkeletonBlock className="h-5 w-28 rounded-full" />
                      <SkeletonBlock className="h-3 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="grid gap-3 min-[430px]:grid-cols-2">
                    {Array.from({ length: 6 }, (_, tileIndex) => (
                      <SkeletonBlock className="h-20 rounded-3xl" key={tileIndex} />
                    ))}
                  </div>
                </article>
              ))
            : formerMembers.map((member) => (
                <article className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/25 sm:rounded-[1.75rem] sm:p-5" key={member._id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-700 text-lg font-extrabold text-white sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">{member.name.slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <strong className="block break-words leading-tight">{member.name}</strong>
                      <p className="m-0 mt-1 text-xs text-slate-500 sm:text-sm">MEMBER ID: #{member.memberId}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-[11px] font-extrabold text-slate-600 sm:text-xs">FORMER</span>
                  </div>

                  <div className="grid gap-3 min-[430px]:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Phone</span>
                      <p className="m-0 mt-1 break-words">{member.phone}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Former Seat</span>
                      <p className="m-0 mt-1 break-words">{getSeatDisplay(member.hallName, member.seatNumber)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Parent</span>
                      <p className="m-0 mt-1 break-words">{member.parentName || "-"}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Parent Number</span>
                      <p className="m-0 mt-1 break-words">{member.parentPhone || "-"}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Joined</span>
                      <p className="m-0 mt-1 break-words">{formatDate(member.joinedDate)}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Moved To Former</span>
                      <p className="m-0 mt-1 break-words">{formatDate(member.archivedAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Membership Record</span>
                    <p className="m-0 break-words">{member.plan} | {formatCurrency(member.feeAmount)} | {formatDate(member.membershipStartDate)} - {formatDate(member.paidTill)}</p>
                    <p className="m-0 break-words text-sm text-slate-500">{member.notes || "No notes added."}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600">{member.shift}</span>
                    <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-600 px-4 py-2 font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={deletingFormerId === member._id} onClick={() => openFormerDeleteDialog(member)} type="button">
                      {deletingFormerId === member._id ? "Deleting..." : "Permanent Delete"}
                    </button>
                  </div>
                </article>
              ))}
          {!loadingFormerMembers && formerMembers.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No former members found.</div> : null}
        </div>
      </section>
      )}

      {directoryView === "active" && !showStudentForm && !viewingStudent ? (
      <button className="fixed bottom-24 right-3 z-40 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-700 px-4 text-sm font-extrabold text-white shadow-2xl shadow-teal-700/30 transition hover:-translate-y-0.5 min-[380px]:right-4 min-[380px]:min-h-14 min-[380px]:px-5 min-[380px]:text-base sm:hidden" onClick={openStudentForm} type="button">
        <span>+</span>
        New Member
      </button>
      ) : null}

      {directoryView === "active" && showStudentForm ? (
      <AppModal
        eyebrow="Member Form"
        isOpen={showStudentForm}
        maxWidthClassName="max-w-[760px]"
        onClose={closeStudentForm}
        title={editingId ? "Edit Student" : "Add Student"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 min-[520px]:grid-cols-2">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-name">Name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-name" name="name" value={form.name} onChange={handleFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-phone">Phone</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-phone" name="phone" type="tel" inputMode="numeric" maxLength="10" pattern="\d{10}" title="Enter exactly 10 digits" value={form.phone} onChange={handleFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-email">Email</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-email" name="email" type="email" value={form.email} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-parentName">Parent Name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-parentName" name="parentName" value={form.parentName} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-parentPhone">Parent Number</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-parentPhone" name="parentPhone" type="tel" inputMode="numeric" maxLength="10" pattern="\d{10}" title="Enter exactly 10 digits" value={form.parentPhone} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2 min-[520px]:col-span-2">
              <label className="font-semibold text-slate-600" htmlFor="student-address">Address</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-address" name="address" value={form.address} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-seat">Seat Number</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-seat" name="seatNumber" type="number" min="1" value={form.seatNumber} onChange={handleFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-hall">Hall Name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-hall" name="hallName" list="hall-options" value={form.hallName} onChange={handleFormChange} />
              <datalist id="hall-options">
                {halls.map((hall) => (
                  <option key={hall._id} value={hall.name} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-joinedDate">Joining Date</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-joinedDate" name="joinedDate" type="date" value={form.joinedDate} onChange={handleFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-plan">Plan</label>
              <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-plan" name="plan" value={form.plan} onChange={handleFormChange} required>
                <option value="1 Month">1 Month</option>
                <option value="2 Months">2 Months</option>
                <option value="3 Months">3 Months</option>
                <option value="6 Months">6 Months</option>
                <option value="12 Months">12 Months</option>
                <option value="Trial">Trial</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-fee">Fee Amount</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-fee" name="feeAmount" type="number" min="0" value={form.feeAmount} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-shift">Shift</label>
              <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-shift" name="shift" value={form.shift} onChange={handleFormChange}>
                <option value="FULL_DAY">Full Day</option>
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-paidTill">Paid Till</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-paidTill" name="paidTill" type="date" value={form.paidTill} onChange={handleFormChange} />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="font-semibold text-slate-600" htmlFor="student-notes">Notes</label>
            <textarea className="min-h-28 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-notes" name="notes" value={form.notes} onChange={handleFormChange} />
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? "Saving..." : editingId ? "Update Student" : "Add Student"}
            </button>
            <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={closeStudentForm} type="button">
              Cancel
            </button>
          </div>
        </form>
      </AppModal>
      ) : null}
    </div>
  );
}
