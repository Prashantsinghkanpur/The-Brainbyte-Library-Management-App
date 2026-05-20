import { useEffect, useState } from "react";

export default function AppModal({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  maxWidthClassName = "max-w-[560px]",
  panelClassName = "",
  headerActions = null
}) {
  const [canCloseFromBackdrop, setCanCloseFromBackdrop] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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

  return (
    <div
      className="fixed inset-0 z-[160] overflow-y-auto p-3 min-[380px]:p-4 sm:p-5"
      onClick={() => {
        if (canCloseFromBackdrop) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div className="app-modal-overlay absolute inset-0 bg-slate-950/60" />
      <section
        aria-modal="true"
        className={`app-modal-panel relative left-1/2 top-1/2 z-[170] grid max-h-[calc(100dvh-1.5rem)] w-[min(94vw,960px)] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_minmax(0,1fr)] ${maxWidthClassName} gap-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/30 min-[380px]:max-h-[calc(100dvh-2rem)] min-[380px]:rounded-[1.9rem] min-[380px]:p-5 sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[2.1rem] sm:p-6 ${panelClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        {(title || eyebrow || headerActions) ? (
          <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-start min-[430px]:justify-between">
            <div className="min-w-0">
              {eyebrow ? <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p> : null}
              {title ? <h3 className="m-0 mt-1 break-words text-2xl font-black text-slate-950">{title}</h3> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid min-h-0 gap-4 overflow-y-auto overscroll-contain pr-1">
          {children}
        </div>
      </section>
    </div>
  );
}
