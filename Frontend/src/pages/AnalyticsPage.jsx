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
    <div className="page-content">
      <section className="screen-header">
        <div>
          <p className="screen-kicker">FINANCIAL</p>
          <h1 className="screen-title">Analytics</h1>
        </div>
        <Link className="floating-action secondary" to="/expenses">
          Expense
        </Link>
      </section>

      {error ? <div className="message error">{error}</div> : null}

      <section className="stack-card">
        <div className="stack-section">
          <p className="mini-label">Select Year</p>
          <div className="chip-row">
            {yearOptions.map((year) => (
              <button
                key={year}
                type="button"
                className={filters.year === year ? "filter-chip active" : "filter-chip"}
                onClick={() => setFilters((current) => ({ ...current, year }))}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="stack-section">
          <p className="mini-label">Select Month</p>
          <div className="chip-row scrollable">
            {monthOptions.map((month) => (
              <button
                key={month.value}
                type="button"
                className={filters.month === month.value ? "filter-chip active" : "filter-chip"}
                onClick={() => setFilters((current) => ({ ...current, month: month.value }))}
              >
                {month.label}
              </button>
            ))}
          </div>
        </div>

        <div className="alert-grid">
          <div className="soft-alert amber">PENDING: Target for all active members.</div>
          <div className="soft-alert violet">PAID: Collections reached so far.</div>
        </div>
      </section>

      <section className="overview-grid">
        {analyticsCards.map((card) => (
          <article className={`metric-card tone-${card.tone}`} key={card.title}>
            <span className="metric-title">{card.title}</span>
            <strong>{card.value}</strong>
            <p>{card.subtitle}</p>
          </article>
        ))}
      </section>

      <section className="sheet-card">
        <div className="section-heading-row">
          <div>
            <h3>Recent Expenses</h3>
            <p className="section-subtitle">Latest spending recorded in this selected period.</p>
          </div>
          <Link className="link-button" to="/expenses">
            Open
          </Link>
        </div>

        <div className="stack-list">
          {expenses.map((expense) => (
            <div className="list-row-card" key={expense._id}>
              <div>
                <strong>{expense.title}</strong>
                <p className="section-subtitle">{expense.category}</p>
              </div>
              <div className="list-row-side">
                <strong>{formatCurrency(expense.amount)}</strong>
              </div>
            </div>
          ))}
          {expenses.length === 0 ? <div className="empty-state">No expenses found for the selected period.</div> : null}
        </div>
      </section>
    </div>
  );
}
