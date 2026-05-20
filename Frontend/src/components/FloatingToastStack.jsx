const toneClasses = {
  error: "border-red-100 bg-red-50 text-red-700 shadow-red-600/10",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-emerald-600/10"
};

function FloatingToast({ message, tone }) {
  if (!message) return null;

  return (
    <div
      className={`pointer-events-none w-full max-w-xl rounded-[1.25rem] border px-4 py-3 text-sm font-extrabold shadow-2xl backdrop-blur sm:px-5 sm:py-4 sm:text-base ${toneClasses[tone]}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

export default function FloatingToastStack({ error = "", success = "" }) {
  if (!error && !success) return null;

  return (
    <div className="app-toast-stack pointer-events-none fixed inset-x-0 top-4 z-[120] flex flex-col items-center gap-3 px-4 sm:top-6">
      {error ? <FloatingToast message={error} tone="error" /> : null}
      {success ? <FloatingToast message={success} tone="success" /> : null}
    </div>
  );
}
