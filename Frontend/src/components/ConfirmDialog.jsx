import { useEffect, useState } from "react";

const toneStyles = {
  danger: {
    badge: "bg-rose-100 text-rose-700",
    button: "bg-rose-600 text-white shadow-lg shadow-rose-600/20 hover:-translate-y-0.5"
  },
  primary: {
    badge: "bg-teal-100 text-teal-700",
    button: "bg-teal-700 text-white shadow-lg shadow-teal-700/20 hover:-translate-y-0.5"
  }
};

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  isLoading = false,
  onConfirm,
  onClose
}) {
  const [canCloseFromBackdrop, setCanCloseFromBackdrop] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCanCloseFromBackdrop(false);
      return undefined;
    }

    setCanCloseFromBackdrop(false);
    const timeoutId = window.setTimeout(() => {
      setCanCloseFromBackdrop(true);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const resolvedTone = toneStyles[tone] || toneStyles.danger;

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto p-3 min-[380px]:p-4 sm:p-5"
      onClick={() => {
        if (!isLoading && canCloseFromBackdrop) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div className="app-modal-overlay absolute inset-0 bg-slate-950/60" />
      <section
        aria-modal="true"
        className="app-modal-panel relative left-1/2 top-1/2 z-[80] grid max-h-[calc(100dvh-1.5rem)] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)_auto] gap-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/30 sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="grid min-h-0 gap-3 overflow-y-auto overscroll-contain pr-1">
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${resolvedTone.badge}`}>
            Please Confirm
          </span>
          <div className="grid gap-2">
            <h3 className="m-0 text-2xl font-black text-slate-950">{title}</h3>
            <p className="m-0 text-sm font-medium leading-6 text-slate-500 sm:text-base">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-full border border-slate-200 bg-white px-5 font-extrabold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={onClose}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`min-h-12 rounded-full px-5 font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${resolvedTone.button}`}
            disabled={isLoading}
            onClick={onConfirm}
            type="button"
          >
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
