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
    <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
      <section className="grid gap-5 sm:gap-6">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
          <div className="grid gap-1">
            <h3 className="m-0 text-2xl font-extrabold">Add Expense</h3>
            <p className="m-0 text-sm text-slate-500 sm:text-base">Track recurring and one-off operating costs.</p>
          </div>

          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
          {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{success}</div> : null}

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 min-[520px]:grid-cols-2">
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="expense-title">Title</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="expense-title" name="title" value={form.title} onChange={handleFormChange} required />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="expense-amount">Amount</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="expense-amount" name="amount" type="number" min="1" value={form.amount} onChange={handleFormChange} required />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="expense-category">Category</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="expense-category" name="category" value={form.category} onChange={handleFormChange} />
              </div>
              <div className="grid gap-2">
                <label className="font-semibold text-slate-600" htmlFor="expense-date">Expense Date</label>
                <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="expense-date" name="expenseDate" type="date" value={form.expenseDate} onChange={handleFormChange} />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="expense-notes">Notes</label>
              <textarea className="min-h-28 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="expense-notes" name="notes" value={form.notes} onChange={handleFormChange} />
            </div>
            <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save Expense"}
            </button>
          </form>
        </article>

        <article className="grid gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Visible Total</span>
          <strong className="break-words text-2xl leading-tight text-slate-950">{formatCurrency(totalExpense)}</strong>
          <p className="m-0 text-sm text-slate-500 sm:text-base">This total reflects the expenses currently loaded with your active filters.</p>
        </article>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(220px,340px)]">
          <div className="grid min-w-0 gap-1">
            <h3 className="m-0 text-2xl font-extrabold">Expenses</h3>
            <p className="m-0 text-sm text-slate-500 sm:text-base">Filter by category, time range, and amount sort.</p>
          </div>
          <form onSubmit={handleSearchSubmit}>
            <input
              className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              name="search"
              placeholder="Search title, category, notes"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </form>
        </div>

        <div className="grid gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <label className="font-semibold text-slate-600">Category</label>
            <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" name="category" value={filters.category} onChange={handleFilterChange} placeholder="GENERAL" />
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
          {expenses.map((expense) => (
            <article className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20" key={expense._id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block break-words leading-tight">{expense.title}</strong>
                  <p className="m-0 mt-1 break-words text-sm text-slate-500">{formatDate(expense.expenseDate)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">{expense.category}</span>
              </div>

              <div className="grid gap-3 min-[430px]:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Amount</span>
                  <p className="m-0 mt-1 break-words font-bold">{formatCurrency(expense.amount)}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Category</span>
                  <p className="m-0 mt-1 break-words">{expense.category}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 min-[430px]:col-span-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Notes</span>
                  <p className="m-0 mt-1 break-words">{expense.notes || "-"}</p>
                </div>
              </div>
            </article>
          ))}
          {expenses.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No expenses found for the current filters.</div> : null}
        </div>

        <div className="hidden w-full overflow-x-auto rounded-3xl border border-slate-200 md:block">
          <table className="w-full min-w-[760px] border-collapse bg-white">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Title</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Category</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Date</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-slate-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense._id}>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Title"><span className="block break-words">{expense.title}</span></td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Category"><span className="block break-words">{expense.category}</span></td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Amount">{formatCurrency(expense.amount)}</td>
                  <td className="border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Date">{formatDate(expense.expenseDate)}</td>
                  <td className="max-w-[260px] break-words border-b border-slate-200 px-4 py-3 align-top text-slate-800" data-label="Notes">{expense.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No expenses found for the current filters.</div> : null}
        </div>
      </section>
    </div>
  );
}





