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
          : action === "RESTORE"
            ? "Pro membership restored successfully."
            : "Pro membership renewed for 30 more days."
      );
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubscriptionAction("");
    }
  };

  return (
    <div className="page-content">
      <section className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="section-subtitle">Manage your account and preferences</p>
        </div>
      </section>

      {error ? <div className="message error">{error}</div> : null}
      {success ? <div className="message success">{success}</div> : null}

      <section className="sheet-card profile-banner">
        <div className="list-avatar logo-avatar">BB</div>
        <div className="list-content">
          <strong>{profile.name || "Admin"}</strong>
          <p className="section-subtitle">{profile.email}</p>
          <span className={isProActive ? "pro-badge" : "pro-badge muted-badge"}>
            {isProActive ? "PRO MEMBER" : `${subscriptionStatus} MEMBER`}
          </span>
        </div>
      </section>

      <section className="stack-card tone-teal">
        <div>
          <strong className="subscription-title">You are {subscriptionPlan}</strong>
          <p>
            {subscriptionStatus === "ACTIVE"
              ? `Renews in ${subscription?.renewsInDays ?? 0} days`
              : `Status: ${subscriptionStatus}`}
          </p>
          <p className="subscription-meta">Renewal date: {formatDate(renewsAt)}</p>
        </div>
        <button
          className="soft-view-button"
          disabled={subscriptionAction === "RENEW"}
          onClick={() => handleSubscriptionAction("RENEW")}
          type="button"
        >
          {subscriptionAction === "RENEW" ? "Renewing..." : "Renew"}
        </button>
      </section>

      <section className="sheet-card">
        <div className="settings-option">
          <div>
            <strong>Manage Subscription</strong>
            <p className="section-subtitle">
              {subscriptionPlan} plan is {subscriptionStatus.toLowerCase()}
            </p>
          </div>
          <button
            className={subscriptionStatus === "CANCELED" ? "secondary-button" : "danger-button"}
            disabled={Boolean(subscriptionAction)}
            onClick={() => handleSubscriptionAction(subscriptionStatus === "CANCELED" ? "RESTORE" : "CANCEL")}
            type="button"
          >
            {subscriptionStatus === "CANCELED" ? "Restore" : "Cancel"}
          </button>
        </div>

        <div className="settings-option">
          <div>
            <strong>Billing History</strong>
            <p className="section-subtitle">
              {billingHistory.length > 0
                ? `Latest on ${formatDate(billingHistory[0].paymentDate)}`
                : "View transaction statements"}
            </p>
          </div>
          <span className="settings-count">{billingHistory.length}</span>
        </div>

        {billingHistory.length > 0 ? (
          <div className="billing-list">
            {billingHistory.map((item) => (
              <div className="billing-row" key={item.id}>
                <div>
                  <strong>{item.reference}</strong>
                  <p className="section-subtitle">
                    {formatDate(item.paymentDate)} | {item.method}
                  </p>
                </div>
                <span>{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="sheet-card">
        <div className="settings-option">
          <div>
            <strong>Theme Mode</strong>
            <p className="section-subtitle">Currently: {themeMode}</p>
          </div>
          <span className="settings-count">{themeMode}</span>
        </div>

        <div className="chip-row">
          {["LIGHT", "DARK", "SYSTEM"].map((mode) => (
            <button
              key={mode}
              type="button"
              className={themeMode === mode ? "filter-chip active" : "filter-chip"}
              onClick={() => handleThemeSubmit(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      <section className="sheet-card">
        <div className="section-heading-row">
          <h3>Profile Details</h3>
        </div>

        <form className="form-grid" onSubmit={handleProfileSubmit}>
          <div className="field-grid two-col">
            <div className="field">
              <label htmlFor="settings-name">Owner Name</label>
              <input id="settings-name" name="name" value={profile.name} onChange={handleProfileChange} />
            </div>
            <div className="field">
              <label htmlFor="settings-libraryName">Library Name</label>
              <input id="settings-libraryName" name="libraryName" value={profile.libraryName} onChange={handleProfileChange} />
            </div>
            <div className="field">
              <label htmlFor="settings-email">Email</label>
              <input id="settings-email" name="email" type="email" value={profile.email} onChange={handleProfileChange} />
            </div>
            <div className="field">
              <label htmlFor="settings-phone">Phone</label>
              <input id="settings-phone" name="phone" value={profile.phone} onChange={handleProfileChange} />
            </div>
          </div>

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Saving..." : "Update Profile"}
          </button>
        </form>
      </section>
    </div>
  );
}
