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
    <div className="grid min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 text-slate-950 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 lg:grid-cols-[minmax(320px,0.9fr)_minmax(360px,1.1fr)]">
      <section className="flex min-h-[30vh] flex-col justify-between gap-6 bg-gradient-to-b from-slate-200 to-slate-100 p-5 dark:from-slate-900 dark:to-slate-800 sm:min-h-[34vh] sm:p-6 lg:min-h-screen lg:p-14">
        <div className="min-w-0">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-sky-500 font-extrabold text-white shadow-lg shadow-teal-700/15 sm:mb-6">BB</div>
          <h1 className="m-0 max-w-xl break-words text-3xl font-extrabold leading-tight min-[380px]:text-4xl">Run your library with less manual follow-up.</h1>
          <p className="mt-4 max-w-xl break-words text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Track students, seats, payments, and dues in one admin workspace built for day-to-day
            operations.
          </p>
        </div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">What you already have</p>
          <p className="m-0 mt-2 max-w-xl break-words text-sm text-slate-600 dark:text-slate-300 sm:text-base">Secure auth, student records, seat grids, payment tracking, expenses, analytics, and settings.</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <form className="grid w-full max-w-xl gap-4 rounded-[1.5rem] border border-white/60 bg-white/90 p-4 shadow-2xl shadow-slate-400/25 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30 sm:rounded-[2rem] sm:p-6" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <h1 className="m-0 text-3xl font-extrabold">Welcome back</h1>
            <p className="m-0 break-words text-sm text-slate-500 dark:text-slate-400 sm:text-base">Sign in to continue managing your library.</p>
          </div>

          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="email">Email</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-teal-900/50" id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="password">Password</label>
              <input
                className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-teal-900/50"
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-xl shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

          <p className="m-0 break-words text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            New here? <Link className="font-bold text-teal-700" to="/register">Create your library account</Link>
          </p>
        </form>
      </section>
    </div>
  );
}



