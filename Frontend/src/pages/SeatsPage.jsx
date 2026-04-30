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
        setSuccess("Hall updated successfully.");
      } else {
        await apiRequest("/seats/halls", {
          method: "POST",
          token,
          body: payload
        });
        setSuccess("Hall created successfully.");
      }

      resetHallForm();
      loadGrid();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleHallEdit = (hall) => {
    setEditingHallId(hall._id);
    setHallForm({ name: hall.name, totalSeats: hall.totalSeats });
  };

  const handleHallDelete = async (hallId) => {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/seats/halls/${hallId}`, { method: "DELETE", token });
      setSuccess("Hall deleted successfully.");
      loadGrid();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  return (
    <div className="page-content">
      <section className="screen-header">
        <div>
          <p className="screen-kicker">MANAGEMENT</p>
          <h1 className="screen-title">Space Grid</h1>
        </div>
        <div className="hero-actions">
          <button className="round-action subtle" onClick={resetHallForm} type="button">
            🗑
          </button>
          <button className="round-action filled" onClick={resetHallForm} type="button">
            +
          </button>
        </div>
      </section>

      {error ? <div className="message error">{error}</div> : null}
      {success ? <div className="message success">{success}</div> : null}

      <section className="stack-card">
        <form onSubmit={handleSearchSubmit}>
          <input
            className="search-input mobile-search"
            name="search"
            placeholder="Find student or seat..."
            value={filters.search}
            onChange={handleFilterChange}
          />
        </form>

        <div className="seat-stats-grid">
          <div className="mini-stat-card">
            <strong>{gridData.summary.filledSeats ?? 0}</strong>
            <span>Filled</span>
          </div>
          <div className="mini-stat-card">
            <strong>{gridData.summary.vacantSeats ?? 0}</strong>
            <span>Vacant</span>
          </div>
          <div className="mini-stat-card">
            <strong>{gridData.summary.totalStudents ?? 0}</strong>
            <span>Students</span>
          </div>
          <div className="mini-stat-card">
            <strong>{gridData.summary.totalSeats ?? 0}</strong>
            <span>Seats</span>
          </div>
        </div>

        <div className="hall-header-row">
          <select className="hall-pill" name="hallName" value={filters.hallName} onChange={handleFilterChange}>
            <option value="">Main Hall</option>
            {gridData.halls.map((hall) => (
              <option key={hall._id} value={hall.name}>
                {hall.name}
              </option>
            ))}
          </select>
          <button className="ghost-button" onClick={() => handleHallEdit(gridData.selectedHall)} type="button" disabled={!gridData.selectedHall}>
            Edit Hall
          </button>
        </div>

        <div className="filter-rows">
          <div className="filter-line">
            <span className="mini-label">Shift</span>
            <div className="chip-row scrollable">
              {["ALL", "FULL_DAY", "MORNING", "EVENING", "CUSTOM"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.shift === value ? "filter-chip active" : "filter-chip"}
                  onClick={() => handleFilterChange({ target: { name: "shift", value } })}
                >
                  {value.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-line">
            <span className="mini-label">Status</span>
            <div className="chip-row scrollable">
              {["ALL", "VACANT", "OCCUPIED"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.status === value ? "filter-chip active" : "filter-chip"}
                  onClick={() => handleFilterChange({ target: { name: "status", value } })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-line">
            <span className="mini-label">Dues</span>
            <div className="chip-row scrollable">
              {["ALL", "PAID", "UNPAID", "TRIAL"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filters.dues === value ? "filter-chip active" : "filter-chip"}
                  onClick={() => handleFilterChange({ target: { name: "dues", value } })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="seat-board">
        <article className="seat-tile add-seat">
          <button className="seat-add-button" onClick={resetHallForm} type="button">
            +
          </button>
          <strong>Add More Seats</strong>
          <p>to {gridData.selectedHall?.name || "Main Hall"}</p>
        </article>

        {gridData.seats.map((seat) => (
          <article className="seat-tile" key={`${seat.hallName}-${seat.seatNumber}`}>
            <div className="seat-tile-top">
              <span className="seat-number-dot">• {seat.seatNumber}</span>
              {seat.student ? <span className="days-chip">{seat.student.daysRemaining}d</span> : null}
            </div>
            <div className="seat-avatar">
              {seat.student?.name ? seat.student.name.slice(0, 2).toUpperCase() : "+"}
            </div>
            <strong>{seat.student?.name || "Vacant"}</strong>
            <p className="section-subtitle">{seat.student?.shift?.replace("_", " ") || "Available"}</p>
            {seat.student ? <span className="tiny-chip">{seat.student.shift.replace("_", " ")}</span> : null}
          </article>
        ))}
      </section>

      <section className="sheet-card">
        <div className="section-heading-row">
          <h3>{editingHallId ? "Edit Hall" : "Create Hall"}</h3>
        </div>
        <form className="form-grid" onSubmit={handleHallSubmit}>
          <div className="field-grid two-col">
            <div className="field">
              <label htmlFor="hall-name">Hall name</label>
              <input id="hall-name" name="name" value={hallForm.name} onChange={handleHallFormChange} required />
            </div>
            <div className="field">
              <label htmlFor="hall-totalSeats">Total seats</label>
              <input id="hall-totalSeats" name="totalSeats" type="number" min="1" value={hallForm.totalSeats} onChange={handleHallFormChange} required />
            </div>
          </div>

          <div className="actions-row">
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Saving..." : editingHallId ? "Update Hall" : "Create Hall"}
            </button>
            {editingHallId ? (
              <button className="ghost-button" onClick={() => handleHallDelete(editingHallId)} type="button">
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
