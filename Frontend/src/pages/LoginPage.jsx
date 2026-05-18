import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordField from "../components/PasswordField";
import { getErrorMessage } from "../lib/format";
import { LogoButton, LogoPopup } from "../components/LogoPreview";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogoOpen, setIsLogoOpen] = useState(false);

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
    <div className="grid min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#d9f99d_0,#ccfbf1_30%,#eff6ff_60%,#fff7ed_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#134e4a_0,#0f172a_48%,#111827_100%)] dark:text-slate-100 lg:grid-cols-[minmax(320px,0.9fr)_minmax(360px,1.1fr)]">
      <section className="relative flex min-h-[34vh] flex-col justify-between gap-6 overflow-hidden bg-white/30 p-5 backdrop-blur dark:bg-slate-950/30 sm:min-h-[38vh] sm:p-6 lg:min-h-screen lg:p-14">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-sky-500 to-amber-400" aria-hidden="true" />
        <div className="min-w-0">
          <LogoButton
            buttonClassName="mx-auto mb-5 grid h-24 w-24 place-items-center overflow-hidden rounded-[1.4rem] border border-white/80 bg-white p-2 shadow-2xl shadow-teal-700/20 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30 dark:focus:ring-teal-900/50 sm:mb-6"
            imageClassName="h-full w-full object-contain"
            onClick={() => setIsLogoOpen(true)}
          />
          <h1 className="m-0 max-w-xl break-words text-3xl font-black leading-tight text-slate-950 min-[380px]:text-4xl dark:text-white">Run your library with less manual follow-up.</h1>
          <p className="mt-4 max-w-xl break-words text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">
            Track students, seats, payments, and dues in one admin workspace built for day-to-day
            operations.
          </p>
        </div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">What you already have</p>
          <p className="m-0 mt-2 max-w-xl break-words text-sm leading-7 text-slate-700 dark:text-slate-300 sm:text-base">Secure auth, student records, seat grids, payment tracking, expenses, analytics, and settings.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-extrabold text-white shadow-lg shadow-teal-700/15">Students</span>
            <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-extrabold text-white shadow-lg shadow-sky-700/15">Seats</span>
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-slate-950 shadow-lg shadow-amber-700/15">Payments</span>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <form className="grid w-full max-w-xl gap-5 rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-2xl shadow-slate-400/25 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30 sm:rounded-[2rem] sm:p-7" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">Owner workspace</p>
            <h1 className="m-0 text-3xl font-black">Welcome back</h1>
            <p className="m-0 break-words text-sm text-slate-500 dark:text-slate-400 sm:text-base">Sign in to continue managing your library.</p>
          </div>

          {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="email">Email</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-teal-900/50" id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <PasswordField
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                labelClassName="font-semibold text-slate-600 dark:text-slate-300"
                inputClassName="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-teal-900/50"
              />
            </div>
          </div>

          <button className="min-h-12 rounded-full bg-gradient-to-r from-teal-700 via-emerald-600 to-sky-600 px-5 py-3 font-extrabold text-white shadow-xl shadow-teal-700/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

          <p className="m-0 break-words text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            New here? <Link className="font-bold text-teal-700" to="/register">Create your library account</Link>
          </p>
        </form>
      </section>

      <LogoPopup isOpen={isLogoOpen} onClose={() => setIsLogoOpen(false)} />
    </div>
  );
}



