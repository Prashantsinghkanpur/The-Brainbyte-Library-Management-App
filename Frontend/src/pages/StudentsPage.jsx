import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage, toDateInputValue } from "../lib/format";

const initialForm = {
  name: "",
  phone: "",
  seatNumber: "",
  plan: "",
  feeAmount: "",
  paidTill: "",
  hallName: "",
  shift: "FULL_DAY",
  joinedDate: "",
  membershipStartDate: "",
  notes: ""
};

const initialFilters = {
  search: "",
  status: "",
  shift: "",
  hallName: "",
  paymentStatus: "",
  sort: "recent"
};

export default function StudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async (activeFilters = filters) => {
    setLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams();
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });

      const [studentsData, hallsData] = await Promise.all([
        apiRequest(`/students${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, { token }),
        apiRequest("/seats/halls", { token })
      ]);

      setStudents(studentsData);
      setHalls(hallsData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(initialFilters);
  }, [token]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };

      if (name !== "search") {
        loadData(nextFilters);
      }

      return nextFilters;
    });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    loadData();
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleEdit = (student) => {
    setEditingId(student._id);
    setForm({
      name: student.name || "",
      phone: student.phone || "",
      seatNumber: student.seatNumber || "",
      plan: student.plan || "",
      feeAmount: student.feeAmount ?? "",
      paidTill: toDateInputValue(student.paidTill),
      hallName: student.hallName || "",
      shift: student.shift || "FULL_DAY",
      joinedDate: toDateInputValue(student.joinedDate),
      membershipStartDate: toDateInputValue(student.membershipStartDate),
      notes: student.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      feeAmount: form.feeAmount === "" ? undefined : Number(form.feeAmount),
      seatNumber: Number(form.seatNumber)
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "" || payload[key] === undefined) {
        delete payload[key];
      }
    });

    try {
      if (editingId) {
        await apiRequest(`/students/${editingId}`, {
          method: "PATCH",
          token,
          body: payload
        });
        setSuccess("Student updated successfully.");
      } else {
        await apiRequest("/students", {
          method: "POST",
          token,
          body: payload
        });
        setSuccess("Student added successfully.");
      }

      resetForm();
      loadData();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content split-layout">
      <section className="card">
        <div className="section-title">
          <h3>{editingId ? "Edit Student" : "Add Student"}</h3>
          <p className="section-subtitle">Capture seat assignment, plan, payment status, and notes.</p>
        </div>

        {error ? <div className="message error">{error}</div> : null}
        {success ? <div className="message success">{success}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field-grid two-col">
            <div className="field">
              <label htmlFor="student-name">Name</label>
              <input id="student-name" name="name" value={form.name} onChange={handleFormChange} required />
            </div>
            <div className="field">
              <label htmlFor="student-phone">Phone</label>
              <input id="student-phone" name="phone" value={form.phone} onChange={handleFormChange} required />
            </div>
            <div className="field">
              <label htmlFor="student-seat">Seat Number</label>
              <input
                id="student-seat"
                name="seatNumber"
                type="number"
                min="1"
                value={form.seatNumber}
                onChange={handleFormChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="student-hall">Hall Name</label>
              <input id="student-hall" name="hallName" list="hall-options" value={form.hallName} onChange={handleFormChange} />
              <datalist id="hall-options">
                {halls.map((hall) => (
                  <option key={hall._id} value={hall.name} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="student-plan">Plan</label>
              <input id="student-plan" name="plan" value={form.plan} onChange={handleFormChange} required />
            </div>
            <div className="field">
              <label htmlFor="student-fee">Fee Amount</label>
              <input id="student-fee" name="feeAmount" type="number" min="0" value={form.feeAmount} onChange={handleFormChange} />
            </div>
            <div className="field">
              <label htmlFor="student-shift">Shift</label>
              <select id="student-shift" name="shift" value={form.shift} onChange={handleFormChange}>
                <option value="FULL_DAY">Full Day</option>
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="student-paidTill">Paid Till</label>
              <input id="student-paidTill" name="paidTill" type="date" value={form.paidTill} onChange={handleFormChange} />
            </div>
            <div className="field">
              <label htmlFor="student-joinedDate">Joined Date</label>
              <input id="student-joinedDate" name="joinedDate" type="date" value={form.joinedDate} onChange={handleFormChange} />
            </div>
            <div className="field">
              <label htmlFor="student-membershipStartDate">Membership Start</label>
              <input
                id="student-membershipStartDate"
                name="membershipStartDate"
                type="date"
                value={form.membershipStartDate}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="student-notes">Notes</label>
            <textarea id="student-notes" name="notes" value={form.notes} onChange={handleFormChange} />
          </div>

          <div className="actions-row">
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Saving..." : editingId ? "Update Student" : "Add Student"}
            </button>
            {editingId ? (
              <button className="ghost-button" onClick={resetForm} type="button">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="page-content">
        <div className="table-card">
          <div className="table-toolbar">
            <div className="section-title">
              <h3>Students</h3>
              <p className="section-subtitle">Search and filter by status, shift, hall, and payment state.</p>
            </div>

            <form onSubmit={handleSearchSubmit}>
              <input
                className="search-input"
                name="search"
                placeholder="Search by name, phone, member or seat"
                value={filters.search}
                onChange={handleFilterChange}
              />
            </form>
          </div>

          <div className="filters-grid">
            <div className="field">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label>Shift</label>
              <select name="shift" value={filters.shift} onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="FULL_DAY">Full Day</option>
                <option value="MORNING">Morning</option>
                <option value="EVENING">Evening</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div className="field">
              <label>Payment</label>
              <select name="paymentStatus" value={filters.paymentStatus} onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="PAID">Paid</option>
                <option value="DUE">Due</option>
              </select>
            </div>
            <div className="field">
              <label>Hall</label>
              <select name="hallName" value={filters.hallName} onChange={handleFilterChange}>
                <option value="">All</option>
                {halls.map((hall) => (
                  <option key={hall._id} value={hall.name}>
                    {hall.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Sort</label>
              <select name="sort" value={filters.sort} onChange={handleFilterChange}>
                <option value="recent">Recent</option>
                <option value="name">Name</option>
                <option value="seat">Seat</option>
                <option value="memberId">Member ID</option>
              </select>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Seat</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Paid Till</th>
                  <th>Fee</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <strong>{student.name}</strong>
                      <div className="muted">#{student.memberId} | {student.phone}</div>
                    </td>
                    <td>{student.hallName} / {student.seatNumber}</td>
                    <td>{student.plan} ({student.shift})</td>
                    <td>
                      <span className={`tag ${student.status.toLowerCase()}`}>{student.status}</span>
                    </td>
                    <td>{formatDate(student.paidTill)}</td>
                    <td>{formatCurrency(student.feeAmount)}</td>
                    <td>
                      <button className="ghost-button" onClick={() => handleEdit(student)} type="button">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && students.length === 0 ? <div className="empty-state">No students found for the current filters.</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
