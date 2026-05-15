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

function MetricCard({ title, value, detail, mobileDetail, note, accent }) {
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
    <article className="flex h-full min-w-0 flex-col gap-3 overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/20 min-[380px]:rounded-[1.25rem] min-[380px]:p-3.5 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-[0.9rem] text-sm font-black min-[380px]:h-10 min-[380px]:w-10 min-[380px]:text-base sm:h-12 sm:w-12 sm:text-lg ${accentClasses[accent] || accentClasses.teal}`}>
          {title.slice(0, 1)}
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="m-0 text-[0.88rem] font-extrabold leading-tight text-slate-700 min-[380px]:text-[0.95rem] sm:text-lg">{title}</h3>
        <strong className="mt-2 block min-w-0 break-words text-[1.35rem] font-black leading-none text-slate-950 min-[380px]:text-[1.55rem] sm:mt-3 sm:text-4xl">
          {value}
        </strong>
        <p className="m-0 mt-2 min-w-0 break-words text-[11px] font-extrabold leading-snug text-teal-700 min-[380px]:text-xs sm:mt-3 sm:text-sm">
          <span className="sm:hidden">{mobileDetail || detail}</span>
          <span className="hidden sm:inline">{detail}</span>
        </p>
        {note ? <p className="m-0 mt-2 hidden text-xs font-bold text-slate-500 sm:block">{note}</p> : null}
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
  const trendBarMaxHeight = 132;
  const trendMax = Math.max(
    1,
    ...(analytics?.monthlyTrend || []).flatMap((item) => [item.revenue, item.expenses])
  );

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden sm:gap-6">
      <section className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start sm:justify-between sm:pt-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">FINANCIAL</p>
          <h1 className="m-0 mt-1 text-[2rem] font-black leading-none text-slate-950 min-[380px]:text-[2.8rem] sm:text-7xl">
            Analytics
          </h1>
        </div>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-lg shadow-slate-300/30 transition hover:-translate-y-0.5 sm:min-h-12 sm:w-auto sm:shrink-0 sm:px-5 sm:py-3 sm:text-base"
          to="/expenses"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white">+</span>
          Expense
        </Link>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}

      <section className="grid gap-3 sm:gap-4">
        <div className="grid gap-3">
          <p className="m-0 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Select Year</p>
          <div className="grid grid-cols-3 gap-2">
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={
                  filters.year === year
                    ? "min-w-0 rounded-3xl bg-teal-700 px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-teal-700/20"
                    : "min-w-0 rounded-3xl border border-slate-200 bg-white px-3 py-3 text-sm font-extrabold text-slate-800 transition hover:-translate-y-0.5"
                }
                onClick={() => setFilters((current) => ({ ...current, year }))}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <p className="m-0 text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Select Month</p>
          <div className="grid grid-cols-4 gap-2">
            {monthOptions.map((month) => (
              <button
                key={month.value}
                type="button"
                className={
                  filters.month === month.value
                    ? "min-w-0 rounded-3xl bg-teal-700 px-2 py-3 text-sm font-extrabold text-white shadow-lg shadow-teal-700/20"
                    : "min-w-0 rounded-3xl border border-slate-200 bg-white px-2 py-3 text-sm font-extrabold text-slate-800 transition hover:-translate-y-0.5"
                }
                onClick={() => setFilters((current) => ({ ...current, month: month.value }))}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 min-[430px]:grid-cols-2 min-[520px]:gap-3">
          <div className="rounded-2xl bg-amber-50 px-3.5 py-3 text-xs font-extrabold leading-snug text-amber-700 min-[380px]:text-sm">
            PENDING: Target for all active members.
          </div>
          <div className="rounded-2xl bg-indigo-50 px-3.5 py-3 text-xs font-extrabold leading-snug text-indigo-700 min-[380px]:text-sm">
            PAID: Collections reached so far.
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-2.5 [grid-template-columns:repeat(2,minmax(0,1fr))]">
        <div className="min-w-0">
          <MetricCard
            title="Today Revenue"
            value={formatCurrency(analytics?.todayRevenue)}
            detail={`Cash: ${formatCurrency(getMethodTotal(analytics?.todayMethods, "CASH"))} | UPI: ${formatCurrency(getMethodTotal(analytics?.todayMethods, "UPI"))}`}
            mobileDetail={`${formatCurrency(getMethodTotal(analytics?.todayMethods, "CASH"))} cash | ${formatCurrency(getMethodTotal(analytics?.todayMethods, "UPI"))} UPI`}
            accent="teal"
          />
        </div>
        <div className="min-w-0">
          <MetricCard
            title="Monthly Revenue"
            value={formatCurrency(analytics?.monthlyRevenue)}
            detail={`${analytics?.monthlyRevenueTransactions ?? 0} Students Paid`}
            accent="blue"
          />
        </div>
        <div className="min-w-0">
          <MetricCard
            title="Monthly Expenses"
            value={formatCurrency(analytics?.monthlyExpenses)}
            detail="Total Spending"
            accent="rose"
          />
        </div>
        <div className="min-w-0">
          <MetricCard title="Net Profit" value={formatCurrency(analytics?.netProfit)} detail="Monthly Gain" accent="green" />
        </div>
        <div className="min-w-0">
          <MetricCard
            title="Total Dues"
            value={formatCurrency(analytics?.totalDues)}
            detail={`${analytics?.pendingStudents ?? 0} Pending`}
            accent="amber"
          />
        </div>
        <div className="min-w-0">
          <MetricCard title="Annual Revenue" value={formatCurrency(analytics?.annualRevenue)} detail="Gross Income" accent="yellow" />
        </div>
        <div className="min-w-0">
          <MetricCard
            title="Annual Expenses"
            value={formatCurrency(analytics?.annualExpenses)}
            detail="Annual Spending"
            accent="pink"
          />
        </div>
        <div className="min-w-0">
          <MetricCard
            title="Annual Net Profit"
            value={formatCurrency(analytics?.annualNetProfit)}
            detail="Yearly Gain"
            accent="green"
          />
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/30 min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
          <div className="min-w-0">
            <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">Financial Trend</h3>
            <p className="m-0 mt-1 text-sm font-bold text-slate-500">Revenue & Expenses for {filters.year}</p>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-50 text-base font-black text-teal-700 sm:h-12 sm:w-12 sm:text-xl"
            onClick={() => setRefreshKey((current) => current + 1)}
            type="button"
          >
            R
          </button>
        </div>
        <div className="flex h-44 items-end gap-2 overflow-x-auto border-b border-slate-100 pb-3 min-[380px]:h-48 sm:h-64 sm:gap-3">
          {(analytics?.monthlyTrend || []).map((item) => {
            const revenueHeight = Math.max(8, Math.round((item.revenue / trendMax) * trendBarMaxHeight));
            const expenseHeight = Math.max(8, Math.round((item.expenses / trendMax) * trendBarMaxHeight));

            return (
              <div className="grid min-w-10 justify-items-center gap-2 min-[380px]:min-w-12 sm:min-w-16" key={item.month}>
                <div className="flex h-36 items-end gap-1 min-[380px]:h-40 sm:h-52">
                  <div
                    className="w-3.5 rounded-t-xl bg-teal-600 min-[380px]:w-4 sm:w-5"
                    style={{ height: `${revenueHeight}px` }}
                    title={`Revenue ${formatCurrency(item.revenue)}`}
                  />
                  <div
                    className="w-3.5 rounded-t-xl bg-rose-200 min-[380px]:w-4 sm:w-5"
                    style={{ height: `${expenseHeight}px` }}
                    title={`Expenses ${formatCurrency(item.expenses)}`}
                  />
                </div>
                <span className={String(item.month) === filters.month ? "text-xs font-black text-slate-950 min-[380px]:text-sm" : "text-xs font-bold text-slate-500 min-[380px]:text-sm"}>
                  {monthOptions[item.month - 1].label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-2 rounded-[1.25rem] border border-slate-200 bg-white p-1 shadow-lg shadow-slate-300/20">
        <button
          className={breakdownTab === "income" ? "min-h-11 rounded-2xl bg-teal-50 px-2 text-sm font-extrabold text-teal-700 sm:min-h-12 sm:text-base" : "min-h-11 rounded-2xl px-2 text-sm font-extrabold text-slate-700 sm:min-h-12 sm:text-base"}
          onClick={() => setBreakdownTab("income")}
          type="button"
        >
          Income
        </button>
        <button
          className={breakdownTab === "expenses" ? "min-h-11 rounded-2xl bg-rose-50 px-2 text-sm font-extrabold text-rose-600 sm:min-h-12 sm:text-base" : "min-h-11 rounded-2xl px-2 text-sm font-extrabold text-slate-700 sm:min-h-12 sm:text-base"}
          onClick={() => setBreakdownTab("expenses")}
          type="button"
        >
          Expenses
        </button>
      </div>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/30 min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">
            {breakdownTab === "income" ? "Revenue Breakdown" : "Expense Breakdown"}
          </h3>
          <span className="rounded-2xl bg-teal-50 px-4 py-2 text-sm font-extrabold text-teal-700">
            {selectedMonthLabel} {filters.year}
          </span>
        </div>

        {breakdownTab === "income" ? (
          <div className="grid gap-5">
            <div className="rounded-3xl bg-teal-50/60 p-4">
              <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
                <div className="min-w-0">
                  <strong className="block text-lg font-black min-[380px]:text-xl">Total Period Revenue</strong>
                  <p className="m-0 text-sm font-bold text-slate-500">All collectors combined</p>
                </div>
                <strong className="break-words text-[1.75rem] font-black text-teal-700 min-[380px]:text-2xl">
                  {formatCurrency(analytics?.monthlyRevenue)}
                </strong>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-extrabold text-slate-700">
                <span>Cash: {formatCurrency(cashTotal)}</span>
                <span>UPI: {formatCurrency(upiTotal)}</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-200">
                <div className="h-full bg-emerald-500" style={{ width: `${cashPercent}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-50 font-black text-teal-700">A</div>
                <div className="min-w-0">
                  <strong className="block text-lg font-black min-[380px]:text-xl">Admin</strong>
                  <p className="m-0 text-sm font-bold text-slate-500">Collector</p>
                </div>
              </div>
              <strong className="break-words text-[1.75rem] font-black text-teal-700 min-[380px]:text-2xl">
                {formatCurrency(analytics?.monthlyRevenue)}
              </strong>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {expenses.map((expense) => (
              <div
                className="flex flex-col gap-2 border-b border-slate-100 py-3 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between"
                key={expense._id}
              >
                <div className="min-w-0">
                  <strong className="block break-words">{expense.title}</strong>
                  <p className="m-0 text-sm font-bold text-slate-500">
                    {formatDate(expense.expenseDate)} | {expense.category}
                  </p>
                </div>
                <strong className="text-lg font-black text-rose-600 min-[520px]:shrink-0">
                  {formatCurrency(expense.amount)}
                </strong>
              </div>
            ))}
            {expenses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">
                No expenses found for the selected period.
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/30 min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="m-0 text-xl font-black min-[380px]:text-2xl">Latest Payments</h3>
          <Link className="text-sm font-extrabold text-teal-700" to="/payments">
            Open
          </Link>
        </div>
        <div className="grid gap-1">
          {payments.map((payment) => (
            <div
              className="flex flex-col gap-3 border-b border-slate-100 py-4 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between"
              key={payment._id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 font-black text-teal-700">
                  {(payment.student?.name || "P").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <strong className="block break-words text-lg font-black">
                    {payment.student?.name || "Deleted student"}
                  </strong>
                  <p className="m-0 text-sm font-bold text-slate-500">
                    {formatDate(payment.paymentDate)} | {payment.method}
                  </p>
                </div>
              </div>
              <strong className="break-words text-xl font-black text-teal-700 min-[520px]:shrink-0">
                {formatCurrency(payment.amount)}
              </strong>
            </div>
          ))}
          {payments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-7 text-center text-slate-500">
              No payments found for the selected period.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
