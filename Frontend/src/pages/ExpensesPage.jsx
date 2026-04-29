import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

const initialForm = {
  title: "",
  amount: "",
  category: "GENERAL",
  expenseDate: "",
  notes: ""
};

const initialFilters = {
  search: "",
  category: "",
  year: "",
  month: "",
  sort: "latest"
};

export default function ExpensesPage() {
  const { token } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = async (activeFilters = filters) => {
    setError("");

    try {
      const searchParams = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });

      const data = await apiRequest(`/expenses${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { token });
      setExpenses(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  };

  useEffect(() => {
    loadExpenses(initialFilters);
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
        loadExpenses(nextFilters);
      }

      return nextFilters;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadExpenses();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await apiRequest("/expenses", {
        method: "POST",
        token,
        body: {
          ...form,
          amount: Number(form.amount)
        }
      });

      setSuccess("Expense added successfully.");
      setForm(initialForm);
      loadExpenses();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return (
    <div className="page-content split-layout">
      <section className="page-content">
        <article className="card">
          <div className="section-title">
            <h3>Add Expense</h3>
            <p className="section-subtitle">Track recurring and one-off operating costs.</p>
          </div>

          {error ? <div className="message error">{error}</div> : null}
          {success ? <div className="message success">{success}</div> : null}

          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field-grid two-col">
              <div className="field">
                <label htmlFor="expense-title">Title</label>
                <input id="expense-title" name="title" value={form.title} onChange={handleFormChange} required />
              </div>
              <div className="field">
                <label htmlFor="expense-amount">Amount</label>
                <input id="expense-amount" name="amount" type="number" min="1" value={form.amount} onChange={handleFormChange} required />
              </div>
              <div className="field">
                <label htmlFor="expense-category">Category</label>
                <input id="expense-category" name="category" value={form.category} onChange={handleFormChange} />
              </div>
              <div className="field">
                <label htmlFor="expense-date">Expense Date</label>
                <input id="expense-date" name="expenseDate" type="date" value={form.expenseDate} onChange={handleFormChange} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="expense-notes">Notes</label>
              <textarea id="expense-notes" name="notes" value={form.notes} onChange={handleFormChange} />
            </div>
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save Expense"}
            </button>
          </form>
        </article>

        <article className="stat-card">
          <span className="eyebrow">Visible Total</span>
          <strong>{formatCurrency(totalExpense)}</strong>
          <p className="muted">This total reflects the expenses currently loaded with your active filters.</p>
        </article>
      </section>

      <section className="table-card">
        <div className="table-toolbar">
          <div className="section-title">
            <h3>Expenses</h3>
            <p className="section-subtitle">Filter by category, time range, and amount sort.</p>
          </div>
          <form onSubmit={handleSearchSubmit}>
            <input
              className="search-input"
              name="search"
              placeholder="Search title, category, notes"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </form>
        </div>

        <div className="filters-grid">
          <div className="field">
            <label>Category</label>
            <input name="category" value={filters.category} onChange={handleFilterChange} placeholder="GENERAL" />
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

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense._id}>
                  <td>{expense.title}</td>
                  <td>{expense.category}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>{formatDate(expense.expenseDate)}</td>
                  <td>{expense.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 ? <div className="empty-state">No expenses found for the current filters.</div> : null}
        </div>
      </section>
    </div>
  );
}
