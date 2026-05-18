import { useState } from "react";

function PasswordIcon({ visible }) {
  return visible ? (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 3 18 18" />
      <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-4.04 5.19" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    </svg>
  ) : (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function PasswordField({
  id,
  name,
  value,
  onChange,
  label = "Password",
  inputClassName,
  labelClassName,
  required = false
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="grid gap-2">
      <label className={labelClassName} htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          className={`${inputClassName} pr-12`}
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={onChange}
          required={required}
        />
        <button
          className="absolute inset-y-0 right-3 inline-flex items-center justify-center rounded-full px-2 text-slate-500 transition hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200 dark:text-slate-400 dark:hover:text-teal-300 dark:focus:ring-teal-900/50"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
        >
          <PasswordIcon visible={isVisible} />
        </button>
      </div>
    </div>
  );
}
