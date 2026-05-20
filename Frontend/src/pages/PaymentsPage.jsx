import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { useLocation } from "react-router-dom";
import FloatingToastStack from "../components/FloatingToastStack";
import { useAuth } from "../context/AuthContext";
import { useTimedAlerts } from "../hooks/useTimedAlerts";
import { apiRequest } from "../lib/api";
import { withMinimumDelay } from "../lib/async";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";
import { getPaymentMessageActions } from "../lib/messages";

const initialForm = {
  studentId: "",
  amount: "",
  paidTill: "",
  paymentDate: "",
  membershipStartDate: "",
  method: "CASH",
  notes: ""
};

const initialFilters = {
  search: "",
  method: "",
  year: "",
  month: "",
  studentId: "",
  sort: "latest"
};

const toDateInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateInputValue = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateInputDate(date);
};

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

export default function PaymentsPage() {
  const location = useLocation();
  const { token } = useAuth();
  const { error, success, setError, setSuccess } = useTimedAlerts();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [submitting, setSubmitting] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [deletingPaymentId, setDeletingPaymentId] = useState("");
  const [paymentDeleteTarget, setPaymentDeleteTarget] = useState(null);
  const [autoSendReceipt, setAutoSendReceipt] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const preselectedStudentId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return location.state?.studentId || searchParams.get("studentId") || "";
  }, [location.search, location.state]);

  const loadPayments = async (activeFilters = filters) => {
    setError("");
    setLoadingPayments(true);

    try {
      const searchParams = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });

      const summaryParams = new URLSearchParams();
      if (activeFilters.year) summaryParams.set("year", activeFilters.year);
      if (activeFilters.month) summaryParams.set("month", activeFilters.month);

      const [studentsData, paymentsData, summaryData] = await withMinimumDelay(Promise.all([
        apiRequest("/students?sort=name", { token }),
        apiRequest(`/payments${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { token }),
        apiRequest(`/payments/summary${summaryParams.toString() ? `?${summaryParams.toString()}` : ""}`, { token })
      ]), 340);

      setStudents(studentsData);
      setPayments(paymentsData);
      setSummary(summaryData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    loadPayments(initialFilters);
  }, [token]);

  useEffect(() => {
    if (!preselectedStudentId || students.length === 0) {
      return;
    }

    const selectedStudent = students.find((student) => student._id === preselectedStudentId);

    if (!selectedStudent) {
      return;
    }

    setForm((current) => {
      if (current.studentId === preselectedStudentId) {
        return current;
      }

      const membershipStartDate =
        current.membershipStartDate ||
        toDateInputDate(new Date(selectedStudent.paidTill || selectedStudent.membershipStartDate || new Date()));

      return {
        ...current,
        studentId: preselectedStudentId,
        membershipStartDate,
        paidTill: current.paidTill || getPaidTillFromPlan(membershipStartDate, selectedStudent.plan)
      };
    });
  }, [preselectedStudentId, students]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const nextForm = { ...current, [name]: value };
      const selectedStudent = students.find((student) => student._id === nextForm.studentId);

      if ((name === "studentId" || name === "membershipStartDate") && selectedStudent && !current.paidTill) {
        const startDate = nextForm.membershipStartDate || selectedStudent.paidTill || selectedStudent.membershipStartDate || new Date();
        nextForm.paidTill = getPaidTillFromPlan(startDate, selectedStudent.plan);
      }

      return nextForm;
    });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };

      if (name !== "search") {
        loadPayments(nextFilters);
      }

      return nextFilters;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadPayments();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    const shouldAutoSendReceipt = !editingPaymentId && autoSendReceipt;
    const receiptPopup = shouldAutoSendReceipt ? window.open("", "_blank") : null;

    try {
      const savedPayment = await apiRequest(editingPaymentId ? `/payments/${editingPaymentId}` : "/payments", {
        method: editingPaymentId ? "PATCH" : "POST",
        token,
        body: {
          ...form,
          amount: Number(form.amount)
        }
      });

      const savedStudent =
        savedPayment?.studentId ||
        savedPayment?.student ||
        students.find((student) => student._id === form.studentId) ||
        null;

      if (shouldAutoSendReceipt) {
        if (savedStudent?.phone) {
          const paymentMessage = getPaymentMessageActions(savedStudent, savedPayment);

          if (receiptPopup) {
            receiptPopup.location.href = paymentMessage.feeSubmissionLinks.whatsapp;
          } else {
            window.open(paymentMessage.feeSubmissionLinks.whatsapp, "_blank", "noopener,noreferrer");
          }

          setSuccess("Payment recorded and fee submission message opened in WhatsApp.");
        } else {
          receiptPopup?.close();
          setSuccess("Payment recorded successfully. Student phone number is missing, so no message was sent.");
        }
      } else {
        receiptPopup?.close();
        setSuccess(editingPaymentId ? "Payment updated successfully." : "Payment recorded successfully.");
      }

      setForm(initialForm);
      setEditingPaymentId("");
      loadPayments();
    } catch (submitError) {
      receiptPopup?.close();
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPayment = (payment) => {
    const resolvedStudentId = payment.student?._id || payment.studentId || "";

    setEditingPaymentId(payment._id);
    setError("");
    setSuccess("");
    setForm({
      studentId: String(resolvedStudentId),
      amount: payment.amount ?? "",
      paidTill: toDateInputValue(payment.paidTill),
      paymentDate: toDateInputValue(payment.paymentDate),
      membershipStartDate: toDateInputValue(payment.membershipStartDate),
      method: payment.method || "CASH",
      notes: payment.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPaymentId("");
    setForm(initialForm);
    setError("");
    setSuccess("");
  };

  const openDeletePaymentDialog = (payment) => {
    if (!payment?._id) return;
    setPaymentDeleteTarget(payment);
  };

  const handleDeletePayment = async () => {
    if (!paymentDeleteTarget?._id) return;

    setDeletingPaymentId(paymentDeleteTarget._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/payments/${paymentDeleteTarget._id}`, {
        method: "DELETE",
        token
      });

      if (editingPaymentId === paymentDeleteTarget._id) {
        setEditingPaymentId("");
        setForm(initialForm);
      }

      setSuccess("Payment deleted successfully.");
      setPaymentDeleteTarget(null);
      loadPayments();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingPaymentId("");
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <FloatingToastStack error={error} success={success} />
      <ConfirmDialog
        isLoading={Boolean(deletingPaymentId)}
        isOpen={Boolean(paymentDeleteTarget)}
        title="Delete this payment?"
        description={`Remove the payment of ${formatCurrency(paymentDeleteTarget?.amount)} for ${paymentDeleteTarget?.student?.name || "this student"}? This will also refresh the linked student payment status.`}
        confirmLabel="Delete Payment"
        onClose={() => setPaymentDeleteTarget(null)}
        onConfirm={handleDeletePayment}
        tone="danger"
      />

      <section className="grid gap-5 sm:gap-6">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
          <div className="grid gap-1">
            <h3 className="m-0 text-2xl font-extrabold">{editingPaymentId ? "Edit Payment" : "Add Payment"}</h3>
            <p className="m-0 text-sm text-slate-500 sm:text-base">
              {editingPaymentId
                ? "Update the payment record and keep the linked student membership in sync."
                : "Record fee collection and automatically update the student status."}
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 min-[520px]:grid-cols-2">
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="payment-studentId">Student</label>
                <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="payment-studentId" name="studentId" value={form.studentId} onChange={handleFormChange} required>
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} (#{student.memberId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="payment-amount">Amount</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="payment-amount" name="amount" type="number" min="1" value={form.amount} onChange={handleFormChange} required />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="payment-paidTill">Paid Till</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="payment-paidTill" name="paidTill" type="date" value={form.paidTill} onChange={handleFormChange} />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="payment-paymentDate">Payment Date</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="payment-paymentDate" name="paymentDate" type="date" value={form.paymentDate} onChange={handleFormChange} />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="payment-membershipStartDate">Membership Start</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  id="payment-membershipStartDate"
                  name="membershipStartDate"
                  type="date"
                  value={form.membershipStartDate}
                  onChange={handleFormChange}
                />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="payment-method">Method</label>
                <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="payment-method" name="method" value={form.method} onChange={handleFormChange}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="payment-notes">Notes</label>
              <textarea className="min-h-28 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="payment-notes" name="notes" value={form.notes} onChange={handleFormChange} />
            </div>

            {!editingPaymentId ? (
              <label className="flex items-start gap-3 rounded-[1.25rem] border border-teal-100 bg-teal-50 p-4 text-sm text-slate-700">
                <input
                  checked={autoSendReceipt}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                  onChange={(event) => setAutoSendReceipt(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong className="block font-extrabold text-teal-800">Auto-send fee receipt message</strong>
                  After saving payment, WhatsApp opens with a message containing amount, submission date, and paid till date.
                </span>
              </label>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={submitting} type="submit">
                {submitting ? "Saving..." : editingPaymentId ? "Update Payment" : "Save Payment"}
              </button>
              {editingPaymentId ? (
                <button className="min-h-12 rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={handleCancelEdit} type="button">
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="grid gap-3 min-[520px]:grid-cols-3 sm:gap-4">
          <div className="grid gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Revenue</span>
            <strong className="break-words text-2xl leading-tight text-slate-950">{formatCurrency(summary?.totalRevenue)}</strong>
          </div>
          <div className="grid gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Transactions</span>
            <strong className="text-2xl leading-tight text-slate-950">{summary?.totalTransactions ?? 0}</strong>
          </div>
          <div className="grid gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Paid Students</span>
            <strong className="text-2xl leading-tight text-slate-950">{summary?.paidStudents ?? 0}</strong>
          </div>
        </article>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,340px)]">
          <div className="grid min-w-0 gap-1">
            <h3 className="m-0 text-2xl font-extrabold">Payment History</h3>
            <p className="m-0 text-sm text-slate-500 sm:text-base">Filter by method, month, student, and amount order.</p>
          </div>
          <form onSubmit={handleSearchSubmit}>
            <input
              className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              name="search"
              placeholder="Search name, seat, member, notes"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </form>
        </div>

        <div className="grid gap-4 min-[520px]:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-2">
            <label className="font-semibold text-slate-600">Method</label>
            <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="method" value={filters.method} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="font-semibold text-slate-600">Student</label>
            <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="studentId" value={filters.studentId} onChange={handleFilterChange}>
              <option value="">All</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} (#{student.memberId})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label className="font-semibold text-slate-600">Year</label>
            <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="year" type="number" placeholder="2026" value={filters.year} onChange={handleFilterChange} />
          </div>
          <div className="grid gap-2">
            <label className="font-semibold text-slate-600">Month</label>
            <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="month" type="number" min="1" max="12" placeholder="4" value={filters.month} onChange={handleFilterChange} />
          </div>
          <div className="grid gap-2">
            <label className="font-semibold text-slate-600">Sort</label>
            <select className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="sort" value={filters.sort} onChange={handleFilterChange}>
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="amountHigh">Amount High</option>
              <option value="amountLow">Amount Low</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:hidden">
          {payments.map((payment) => (
            <article className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20" key={payment._id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block break-words leading-tight">{payment.student?.name || "Deleted student"}</strong>
                  <p className="m-0 mt-1 break-words text-sm text-slate-500">
                    #{payment.student?.memberId || "-"} | Seat {payment.student?.seatNumber || "-"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">{payment.method}</span>
              </div>

              <div className="grid gap-3 min-[430px]:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Amount</span>
                  <p className="m-0 mt-1 break-words font-bold">{formatCurrency(payment.amount)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Payment Date</span>
                  <p className="m-0 mt-1 break-words">{formatDate(payment.paymentDate)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Paid Till</span>
                  <p className="m-0 mt-1 break-words">{formatDate(payment.paidTill)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Notes</span>
                  <p className="m-0 mt-1 break-words">{payment.notes || "-"}</p>
                </div>
              </div>

              <div className="grid gap-2 min-[430px]:grid-cols-2">
                <button className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => handleEditPayment(payment)} type="button">
                  Edit
                </button>
                <button className="min-h-11 rounded-full bg-red-50 px-4 py-2 font-extrabold text-red-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={deletingPaymentId === payment._id} onClick={() => openDeletePaymentDialog(payment)} type="button">
                  {deletingPaymentId === payment._id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
          {!loadingPayments && payments.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No payments found for the current filters.</div> : null}
        </div>

        <div className="hidden w-full overflow-x-auto rounded-3xl border border-slate-200 md:block">
          <table className="w-full min-w-[760px] border-collapse bg-white">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Student</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Method</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Payment Date</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Paid Till</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Notes</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Student">
                    <strong className="block break-words">{payment.student?.name || "Deleted student"}</strong>
                    <div className="break-words text-slate-500">
                      #{payment.student?.memberId || "-"} | Seat {payment.student?.seatNumber || "-"}
                    </div>
                  </td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Amount">{formatCurrency(payment.amount)}</td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Method">{payment.method}</td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Payment Date">{formatDate(payment.paymentDate)}</td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Paid Till">{formatDate(payment.paidTill)}</td>
                  <td className="max-w-[220px] break-words border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Notes">{payment.notes || "-"}</td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Actions">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => handleEditPayment(payment)} type="button">
                        Edit
                      </button>
                      <button className="rounded-full bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={deletingPaymentId === payment._id} onClick={() => openDeletePaymentDialog(payment)} type="button">
                        {deletingPaymentId === payment._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loadingPayments && payments.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No payments found for the current filters.</div> : null}
        </div>
      </section>
    </div>
  );
}





