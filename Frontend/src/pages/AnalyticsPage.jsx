import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = String(currentDate.getMonth() + 1);
const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map(String);
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

const getMethodTotal = (methods, method) => methods?.[method]?.total || 0;

function MetricCard({ title, value, detail, note, accent }) {
  const accentClasses = {
    teal: "bg-cyan-50 text-cyan-600",
    blue: "bg-indigo-50 text-indigo-500",
    rose: "bg-rose-50 text-rose-500",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-500",
    yellow: "bg-yellow-50 text-yellow-500",
    pink: "bg-pink-50 text-pink-500"
  };

  return (
    <article className="grid min-h-56 content-between rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/30">
      <div className={`grid h-14 w-14 place-items-center rounded-2xl text-xl font-black ${accentClasses[accent] || accentClasses.teal}`}>
        {title.slice(0, 1)}
      </div>
      <div>
        <h3 className="m-0 text-lg font-extrabold text-slate-700">{title}</h3>
        <strong className="mt-4 block break-words text-4xl font-black leading-none text-slate-950">{value}</strong>
        <p className="m-0 mt-4 break-words font-extrabold text-teal-700">{detail}</p>
        <p className="m-0 mt-4 text-sm font-bold text-slate-500">{note || "Stable this period"}</p>
      </div>
    </article>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ year: String(currentYear), month: currentMonth });
  const [analytics, setAnalytics] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [breakdownTab, setBreakdownTab] = useState("income");
  const [refreshKey, setRefreshKey] = useState(0);
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
        const [analyticsData, expenseData, paymentData] = await Promise.all([
          apiRequest(`/analytics/summary${queryString}`, { token }),
          apiRequest(`/expenses${queryString}&sort=latest`.replace("?&", "?"), { token }),
          apiRequest(`/payments${queryString}&sort=latest`.replace("?&", "?"), { token })
        ]);

        setAnalytics(analyticsData);
        setExpenses(expenseData.slice(0, 8));
        setPayments(paymentData.slice(0, 12));
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      }
    };

    loadAnalytics();
  }, [queryString, token, refreshKey]);

  const selectedMonthLabel = monthOptions.find((month) => month.value === filters.month)?.label || "";
  const cashTotal = getMethodTotal(analytics?.monthlyMethods, "CASH");
  const upiTotal = getMethodTotal(analytics?.monthlyMethods, "UPI");
  const methodTotal = Math.max(1, cashTotal + upiTotal);
  const cashPercent = Math.round((cashTotal / methodTotal) * 100);
  const trendMax = Math.max(
    1,
    ...(analytics?.monthlyTrend || []).flatMap((item) => [item.revenue, item.expenses])
  );

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="flex items-start justify-between gap-3 pt-2 sm:pt-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">FINANCIAL</p>
          <h1 className="m-0 mt-1 text-[2.35rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-7xl">Analytics</h1>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-lg shadow-slate-300/30 transition hover:-translate-y-0.5 sm:min-h-12 sm:px-5 sm:py-3 sm:text-base" to="/expenses">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white">+</span>
          Expense
        </Link>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}

      <section className="grid gap-4">
        <div className="grid gap-3">
          <p className="m-0 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Select Year</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={filters.year === year ? "whitespace-nowrap rounded-3xl bg-teal-700 px-6 py-4 font-extrabold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-3xl border border-slate-200 bg-white px-6 py-4 font-extrabold text-slate-800 transition hover:-translate-y-0.5"}
                onClick={() => setFilters((current) => ({ ...current, year }))}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <p className="m-0 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Select Month</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {monthOptions.map((month) => (
              <button
                key={month.value}
                type="button"
                className={filters.month === month.value ? "whitespace-nowrap rounded-3xl bg-teal-700 px-6 py-4 font-extrabold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-3xl border border-slate-200 bg-white px-6 py-4 font-extrabold text-slate-800 transition hover:-translate-y-0.5"}
                onClick={() => setFilters((current) => ({ ...current, month: month.value }))}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-700">PENDING: Target for all active members.</div>
          <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-extrabold text-indigo-700">PAID: Collections reached so far.</div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <MetricCard title="Today Revenue" value={formatCurrency(analytics?.todayRevenue)} detail={`Cash: ${formatCurrency(getMethodTotal(analytics?.todayMethods, "CASH"))} • UPI: ${formatCurrency(getMethodTotal(analytics?.todayMethods, "UPI"))}`} accent="teal" />
        <MetricCard title="Monthly Revenue" value={formatCurrency(analytics?.monthlyRevenue)} detail={`${analytics?.monthlyRevenueTransactions ?? 0} Students Paid`} accent="blue" />
        <MetricCard title="Monthly Expenses" value={formatCurrency(analytics?.monthlyExpenses)} detail="Total Spending" accent="rose" />
        <MetricCard title="Net Profit" value={formatCurrency(analytics?.netProfit)} detail="Monthly Gain" accent="green" />
        <MetricCard title="Total Dues" value={formatCurrency(analytics?.totalDues)} detail={`${analytics?.pendingStudents ?? 0} Pending`} accent="amber" />
        <MetricCard title="Annual Revenue" value={formatCurrency(analytics?.annualRevenue)} detail="Gross Income" accent="yellow" />
        <MetricCard title="Annual Expenses" value={formatCurrency(analytics?.annualExpenses)} detail="Annual Spending" accent="pink" />
        <MetricCard title="Annual Net Profit" value={formatCurrency(analytics?.annualNetProfit)} detail="Yearly Gain" accent="green" />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/30">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-2xl font-black">Financial Trend</h3>
            <p className="m-0 mt-1 text-sm font-bold text-slate-500">Revenue & Expenses for {filters.year}</p>
          </div>
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-xl font-black text-teal-700" onClick={() => setRefreshKey((current) => current + 1)} type="button">
            R
          </button>
        </div>
        <div className="flex h-64 items-end gap-3 overflow-x-auto border-b border-slate-100 pb-3">
          {(analytics?.monthlyTrend || []).map((item) => {
            const revenueHeight = Math.max(8, Math.round((item.revenue / trendMax) * 190));
            const expenseHeight = Math.max(8, Math.round((item.expenses / trendMax) * 190));
            return (
              <div className="grid min-w-16 justify-items-center gap-2" key={item.month}>
                <div className="flex h-52 items-end gap-1">
                  <div className="w-5 rounded-t-xl bg-teal-600" style={{ height: `${revenueHeight}px` }} title={`Revenue ${formatCurrency(item.revenue)}`} />
                  <div className="w-5 rounded-t-xl bg-rose-200" style={{ height: `${expenseHeight}px` }} title={`Expenses ${formatCurrency(item.expenses)}`} />
                </div>
                <span className={String(item.month) === filters.month ? "text-sm font-black text-slate-950" : "text-sm font-bold text-slate-500"}>
                  {monthOptions[item.month - 1].label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-2 rounded-[1.25rem] border border-slate-200 bg-white p-1 shadow-lg shadow-slate-300/20">
        <button className={breakdownTab === "income" ? "min-h-12 rounded-2xl bg-teal-50 font-extrabold text-teal-700" : "min-h-12 rounded-2xl font-extrabold text-slate-700"} onClick={() => setBreakdownTab("income")} type="button">
          Income
        </button>
        <button className={breakdownTab === "expenses" ? "min-h-12 rounded-2xl bg-rose-50 font-extrabold text-rose-600" : "min-h-12 rounded-2xl font-extrabold text-slate-700"} onClick={() => setBreakdownTab("expenses")} type="button">
          Expenses
        </button>
      </div>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/30">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h3 className="m-0 text-2xl font-black">{breakdownTab === "income" ? "Revenue Breakdown" : "Expense Breakdown"}</h3>
          <span className="rounded-2xl bg-teal-50 px-4 py-2 text-sm font-extrabold text-teal-700">{selectedMonthLabel} {filters.year}</span>
        </div>

        {breakdownTab === "income" ? (
          <div className="grid gap-5">
            <div className="rounded-3xl bg-teal-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="block text-xl font-black">Total Period Revenue</strong>
                  <p className="m-0 text-sm font-bold text-slate-500">All collectors combined</p>
                </div>
                <strong className="text-2xl font-black text-teal-700">{formatCurrency(analytics?.monthlyRevenue)}</strong>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-extrabold text-slate-700">
                <span>Cash: {formatCurrency(cashTotal)}</span>
                <span>UPI: {formatCurrency(upiTotal)}</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-200">
                <div className="h-full bg-emerald-500" style={{ width: `${cashPercent}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-50 font-black text-teal-700">A</div>
                <div className="min-w-0">
                  <strong className="block text-xl font-black">Admin</strong>
                  <p className="m-0 text-sm font-bold text-slate-500">Collector</p>
                </div>
              </div>
              <strong className="shrink-0 text-2xl font-black text-teal-700">{formatCurrency(analytics?.monthlyRevenue)}</strong>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {expenses.map((expense) => (
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3" key={expense._id}>
                <div className="min-w-0">
                  <strong className="block break-words">{expense.title}</strong>
                  <p className="m-0 text-sm font-bold text-slate-500">{formatDate(expense.expenseDate)} • {expense.category}</p>
                </div>
                <strong className="shrink-0 text-lg font-black text-rose-600">{formatCurrency(expense.amount)}</strong>
              </div>
            ))}
            {expenses.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No expenses found for the selected period.</div> : null}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/30">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="m-0 text-2xl font-black">Latest Payments</h3>
          <Link className="text-sm font-extrabold text-teal-700" to="/payments">Open</Link>
        </div>
        <div className="grid gap-1">
          {payments.map((payment) => (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-4" key={payment._id}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 font-black text-teal-700">
                  {(payment.student?.name || "P").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <strong className="block break-words text-lg font-black">{payment.student?.name || "Deleted student"}</strong>
                  <p className="m-0 text-sm font-bold text-slate-500">{formatDate(payment.paymentDate)} • {payment.method}</p>
                </div>
              </div>
              <strong className="shrink-0 text-xl font-black text-teal-700">{formatCurrency(payment.amount)}</strong>
            </div>
          ))}
          {payments.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">No payments found for the selected period.</div> : null}
        </div>
      </section>
    </div>
  );
}
