import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

const initialProfile = {
  name: "",
  email: "",
  phone: "",
  libraryName: ""
};

const loadRazorpayCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    document.body.appendChild(script);
  });

export default function SettingsPage() {
  const { token, patchUser, user } = useAuth();
  const [profile, setProfile] = useState(initialProfile);
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [themeMode, setThemeMode] = useState(user?.themeMode || "SYSTEM");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState("");

  const subscriptionStatus = subscription?.status || user?.subscriptionStatus || "ACTIVE";
  const subscriptionPlan = subscription?.plan || user?.subscriptionPlan || "PRO";
  const renewsAt = subscription?.renewsAt || user?.subscriptionRenewsAt;
  const isProActive = subscriptionPlan === "PRO" && subscriptionStatus === "ACTIVE";

  const loadSettings = async () => {
    setError("");

    try {
      const [profileData, subscriptionData, historyData] = await Promise.all([
        apiRequest("/settings/profile", { token }),
        apiRequest("/settings/subscription", { token }),
        apiRequest("/settings/billing-history", { token })
      ]);

      setProfile({
        name: profileData.user.name || "",
        email: profileData.user.email || "",
        phone: profileData.library.phone || "",
        libraryName: profileData.library.name || ""
      });
      setThemeMode(profileData.user.themeMode || "SYSTEM");
      setSubscription(subscriptionData);
      setBillingHistory(historyData.slice(0, 3));
      patchUser((currentUser) => ({
        ...currentUser,
        ...profileData.user,
        subscriptionPlan: subscriptionData.plan,
        subscriptionStatus: subscriptionData.status,
        subscriptionRenewsAt: subscriptionData.renewsAt
      }));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  };

  useEffect(() => {
    loadSettings();
  }, [token]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/settings/profile", {
        method: "PATCH",
        token,
        body: profile
      });
      setProfile({
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.library.phone || "",
        libraryName: data.library.name || ""
      });
      patchUser((currentUser) => ({
        ...currentUser,
        ...data.user
      }));
      setSuccess("Profile updated successfully.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleThemeSubmit = async (mode) => {
    setError("");
    setSuccess("");

    try {
      const data = await apiRequest("/settings/appearance", {
        method: "PATCH",
        token,
        body: { themeMode: mode }
      });
      setThemeMode(data.themeMode);
      patchUser((currentUser) => ({
        ...currentUser,
        themeMode: data.themeMode
      }));
      setSuccess("Appearance updated successfully.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  };

  const handleSubscriptionAction = async (action) => {
    setSubscriptionAction(action);
    setError("");
    setSuccess("");

    try {
      if (action === "RENEW") {
        await loadRazorpayCheckout();

        const order = await apiRequest("/settings/subscription/order", {
          method: "POST",
          token
        });

        const paymentResult = await new Promise((resolve, reject) => {
          const checkout = new window.Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: order.name,
            description: order.description,
            order_id: order.orderId,
            prefill: {
              name: profile.name || user?.name || "",
              email: profile.email || user?.email || "",
              contact: profile.phone || ""
            },
            notes: {
              libraryName: profile.libraryName || ""
            },
            theme: {
              color: "#0f766e"
            },
            handler: resolve,
            modal: {
              ondismiss: () => reject(new Error("Payment was cancelled"))
            }
          });

          checkout.on("payment.failed", (response) => {
            reject(new Error(response.error?.description || "Payment failed"));
          });

          checkout.open();
        });

        const data = await apiRequest("/settings/subscription/verify", {
          method: "POST",
          token,
          body: paymentResult
        });

        setSubscription(data);
        patchUser((currentUser) => ({
          ...currentUser,
          subscriptionPlan: data.plan,
          subscriptionStatus: data.status,
          subscriptionRenewsAt: data.renewsAt
        }));

        setSuccess("Payment successful. Pro membership renewed for 30 more days.");
        loadSettings();
        return;
      }

      const data = await apiRequest("/settings/subscription", {
        method: "PATCH",
        token,
        body: { action }
      });

      setSubscription(data);
      patchUser((currentUser) => ({
        ...currentUser,
        subscriptionPlan: data.plan,
        subscriptionStatus: data.status,
        subscriptionRenewsAt: data.renewsAt
      }));

      setSuccess(
        action === "CANCEL"
          ? "Subscription marked as canceled."
          : "Pro membership restored successfully."
      );
      loadSettings();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubscriptionAction("");
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-[2.55rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-7xl">Settings</h1>
          <p className="m-0 break-words text-sm text-slate-500 sm:text-base">Manage your account and preferences</p>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{success}</div> : null}

      <section className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:items-center sm:gap-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-yellow-50 text-lg font-extrabold text-yellow-600 sm:h-16 sm:w-16 sm:rounded-3xl sm:text-xl">BB</div>
        <div className="min-w-0 flex-1">
          <strong className="block break-words leading-tight">{profile.name || "Admin"}</strong>
          <p className="m-0 break-all text-sm text-slate-500 sm:text-base">{profile.email}</p>
          <span className={isProActive ? "mt-2 inline-flex rounded-full bg-yellow-50 px-3 py-2 text-xs font-extrabold text-yellow-600" : "mt-2 inline-flex rounded-full bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-600"}>
            {isProActive ? "PRO MEMBER" : `${subscriptionStatus} MEMBER`}
          </span>
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.5rem] bg-gradient-to-br from-teal-700 to-sky-600 p-4 text-white shadow-xl shadow-teal-700/20 sm:rounded-[1.75rem] sm:p-5 min-[520px]:grid-cols-[minmax(0,1fr)_auto] min-[520px]:items-center">
        <div className="min-w-0">
          <strong className="block break-words text-2xl font-extrabold">You are {subscriptionPlan}</strong>
          <p className="m-0 mt-2 break-words">
            {subscriptionStatus === "ACTIVE"
              ? `Renews in ${subscription?.renewsInDays ?? 0} days`
              : `Status: ${subscriptionStatus}`}
          </p>
          <p className="m-0 mt-1 break-words text-sm text-white/80">Renewal date: {formatDate(renewsAt)}</p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-white/20 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(subscriptionAction)}
          onClick={() => handleSubscriptionAction("RENEW")}
          type="button"
        >
          {subscriptionAction === "RENEW" ? "Opening..." : "Pay & Renew"}
        </button>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid gap-3 py-3 min-[430px]:flex min-[430px]:items-start min-[430px]:justify-between">
          <div className="min-w-0">
            <strong className="block break-words">Manage Subscription</strong>
            <p className="m-0 break-words text-sm text-slate-500 sm:text-base">
              {subscriptionPlan} plan is {subscriptionStatus.toLowerCase()}
            </p>
          </div>
          <button
            className={subscriptionStatus === "CANCELED" ? "inline-flex min-h-11 items-center justify-center rounded-full bg-teal-50 px-4 py-2 font-bold text-teal-700 transition hover:-translate-y-0.5" : "inline-flex min-h-11 items-center justify-center rounded-full bg-red-50 px-4 py-2 font-bold text-red-700 transition hover:-translate-y-0.5"}
            disabled={Boolean(subscriptionAction)}
            onClick={() => handleSubscriptionAction(subscriptionStatus === "CANCELED" ? "RESTORE" : "CANCEL")}
            type="button"
          >
            {subscriptionStatus === "CANCELED" ? "Restore" : "Cancel"}
          </button>
        </div>

        <div className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <strong className="block break-words">Billing History</strong>
            <p className="m-0 break-words text-sm text-slate-500 sm:text-base">
              {billingHistory.length > 0
                ? `Latest on ${formatDate(billingHistory[0].paymentDate)}`
                : "View transaction statements"}
            </p>
          </div>
          <span className="inline-flex min-h-10 items-center justify-center rounded-full bg-teal-50 px-3 text-xs font-extrabold text-teal-700">{billingHistory.length}</span>
        </div>

        {billingHistory.length > 0 ? (
          <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
            {billingHistory.map((item) => (
              <div className="grid gap-2 py-3 min-[430px]:flex min-[430px]:items-center min-[430px]:justify-between" key={item.id}>
                <div className="min-w-0">
                  <strong className="block break-all leading-tight">{item.reference}</strong>
                  <p className="m-0 break-words text-sm text-slate-500 sm:text-base">
                    {formatDate(item.paymentDate)} | {item.method} | {item.status}
                  </p>
                </div>
                <span className="break-words font-extrabold text-teal-700 min-[430px]:shrink-0 min-[430px]:text-right">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <strong className="block break-words">Theme Mode</strong>
            <p className="m-0 break-words text-sm text-slate-500 sm:text-base">Currently: {themeMode}</p>
          </div>
          <span className="inline-flex min-h-10 items-center justify-center rounded-full bg-teal-50 px-3 text-xs font-extrabold text-teal-700">{themeMode}</span>
        </div>

        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {["LIGHT", "DARK", "SYSTEM"].map((mode) => (
            <button
              key={mode}
              type="button"
              className={themeMode === mode ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
              onClick={() => handleThemeSubmit(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="m-0 text-2xl font-extrabold">Profile Details</h3>
        </div>

        <form className="grid gap-4" onSubmit={handleProfileSubmit}>
          <div className="grid gap-4 min-[520px]:grid-cols-2">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="settings-name">Owner Name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-name" name="name" value={profile.name} onChange={handleProfileChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="settings-libraryName">Library Name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-libraryName" name="libraryName" value={profile.libraryName} onChange={handleProfileChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="settings-email">Email</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-email" name="email" type="email" value={profile.email} onChange={handleProfileChange} />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="settings-phone">Phone</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-phone" name="phone" value={profile.phone} onChange={handleProfileChange} />
            </div>
          </div>

          <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit" disabled={submitting} type="submit">
            {submitting ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </section>
    </div>
  );
}




