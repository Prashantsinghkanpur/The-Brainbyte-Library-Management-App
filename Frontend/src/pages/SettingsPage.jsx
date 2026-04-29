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
      setBillingHistory(historyData);
      patchUser((currentUser) => ({
        ...currentUser,
        ...profileData.user
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

  return (
    <div className="page-content">
      {error ? <div className="message error">{error}</div> : null}
      {success ? <div className="message success">{success}</div> : null}

      <section className="card-grid three-col">
        <article className="stat-card">
          <span className="eyebrow">Plan</span>
          <strong>{subscription?.plan || "STARTER"}</strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Status</span>
          <strong>{subscription?.status || "ACTIVE"}</strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Renews In</span>
          <strong>{subscription?.renewsInDays ?? 0} days</strong>
        </article>
      </section>

      <section className="split-layout">
        <article className="card">
          <div className="section-title">
            <h3>Profile</h3>
            <p className="section-subtitle">Update owner and library details.</p>
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
        </article>

        <article className="card">
          <div className="section-title">
            <h3>Appearance</h3>
            <p className="section-subtitle">Sync the preferred mode with your backend setting.</p>
          </div>

          <div className="actions-row">
            <button
              className={themeMode === "LIGHT" ? "primary-button" : "secondary-button"}
              onClick={() => handleThemeSubmit("LIGHT")}
              type="button"
            >
              Light
            </button>
            <button
              className={themeMode === "DARK" ? "primary-button" : "secondary-button"}
              onClick={() => handleThemeSubmit("DARK")}
              type="button"
            >
              Dark
            </button>
            <button
              className={themeMode === "SYSTEM" ? "primary-button" : "secondary-button"}
              onClick={() => handleThemeSubmit("SYSTEM")}
              type="button"
            >
              System
            </button>
          </div>

          <p className="muted">Current mode: {themeMode}</p>
          <p className="muted">Renewal date: {formatDate(subscription?.renewsAt)}</p>
        </article>
      </section>

      <section className="table-card">
        <div className="section-title">
          <h3>Billing History</h3>
          <p className="section-subtitle">This currently mirrors recent member payments from your backend.</p>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Payment Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.reference}</td>
                  <td>{item.type}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{item.method}</td>
                  <td>{formatDate(item.paymentDate)}</td>
                  <td>{item.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {billingHistory.length === 0 ? <div className="empty-state">No billing entries available yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
