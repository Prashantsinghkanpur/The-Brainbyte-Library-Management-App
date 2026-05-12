import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";


const initialProfile = {
  name: "",
  email: "",
  phone: "",
  libraryName: "",
  seatCount: "",
  address: "",
  logoDataUrl: ""
};

const getLibraryInitials = (profile) => (profile.libraryName || profile.name || "BB").slice(0, 2).toUpperCase();

const compressLogoFile = (file) =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const size = 256;
      const scale = Math.min(size / image.width, size / image.height);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = size;
      canvas.height = size;
      context.clearRect(0, 0, size, size);
      context.drawImage(image, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/webp", 0.86));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read this image."));
    };

    image.src = objectUrl;
  });

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
  const [savingLogo, setSavingLogo] = useState(false);
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
        libraryName: profileData.library.name || "",
        seatCount: profileData.library.seatCount || "",
        address: profileData.library.address || "",
        logoDataUrl: profileData.library.logoDataUrl || ""
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

  const applyProfileResponse = (data) => {
    setProfile({
      name: data.user.name || "",
      email: data.user.email || "",
      phone: data.library.phone || "",
      libraryName: data.library.name || "",
      seatCount: data.library.seatCount || "",
      address: data.library.address || "",
      logoDataUrl: data.library.logoDataUrl || ""
    });
    patchUser((currentUser) => ({
      ...currentUser,
      ...data.user
    }));
  };

  const saveProfile = async (nextProfile, successMessage) => {
    const data = await apiRequest("/settings/profile", {
      method: "PATCH",
      token,
      body: nextProfile
    });

    applyProfileResponse(data);
    setSuccess(successMessage);
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError("");
    setSuccess("");
    setSavingLogo(true);

    try {
      const logoDataUrl = await compressLogoFile(file);
      const nextProfile = { ...profile, logoDataUrl };
      setProfile(nextProfile);
      await saveProfile(nextProfile, "Library logo updated successfully.");
    } catch (logoError) {
      setError(getErrorMessage(logoError));
    } finally {
      setSavingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    setError("");
    setSuccess("");
    setSavingLogo(true);

    const nextProfile = { ...profile, logoDataUrl: "" };
    setProfile(nextProfile);

    try {
      await saveProfile(nextProfile, "Library logo removed.");
    } catch (removeError) {
      setError(getErrorMessage(removeError));
    } finally {
      setSavingLogo(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await saveProfile(profile, "Profile updated successfully.");
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

  const [selectedPlanKey, setSelectedPlanKey] = useState("1_MONTH");

  const APP_SUBSCRIPTION_PLANS = [
    { key: "1_MONTH", label: "1 Month", price: 249 },
    { key: "3_MONTHS", label: "3 Months", price: 599 },
    { key: "6_MONTHS", label: "6 Months", price: 999 },
    { key: "12_MONTHS", label: "1 Year", price: 1799 }
  ];

  const selectedPlan = APP_SUBSCRIPTION_PLANS.find((p) => p.key === selectedPlanKey) || APP_SUBSCRIPTION_PLANS[0];

  const handleSubscriptionAction = async (action) => {
    setSubscriptionAction(action);
    setError("");
    setSuccess("");

    try {
      if (action === "RENEW") {
        await loadRazorpayCheckout();

        const order = await apiRequest("/settings/subscription/order", {
          method: "POST",
          token,
          body: { plan: selectedPlanKey }
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
          <h1 className="m-0 text-[2.55rem] font-black leading-[0.95] text-slate-950 min-[380px]:text-5xl sm:text-7xl">Settings</h1>
          <p className="m-0 mt-3 break-words text-sm text-slate-500 sm:text-base">Manage your account and preferences</p>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{success}</div> : null}

      <section className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:items-center sm:gap-4 sm:rounded-[1.75rem] sm:p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-yellow-300 bg-yellow-50 text-lg font-extrabold text-yellow-600 sm:h-16 sm:w-16 sm:rounded-3xl sm:text-xl">
          {profile.logoDataUrl ? (
            <img className="h-full w-full object-contain" src={profile.logoDataUrl} alt={`${profile.libraryName || "Library"} logo`} />
          ) : (
            getLibraryInitials(profile)
          )}
        </div>
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
          {subscription?.amountPerSeat ? (
            <p className="m-0 mt-1 break-words text-sm text-white/80">
              {subscription.seatCount} seats x {formatCurrency(subscription.amountPerSeat)}
            </p>
          ) : null}
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
        <div className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <strong className="block break-words">Manage Subscription</strong>
            <p className="m-0 break-words text-sm text-slate-500 sm:text-base">
              {subscriptionPlan} plan is {subscriptionStatus.toLowerCase()}
            </p>
          </div>
          {/* <button
            className={subscriptionStatus === "CANCELED" ? "inline-flex min-h-11 items-center justify-center rounded-full bg-teal-50 px-4 py-2 font-bold text-teal-700 transition hover:-translate-y-0.5" : "inline-flex min-h-11 items-center justify-center rounded-full bg-red-50 px-4 py-2 font-bold text-red-700 transition hover:-translate-y-0.5"}
            disabled={Boolean(subscriptionAction)}
            onClick={() => handleSubscriptionAction(subscriptionStatus === "CANCELED" ? "RESTORE" : "CANCEL")}
            type="button"
          >
            {subscriptionStatus === "CANCELED" ? "Restore" : "Cancel"}
          </button> */}
        </div>

        <div className="mt-2 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {APP_SUBSCRIPTION_PLANS.map((plan) => {
            const active = plan.key === selectedPlanKey;
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlanKey(plan.key)}
                disabled={Boolean(subscriptionAction)}
                className={active ? "rounded-3xl border border-teal-200 bg-teal-50 p-4 text-left transition hover:-translate-y-0.5" : "rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5"}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="break-words text-base font-extrabold">{plan.label}</strong>
                  <span className={active ? "inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold text-teal-700" : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700"}>
                    {formatCurrency(plan.price)}
                  </span>
                </div>
                {
                  plan.label === '1 Year' &&           <p className=" text-center font-extrabold  m-0 mt-2 text-sm text-slate-500">Best value</p>
                }
      
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-teal-700 px-6 py-2 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={Boolean(subscriptionAction)}
            onClick={() => handleSubscriptionAction("RENEW")}
            type="button"
          >
            {subscriptionAction === "RENEW" ? "Opening..." : "Pay & Subscribe"}
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
                    {item.amountPerSeat ? ` | ${item.seatCount} seats` : ""}
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
          <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-yellow-300 bg-yellow-50 text-2xl font-black text-yellow-600">
              {profile.logoDataUrl ? (
                <img className="h-full w-full object-contain" src={profile.logoDataUrl} alt={`${profile.libraryName || "Library"} logo preview`} />
              ) : (
                getLibraryInitials(profile)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Library Logo</span>
              <p className="m-0 mt-1 text-sm font-bold text-slate-600">Optional logo for this library profile.</p>
            </div>
            <label className={savingLogo ? "inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full bg-teal-700 px-4 py-2 font-extrabold text-white opacity-70 shadow-lg shadow-teal-700/20" : "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-teal-700 px-4 py-2 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5"}>
              {savingLogo ? "Saving..." : "Upload Logo"}
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={savingLogo} onChange={handleLogoChange} />
            </label>
            {profile.logoDataUrl ? (
              <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" type="button" disabled={savingLogo} onClick={handleLogoRemove}>
                Remove
              </button>
            ) : null}
          </div>

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
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="settings-seatCount">Library Seats</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-seatCount" name="seatCount" type="number" min="1" value={profile.seatCount} onChange={handleProfileChange} />
            </div>
            <div className="grid gap-2 min-[520px]:col-span-2">
              <label className="font-semibold text-slate-600" htmlFor="settings-address">Library Address</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="settings-address" name="address" value={profile.address} onChange={handleProfileChange} />
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




