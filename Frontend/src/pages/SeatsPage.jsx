import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/format";

const initialHallForm = {
  name: "",
  totalSeats: ""
};

const initialFilters = {
  hallName: "",
  shift: "ALL",
  status: "ALL",
  dues: "ALL",
  search: ""
};

export default function SeatsPage() {
  const { token } = useAuth();
  const [gridData, setGridData] = useState({ halls: [], summary: {}, seats: [], selectedHall: null });
  const [hallForm, setHallForm] = useState(initialHallForm);
  const [editingHallId, setEditingHallId] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showHallForm, setShowHallForm] = useState(false);

  const loadGrid = async (nextFilters = filters) => {
    setError("");

    try {
      const searchParams = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value && value !== "ALL") searchParams.set(key, value);
      });

      const data = await apiRequest(`/seats/grid${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { token });
      setGridData(data);

      if (!nextFilters.hallName && data.selectedHall?.name) {
        setFilters((current) => ({ ...current, hallName: data.selectedHall.name }));
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  };

  useEffect(() => {
    loadGrid(initialFilters);
  }, [token]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };

      if (name !== "search") {
        loadGrid(nextFilters);
      }

      return nextFilters;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadGrid();
  };

  const handleHallFormChange = (event) => {
    const { name, value } = event.target;
    setHallForm((current) => ({ ...current, [name]: value }));
  };

  const resetHallForm = () => {
    setHallForm(initialHallForm);
    setEditingHallId("");
  };

  const openHallForm = () => {
    resetHallForm();
    setShowHallForm(true);
    window.setTimeout(() => {
      document.getElementById("hall-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const openAddSeatsForm = () => {
    if (gridData.selectedHall) {
      setEditingHallId(gridData.selectedHall._id);
      setHallForm({
        name: gridData.selectedHall.name,
        totalSeats: Number(gridData.selectedHall.totalSeats || 0) + 1
      });
    } else {
      resetHallForm();
    }

    setShowHallForm(true);
    window.setTimeout(() => {
      document.getElementById("hall-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleHallSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = { ...hallForm, totalSeats: Number(hallForm.totalSeats) };

      if (editingHallId) {
        await apiRequest(`/seats/halls/${editingHallId}`, {
          method: "PATCH",
          token,
          body: payload
        });
        setSuccess("Seats updated successfully.");
      } else {
        await apiRequest("/seats/halls", {
          method: "POST",
          token,
          body: payload
        });
        setSuccess("Seats added successfully.");
      }

      resetHallForm();
      setShowHallForm(false);
      loadGrid({ ...filters, hallName: payload.name });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHallEdit = (hall) => {
    if (!hall) return;
    setEditingHallId(hall._id);
    setHallForm({ name: hall.name, totalSeats: hall.totalSeats });
    setShowHallForm(true);
    window.setTimeout(() => {
      document.getElementById("hall-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleHallDelete = async (hallId) => {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/seats/halls/${hallId}`, { method: "DELETE", token });
      setSuccess("Seats deleted successfully.");
      setShowHallForm(false);
      loadGrid();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="flex items-start justify-between gap-3 pt-2 sm:pt-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.22em] text-slate-500">MANAGEMENT</p>
          <h1 className="m-0 mt-1 text-[2.45rem] font-black leading-none text-slate-950 min-[380px]:text-5xl sm:text-7xl">Space Grid</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-lg font-bold shadow-xl shadow-slate-300/40 sm:h-14 sm:w-14" onClick={() => { resetHallForm(); setShowHallForm(false); }} type="button" aria-label="Clear hall form">
            X
          </button>
          <button className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-700 text-3xl text-white shadow-xl shadow-teal-700/20 sm:h-14 sm:w-14" onClick={openHallForm} type="button" aria-label="Add seats">
            +
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-700">{success}</div> : null}

      <section className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <form onSubmit={handleSearchSubmit}>
          <input
            className="min-h-14 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-lg outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            name="search"
            placeholder="Find student or seat..."
            value={filters.search}
            onChange={handleFilterChange}
          />
        </form>

        <div className="grid grid-cols-2 gap-3 min-[520px]:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20">
            <strong className="block text-2xl font-black leading-none text-slate-950">{gridData.summary.filledSeats ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Filled</span>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20">
            <strong className="block text-2xl font-black leading-none text-slate-950">{gridData.summary.vacantSeats ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Vacant</span>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20">
            <strong className="block text-2xl font-black leading-none text-slate-950">{gridData.summary.totalStudents ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Students</span>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20">
            <strong className="block text-2xl font-black leading-none text-slate-950">{gridData.summary.totalSeats ?? 0}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">Seats</span>
          </div>
        </div>

        <div className="grid gap-3 min-[430px]:flex min-[430px]:items-center min-[430px]:justify-between">
          <select className="min-h-12 w-full rounded-3xl border-0 bg-teal-700 px-5 font-bold text-white min-[430px]:w-auto" name="hallName" value={filters.hallName} onChange={handleFilterChange}>
            <option value="">Main Hall</option>
            {gridData.halls.map((hall) => (
              <option key={hall._id} value={hall.name}>
                {hall.name}
              </option>
            ))}
          </select>
          <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => handleHallEdit(gridData.selectedHall)} type="button" disabled={!gridData.selectedHall}>
            Edit Seats
          </button>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">Shift</span>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {["ALL", "FULL_DAY", "MORNING", "EVENING", "CUSTOM"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.shift === value ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
                  onClick={() => handleFilterChange({ target: { name: "shift", value } })}
                >
                  {value.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">Status</span>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {["ALL", "VACANT", "OCCUPIED"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.status === value ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
                  onClick={() => handleFilterChange({ target: { name: "status", value } })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-bold text-slate-500">Dues</span>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {["ALL", "PAID", "UNPAID", "TRIAL"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.dues === value ? "whitespace-nowrap rounded-full bg-teal-700 px-4 py-2 font-bold text-white shadow-lg shadow-teal-700/20" : "whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5"}
                  onClick={() => handleFilterChange({ target: { name: "dues", value } })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 min-[430px]:grid-cols-2 xl:grid-cols-3">
        <article className="grid min-h-40 place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-4 text-center shadow-lg shadow-slate-300/20 sm:rounded-[1.75rem] sm:p-5">
          <button className="grid h-14 w-14 place-items-center rounded-full border-0 bg-teal-50 text-4xl text-teal-700 sm:h-16 sm:w-16" onClick={openAddSeatsForm} type="button">
            +
          </button>
          <strong className="block">Add More Seats</strong>
          <p className="m-0 break-words text-sm text-slate-500">to {gridData.selectedHall?.name || "Main Hall"}</p>
        </article>

        {gridData.seats.map((seat) => (
          <article className={`grid min-h-44 content-start gap-3 rounded-[1.5rem] border p-4 shadow-lg shadow-slate-300/25 sm:rounded-[1.75rem] sm:p-5 ${seat.student ? "border-sky-100 bg-white" : "border-slate-200 bg-slate-50"}`} key={`${seat.hallName}-${seat.seatNumber}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-700">Seat {seat.seatNumber}</span>
              {seat.student ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-extrabold text-sky-600">{seat.student.daysRemaining}d</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">Open</span>}
            </div>
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full border-4 text-2xl font-extrabold ${seat.student ? "border-yellow-300 bg-sky-600 text-white" : "border-slate-200 bg-white text-teal-700"}`}>
              {seat.student?.name ? seat.student.name.slice(0, 2).toUpperCase() : "+"}
            </div>
            <strong className="block min-w-0 break-words text-center leading-tight">{seat.student?.name || "Vacant"}</strong>
            <p className="m-0 break-words text-center text-sm text-slate-500">{seat.student?.shift?.replace("_", " ") || "Available"}</p>
            {seat.student ? <span className="inline-flex items-center justify-center rounded-full bg-teal-50 px-3 py-2 text-xs font-extrabold text-teal-700">{seat.student.shift.replace("_", " ")}</span> : null}
          </article>
        ))}
      </section>

      {showHallForm ? (
      <section id="hall-form-section" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/40 sm:rounded-[1.75rem] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="m-0 text-2xl font-extrabold">{editingHallId ? "Edit Seats" : "Add Seats"}</h3>
        </div>
        <form className="grid gap-4" onSubmit={handleHallSubmit}>
          <div className="grid gap-4 min-[520px]:grid-cols-2">
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="hall-name">Section name</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="hall-name" name="name" value={hallForm.name} onChange={handleHallFormChange} required />
            </div>
            <div className="grid gap-2">
              <label className="font-semibold text-slate-600" htmlFor="hall-totalSeats">Total seats</label>
              <input className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100" id="hall-totalSeats" name="totalSeats" type="number" min="1" value={hallForm.totalSeats} onChange={handleHallFormChange} required />
            </div>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <button className="min-h-12 rounded-full bg-teal-700 px-5 py-3 font-extrabold text-white shadow-lg shadow-teal-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? "Saving..." : editingHallId ? "Update Seats" : "Add Seats"}
            </button>
            {editingHallId ? (
              <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => handleHallDelete(editingHallId)} type="button">
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </section>
      ) : null}
    </div>
  );
}




