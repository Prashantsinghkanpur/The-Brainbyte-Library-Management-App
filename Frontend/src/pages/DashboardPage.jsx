import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, getErrorMessage } from "../lib/format";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [seatGrid, setSeatGrid] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [analyticsData, paymentData, seatData] = await Promise.all([
          apiRequest("/analytics/summary", { token }),
          apiRequest("/payments/summary", { token }),
          apiRequest("/seats/grid", { token })
        ]);

        setAnalytics(analyticsData);
        setPaymentSummary(paymentData);
        setSeatGrid(seatData);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token]);

  return (
    <div className="page-content">
      <section className="hero-card">
        <div className="page-header">
          <div className="section-title">
            <p className="eyebrow">Operations Snapshot</p>
            <h3>{user?.name ? `${user.name}, your workspace is ready.` : "Your workspace is ready."}</h3>
            <p className="section-subtitle">This dashboard combines revenue, occupancy, and dues into one quick view.</p>
          </div>
          <div className="status-pill">{user?.themeMode || "SYSTEM"}</div>
        </div>
      </section>

      {error ? <div className="message error">{error}</div> : null}

      <section className="stats-grid">
        {[
          { label: "Monthly Revenue", value: formatCurrency(analytics?.monthlyRevenue) },
          { label: "Net Profit", value: formatCurrency(analytics?.netProfit) },
          { label: "Active Students", value: analytics?.activeStudents ?? (loading ? "..." : 0) },
          { label: "Pending Students", value: analytics?.pendingStudents ?? (loading ? "..." : 0) }
        ].map((item) => (
          <article className="stat-card" key={item.label}>
            <span className="eyebrow">{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="card-grid three-col">
        <article className="card">
          <div className="section-title">
            <h3>Collection Summary</h3>
            <p className="section-subtitle">Revenue movement this period.</p>
          </div>
          <p>Total transactions: {paymentSummary?.totalTransactions ?? 0}</p>
          <p>Paid students: {paymentSummary?.paidStudents ?? 0}</p>
          <p>Cash / UPI / Card counts are included in the payment page breakdown.</p>
        </article>

        <article className="card">
          <div className="section-title">
            <h3>Occupancy</h3>
            <p className="section-subtitle">Seat utilization across halls.</p>
          </div>
          <p>Filled seats: {seatGrid?.summary?.filledSeats ?? 0}</p>
          <p>Vacant seats: {seatGrid?.summary?.vacantSeats ?? 0}</p>
          <p>Total seats: {seatGrid?.summary?.totalSeats ?? 0}</p>
        </article>

        <article className="card">
          <div className="section-title">
            <h3>Financial Pressure</h3>
            <p className="section-subtitle">What still needs attention.</p>
          </div>
          <p>Total dues: {formatCurrency(analytics?.totalDues)}</p>
          <p>Expenses this month: {formatCurrency(analytics?.monthlyExpenses)}</p>
          <p>Expense entries: {analytics?.expenseTransactions ?? 0}</p>
        </article>
      </section>
    </div>
  );
}
