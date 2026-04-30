import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

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

export default function PaymentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = async (activeFilters = filters) => {
    setError("");

    try {
      const searchParams = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });

      const summaryParams = new URLSearchParams();
      if (activeFilters.year) summaryParams.set("year", activeFilters.year);
      if (activeFilters.month) summaryParams.set("month", activeFilters.month);

      const [studentsData, paymentsData, summaryData] = await Promise.all([
        apiRequest("/students?sort=name", { token }),
        apiRequest(`/payments${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { token }),
        apiRequest(`/payments/summary${summaryParams.toString() ? `?${summaryParams.toString()}` : ""}`, { token })
      ]);

      setStudents(studentsData);
      setPayments(paymentsData);
      setSummary(summaryData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  };

  useEffect(() => {
    loadPayments(initialFilters);
  }, [token]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
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

    try {
      await apiRequest("/payments", {
        method: "POST",
        token,
        body: {
          ...form,
          amount: Number(form.amount)
        }
      });

      setSuccess("Payment recorded successfully.");
      setForm(initialForm);
      loadPayments();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <section className="grid gap-5 sm:gap-6">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
          <div className="grid gap-1">
            <h3 className="m-0 text-2xl font-extrabold">Add Payment</h3>
            <p className="m-0 text-sm text-slate-500 sm:text-base">Record fee collection and automatically update the student status.</p>
          </div>

          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
          {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{success}</div> : null}

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
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="payment-paidTill" name="paidTill" type="date" value={form.paidTill} onChange={handleFormChange} required />
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

            <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save Payment"}
            </button>
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
            </article>
          ))}
          {payments.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No payments found for the current filters.</div> : null}
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
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No payments found for the current filters.</div> : null}
        </div>
      </section>
    </div>
  );
}





