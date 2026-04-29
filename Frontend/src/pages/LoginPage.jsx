import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/format";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(form);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-panel">
        <div>
          <div className="brand-mark">BB</div>
          <h1>Run your library with less manual follow-up.</h1>
          <p>
            Track students, seats, payments, and dues in one admin workspace built for day-to-day
            operations.
          </p>
        </div>
        <div>
          <p className="eyebrow">What you already have</p>
          <p>Secure auth, student records, seat grids, payment tracking, expenses, analytics, and settings.</p>
        </div>
      </section>

      <section className="auth-card-wrap">
        <form className="auth-card form-grid" onSubmit={handleSubmit}>
          <div className="section-title">
            <h1>Welcome back</h1>
            <p className="section-subtitle">Sign in to continue managing your library.</p>
          </div>

          {error ? <div className="message error">{error}</div> : null}

          <div className="field-grid">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

          <p className="muted">
            New here? <Link to="/register">Create your library account</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
