export default function QRCodePublicLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-10 text-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-xl rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-xl">
        <h1 className="m-0 text-3xl font-extrabold">Scan QR</h1>
        <p className="m-0 mt-3 text-sm text-slate-600">
          This page is loaded directly via a QR scan. If you see this message, the QR link is incomplete.
        </p>
      </div>
    </div>
  );
}

