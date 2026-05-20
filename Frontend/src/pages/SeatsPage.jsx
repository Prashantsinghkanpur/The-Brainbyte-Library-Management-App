import { useEffect, useRef, useState } from "react";
import AppModal from "../components/AppModal";
import ConfirmDialog from "../components/ConfirmDialog";
import FloatingToastStack from "../components/FloatingToastStack";
import SkeletonBlock from "../components/SkeletonBlock";
import { useAuth } from "../context/AuthContext";
import { useTimedAlerts } from "../hooks/useTimedAlerts";
import { apiRequest } from "../lib/api";
import { withMinimumDelay } from "../lib/async";
import { buildCacheKey, readCachedValue, writeCachedValue } from "../lib/cache";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

const initialHallForm = {
  name: "",
  totalSeats: ""
};

const initialFilters = {
  hallName: "",
  shift: "ALL",
  status: "ALL",
  dues: "ALL",
  search: ""
};

const SEAT_GRID_CACHE_MAX_AGE = 5 * 60 * 1000;

const getSeatInitials = (name) => {
  if (!name) return "+";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return parts[0].slice(0, 2).toUpperCase();
};

const getSeatShiftLabel = (shift) => (shift ? shift.replace(/_/g, " ") : "AVAILABLE");

const buildSeatFilterQuery = (filters) => {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "ALL") searchParams.set(key, value);
  });

  return searchParams.toString();
};

const getSeatDisplay = (hallName, seatNumber) => (
  Number.isInteger(Number(seatNumber)) && Number(seatNumber) > 0
    ? `${hallName || "Hall"} - #${seatNumber}`
    : "Unallocated"
);

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

const getSeatStatusMeta = (student) => {
  if (!student) {
    return {
      label: "AVAILABLE",
      tone: "vacant"
    };
  }

  if (student.duesState === "PAID") {
    if (student.daysRemaining <= 30) {
      return {
        label: "PAID",
        tone: "paid"
      };
    }

    return {
      label: `${student.daysRemaining}d`,
      tone: "running"
    };
  }

  return {
    label: student.daysRemaining > 0 ? `${student.daysRemaining}d` : "DUE",
    tone: "due"
  };
};

function SeatBadge({ student }) {
  const meta = getSeatStatusMeta(student);

  if (meta.tone === "vacant") {
    return null;
  }

  const toneClasses = {
    running: "bg-sky-50 text-sky-600",
    paid: "bg-emerald-50 text-emerald-600",
    due: "bg-rose-50 text-rose-500"
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.04em] ${toneClasses[meta.tone]}`}>
      {meta.tone === "running" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2v7.31" />
          <path d="M14 9.3V1.99" />
          <path d="M8.5 2h7" />
          <path d="M14 9.3a6 6 0 1 1-4 0" />
        </svg>
      ) : null}
      {meta.tone === "paid" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ) : null}
      {meta.tone === "due" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6" />
          <path d="M12 16h.01" />
        </svg>
      ) : null}
      {meta.label}
    </span>
  );
}

export default function SeatsPage() {
  const { token, user } = useAuth();
  const { error, success, setError, setSuccess } = useTimedAlerts();
  const [gridData, setGridData] = useState({ halls: [], summary: {}, seats: [], selectedHall: null });
  const [hallForm, setHallForm] = useState(initialHallForm);
  const [editingHallId, setEditingHallId] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [submitting, setSubmitting] = useState(false);
  const [deletingHallId, setDeletingHallId] = useState("");
  const [showHallForm, setShowHallForm] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [hallDeleteTarget, setHallDeleteTarget] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const activeStudentRequestRef = useRef(0);
  const hasGridSnapshot = gridData.seats.length > 0 || gridData.halls.length > 0 || Boolean(gridData.selectedHall);
  const editingHall = gridData.halls.find((hall) => hall._id === editingHallId) || gridData.selectedHall;
  const showStudentDetailModal = Boolean(viewingStudent) || loadingStudentDetail;

  const loadGrid = async (nextFilters = filters) => {
    setError("");
    const searchQuery = buildSeatFilterQuery(nextFilters);
    const cacheKey = buildCacheKey("seat-grid", user?.libraryId || "default", searchQuery || "all");
    const cachedGrid = readCachedValue(cacheKey, {
      maxAgeMs: SEAT_GRID_CACHE_MAX_AGE,
      allowExpired: true
    });

    if (cachedGrid) {
      setGridData(cachedGrid);
      setLoadingGrid(false);
    } else if (!hasGridSnapshot) {
      setLoadingGrid(true);
    }

    try {
      const data = await withMinimumDelay(
        apiRequest(`/seats/grid${searchQuery ? `?${searchQuery}` : ""}`, { token }),
        cachedGrid || hasGridSnapshot ? 0 : 340
      );
      setGridData(data);
      writeCachedValue(cacheKey, data);

      if (!nextFilters.hallName && data.selectedHall?.name) {
        setFilters((current) => ({ ...current, hallName: data.selectedHall.name }));
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingGrid(false);
    }
  };

  useEffect(() => {
    loadGrid(initialFilters);
  }, [token, user?.libraryId]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };

      if (name !== "search") {
        loadGrid(nextFilters);
      }

      return nextFilters;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadGrid();
  };

  const handleHallFormChange = (event) => {
    const { name, value } = event.target;
    setHallForm((current) => ({ ...current, [name]: value }));
  };

  const resetHallForm = () => {
    setHallForm(initialHallForm);
    setEditingHallId("");
  };

  const closeHallForm = () => {
    resetHallForm();
    setShowHallForm(false);
  };

  const openHallForm = () => {
    resetHallForm();
    setShowHallForm(true);
  };

  const openAddSeatsForm = () => {
    if (gridData.selectedHall) {
      setEditingHallId(gridData.selectedHall._id);
      setHallForm({
        name: gridData.selectedHall.name,
        totalSeats: Number(gridData.selectedHall.totalSeats || 0) + 1
      });
    } else {
      resetHallForm();
    }

    setShowHallForm(true);
  };

  const handleHallSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const trimmedName = hallForm.name.trim();
      const numericTotalSeats = Number(hallForm.totalSeats);

      if (!trimmedName) {
        throw new Error("Hall name is required.");
      }

      if (!Number.isInteger(numericTotalSeats) || numericTotalSeats <= 0) {
        throw new Error("Total seats must be a positive whole number.");
      }

      const payload = {
        name: trimmedName,
        totalSeats: numericTotalSeats
      };

      if (editingHallId) {
        await apiRequest(`/seats/halls/${editingHallId}`, {
          method: "PATCH",
          token,
          body: payload
        });
        setSuccess("Seats updated successfully.");
      } else {
        await apiRequest("/seats/halls", {
          method: "POST",
          token,
          body: payload
        });
        setSuccess("Hall added successfully.");
      }

      closeHallForm();
      loadGrid({ ...filters, hallName: payload.name });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHallEdit = (hall) => {
    if (!hall) return;
    setEditingHallId(hall._id);
    setHallForm({ name: hall.name, totalSeats: hall.totalSeats });
    setShowHallForm(true);
  };

  const openHallDeleteDialog = (hall) => {
    if (!hall?._id) return;
    setHallDeleteTarget(hall);
  };

  const handleHallDelete = async () => {
    if (!hallDeleteTarget?._id) return;

    setDeletingHallId(hallDeleteTarget._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/seats/halls/${hallDeleteTarget._id}`, { method: "DELETE", token });
      setSuccess("Hall deleted successfully.");
      setHallDeleteTarget(null);
      closeHallForm();
      setFilters((current) => ({ ...current, hallName: "" }));
      loadGrid({ ...filters, hallName: "" });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingHallId("");
    }
  };

  const closeStudentDetailModal = () => {
    activeStudentRequestRef.current += 1;
    setLoadingStudentDetail(false);
    setViewingStudent(null);
  };

  const handleSeatOpenProfile = async (seat) => {
    if (!seat?.student?.id) return;

    const requestId = activeStudentRequestRef.current + 1;
    activeStudentRequestRef.current = requestId;

    setError("");
    setViewingStudent(null);
    setLoadingStudentDetail(true);

    try {
      const studentDetail = await apiRequest(`/students/${seat.student.id}`, { token });

      if (activeStudentRequestRef.current !== requestId) {
        return;
      }

      setViewingStudent(studentDetail);
    } catch (viewError) {
      if (activeStudentRequestRef.current === requestId) {
        setError(getErrorMessage(viewError));
      }
    } finally {
      if (activeStudentRequestRef.current === requestId) {
        setLoadingStudentDetail(false);
      }
    }
  };

  const showSeatGridSkeleton = loadingGrid && gridData.seats.length === 0;

  return (
    <div className="grid gap-3 sm:gap-6">
      <FloatingToastStack error={error} success={success} />
      <ConfirmDialog
        isLoading={Boolean(deletingHallId)}
        isOpen={Boolean(hallDeleteTarget)}
        title={`Delete ${hallDeleteTarget?.name || "hall"}?`}
        description={`This will remove the hall only if no students are assigned to it. Delete ${hallDeleteTarget?.name || "this hall"} now?`}
        confirmLabel="Delete Hall"
        onClose={() => setHallDeleteTarget(null)}
        onConfirm={handleHallDelete}
        tone="danger"
      />
      <AppModal
        eyebrow={viewingStudent ? `Member #${viewingStudent.memberId}` : "Loading Member"}
        isOpen={showStudentDetailModal}
        maxWidthClassName="max-w-[760px]"
        onClose={closeStudentDetailModal}
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
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-sky-600 text-xl font-extrabold text-white sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">
                {viewingStudent.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <strong>{viewingStudent.plan}</strong>
                <p className="m-0 break-words text-sm text-slate-500 sm:text-base">
                  {getSeatDisplay(viewingStudent.hallName, viewingStudent.seatNumber)} | {getSeatShiftLabel(viewingStudent.shift)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">{viewingStudent.status}</span>
                  <span className="inline-flex items-center justify-center rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">
                    {formatCurrency(viewingStudent.feeAmount)}
                  </span>
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
                <p className="m-0 mt-1 break-words">{getSeatShiftLabel(viewingStudent.shift)}</p>
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
          </>
        )}
      </AppModal>

      <section className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between sm:pt-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">MANAGEMENT</p>
          <h1 className="m-0 mt-1 text-[2rem] font-black leading-none text-slate-950 min-[380px]:text-[2.8rem] sm:text-7xl">Space Grid</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-3">
          <button className="grid min-h-11 place-items-center rounded-2xl bg-white px-4 text-lg font-bold shadow-xl shadow-slate-300/40 sm:h-14 sm:w-14 sm:px-0" onClick={() => { resetHallForm(); setShowHallForm(false); }} type="button" aria-label="Clear hall form">
            X
          </button>
          <button className="grid min-h-11 place-items-center rounded-2xl bg-teal-700 px-4 text-3xl text-white shadow-xl shadow-teal-700/20 sm:h-14 sm:w-14 sm:px-0" onClick={openHallForm} type="button" aria-label="Add hall">
            +
          </button>
        </div>
      </section>

      <section className="grid gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/40 min-[380px]:p-4 sm:gap-4 sm:rounded-[1.75rem] sm:p-5">
        <form onSubmit={handleSearchSubmit}>
          <input
            className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 sm:min-h-14 sm:text-lg"
            name="search"
            placeholder="Find student or seat..."
            value={filters.search}
            onChange={handleFilterChange}
          />
        </form>

        <div className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-4">
          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/20 sm:rounded-3xl sm:p-4">
            <strong className="block text-xl font-black leading-none text-slate-950 sm:text-2xl">{gridData.summary.filledSeats ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Filled</span>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/20 sm:rounded-3xl sm:p-4">
            <strong className="block text-xl font-black leading-none text-slate-950 sm:text-2xl">{gridData.summary.vacantSeats ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Vacant</span>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/20 sm:rounded-3xl sm:p-4">
            <strong className="block text-xl font-black leading-none text-slate-950 sm:text-2xl">{gridData.summary.totalStudents ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Students</span>
          </div>
          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/20 sm:rounded-3xl sm:p-4">
            <strong className="block text-xl font-black leading-none text-slate-950 sm:text-2xl">{gridData.summary.totalSeats ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Seats</span>
          </div>
        </div>

        <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
          <select className="min-h-11 w-full rounded-3xl border-0 bg-teal-700 px-4 text-sm font-bold text-white sm:min-h-12 sm:w-auto sm:px-5 sm:text-base" name="hallName" value={filters.hallName} onChange={handleFilterChange}>
            <option value="">Main Hall</option>
            {gridData.halls.map((hall) => (
              <option key={hall._id} value={hall.name}>
                {hall.name}
              </option>
            ))}
          </select>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <button className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-base" onClick={() => handleHallEdit(gridData.selectedHall)} type="button" disabled={!gridData.selectedHall}>
              Edit Seats
            </button>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-base"
              onClick={() => openHallDeleteDialog(gridData.selectedHall)}
              type="button"
              disabled={!gridData.selectedHall || deletingHallId === gridData.selectedHall?._id}
            >
              {deletingHallId === gridData.selectedHall?._id ? "Deleting..." : "Delete Hall"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4">
          <div className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">Shift</span>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:gap-3">
              {["ALL", "FULL_DAY", "MORNING", "EVENING", "CUSTOM"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.shift === value ? "whitespace-nowrap rounded-full bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-teal-700/20 min-[380px]:px-4 sm:text-sm" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:-translate-y-0.5 min-[380px]:px-4 sm:text-sm"}
                  onClick={() => handleFilterChange({ target: { name: "shift", value } })}
                >
                  {value.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">Status</span>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:gap-3">
              {["ALL", "VACANT", "OCCUPIED"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.status === value ? "whitespace-nowrap rounded-full bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-teal-700/20 min-[380px]:px-4 sm:text-sm" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:-translate-y-0.5 min-[380px]:px-4 sm:text-sm"}
                  onClick={() => handleFilterChange({ target: { name: "status", value } })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">Dues</span>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:gap-3">
              {["ALL", "PAID", "UNPAID", "TRIAL"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.dues === value ? "whitespace-nowrap rounded-full bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-teal-700/20 min-[380px]:px-4 sm:text-sm" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 transition hover:-translate-y-0.5 min-[380px]:px-4 sm:text-sm"}
                  onClick={() => handleFilterChange({ target: { name: "dues", value } })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 rounded-[1.35rem] border border-[#d9e7ef] bg-white p-3.5 shadow-xl shadow-slate-300/25 min-[380px]:p-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-[1.6rem] sm:p-5">
          <div className="min-w-0">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">Seat Layout</p>
            <h3 className="m-0 mt-1 text-lg font-black text-slate-950 min-[380px]:text-xl">{gridData.selectedHall?.name || "Main Hall"}</h3>
            <p className="m-0 mt-1 text-sm font-bold text-slate-500">
              {gridData.summary.totalSeats ?? 0} seats mapped for this hall
            </p>
          </div>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 sm:w-auto sm:text-base"
            onClick={openAddSeatsForm}
            type="button"
          >
            Add More Seats
          </button>
        </div>

        <div className="rounded-[1.45rem] border border-[#d8e8ef] bg-gradient-to-b from-[#eff7fb] to-[#e8f3f8] p-2 shadow-xl shadow-slate-300/20 min-[380px]:p-3 sm:rounded-[1.8rem] sm:p-4">
          <div className="grid grid-cols-2 gap-2 min-[380px]:gap-3 xl:grid-cols-3">
            {showSeatGridSkeleton
              ? Array.from({ length: 6 }, (_, index) => (
                  <article className="grid min-h-[11.5rem] rounded-[1.15rem] border border-[#d9e8ee] bg-white/90 p-3 shadow-[0_12px_24px_rgba(148,184,198,0.18)] min-[380px]:min-h-[13rem] min-[380px]:rounded-[1.35rem] min-[380px]:p-4 sm:min-h-[15.5rem] sm:rounded-[1.55rem]" key={index}>
                    <div className="flex items-start justify-between gap-3">
                      <SkeletonBlock className="h-5 w-12 rounded-full" />
                      <SkeletonBlock className="h-6 w-14 rounded-full" />
                    </div>
                    <div className="mt-6 grid justify-items-center gap-4">
                      <SkeletonBlock className="h-16 w-16 rounded-full sm:h-20 sm:w-20" />
                      <SkeletonBlock className="h-5 w-24 rounded-full" />
                      <SkeletonBlock className="h-7 w-20 rounded-full" />
                    </div>
                  </article>
                ))
              : gridData.seats.map((seat) => (
                  <article
                    className={`relative grid min-h-[11.5rem] content-start rounded-[1.15rem] border p-3 shadow-[0_12px_24px_rgba(148,184,198,0.18)] min-[380px]:min-h-[13rem] min-[380px]:rounded-[1.35rem] min-[380px]:p-4 sm:min-h-[15.5rem] sm:rounded-[1.55rem] ${
                      seat.student ? "cursor-pointer border-[#cfe1e8] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(148,184,198,0.22)]" : "border-[#d9e8ee] bg-white/90"
                    }`}
                    key={`${seat.hallName}-${seat.seatNumber}`}
                    onClick={seat.student ? () => handleSeatOpenProfile(seat) : undefined}
                    onKeyDown={seat.student ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSeatOpenProfile(seat);
                      }
                    } : undefined}
                    role={seat.student ? "button" : undefined}
                    tabIndex={seat.student ? 0 : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[0.95rem] font-black text-slate-900 min-[380px]:text-[1.05rem] sm:text-xl">
                        <span
                          className={`h-2 w-2 rounded-full min-[380px]:h-2.5 min-[380px]:w-2.5 ${
                            seat.student
                              ? seat.student.duesState === "PAID"
                                ? "bg-teal-500"
                                : "bg-rose-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {seat.seatNumber}
                      </span>
                      <SeatBadge student={seat.student} />
                    </div>

                    {seat.student ? (
                      <div className="mt-3 grid flex-1 content-center justify-items-center text-center min-[380px]:mt-4">
                        <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-yellow-300 bg-sky-600 text-[1.5rem] font-black text-white shadow-[0_10px_24px_rgba(14,116,144,0.22)] min-[380px]:h-16 min-[380px]:w-16 min-[380px]:text-[1.7rem] sm:h-20 sm:w-20 sm:text-[2rem]">
                          {getSeatInitials(seat.student.name)}
                        </div>
                        <strong className="mt-3 block min-w-0 break-words text-[0.92rem] font-black uppercase leading-tight text-slate-950 min-[380px]:mt-4 min-[380px]:text-[1.02rem] sm:mt-5 sm:text-[1.2rem]">
                          {seat.student.name}
                        </strong>
                        <span className="mt-3 inline-flex items-center justify-center rounded-full border border-[#d3e5e8] bg-[#f8fdfd] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-teal-700 min-[380px]:mt-4 min-[380px]:px-3 min-[380px]:py-1.5 min-[380px]:text-[0.72rem]">
                          {getSeatShiftLabel(seat.student.shift)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 grid flex-1 content-center justify-items-center text-center min-[380px]:mt-4">
                        <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[#d9e2e8] bg-white text-4xl font-thin leading-none text-slate-400 min-[380px]:h-16 min-[380px]:w-16 min-[380px]:text-5xl sm:h-20 sm:w-20">
                          +
                        </div>
                        <strong className="mt-4 block text-[0.72rem] font-black uppercase tracking-[0.16em] text-slate-400 min-[380px]:mt-5 min-[380px]:text-sm sm:mt-7 sm:text-base">
                          Available
                        </strong>
                      </div>
                    )}
                  </article>
                ))}
          </div>
        </div>
      </section>

      <AppModal
        eyebrow={editingHallId ? "Hall Settings" : "New Hall"}
        isOpen={showHallForm}
        maxWidthClassName="max-w-[620px]"
        onClose={closeHallForm}
        title={editingHallId ? "Edit Hall" : "Add Hall"}
      >
        <form className="grid gap-4" onSubmit={handleHallSubmit}>
          <div className="grid gap-4 min-[520px]:grid-cols-2">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="hall-name">Hall name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="hall-name" name="name" value={hallForm.name} onChange={handleHallFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="hall-totalSeats">Total seats</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="hall-totalSeats" name="totalSeats" type="number" min="1" value={hallForm.totalSeats} onChange={handleHallFormChange} required />
            </div>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? "Saving..." : editingHallId ? "Update Hall" : "Add Hall"}
            </button>
            {editingHallId ? (
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => openHallDeleteDialog(editingHall)}
                type="button"
                disabled={deletingHallId === editingHallId}
              >
                {deletingHallId === editingHallId ? "Deleting..." : "Delete Hall"}
              </button>
            ) : null}
          </div>
        </form>
      </AppModal>
    </div>
  );
}




