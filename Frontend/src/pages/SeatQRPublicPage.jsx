import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../lib/api";

const getSeatInitials = (name) => {
  if (!name) return "+";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return parts[0].slice(0, 2).toUpperCase();
};

const getSeatShiftLabel = (shift) => (shift ? shift.replace(/_/g, " ") : "AVAILABLE");

const getSeatStatusMeta = (student) => {
  if (!student) {
    return { label: "AVAILABLE", tone: "vacant" };
  }

  if (student.duesState === "PAID") {
    if (student.daysRemaining <= 30) {
      return { label: "PAID", tone: "paid" };
    }

    return { label: `${student.daysRemaining}d`, tone: "running" };
  }

  return {
    label: student.daysRemaining > 0 ? `${student.daysRemaining}d` : "DUE",
    tone: "due"
  };
};

function SeatBadge({ student }) {
  const meta = getSeatStatusMeta(student);

  if (meta.tone === "vacant") {
    return null;
  }

  const toneClasses = {
    running: "bg-sky-50 text-sky-600",
    paid: "bg-emerald-50 text-emerald-600",
    due: "bg-rose-50 text-rose-500"
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.04em] min-[380px]:px-2.5 min-[380px]:text-[0.7rem] ${toneClasses[meta.tone]}`}>
      {meta.tone === "running" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2v7.31" />
          <path d="M14 9.3V1.99" />
          <path d="M8.5 2h7" />
          <path d="M14 9.3a6 6 0 1 1-4 0" />
        </svg>
      ) : null}
      {meta.tone === "paid" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ) : null}
      {meta.tone === "due" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6" />
          <path d="M12 16h.01" />
        </svg>
      ) : null}
      {meta.label}
    </span>
  );
}

export default function SeatQRPublicPage() {
  const { libraryId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const apiPath = useMemo(() => {
    if (!libraryId) return "";
    return `/settings/qr/seat-snapshot/${libraryId}`;
  }, [libraryId]);

  useEffect(() => {
    let isMounted = true;

    const load = async (showLoader = false) => {
      if (!apiPath) return;
      if (showLoader) {
        setLoading(true);
      }

      try {
        const data = await apiRequest(apiPath, { token: undefined });
        if (!isMounted) return;
        setError("");
        setPayload(data);
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load seat snapshot");
      } finally {
        if (!isMounted || !showLoader) return;
        setLoading(false);
      }
    };

    load(true);
    const intervalId = window.setInterval(() => {
      load(false);
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [apiPath]);

  const summary = payload?.seatGrid?.summary;
  const seats = payload?.seatGrid?.seats || [];

  const seatCount = summary?.totalSeats ?? payload?.seatCount ?? 0;
  const occupied = summary?.filledSeats ?? null;
  const vacant = summary?.vacantSeats ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-3 py-6 text-slate-950 min-[380px]:px-4 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 sm:mb-6">
          <h1 className="m-0 text-2xl font-extrabold min-[380px]:text-3xl">Seat Availability</h1>
          <p className="m-0 mt-2 text-sm text-slate-600">{payload?.libraryName || "Live seat status"}</p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Loading...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">{error}</div>
        ) : (
          <section className="grid gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/30 min-[380px]:p-4 sm:gap-4 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 min-[380px]:rounded-3xl min-[380px]:p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Seats</div>
                <div className="mt-2 text-xl font-black text-slate-900 min-[380px]:text-2xl">{seatCount}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 min-[380px]:rounded-3xl min-[380px]:p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Occupied</div>
                <div className="mt-2 text-xl font-black text-slate-900 min-[380px]:text-2xl">{occupied ?? "-"}</div>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 min-[380px]:rounded-3xl min-[380px]:p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Vacant</div>
                <div className="mt-2 text-xl font-black text-teal-700 min-[380px]:text-2xl">{vacant ?? "-"}</div>
              </div>
            </div>

            <div className="rounded-[1.3rem] border border-slate-200 bg-white p-3 min-[380px]:rounded-2xl min-[380px]:p-4">
              <div className="text-sm font-extrabold text-slate-700">Live seat grid</div>
              <p className="m-0 mt-1 text-sm text-slate-500">Vacant seats are shown as Open, occupied seats show student names.</p>

              <div className="mt-4 grid grid-cols-2 gap-2 min-[380px]:gap-3 lg:grid-cols-3">
                {seats.map((seat) => (
                  <article
                    key={`${seat.hallName}-${seat.seatNumber}`}
                    className={`grid min-h-[11.5rem] content-start rounded-[1.15rem] border p-3 shadow-[0_12px_24px_rgba(148,184,198,0.18)] min-[380px]:min-h-[13rem] min-[380px]:rounded-[1.35rem] min-[380px]:p-4 ${
                      seat.student ? "border-[#cfe1e8] bg-white" : "border-[#d9e8ee] bg-white/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[0.95rem] font-black text-slate-900 min-[380px]:text-[1.05rem]">
                        <span
                          className={`h-2 w-2 rounded-full min-[380px]:h-2.5 min-[380px]:w-2.5 ${
                            seat.student
                              ? seat.student.duesState === "PAID"
                                ? "bg-teal-500"
                                : "bg-rose-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {seat.seatNumber}
                      </span>
                      <SeatBadge student={seat.student} />
                    </div>

                    {seat.student ? (
                      <div className="mt-3 grid flex-1 content-center justify-items-center text-center min-[380px]:mt-4">
                        <div className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-yellow-300 bg-sky-600 text-[1.5rem] font-black text-white shadow-[0_10px_24px_rgba(14,116,144,0.22)] min-[380px]:h-16 min-[380px]:w-16 min-[380px]:text-[1.7rem]">
                          {getSeatInitials(seat.student.name)}
                        </div>
                        <strong className="mt-3 block min-w-0 break-words text-[0.92rem] font-black uppercase leading-tight text-slate-950 min-[380px]:mt-4 min-[380px]:text-[1.02rem]">
                          {seat.student.name}
                        </strong>
                        <span className="mt-3 inline-flex items-center justify-center rounded-full border border-[#d3e5e8] bg-[#f8fdfd] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-teal-700 min-[380px]:mt-4 min-[380px]:px-3 min-[380px]:py-1.5 min-[380px]:text-[0.72rem]">
                          {getSeatShiftLabel(seat.student.shift)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 grid flex-1 content-center justify-items-center text-center min-[380px]:mt-4">
                        <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[#d9e2e8] bg-white text-4xl font-thin leading-none text-slate-400 min-[380px]:h-16 min-[380px]:w-16 min-[380px]:text-5xl">
                          +
                        </div>
                        <strong className="mt-4 block text-[0.72rem] font-black uppercase tracking-[0.16em] text-slate-400 min-[380px]:mt-5 min-[380px]:text-sm">
                          Available
                        </strong>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

