import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordField from "../components/PasswordField";
import { getErrorMessage } from "../lib/format";
import { LogoButton, LogoPopup } from "../components/LogoPreview";

const initialForm = {
  name: "",
  email: "",
  password: "",
  libraryName: "",
  phone: "",
  seatCount: "",
  address: ""
};

const inputClass =
  "w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-teal-900/50";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
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
      await register(form);
      navigate("/dashboard", { replace: true });
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
          <LogoButton
            buttonClassName="mb-5 grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-teal-700/15 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/50 sm:mb-6"
            imageClassName="h-full w-full object-contain"
            onClick={() => setIsLogoOpen(true)}
          />
          <h1 className="m-0 max-w-xl break-words text-3xl font-extrabold leading-tight min-[380px]:text-4xl">Create the operating system for your study hall.</h1>
          <p className="mt-4 max-w-xl break-words text-sm text-slate-600 dark:text-slate-300 sm:text-base">Start with your library profile, then we'll help you organize students, seats, and finances.</p>
        </div>
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Best fit for</p>
          <p className="m-0 mt-2 max-w-xl break-words text-sm text-slate-600 dark:text-slate-300 sm:text-base">Owners who want fewer manual registers and faster visibility into dues, occupancy, and revenue.</p>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <form className="grid w-full max-w-xl gap-4 rounded-[1.5rem] border border-white/60 bg-white/90 p-4 shadow-2xl shadow-slate-400/25 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30 sm:rounded-[2rem] sm:p-6" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <h1 className="m-0 text-3xl font-extrabold">Register library</h1>
            <p className="m-0 break-words text-sm text-slate-500 dark:text-slate-400 sm:text-base">This creates both the library workspace and the owner account.</p>
          </div>

          {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}

          <div className="grid gap-4 min-[520px]:grid-cols-2">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="name">Owner name</label>
              <input className={inputClass} id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="libraryName">Library name</label>
              <input className={inputClass} id="libraryName" name="libraryName" value={form.libraryName} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="email">Email</label>
              <input className={inputClass} id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="phone">Phone</label>
              <input className={inputClass} id="phone" name="phone" value={form.phone} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="seatCount">Library seats</label>
              <input className={inputClass} id="seatCount" name="seatCount" type="number" min="1" value={form.seatCount} onChange={handleChange} required />
            </div>
            <div className="grid gap-2 min-[520px]:col-span-2">
              <label className="font-semibold text-slate-600 dark:text-slate-300" htmlFor="address">Library address</label>
              <input className={inputClass} id="address" name="address" value={form.address} onChange={handleChange} />
            </div>
            <PasswordField
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              labelClassName="font-semibold text-slate-600 dark:text-slate-300"
              inputClassName={inputClass}
            />
          </div>

          <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-xl shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating..." : "Create account"}
          </button>

          <p className="m-0 break-words text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            Already have an account? <Link className="font-bold text-teal-700" to="/login">Back to login</Link>
          </p>
        </form>
      </section>
      <LogoPopup isOpen={isLogoOpen} onClose={() => setIsLogoOpen(false)} />
    </div>
  );
}



