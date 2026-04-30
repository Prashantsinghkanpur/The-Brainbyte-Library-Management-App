import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, getErrorMessage } from "../lib/format";

const yearOptions = ["2025", "2026", "2027"];
const monthOptions = [
  { label: "Jan", value: "1" },
  { label: "Feb", value: "2" },
  { label: "Mar", value: "3" },
  { label: "Apr", value: "4" },
  { label: "May", value: "5" },
  { label: "Jun", value: "6" },
  { label: "Jul", value: "7" },
  { label: "Aug", value: "8" },
  { label: "Sep", value: "9" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" }
];

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ year: "2026", month: "4" });
  const [analytics, setAnalytics] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.year) params.set("year", filters.year);
    if (filters.month) params.set("month", filters.month);
    return params.toString() ? `?${params.toString()}` : "";
  }, [filters]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setError("");

      try {
        const [analyticsData, expenseData] = await Promise.all([
          apiRequest(`/analytics/summary${queryString}`, { token }),
          apiRequest(`/expenses${queryString}&sort=latest`.replace("?&", "?"), { token })
        ]);

        setAnalytics(analyticsData);
        setExpenses(expenseData.slice(0, 4));
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      }
    };

    loadAnalytics();
  }, [queryString, token]);

  const analyticsCards = [
    {
      title: "Monthly Revenue",
      value: formatCurrency(analytics?.monthlyRevenue),
      subtitle: `${analytics?.monthlyRevenueTransactions ?? 0} transactions`,
      tone: "violet"
    },
    {
      title: "Monthly Expenses",
      value: formatCurrency(analytics?.monthlyExpenses),
      subtitle: `${analytics?.expenseTransactions ?? 0} spending entries`,
      tone: "rose"
    },
    {
      title: "Total Dues",
      value: formatCurrency(analytics?.totalDues),
      subtitle: `${analytics?.pendingStudents ?? 0} students pending`,
      tone: "amber"
    },
    {
      title: "Net Profit",
      value: formatCurrency(analytics?.netProfit),
      subtitle: "Stable this period",
      tone: "mint"
    }
  ];

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="flex items-start justify-between gap-3 pt-2 sm:pt-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">FINANCIAL</p>
          <h1 className="m-0 mt-1 text-[2.35rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-7xl">Analytics</h1>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-lg shadow-slate-300/30 transition hover:-translate-y-0.5 sm:min-h-12 sm:px-5 sm:py-3 sm:text-base" to="/expenses">
          Expense
        </Link>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}

      <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid gap-3">
          <p className="m-0 text-sm font-bold text-slate-500">Select Year</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={filters.year === year ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
                onClick={() => setFilters((current) => ({ ...current, year }))}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <p className="m-0 text-sm font-bold text-slate-500">Select Month</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {monthOptions.map((month) => (
              <button
                key={month.value}
                type="button"
                className={filters.month === month.value ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
                onClick={() => setFilters((current) => ({ ...current, month: month.value }))}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">PENDING: Target for all active members.</div>
          <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">PAID: Collections reached so far.</div>
        </div>
      </section>

      <section className="grid gap-4 min-[520px]:grid-cols-2">
        {analyticsCards.map((card) => (
          <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5" key={card.title}>
            <span className="text-sm font-bold text-slate-500">{card.title}</span>
            <strong className="mt-2 block break-words text-2xl leading-tight text-slate-950 sm:text-3xl">{card.value}</strong>
            <p className="m-0 mt-2 break-words text-sm text-slate-500 sm:text-base">{card.subtitle}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-2xl font-extrabold">Recent Expenses</h3>
            <p className="m-0 text-sm text-slate-500 sm:text-base">Latest spending recorded in this selected period.</p>
          </div>
          <Link className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800" to="/expenses">
            Open
          </Link>
        </div>

        <div className="grid gap-4">
          {expenses.map((expense) => (
            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 min-[430px]:flex min-[430px]:items-center min-[430px]:justify-between" key={expense._id}>
              <div className="min-w-0">
                <strong className="block break-words leading-tight">{expense.title}</strong>
                <p className="m-0 mt-1 break-words text-sm text-slate-500">{expense.category}</p>
              </div>
              <div className="break-words font-extrabold text-teal-700 min-[430px]:shrink-0 min-[430px]:text-right">
                <strong>{formatCurrency(expense.amount)}</strong>
              </div>
            </div>
          ))}
          {expenses.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No expenses found for the selected period.</div> : null}
        </div>
      </section>
    </div>
  );
}




