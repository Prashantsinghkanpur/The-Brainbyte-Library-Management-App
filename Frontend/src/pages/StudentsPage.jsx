import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage, toDateInputValue } from "../lib/format";
import { getStudentMessageActions } from "../lib/messages";

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
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedId, setCopiedId] = useState("");

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

  const handleView = async (student) => {
    setLoadingStudentDetail(true);
    setError("");

    try {
      const studentDetail = await apiRequest(`/students/${student._id}`, { token });
      setViewingStudent(studentDetail);
    } catch (viewError) {
      setError(getErrorMessage(viewError));
    } finally {
      setLoadingStudentDetail(false);
    }
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
    setViewingStudent(null);
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

  const handleCopyMessage = async (student, type) => {
    const actions = getStudentMessageActions(student);
    const message = type === "welcome" ? actions.welcomeMessage : actions.reminderMessage;

    try {
      await navigator.clipboard.writeText(message);
      setCopiedId(`${student._id}-${type}`);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setError("Could not copy the message. You can still use WhatsApp or SMS directly.");
    }
  };

  return (
    <div className="page-content">
      <section className="screen-header">
        <div>
          <p className="screen-kicker">MANAGEMENT</p>
          <h1 className="screen-title">Directory</h1>
        </div>
        <div className="count-chip">
          <strong>{students.length}</strong>
          <span>Profiles</span>
        </div>
      </section>

      {error ? <div className="message error">{error}</div> : null}
      {success ? <div className="message success">{success}</div> : null}

      {viewingStudent ? (
        <section className="sheet-card student-detail-card">
          <div className="section-heading-row">
            <div>
              <p className="screen-kicker">MEMBER #{viewingStudent.memberId}</p>
              <h3>{viewingStudent.name}</h3>
            </div>
            <button className="ghost-button" onClick={() => setViewingStudent(null)} type="button">
              Close
            </button>
          </div>

          <div className="detail-hero">
            <div className="list-avatar large">{viewingStudent.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{viewingStudent.plan}</strong>
              <p className="section-subtitle">
                {viewingStudent.hallName} | Seat #{viewingStudent.seatNumber} | {viewingStudent.shift}
              </p>
              <div className="meta-row">
                <span className={`tag ${viewingStudent.status.toLowerCase()}`}>{viewingStudent.status}</span>
                <span className="tiny-chip">{formatCurrency(viewingStudent.feeAmount)}</span>
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div className="info-pill">
              <span className="eyebrow">Phone</span>
              <p>{viewingStudent.phone}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Plan</span>
              <p>{viewingStudent.plan}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Fee Amount</span>
              <p>{formatCurrency(viewingStudent.feeAmount)}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Seat</span>
              <p>{viewingStudent.hallName} | #{viewingStudent.seatNumber}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Shift</span>
              <p>{viewingStudent.shift}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Status</span>
              <p>{viewingStudent.status}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Joined Date</span>
              <p>{formatDate(viewingStudent.joinedDate)}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Membership Start</span>
              <p>{formatDate(viewingStudent.membershipStartDate)}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Paid Till</span>
              <p>{formatDate(viewingStudent.paidTill)}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Created</span>
              <p>{formatDate(viewingStudent.createdAt)}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">Last Updated</span>
              <p>{formatDate(viewingStudent.updatedAt)}</p>
            </div>
            <div className="info-pill">
              <span className="eyebrow">System ID</span>
              <p>{viewingStudent._id}</p>
            </div>
          </div>

          <div className="info-pill full-width-detail">
            <span className="eyebrow">Notes</span>
            <p>{viewingStudent.notes || "No notes added."}</p>
          </div>

          <div className="actions-row">
            <button className="primary-button" onClick={() => handleEdit(viewingStudent)} type="button">
              Edit Student
            </button>
            <button className="ghost-button" onClick={() => setViewingStudent(null)} type="button">
              Back to List
            </button>
          </div>
        </section>
      ) : null}

      <section className="stack-card">
        <form onSubmit={handleSearchSubmit}>
          <input
            className="search-input mobile-search"
            name="search"
            placeholder="Search by name or number..."
            value={filters.search}
            onChange={handleFilterChange}
          />
        </form>

        <div className="stack-section">
          <div className="chip-row">
            <button
              type="button"
              className={!filters.shift ? "filter-chip active" : "filter-chip"}
              onClick={() => handleFilterChange({ target: { name: "shift", value: "" } })}
            >
              All Shifts
            </button>
            <button
              type="button"
              className={filters.shift === "FULL_DAY" ? "filter-chip active" : "filter-chip"}
              onClick={() => handleFilterChange({ target: { name: "shift", value: "FULL_DAY" } })}
            >
              Full Day
            </button>
          </div>
        </div>

        <div className="chip-row scrollable">
          <button
            type="button"
            className={filters.sort === "recent" ? "filter-chip active" : "filter-chip"}
            onClick={() => handleFilterChange({ target: { name: "sort", value: "recent" } })}
          >
            Recent
          </button>
          <button
            type="button"
            className={filters.paymentStatus === "PAID" ? "filter-chip active" : "filter-chip"}
            onClick={() => handleFilterChange({ target: { name: "paymentStatus", value: "PAID" } })}
          >
            Paid
          </button>
          <button
            type="button"
            className={filters.paymentStatus === "DUE" ? "filter-chip active" : "filter-chip"}
            onClick={() => handleFilterChange({ target: { name: "paymentStatus", value: "DUE" } })}
          >
            Dues
          </button>
          <button
            type="button"
            className={filters.status === "ACTIVE" ? "filter-chip active" : "filter-chip"}
            onClick={() => handleFilterChange({ target: { name: "status", value: "ACTIVE" } })}
          >
            Active
          </button>
        </div>
      </section>

      <section className="sheet-card">
        <div className="section-heading-row">
          <h3>Profiles</h3>
          <button className="floating-action" onClick={resetForm} type="button">
            New Member
          </button>
        </div>

        <div className="student-list">
          {students.map((student) => {
            const actions = getStudentMessageActions(student);

            return (
              <article className="directory-card" key={student._id}>
                <div className="directory-top">
                  <div className="list-avatar large">{student.name.slice(0, 2).toUpperCase()}</div>
                  <div className="directory-name">
                    <strong>{student.name}</strong>
                    <p className="section-subtitle">MEMBER ID: #{student.memberId}</p>
                  </div>
                  <span className={`tag ${student.status.toLowerCase()}`}>{student.status}</span>
                </div>

                <div className="directory-grid">
                  <div className="info-pill">
                    <span className="eyebrow">Phone</span>
                    <p>{student.phone}</p>
                  </div>
                  <div className="info-pill">
                    <span className="eyebrow">Status</span>
                    <p>{student.status}</p>
                  </div>
                  <div className="info-pill">
                    <span className="eyebrow">Joined</span>
                    <p>{formatDate(student.joinedDate)}</p>
                  </div>
                  <div className="info-pill">
                    <span className="eyebrow">Seat</span>
                    <p>{student.hallName} • #{student.seatNumber}</p>
                  </div>
                </div>

                <div className="validity-card">
                  <div>
                    <span className="eyebrow">Membership Validity</span>
                    <p>
                      {formatDate(student.membershipStartDate)} - {formatDate(student.paidTill)}
                    </p>
                  </div>
                  <button className="floating-action" onClick={() => handleEdit(student)} type="button">
                    Edit
                  </button>
                </div>

                <div className="meta-row">
                  <span className="tiny-chip">{student.shift}</span>
                  <span className="tiny-chip">{formatCurrency(student.feeAmount)}</span>
                </div>

                <div className="message-actions">
                  <button className="secondary-button" disabled={loadingStudentDetail} onClick={() => handleView(student)} type="button">
                    {loadingStudentDetail ? "Opening..." : "View"}
                  </button>
                  <a className="secondary-button" href={actions.welcomeLinks.whatsapp} target="_blank" rel="noreferrer">
                    Welcome WA
                  </a>
                  <a className="secondary-button" href={actions.reminderLinks.whatsapp} target="_blank" rel="noreferrer">
                    Reminder WA
                  </a>
                  <a className="ghost-button" href={actions.welcomeLinks.sms}>
                    Welcome SMS
                  </a>
                  <a className="ghost-button" href={actions.reminderLinks.sms}>
                    Reminder SMS
                  </a>
                  <button className="ghost-button" onClick={() => handleCopyMessage(student, "welcome")} type="button">
                    {copiedId === `${student._id}-welcome` ? "Copied" : "Copy Welcome"}
                  </button>
                  <button className="ghost-button" onClick={() => handleCopyMessage(student, "reminder")} type="button">
                    {copiedId === `${student._id}-reminder` ? "Copied" : "Copy Reminder"}
                  </button>
                </div>
              </article>
            );
          })}
          {!loading && students.length === 0 ? <div className="empty-state">No students found for the current filters.</div> : null}
        </div>
      </section>

      <section className="sheet-card">
        <div className="section-heading-row">
          <h3>{editingId ? "Edit Student" : "Add Student"}</h3>
        </div>

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
              <input id="student-seat" name="seatNumber" type="number" min="1" value={form.seatNumber} onChange={handleFormChange} required />
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
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
