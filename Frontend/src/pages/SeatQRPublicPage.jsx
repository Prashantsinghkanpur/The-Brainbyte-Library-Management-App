import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiRequest } from "../lib/api";

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
  const vacantSeats = (payload?.seatGrid?.seats || []).filter(
    (seat) => seat?.occupancyStatus === "VACANT" && !seat.student
  );
  const vacant = summary?.vacantSeats ?? vacantSeats.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-3 py-6 text-slate-950 min-[380px]:px-4 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 sm:mb-6">
          <h1 className="m-0 text-2xl font-extrabold min-[380px]:text-3xl">Vacant Seats</h1>
          <p className="m-0 mt-2 text-sm text-slate-600">{payload?.libraryName || "Live public seat view"}</p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="grid gap-3">
              <div className="h-6 w-40 rounded-full bg-slate-100/90" />
              <div className="h-4 w-60 rounded-full bg-slate-100/75" />
              <div className="grid grid-cols-2 gap-3 pt-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-36 rounded-[1.35rem] bg-slate-100/80" />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">{error}</div>
        ) : (
          <section className="grid gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-xl shadow-slate-300/30 min-[380px]:p-4 sm:gap-4 sm:p-6">
            <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 min-[380px]:rounded-3xl min-[380px]:p-4">
              <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Vacant Seats</div>
              <div className="mt-2 text-xl font-black text-teal-700 min-[380px]:text-2xl">{vacant}</div>
              <p className="m-0 mt-1 text-xs font-bold text-slate-500 min-[380px]:text-sm">Only open seats are shown here.</p>
            </div>

            <div className="rounded-[1.3rem] border border-slate-200 bg-white p-3 min-[380px]:rounded-2xl min-[380px]:p-4">
              <div className="text-sm font-extrabold text-slate-700">Live vacant seat list</div>
              <p className="m-0 mt-1 text-sm text-slate-500">This public QR page hides all filled seats and student details.</p>

              {vacantSeats.length ? (
                <div className="mt-4 grid grid-cols-2 gap-2 min-[380px]:gap-3 lg:grid-cols-3">
                  {vacantSeats.map((seat) => (
                    <article
                      key={`${seat.hallName}-${seat.seatNumber}`}
                      className="grid min-h-[10rem] content-between rounded-[1.15rem] border border-[#d9e8ee] bg-white/90 p-3 shadow-[0_12px_24px_rgba(148,184,198,0.18)] min-[380px]:min-h-[11rem] min-[380px]:rounded-[1.35rem] min-[380px]:p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[0.95rem] font-black text-slate-900 min-[380px]:text-[1.05rem]">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 min-[380px]:h-2.5 min-[380px]:w-2.5" />
                          Seat {seat.seatNumber}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-emerald-700 min-[380px]:text-[0.7rem]">
                          Open
                        </span>
                      </div>

                      <div className="grid justify-items-center gap-3 text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[#d9e2e8] bg-white text-4xl font-thin leading-none text-slate-400 min-[380px]:h-16 min-[380px]:w-16 min-[380px]:text-5xl">
                          +
                        </div>
                        <div>
                          <strong className="block text-sm font-black uppercase tracking-[0.16em] text-slate-500 min-[380px]:text-base">
                            Available
                          </strong>
                          <p className="m-0 mt-1 text-xs font-bold text-slate-400 min-[380px]:text-sm">
                            {seat.hallName || "Main Hall"}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                  No vacant seats are available right now.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
