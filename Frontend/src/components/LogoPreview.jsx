const logoSrc = "/brainbyte-logo.svg";

export function LogoButton({ buttonClassName, imageClassName, onClick }) {
  return (
    <button
      className={buttonClassName}
      type="button"
      aria-label="Open Brainbyte logo"
      onClick={onClick}
    >
      <img className={imageClassName} src={logoSrc} alt="Brainbyte logo" />
    </button>
  );
}

export function LogoPopup({ isOpen, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button className="app-modal-overlay fixed inset-0 z-50 cursor-default bg-slate-950/60" onClick={onClose} type="button" aria-label="Close logo popup" />
      <section className="app-modal-panel fixed left-1/2 top-1/2 z-[60] grid w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-2xl shadow-slate-950/30">
        <div className="mx-auto rounded-[2rem] p-4 shadow-inner shadow-slate-200" style={{ backgroundColor: "#ffffff" }}>
          <img className="h-56 w-56 rounded-[1.5rem] object-contain" style={{ backgroundColor: "#ffffff" }} src={logoSrc} alt="Brainbyte logo large" />
        </div>
        <div>
          <h3 className="m-0 text-2xl font-black text-slate-950">Brainbyte</h3>
          <p className="m-0 mt-1 font-bold text-slate-500">Library Management App</p>
        </div>
        <button className="mx-auto min-h-11 rounded-full bg-slate-950 px-6 font-extrabold text-white" onClick={onClose} type="button">
          Close
        </button>
      </section>
    </>
  );
}
