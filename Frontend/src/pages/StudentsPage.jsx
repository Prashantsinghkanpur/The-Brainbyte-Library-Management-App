import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage, toDateInputValue } from "../lib/format";
import { getStudentMessageActions } from "../lib/messages";

const initialForm = {
  name: "",
  phone: "",
  parentName: "",
  parentPhone: "",
  seatNumber: "",
  plan: "1 Month",
  feeAmount: "",
  paidTill: "",
  hallName: "",
  shift: "FULL_DAY",
  joinedDate: "",
  membershipStartDate: "",
  notes: ""
};

const initialFilters = {
  search: "",
  status: "",
  shift: "",
  hallName: "",
  paymentStatus: "",
  sort: "recent"
};

export default function StudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [showStudentForm, setShowStudentForm] = useState(false);

  const loadData = async (activeFilters = filters) => {
    setLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });

      const [studentsData, hallsData] = await Promise.all([
        apiRequest(`/students${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { token }),
        apiRequest("/seats/halls", { token })
      ]);

      setStudents(studentsData);
      setHalls(hallsData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(initialFilters);

    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setShowStudentForm(true);
    }
  }, [token]);

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

  const applyQuickFilter = (nextValues) => {
    setFilters((current) => {
      const nextFilters = { ...current, ...nextValues };
      loadData(nextFilters);
      return nextFilters;
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const openStudentForm = () => {
    resetForm();
    setShowStudentForm(true);
    window.setTimeout(() => {
      document.getElementById("student-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleView = async (student) => {
    setLoadingStudentDetail(true);
    setError("");

    try {
      const studentDetail = await apiRequest(`/students/${student._id}`, { token });
      setViewingStudent(studentDetail);
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
    window.setTimeout(() => {
      document.getElementById("student-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
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

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="flex items-start justify-between gap-3 pt-2 sm:pt-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">MANAGEMENT</p>
          <h1 className="m-0 mt-1 text-[2.7rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-7xl">Directory</h1>
        </div>
        <div className="grid min-h-16 min-w-16 shrink-0 place-items-center rounded-3xl bg-teal-50 p-3 text-center text-teal-700 sm:min-h-20 sm:min-w-20">
          <strong className="text-2xl leading-none sm:text-3xl">{students.length}</strong>
          <span className="text-[10px] font-extrabold uppercase tracking-wider sm:text-xs">Profiles</span>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{success}</div> : null}

      {viewingStudent ? (
        <section className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">MEMBER #{viewingStudent.memberId}</p>
              <h3 className="m-0 mt-1 break-words text-2xl font-extrabold">{viewingStudent.name}</h3>
            </div>
            <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => setViewingStudent(null)} type="button">
              Close
            </button>
          </div>

          <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-sky-600 text-xl font-extrabold text-white sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">{viewingStudent.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <strong>{viewingStudent.plan}</strong>
              <p className="m-0 break-words text-sm text-slate-500 sm:text-base">
                {viewingStudent.hallName} | Seat #{viewingStudent.seatNumber} | {viewingStudent.shift}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700">{viewingStudent.status}</span>
                <span className="inline-flex items-center justify-center rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">{formatCurrency(viewingStudent.feeAmount)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Phone</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.phone}</p>
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
              <p className="m-0 mt-1 break-words">{viewingStudent.hallName} | #{viewingStudent.seatNumber}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Shift</span>
              <p className="m-0 mt-1 break-words">{viewingStudent.shift}</p>
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
            <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => setViewingStudent(null)} type="button">
              Back to List
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40">
        <form onSubmit={handleSearchSubmit}>
          <input
            className="min-h-14 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-lg outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            name="search"
            placeholder="Search by name or number..."
            value={filters.search}
            onChange={handleFilterChange}
          />
        </form>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={!filters.shift ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
              onClick={() => applyQuickFilter({ shift: "" })}
            >
              All Shifts
            </button>
            <button
              type="button"
              className={filters.shift === "FULL_DAY" ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
              onClick={() => applyQuickFilter({ shift: filters.shift === "FULL_DAY" ? "" : "FULL_DAY" })}
            >
              Full Day
            </button>
          </div>
        </div>

        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            className={filters.sort === "recent" ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
            onClick={() => applyQuickFilter({ sort: "recent", paymentStatus: "", status: "" })}
          >
            Recent
          </button>
          <button
            type="button"
            className={filters.paymentStatus === "PAID" ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
            onClick={() => applyQuickFilter({ paymentStatus: filters.paymentStatus === "PAID" ? "" : "PAID", status: "" })}
          >
            Paid
          </button>
          <button
            type="button"
            className={filters.paymentStatus === "DUE" ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
            onClick={() => applyQuickFilter({ paymentStatus: filters.paymentStatus === "DUE" ? "" : "DUE", status: "" })}
          >
            Dues
          </button>
          <button
            type="button"
            className={filters.status === "ACTIVE" ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
            onClick={() => applyQuickFilter({ status: filters.status === "ACTIVE" ? "" : "ACTIVE", paymentStatus: "" })}
          >
            Active
          </button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="m-0 text-2xl font-extrabold">Profiles</h3>
          <button className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-teal-700 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 sm:min-h-12 sm:px-5 sm:py-3 sm:text-base" onClick={openStudentForm} type="button">
            New Member
          </button>
        </div>

        <div className="grid gap-4">
          {students.map((student) => {
            const actions = getStudentMessageActions(student);

            return (
              <article className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/25 sm:rounded-[1.75rem] sm:p-5" key={student._id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sky-600 text-lg font-extrabold text-white sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">{student.name.slice(0, 2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <strong className="block break-words leading-tight">{student.name}</strong>
                    <p className="m-0 mt-1 text-xs text-slate-500 sm:text-sm">MEMBER ID: #{student.memberId}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-700 sm:text-xs">{student.status}</span>
                </div>

                <div className="grid gap-3 min-[430px]:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Phone</span>
                    <p className="m-0 mt-1 break-words">{student.phone}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Status</span>
                    <p className="m-0 mt-1 break-words">{student.status}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Parent</span>
                    <p className="m-0 mt-1 break-words">{student.parentName || "-"}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Parent Number</span>
                    <p className="m-0 mt-1 break-words">{student.parentPhone || "-"}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Joined</span>
                    <p className="m-0 mt-1 break-words">{formatDate(student.joinedDate)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Seat</span>
                    <p className="m-0 mt-1 break-words">{student.hallName} - #{student.seatNumber}</p>
                  </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 min-[430px]:flex min-[430px]:items-center min-[430px]:justify-between">
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Membership Validity</span>
                    <p className="m-0 mt-1 break-words">
                      {formatDate(student.membershipStartDate)} - {formatDate(student.paidTill)}
                    </p>
                  </div>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-5 py-2 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5" onClick={() => handleEdit(student)} type="button">
                    Edit
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">{student.shift}</span>
                  <span className="inline-flex items-center justify-center rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">{formatCurrency(student.feeAmount)}</span>
                </div>

                <div className="grid gap-2 min-[430px]:grid-cols-2 lg:grid-cols-3">
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-50 px-4 py-2 font-bold text-teal-700 transition hover:-translate-y-0.5" disabled={loadingStudentDetail} onClick={() => handleView(student)} type="button">
                    {loadingStudentDetail ? "Opening..." : "View"}
                  </button>
                  <a className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-50 px-4 py-2 font-bold text-teal-700 transition hover:-translate-y-0.5" href={actions.welcomeLinks.whatsapp} target="_blank" rel="noreferrer">
                    Welcome WhatsApp
                  </a>
                  <a className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-50 px-4 py-2 font-bold text-teal-700 transition hover:-translate-y-0.5" href={actions.reminderLinks.whatsapp} target="_blank" rel="noreferrer">
                    Reminder WhatsApp
                  </a>
                  <a className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" href={actions.welcomeLinks.sms}>
                    Welcome SMS
                  </a>
                  <a className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" href={actions.reminderLinks.sms}>
                    Reminder SMS
                  </a>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => handleCopyMessage(student, "welcome")} type="button">
                    {copiedId === `${student._id}-welcome` ? "Copied" : "Copy Welcome"}
                  </button>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => handleCopyMessage(student, "reminder")} type="button">
                    {copiedId === `${student._id}-reminder` ? "Copied" : "Copy Reminder"}
                  </button>
                </div>
              </article>
            );
          })}
          {!loading && students.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No students found for the current filters.</div> : null}
        </div>
      </section>

      {showStudentForm ? (
      <section id="student-form-section" className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="m-0 text-2xl font-extrabold">{editingId ? "Edit Student" : "Add Student"}</h3>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 min-[520px]:grid-cols-2">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-name">Name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-name" name="name" value={form.name} onChange={handleFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-phone">Phone</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-phone" name="phone" value={form.phone} onChange={handleFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-parentName">Parent Name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-parentName" name="parentName" value={form.parentName} onChange={handleFormChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="student-parentPhone">Parent Number</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="student-parentPhone" name="parentPhone" value={form.parentPhone} onChange={handleFormChange} />
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
            {editingId ? (
              <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => { resetForm(); setShowStudentForm(false); }} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
      ) : null}
    </div>
  );
}






