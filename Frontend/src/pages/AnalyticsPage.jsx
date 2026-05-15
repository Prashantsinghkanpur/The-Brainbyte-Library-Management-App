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

function MetricCard({ title, value, detail, accent }) {
  const accentClasses = {
    teal: "bg-cyan-50 text-cyan-700",
    blue: "bg-indigo-50 text-indigo-700",
    rose: "bg-rose-50 text-rose-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    yellow: "bg-yellow-50 text-yellow-700",
    pink: "bg-pink-50 text-pink-700"
  };

  return (
    <article className="min-w-0 rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/20 min-[380px]:p-4 sm:rounded-[1.5rem] sm:p-5">
      <div className={`grid h-9 w-9 place-items-center rounded-2xl text-sm font-black min-[380px]:h-10 min-[380px]:w-10 ${accentClasses[accent] || accentClasses.teal}`}>
        {title.slice(0, 1)}
      </div>
      <h3 className="m-0 mt-3 min-w-0 break-words text-[0.9rem] font-extrabold leading-tight text-slate-800 min-[380px]:text-[0.98rem] sm:text-lg">
        {title}
      </h3>
      <strong className="mt-2 block min-w-0 break-words text-[1.45rem] font-black leading-none text-slate-950 min-[380px]:text-[1.7rem] sm:text-4xl">
        {value}
      </strong>
      <p className="m-0 mt-2 min-w-0 break-words text-[11px] font-extrabold leading-snug text-teal-700 min-[380px]:text-xs sm:text-sm">
        {detail}
      </p>
    </article>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ year: String(currentYear), month: currentMonth });
  const [analytics, setAnalytics] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState("income");
  const [activityTab, setActivityTab] = useState("payments");
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
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
        const [analyticsData, paymentData, expenseData] = await Promise.all([
          apiRequest(`/analytics/summary${queryString}`, { token }),
          apiRequest(`/payments${queryString}&sort=latest`.replace("?&", "?"), { token }),
          apiRequest(`/expenses${queryString}&sort=latest`.replace("?&", "?"), { token })
        ]);

        setAnalytics(analyticsData);
        setRecentPayments((paymentData || []).slice(0, 5));
        setRecentExpenses((expenseData || []).slice(0, 5));
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      }
    };

    loadAnalytics();
  }, [queryString, token]);

  const cards = [
    {
      title: "Today Revenue",
      value: formatCurrency(analytics?.todayRevenue),
      detail: `${formatCurrency(getMethodTotal(analytics?.todayMethods, "CASH"))} cash | ${formatCurrency(getMethodTotal(analytics?.todayMethods, "UPI"))} UPI`,
      accent: "teal"
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(analytics?.monthlyRevenue),
      detail: `${analytics?.monthlyRevenueTransactions ?? 0} students paid`,
      accent: "blue"
    },
    {
      title: "Monthly Expenses",
      value: formatCurrency(analytics?.monthlyExpenses),
      detail: "Total spending",
      accent: "rose"
    },
    {
      title: "Net Profit",
      value: formatCurrency(analytics?.netProfit),
      detail: "Monthly gain",
      accent: "green"
    },
    {
      title: "Total Dues",
      value: formatCurrency(analytics?.totalDues),
      detail: `${analytics?.pendingStudents ?? 0} pending`,
      accent: "amber"
    },
    {
      title: "Annual Revenue",
      value: formatCurrency(analytics?.annualRevenue),
      detail: "Gross income",
      accent: "yellow"
    },
    {
      title: "Annual Expenses",
      value: formatCurrency(analytics?.annualExpenses),
      detail: "Annual spending",
      accent: "pink"
    },
    {
      title: "Annual Net Profit",
      value: formatCurrency(analytics?.annualNetProfit),
      detail: "Yearly gain",
      accent: "green"
    }
  ];
  const trendItems = analytics?.monthlyTrend || [];
  const trendMax = Math.max(1, ...trendItems.flatMap((item) => [item.revenue || 0, item.expenses || 0]));
  const cashTotal = getMethodTotal(analytics?.monthlyMethods, "CASH");
  const upiTotal = getMethodTotal(analytics?.monthlyMethods, "UPI");
  const breakdownItems = breakdownTab === "income"
    ? [
        { label: "Total Revenue", value: formatCurrency(analytics?.monthlyRevenue), tone: "text-teal-700 bg-teal-50" },
        { label: "Cash Collection", value: formatCurrency(cashTotal), tone: "text-cyan-700 bg-cyan-50" },
        { label: "UPI Collection", value: formatCurrency(upiTotal), tone: "text-indigo-700 bg-indigo-50" },
        { label: "Students Paid", value: String(analytics?.monthlyRevenueTransactions ?? 0), tone: "text-emerald-700 bg-emerald-50" }
      ]
    : [
        { label: "Total Expenses", value: formatCurrency(analytics?.monthlyExpenses), tone: "text-rose-700 bg-rose-50" },
        { label: "Net Profit", value: formatCurrency(analytics?.netProfit), tone: "text-emerald-700 bg-emerald-50" },
        { label: "Total Dues", value: formatCurrency(analytics?.totalDues), tone: "text-amber-700 bg-amber-50" },
        { label: "Pending Students", value: String(analytics?.pendingStudents ?? 0), tone: "text-orange-700 bg-orange-50" }
      ];
  const activityItems = activityTab === "payments" ? recentPayments : recentExpenses;

  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-hidden sm:gap-6">
      <section className="grid gap-4">
        <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start sm:justify-between sm:pt-4">
          <div className="min-w-0">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">Financial</p>
            <h1 className="m-0 mt-1 text-[2rem] font-black leading-none text-slate-950 min-[380px]:text-[2.5rem] sm:text-7xl">
              Analytics
            </h1>
          </div>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-lg shadow-slate-300/20 transition hover:-translate-y-0.5 sm:w-auto sm:px-5 sm:text-base"
            to="/expenses"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white">+</span>
            Expense
          </Link>
        </div>

        {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}

        <div className="grid gap-4 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/20 min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
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

          <div className="grid gap-2 min-[430px]:grid-cols-2">
            <div className="rounded-2xl bg-amber-50 px-3.5 py-3 text-xs font-extrabold leading-snug text-amber-700 min-[380px]:text-sm">
              PENDING: Target for all active members.
            </div>
            <div className="rounded-2xl bg-indigo-50 px-3.5 py-3 text-xs font-extrabold leading-snug text-indigo-700 min-[380px]:text-sm">
              PAID: Collections reached so far.
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2.5">
          {cards.map((card) => (
            <div className="min-w-0" key={card.title}>
              <MetricCard {...card} />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/20 min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="min-w-0">
          <h2 className="m-0 text-xl font-black text-slate-950 min-[380px]:text-2xl">Financial Trend</h2>
          <p className="m-0 mt-1 text-sm font-bold text-slate-500">Revenue and expenses for {filters.year}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 min-[430px]:gap-3">
          <div className="rounded-2xl bg-teal-50 px-3 py-2.5 text-xs font-extrabold text-teal-700 min-[380px]:text-sm">
            Revenue
          </div>
          <div className="rounded-2xl bg-rose-50 px-3 py-2.5 text-xs font-extrabold text-rose-700 min-[380px]:text-sm">
            Expenses
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-2">
            {trendItems.map((item) => {
              const revenueHeight = Math.max(10, Math.round(((item.revenue || 0) / trendMax) * 120));
              const expenseHeight = Math.max(10, Math.round(((item.expenses || 0) / trendMax) * 120));

              return (
                <div className="grid w-12 shrink-0 justify-items-center gap-2 min-[380px]:w-14" key={item.month}>
                  <div className="flex h-32 items-end gap-1.5 min-[380px]:h-36">
                    <div
                      className="w-4 rounded-t-xl bg-teal-600 min-[380px]:w-[1.1rem]"
                      style={{ height: `${revenueHeight}px` }}
                      title={`Revenue ${formatCurrency(item.revenue || 0)}`}
                    />
                    <div
                      className="w-4 rounded-t-xl bg-rose-300 min-[380px]:w-[1.1rem]"
                      style={{ height: `${expenseHeight}px` }}
                      title={`Expenses ${formatCurrency(item.expenses || 0)}`}
                    />
                  </div>
                  <div className="grid justify-items-center gap-1">
                    <span className="text-[11px] font-extrabold text-slate-700 min-[380px]:text-xs">
                      {monthOptions[(item.month || 1) - 1]?.label || item.month}
                    </span>
                  </div>
                </div>
              );
            })}
            {trendItems.length === 0 ? (
              <div className="grid min-h-28 w-full place-items-center rounded-3xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-bold text-slate-500">
                No trend data available for this period.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/20 min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-xl font-black text-slate-950 min-[380px]:text-2xl">Monthly Breakdown</h2>
            <p className="m-0 mt-1 text-sm font-bold text-slate-500">
              {monthOptions.find((month) => month.value === filters.month)?.label} {filters.year}
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-1">
            <button
              className={breakdownTab === "income" ? "min-h-11 rounded-2xl bg-white text-sm font-extrabold text-teal-700 shadow-sm" : "min-h-11 rounded-2xl text-sm font-extrabold text-slate-600"}
              onClick={() => setBreakdownTab("income")}
              type="button"
            >
              Income
            </button>
            <button
              className={breakdownTab === "expenses" ? "min-h-11 rounded-2xl bg-white text-sm font-extrabold text-rose-700 shadow-sm" : "min-h-11 rounded-2xl text-sm font-extrabold text-slate-600"}
              onClick={() => setBreakdownTab("expenses")}
              type="button"
            >
              Expenses
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {breakdownItems.map((item) => (
            <article className="min-w-0 rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/10 min-[380px]:p-4" key={item.label}>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ${item.tone}`}>
                {item.label}
              </span>
              <strong className="mt-3 block min-w-0 break-words text-[1.2rem] font-black leading-tight text-slate-950 min-[380px]:text-[1.35rem]">
                {item.value}
              </strong>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/20 min-[380px]:p-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-xl font-black text-slate-950 min-[380px]:text-2xl">Recent Activity</h2>
            <p className="m-0 mt-1 text-sm font-bold text-slate-500">Latest items from the selected period</p>
          </div>

          <div className="grid grid-cols-2 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-1">
            <button
              className={activityTab === "payments" ? "min-h-11 rounded-2xl bg-white text-sm font-extrabold text-teal-700 shadow-sm" : "min-h-11 rounded-2xl text-sm font-extrabold text-slate-600"}
              onClick={() => setActivityTab("payments")}
              type="button"
            >
              Payments
            </button>
            <button
              className={activityTab === "expenses" ? "min-h-11 rounded-2xl bg-white text-sm font-extrabold text-rose-700 shadow-sm" : "min-h-11 rounded-2xl text-sm font-extrabold text-slate-600"}
              onClick={() => setActivityTab("expenses")}
              type="button"
            >
              Expenses
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {activityItems.map((item) => (
            <article className="grid gap-3 rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/10 min-[380px]:p-4" key={item._id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block min-w-0 break-words text-sm font-black text-slate-950 min-[380px]:text-base">
                    {activityTab === "payments" ? item.student?.name || "Deleted student" : item.title}
                  </strong>
                  <p className="m-0 mt-1 text-xs font-bold text-slate-500 min-[380px]:text-sm">
                    {activityTab === "payments"
                      ? `${formatDate(item.paymentDate)} | ${item.method}`
                      : `${formatDate(item.expenseDate)} | ${item.category}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${activityTab === "payments" ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"}`}>
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </article>
          ))}

          {activityItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-bold text-slate-500">
              No {activityTab} found for this period.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
