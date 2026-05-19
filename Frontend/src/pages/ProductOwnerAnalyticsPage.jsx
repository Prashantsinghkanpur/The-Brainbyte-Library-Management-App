import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";
import { isProductOwner } from "../lib/productOwner";

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const subscriptionPlans = [
  { key: "12_MONTHS", label: "Yearly Plan" },
  { key: "6_MONTHS", label: "Half Yearly Plan" },
  { key: "3_MONTHS", label: "3 Months" },
  { key: "1_MONTH", label: "Monthly Plan" }
];
const initialGrantForm = {
  email: "",
  grantMode: "plan",
  plan: "12_MONTHS",
  durationDays: "",
  renewsAt: "",
  note: ""
};

function MetricCard({ title, value, detail, tone = "teal" }) {
  const toneClasses = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    purple: "bg-violet-50 text-violet-700"
  };

  return (
    <article className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/15 sm:rounded-[1.6rem] sm:p-5">
      <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${toneClasses[tone] || toneClasses.teal}`}>
        {title}
      </div>
      <strong className="mt-4 block text-[1.7rem] font-black leading-none text-slate-950 sm:text-[2.35rem]">{value}</strong>
      <p className="m-0 mt-3 text-sm font-semibold leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function ConfirmCancelModal({ owner, note, onNoteChange, onClose, onConfirm, canceling }) {
  if (!owner) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-slate-950/60" onClick={onClose} type="button" aria-label="Close cancel subscription confirmation" />
      <div className="relative z-10 flex min-h-full items-start justify-center overflow-y-auto p-4 sm:p-5">
        <section className="grid w-full max-w-xl gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/30 sm:p-6">
          <div>
            <h2 className="m-0 text-2xl font-black text-slate-950">Cancel Subscription</h2>
            <p className="m-0 mt-2 text-sm font-semibold leading-6 text-slate-500">
              This will immediately remove Pro access for <strong className="text-slate-800">{owner.email}</strong>.
            </p>
          </div>

          <div className="rounded-[1.3rem] border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-7 text-red-700">
            After cancellation, this owner will lose Pro access and be treated as canceled until you manually grant or reactivate again.
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Cancel Note</span>
            <textarea
              className="min-h-28 w-full rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              onChange={onNoteChange}
              placeholder="Optional reason for manual cancellation"
              value={note}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Keep Active
            </button>
            <button
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-red-500 px-5 py-3 font-extrabold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={canceling}
              onClick={onConfirm}
              type="button"
            >
              {canceling ? "Canceling..." : "Confirm Cancel"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ProductOwnerAnalyticsPage() {
  const { token, user } = useAuth();
  const [ownerSecret, setOwnerSecret] = useState("");
  const [showOwnerSecret, setShowOwnerSecret] = useState(false);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [grantTypeFilter, setGrantTypeFilter] = useState("ALL");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelNote, setCancelNote] = useState("");
  const [grantForm, setGrantForm] = useState(initialGrantForm);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const visibleOwners = useMemo(() => {
    const owners = analytics?.owners || [];
    const query = String(search || "").trim().toLowerCase();
    return owners.filter((owner) => {
      const matchesQuery = !query || (
      [
        owner.name,
        owner.email,
        owner.library?.name,
        owner.library?.phone,
        owner.subscriptionStatus,
        owner.subscriptionGrantType
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
      );
      const matchesStatus = statusFilter === "ALL" || owner.subscriptionStatus === statusFilter;
      const matchesGrantType = grantTypeFilter === "ALL" || owner.subscriptionGrantType === grantTypeFilter;
      return matchesQuery && matchesStatus && matchesGrantType;
    });
  }, [analytics?.owners, search, statusFilter, grantTypeFilter]);

  if (!isProductOwner(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  const loadAnalytics = async ({ preserveSuccess = false } = {}) => {
    if (!ownerSecret.trim()) {
      setError("Owner secret is required to load product owner analytics.");
      return;
    }

    setLoading(true);
    setError("");
    if (!preserveSuccess) {
      setSuccess("");
    }

    try {
      const data = await apiRequest(`/settings/product-owner/analytics?year=${encodeURIComponent(selectedYear)}`, {
        token,
        headers: {
          "x-product-owner-secret": ownerSecret.trim()
        }
      });
      setAnalytics(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  const handleGrantFieldChange = (event) => {
    const { name, value } = event.target;
    setGrantForm((current) => ({ ...current, [name]: value }));
  };

  const handleGrantSubmit = async (event) => {
    event.preventDefault();

    if (!ownerSecret.trim()) {
      setError("Owner secret is required before granting access.");
      return;
    }

    const targetEmail = String(grantForm.email || "").trim().toLowerCase();
    if (!targetEmail) {
      setError("Customer email is required.");
      return;
    }

    setGranting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        email: targetEmail,
        note: String(grantForm.note || "").trim(),
        startsFromCurrentExpiry: true
      };

      if (grantForm.grantMode === "days") {
        payload.durationDays = Number(grantForm.durationDays || 0);
      } else if (grantForm.grantMode === "date") {
        if (!grantForm.renewsAt) {
          throw new Error("Exact expiry date is required.");
        }
        payload.renewsAt = new Date(grantForm.renewsAt).toISOString();
      } else {
        payload.plan = grantForm.plan;
      }

      const response = await apiRequest("/settings/subscription/grant", {
        method: "POST",
        token,
        headers: {
          "x-product-owner-secret": ownerSecret.trim()
        },
        body: payload
      });

      setGrantForm(initialGrantForm);
      setSuccess(response.msg || `Complimentary Pro granted to ${targetEmail}.`);
      await loadAnalytics({ preserveSuccess: true });
    } catch (grantError) {
      setError(getErrorMessage(grantError));
    } finally {
      setGranting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!cancelTarget) return;

    setCanceling(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest("/settings/product-owner/subscription/cancel", {
        method: "POST",
        token,
        headers: {
          "x-product-owner-secret": ownerSecret.trim()
        },
        body: {
          userId: cancelTarget.id,
          note: cancelNote
        }
      });

      setSuccess(response.msg || `Subscription canceled for ${cancelTarget.email}.`);
      setCancelTarget(null);
      setCancelNote("");
      await loadAnalytics({ preserveSuccess: true });
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setCanceling(false);
    }
  };

  const monthlyTrend = analytics?.monthlyTrend || [];
  const trendMax = Math.max(1, ...monthlyTrend.flatMap((item) => [item.income || 0, item.subscriptionsPurchased || 0]));
  const summary = analytics?.summary;

  return (
    <div className="grid gap-5 pb-6 sm:gap-6">
      <section className="grid gap-4">
        <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="m-0 text-xs font-black uppercase tracking-[0.22em] text-amber-700">Owner Admin</p>
            <h1 className="m-0 mt-1 break-words text-[2.15rem] font-black leading-none text-slate-950 min-[380px]:text-[2.8rem] sm:text-6xl">
              Product Owner Analytics
            </h1>
            <p className="m-0 mt-2 text-sm font-semibold text-slate-500 sm:text-base">
              Secure revenue view, subscription purchase tracking, and manual control over owner Pro access.
            </p>
          </div>
          <div className="shrink-0 rounded-full bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-700">
            {user?.email}
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/15 sm:grid-cols-[1fr_auto] sm:items-end sm:p-5">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Owner Secret</span>
              <div className="relative">
                <input
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 pr-24 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  onChange={(event) => setOwnerSecret(event.target.value)}
                  placeholder="Enter secure owner secret"
                  type={showOwnerSecret ? "text" : "password"}
                  value={ownerSecret}
                />
                <button
                  className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setShowOwnerSecret((current) => !current)}
                  type="button"
                >
                  {showOwnerSecret ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
              {yearOptions.map((year) => (
                <button
                  key={year}
                  className={selectedYear === String(year)
                    ? "min-h-12 rounded-3xl bg-amber-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-amber-600/20"
                    : "min-h-12 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"}
                  onClick={() => setSelectedYear(String(year))}
                  type="button"
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <button
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 font-extrabold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={loadAnalytics}
            type="button"
          >
            {loading ? "Loading..." : "Load Secure Analytics"}
          </button>
        </div>

        {error ? <div className="rounded-[1.2rem] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
        {success ? <div className="rounded-[1.2rem] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{success}</div> : null}
      </section>

      {analytics ? (
        <>
          <section className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/15 sm:p-5">
            <div className="min-w-0">
              <h2 className="m-0 text-2xl font-black text-slate-950">Grant Complimentary Pro</h2>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Directly grant access from the super-admin page without opening the owner dashboard.</p>
            </div>

            <form className="grid gap-4" onSubmit={handleGrantSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Customer Email</span>
                  <input
                    className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    name="email"
                    onChange={handleGrantFieldChange}
                    placeholder="customer@example.com"
                    type="email"
                    value={grantForm.email}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Grant Method</span>
                  <select
                    className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    name="grantMode"
                    onChange={handleGrantFieldChange}
                    value={grantForm.grantMode}
                  >
                    <option value="plan">Use subscription plan</option>
                    <option value="days">Use custom days</option>
                    <option value="date">Set exact expiry date</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {grantForm.grantMode === "plan" ? (
                  <label className="grid gap-2">
                    <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Plan</span>
                    <select
                      className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      name="plan"
                      onChange={handleGrantFieldChange}
                      value={grantForm.plan}
                    >
                      {subscriptionPlans.map((plan) => (
                        <option key={plan.key} value={plan.key}>{plan.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {grantForm.grantMode === "days" ? (
                  <label className="grid gap-2">
                    <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Custom Days</span>
                    <input
                      className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      min="1"
                      name="durationDays"
                      onChange={handleGrantFieldChange}
                      placeholder="90"
                      type="number"
                      value={grantForm.durationDays}
                    />
                  </label>
                ) : null}

                {grantForm.grantMode === "date" ? (
                  <label className="grid gap-2">
                    <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Exact Expiry Date</span>
                    <input
                      className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      name="renewsAt"
                      onChange={handleGrantFieldChange}
                      type="datetime-local"
                      value={grantForm.renewsAt}
                    />
                  </label>
                ) : null}

                <label className="grid gap-2 sm:col-span-1">
                  <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-500">Owner Note</span>
                  <input
                    className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                    name="note"
                    onChange={handleGrantFieldChange}
                    placeholder="Reason for complimentary Pro"
                    type="text"
                    value={grantForm.note}
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-600 px-6 py-3 font-extrabold text-white shadow-lg shadow-amber-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={granting}
                  type="submit"
                >
                  {granting ? "Granting..." : "Grant Complimentary Pro"}
                </button>
              </div>
            </form>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="Annual Income" value={formatCurrency(summary?.annualIncome)} detail={`Revenue collected in ${summary?.year}`} tone="green" />
            <MetricCard title="Subscriptions Purchased" value={String(summary?.annualSubscriptionsPurchased || 0)} detail={`Successful Pro purchases in ${summary?.year}`} tone="blue" />
            <MetricCard title="Total Lifetime Income" value={formatCurrency(summary?.totalIncome)} detail={`${summary?.totalSubscriptionsPurchased || 0} successful purchases overall`} tone="amber" />
            <MetricCard title="Library Owners" value={String(summary?.totalLibraryOwners || 0)} detail="Admin accounts across all libraries" tone="purple" />
            <MetricCard title="Active Pro Owners" value={String(summary?.activeProOwners || 0)} detail={`${summary?.complimentaryOwners || 0} complimentary active owners`} tone="teal" />
            <MetricCard title="Canceled Owners" value={String(summary?.canceledOwners || 0)} detail={`${summary?.expiredOwners || 0} expired owners`} tone="rose" />
          </section>

          <section className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/15 sm:p-5">
            <div className="min-w-0">
              <h2 className="m-0 text-2xl font-black text-slate-950">Subscription Trend</h2>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Monthly income and successful subscription count for {summary?.year}</p>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max items-end gap-3">
                {monthlyTrend.map((item) => {
                  const incomeHeight = Math.max(10, Math.round(((item.income || 0) / trendMax) * 140));
                  const purchaseHeight = Math.max(10, Math.round(((item.subscriptionsPurchased || 0) / trendMax) * 140));

                  return (
                    <div className="grid w-14 justify-items-center gap-2" key={item.month}>
                      <div className="flex h-40 items-end gap-1.5">
                        <div
                          className="w-5 rounded-t-xl bg-emerald-500"
                          style={{ height: `${incomeHeight}px` }}
                          title={`Income ${formatCurrency(item.income || 0)}`}
                        />
                        <div
                          className="w-5 rounded-t-xl bg-sky-400"
                          style={{ height: `${purchaseHeight}px` }}
                          title={`Purchases ${item.subscriptionsPurchased || 0}`}
                        />
                      </div>
                      <div className="grid justify-items-center gap-1">
                        <span className="text-xs font-extrabold text-slate-700">{monthLabels[(item.month || 1) - 1] || item.month}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/15 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="m-0 text-2xl font-black text-slate-950">Library Owners</h2>
                <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Search owners, inspect subscription health, and cancel Pro manually.</p>
              </div>
              <div className="grid gap-3 sm:max-w-xl sm:grid-cols-3">
                <input
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search owner or library"
                  value={search}
                />
                <select
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  value={statusFilter}
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CANCELED">Canceled</option>
                  <option value="EXPIRED">Expired</option>
                </select>
                <select
                  className="min-h-12 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                  onChange={(event) => setGrantTypeFilter(event.target.value)}
                  value={grantTypeFilter}
                >
                  <option value="ALL">All Grants</option>
                  <option value="PAID">Paid</option>
                  <option value="COMPLIMENTARY">Complimentary</option>
                  <option value="NONE">None</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3">
              {visibleOwners.map((owner) => {
                const isCancelable = owner.subscriptionPlan === "PRO" || owner.subscriptionStatus === "ACTIVE";
                const statusTone = owner.subscriptionStatus === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : owner.subscriptionStatus === "CANCELED"
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-100 text-slate-600";

                return (
                  <article className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-start" key={owner.id}>
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-lg font-black text-slate-950">{owner.name || "Library Owner"}</strong>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${statusTone}`}>
                          {owner.subscriptionStatus}
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">
                          {owner.subscriptionGrantType || "NONE"}
                        </span>
                      </div>

                      <div className="grid gap-1 text-sm font-semibold text-slate-600">
                        <span>{owner.email}</span>
                        <span>{owner.library?.name || "No library linked"}</span>
                        <span>{owner.library?.phone || "No phone"} {owner.library?.seatCount ? `| ${owner.library.seatCount} seats` : ""}</span>
                        <span>{owner.library?.address || "No address added"}</span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="rounded-[1.1rem] bg-white px-3 py-3">
                          <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Plan</span>
                          <strong className="mt-1 block text-sm font-black text-slate-950">{owner.subscriptionPlan || "-"}</strong>
                        </div>
                        <div className="rounded-[1.1rem] bg-white px-3 py-3">
                          <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Renews</span>
                          <strong className="mt-1 block text-sm font-black text-slate-950">{formatDate(owner.subscriptionRenewsAt)}</strong>
                        </div>
                        <div className="rounded-[1.1rem] bg-white px-3 py-3">
                          <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Paid Total</span>
                          <strong className="mt-1 block text-sm font-black text-slate-950">{formatCurrency(owner.totalPaidAmount)}</strong>
                        </div>
                        <div className="rounded-[1.1rem] bg-white px-3 py-3">
                          <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Purchases</span>
                          <strong className="mt-1 block text-sm font-black text-slate-950">{owner.subscriptionsPurchased || 0}</strong>
                        </div>
                      </div>

                      <p className="m-0 text-sm font-semibold text-slate-500">
                        Last paid: {formatDate(owner.lastPaidAt)} | Joined: {formatDate(owner.createdAt)}
                      </p>
                    </div>

                    <div className="sm:w-44">
                      {isCancelable ? (
                        <button
                          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-red-500 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5"
                          onClick={() => setCancelTarget(owner)}
                          type="button"
                        >
                          Cancel Subscription
                        </button>
                      ) : (
                        <div className="rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-extrabold text-slate-500">
                          Already inactive
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {visibleOwners.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-bold text-slate-500">
                  No library owners matched your search.
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-4 rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/15 sm:p-5">
            <div className="min-w-0">
              <h2 className="m-0 text-2xl font-black text-slate-950">Owner Action History</h2>
              <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Recent complimentary grants and manual subscription cancellations.</p>
            </div>

            <div className="grid gap-3">
              {(analytics.actionLogs || []).map((log) => {
                const isGrant = log.actionType === "GRANT_COMPLIMENTARY_PRO";
                return (
                  <article className="grid gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4" key={log.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={isGrant ? "rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700" : "rounded-full bg-red-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-red-700"}>
                        {isGrant ? "Grant Complimentary Pro" : "Cancel Subscription"}
                      </span>
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <div className="grid gap-1 text-sm font-semibold text-slate-600">
                      <span>Actor: {log.actorEmail}</span>
                      <span>Target: {log.targetEmail}</span>
                      <span>
                        {log.previousSubscriptionPlan || "-"} / {log.previousSubscriptionStatus || "-"} / {log.previousSubscriptionGrantType || "-"}
                        {" -> "}
                        {log.nextSubscriptionPlan || "-"} / {log.nextSubscriptionStatus || "-"} / {log.nextSubscriptionGrantType || "-"}
                      </span>
                      <span>
                        Renews: {formatDate(log.previousSubscriptionRenewsAt)} {" -> "} {formatDate(log.nextSubscriptionRenewsAt)}
                      </span>
                    </div>
                    {log.note ? (
                      <div className="rounded-[1.1rem] bg-white px-3 py-3 text-sm font-semibold text-slate-700">
                        {log.note}
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {(analytics.actionLogs || []).length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-bold text-slate-500">
                  No owner actions recorded yet.
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      <ConfirmCancelModal
        canceling={canceling}
        note={cancelNote}
        owner={cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          setCancelNote("");
        }}
        onNoteChange={(event) => setCancelNote(event.target.value)}
        onConfirm={handleCancelSubscription}
      />
    </div>
  );
}
