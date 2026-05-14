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
  const seats = payload?.seatGrid?.seats || [];

  const seatCount = summary?.totalSeats ?? payload?.seatCount ?? 0;
  const occupied = summary?.filledSeats ?? null;
  const vacant = summary?.vacantSeats ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <h1 className="m-0 text-3xl font-extrabold">Seat Availability</h1>
          <p className="m-0 mt-2 text-sm text-slate-600">{payload?.libraryName || "Live seat status"}</p>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">Loading...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-bold text-red-700">{error}</div>
        ) : (
          <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/30 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Seats</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{seatCount}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Occupied</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{occupied ?? "-"}</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Vacant</div>
                <div className="mt-2 text-2xl font-black text-teal-700">{vacant ?? "-"}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-extrabold text-slate-700">Live seat grid</div>
              <p className="m-0 mt-1 text-sm text-slate-500">Vacant seats are shown as Open, occupied seats show student names.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {seats.map((seat) => (
                  <div
                    key={`${seat.hallName}-${seat.seatNumber}`}
                    className={
                      seat.student
                        ? "rounded-[1.25rem] border border-sky-200 bg-white p-4"
                        : "rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-700">Seat {seat.seatNumber}</span>
                      {seat.student ? (
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-extrabold text-sky-700">
                          Filled
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">
                          Open
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className={
                          seat.student
                            ? "grid h-12 w-12 place-items-center rounded-full border-4 border-yellow-300 bg-sky-600 text-lg font-extrabold text-white"
                            : "grid h-12 w-12 place-items-center rounded-full border-2 border-slate-200 bg-white text-teal-700"
                        }
                      >
                        {seat.student?.name ? seat.student.name.slice(0, 2).toUpperCase() : "+"}
                      </div>

                      <div className="min-w-0">
                        <strong className="block break-words text-center text-sm font-extrabold leading-tight">
                          {seat.student?.name || "Vacant"}
                        </strong>
                        <p className="m-0 break-words text-center text-xs font-bold text-slate-500">
                          {seat.student?.shift?.replace("_", " ") || "Available"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

