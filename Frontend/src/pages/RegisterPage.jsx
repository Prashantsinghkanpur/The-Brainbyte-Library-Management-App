import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/format";

const initialForm = {
  name: "",
  email: "",
  password: "",
  libraryName: "",
  phone: ""
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
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
      await register(form);
      navigate("/dashboard", { replace: true });
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
          <h1>Create the operating system for your study hall.</h1>
          <p>Start with your library profile, then we’ll help you organize students, seats, and finances.</p>
        </div>
        <div>
          <p className="eyebrow">Best fit for</p>
          <p>Owners who want fewer manual registers and faster visibility into dues, occupancy, and revenue.</p>
        </div>
      </section>

      <section className="auth-card-wrap">
        <form className="auth-card form-grid" onSubmit={handleSubmit}>
          <div className="section-title">
            <h1>Register library</h1>
            <p className="section-subtitle">This creates both the library workspace and the owner account.</p>
          </div>

          {error ? <div className="message error">{error}</div> : null}

          <div className="field-grid two-col">
            <div className="field">
              <label htmlFor="name">Owner name</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="libraryName">Library name</label>
              <input id="libraryName" name="libraryName" value={form.libraryName} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} required />
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
            {isSubmitting ? "Creating..." : "Create account"}
          </button>

          <p className="muted">
            Already have an account? <Link to="/login">Back to login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
