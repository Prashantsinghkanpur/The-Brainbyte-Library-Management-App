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
    <div className="page-content split-layout">
      <section className="page-content">
        <article className="card">
          <div className="section-title">
            <h3>{editingHallId ? "Edit Hall" : "Create Hall"}</h3>
            <p className="section-subtitle">Set hall name and seat capacity. Student seat limits will follow this.</p>
          </div>

          {error ? <div className="message error">{error}</div> : null}
          {success ? <div className="message success">{success}</div> : null}

          <form className="form-grid" onSubmit={handleHallSubmit}>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="hall-name">Hall name</label>
                <input id="hall-name" name="name" value={hallForm.name} onChange={handleHallFormChange} required />
              </div>
              <div className="field">
                <label htmlFor="hall-totalSeats">Total seats</label>
                <input
                  id="hall-totalSeats"
                  name="totalSeats"
                  type="number"
                  min="1"
                  value={hallForm.totalSeats}
                  onChange={handleHallFormChange}
                  required
                />
              </div>
            </div>

            <div className="actions-row">
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? "Saving..." : editingHallId ? "Update Hall" : "Create Hall"}
              </button>
              {editingHallId ? (
                <button className="ghost-button" onClick={resetHallForm} type="button">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="table-card">
          <div className="section-title">
            <h3>Halls</h3>
            <p className="section-subtitle">Quick access to edit capacity or remove empty halls.</p>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Total Seats</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {gridData.halls.map((hall) => (
                  <tr key={hall._id}>
                    <td>{hall.name}</td>
                    <td>{hall.totalSeats}</td>
                    <td>
                      <div className="inline-actions">
                        <button className="ghost-button" onClick={() => handleHallEdit(hall)} type="button">
                          Edit
                        </button>
                        <button className="danger-button" onClick={() => handleHallDelete(hall._id)} type="button">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="page-content">
        <article className="card-grid three-col">
          <div className="stat-card">
            <span className="eyebrow">Filled</span>
            <strong>{gridData.summary.filledSeats ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span className="eyebrow">Vacant</span>
            <strong>{gridData.summary.vacantSeats ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span className="eyebrow">Total Seats</span>
            <strong>{gridData.summary.totalSeats ?? 0}</strong>
          </div>
        </article>

        <article className="table-card">
          <div className="table-toolbar">
            <div className="section-title">
              <h3>Seat Grid</h3>
              <p className="section-subtitle">Inspect occupancy, dues state, and student assignments by hall.</p>
            </div>
            <form onSubmit={handleSearchSubmit}>
              <input
                className="search-input"
                name="search"
                placeholder="Search seat or student"
                value={filters.search}
                onChange={handleFilterChange}
              />
            </form>
          </div>

          <div className="filters-grid">
            <div className="field">
              <label>Hall</label>
              <select name="hallName" value={filters.hallName} onChange={handleFilterChange}>
                <option value="">Auto select</option>
                {gridData.halls.map((hall) => (
                  <option key={hall._id} value={hall.name}>
                    {hall.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="ALL">All</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="VACANT">Vacant</option>
              </select>
            </div>
            <div className="field">
              <label>Shift</label>
              <select name="shift" value={filters.shift} onChange={handleFilterChange}>
                <option value="ALL">All</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div className="field">
              <label>Dues</label>
              <select name="dues" value={filters.dues} onChange={handleFilterChange}>
                <option value="ALL">All</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="TRIAL">Trial</option>
              </select>
            </div>
          </div>

          <div className="seat-grid">
            {gridData.seats.map((seat) => (
              <div
                className={`seat-card ${seat.occupancyStatus.toLowerCase()}`}
                key={`${seat.hallName}-${seat.seatNumber}`}
              >
                <div className="toolbar-row">
                  <strong>Seat {seat.seatNumber}</strong>
                  <span className={`tag ${seat.occupancyStatus.toLowerCase()}`}>{seat.occupancyStatus}</span>
                </div>
                {seat.student ? (
                  <>
                    <p><strong>{seat.student.name}</strong></p>
                    <p className="muted">#{seat.student.memberId} | {seat.student.shift}</p>
                    <p className="muted">{seat.student.daysRemaining} days left</p>
                    <span className={`tag ${seat.student.duesState.toLowerCase()}`}>{seat.student.duesState}</span>
                  </>
                ) : (
                  <p className="muted">Available for assignment</p>
                )}
              </div>
            ))}
          </div>

          {gridData.seats.length === 0 ? <div className="empty-state">No seats match the current filters.</div> : null}
        </article>
      </section>
    </div>
  );
}
