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
    <div className="page-content split-layout">
      <section className="page-content">
        <article className="card">
          <div className="section-title">
            <h3>Add Payment</h3>
            <p className="section-subtitle">Record fee collection and automatically update the student status.</p>
          </div>

          {error ? <div className="message error">{error}</div> : null}
          {success ? <div className="message success">{success}</div> : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field-grid two-col">
              <div className="field">
                <label htmlFor="payment-studentId">Student</label>
                <select id="payment-studentId" name="studentId" value={form.studentId} onChange={handleFormChange} required>
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} (#{student.memberId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="payment-amount">Amount</label>
                <input id="payment-amount" name="amount" type="number" min="1" value={form.amount} onChange={handleFormChange} required />
              </div>
              <div className="field">
                <label htmlFor="payment-paidTill">Paid Till</label>
                <input id="payment-paidTill" name="paidTill" type="date" value={form.paidTill} onChange={handleFormChange} required />
              </div>
              <div className="field">
                <label htmlFor="payment-paymentDate">Payment Date</label>
                <input id="payment-paymentDate" name="paymentDate" type="date" value={form.paymentDate} onChange={handleFormChange} />
              </div>
              <div className="field">
                <label htmlFor="payment-membershipStartDate">Membership Start</label>
                <input
                  id="payment-membershipStartDate"
                  name="membershipStartDate"
                  type="date"
                  value={form.membershipStartDate}
                  onChange={handleFormChange}
                />
              </div>
              <div className="field">
                <label htmlFor="payment-method">Method</label>
                <select id="payment-method" name="method" value={form.method} onChange={handleFormChange}>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="payment-notes">Notes</label>
              <textarea id="payment-notes" name="notes" value={form.notes} onChange={handleFormChange} />
            </div>

            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save Payment"}
            </button>
          </form>
        </article>

        <article className="card-grid three-col">
          <div className="stat-card">
            <span className="eyebrow">Revenue</span>
            <strong>{formatCurrency(summary?.totalRevenue)}</strong>
          </div>
          <div className="stat-card">
            <span className="eyebrow">Transactions</span>
            <strong>{summary?.totalTransactions ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span className="eyebrow">Paid Students</span>
            <strong>{summary?.paidStudents ?? 0}</strong>
          </div>
        </article>
      </section>

      <section className="table-card">
        <div className="table-toolbar">
          <div className="section-title">
            <h3>Payment History</h3>
            <p className="section-subtitle">Filter by method, month, student, and amount order.</p>
          </div>
          <form onSubmit={handleSearchSubmit}>
            <input
              className="search-input"
              name="search"
              placeholder="Search name, seat, member, notes"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </form>
        </div>

        <div className="filters-grid">
          <div className="field">
            <label>Method</label>
            <select name="method" value={filters.method} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="field">
            <label>Student</label>
            <select name="studentId" value={filters.studentId} onChange={handleFilterChange}>
              <option value="">All</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} (#{student.memberId})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Year</label>
            <input name="year" type="number" placeholder="2026" value={filters.year} onChange={handleFilterChange} />
          </div>
          <div className="field">
            <label>Month</label>
            <input name="month" type="number" min="1" max="12" placeholder="4" value={filters.month} onChange={handleFilterChange} />
          </div>
          <div className="field">
            <label>Sort</label>
            <select name="sort" value={filters.sort} onChange={handleFilterChange}>
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="amountHigh">Amount High</option>
              <option value="amountLow">Amount Low</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper payment-table">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Payment Date</th>
                <th>Paid Till</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td data-label="Student">
                    <strong>{payment.student?.name || "Deleted student"}</strong>
                    <div className="muted">
                      #{payment.student?.memberId || "-"} | Seat {payment.student?.seatNumber || "-"}
                    </div>
                  </td>
                  <td data-label="Amount">{formatCurrency(payment.amount)}</td>
                  <td data-label="Method">{payment.method}</td>
                  <td data-label="Payment Date">{formatDate(payment.paymentDate)}</td>
                  <td data-label="Paid Till">{formatDate(payment.paidTill)}</td>
                  <td data-label="Notes">{payment.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 ? <div className="empty-state">No payments found for the current filters.</div> : null}
        </div>
      </section>
    </div>
  );
}
