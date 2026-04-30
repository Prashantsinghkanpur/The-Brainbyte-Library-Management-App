import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "../lib/format";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [libraryProfile, setLibraryProfile] = useState(null);
  const [activePromo, setActivePromo] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setError("");

      try {
        const [analyticsData, studentsData, paymentData, profileData] = await Promise.all([
          apiRequest("/analytics/summary", { token }),
          apiRequest("/students?sort=recent", { token }),
          apiRequest("/payments?sort=latest", { token }),
          apiRequest("/settings/profile", { token })
        ]);

        setAnalytics(analyticsData);
        setStudents(studentsData.slice(0, 3));
        setPayments(paymentData.slice(0, 3));
        setLibraryProfile(profileData.library);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      }
    };

    loadDashboard();
  }, [token]);

  const overviewCards = [
    {
      title: "Active Students",
      value: analytics?.activeStudents ?? 0,
      tone: "green",
      icon: "students"
    },
    {
      title: "Total Students",
      value: analytics?.totalStudents ?? 0,
      tone: "blue",
      icon: "bars"
    },
    {
      title: "Pending Dues",
      value: analytics?.pendingStudents ?? 0,
      tone: "purple",
      icon: "trend"
    },
    {
      title: "Monthly Earnings",
      value: formatCurrency(analytics?.monthlyRevenue),
      tone: "orange",
      icon: "wallet"
    }
  ];
  const referralCode = `BB-${String(user?.id || user?.libraryId || "ADMIN").slice(-6).toUpperCase()}`;
  const libraryName = libraryProfile?.name || "Brainbyte Library";
  const normalizedPhone = String(libraryProfile?.phone || "").replace(/\D/g, "");
  const referralMessage = `Join ${libraryName} with my referral code ${referralCode}. Refer a new admission and earn INR 149 after successful registration.`;
  const communityMessage = `Hi, I want to join the ${libraryName} community for latest updates and library news.`;
  const communityLink = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(communityMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(communityMessage)}`;

  const handleShareText = async (message, successText) => {
    setActionMessage("");

    try {
      if (navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
      }

      setActionMessage(successText);
    } catch {
      setActionMessage("Could not share automatically. You can copy the message manually.");
    }
  };

  const handleOpenCommunity = () => {
    window.open(communityLink, "_blank", "noopener,noreferrer");
    setActionMessage("Opening WhatsApp community invite.");
  };

  return (
    <div className="page-content">
      <section className="screen-header hero-home">
        <div>
          <p className="screen-greeting">Good Morning</p>
          <h1 className="screen-title">Admin</h1>
        </div>
        <div className="hero-actions">
          <Link className="round-action" to="/students">
            +
          </Link>
          <div className="profile-badge">{(user?.name || "A").slice(0, 1).toUpperCase()}</div>
        </div>
      </section>

      {error ? <div className="message error">{error}</div> : null}
      {actionMessage ? <div className="message success">{actionMessage}</div> : null}

      <section>
        <div className="section-heading-row">
          <h3>Overview</h3>
        </div>
        <div className="hero-stats-grid">
          {overviewCards.map((card) => (
            <article className={`hero-stat-card tone-${card.tone}`} key={card.title}>
              <div className={`hero-stat-icon stat-icon-${card.icon}`} />
              <strong>{card.value}</strong>
              <p>{card.title}</p>
            </article>
          ))}
        </div>
      </section>

      <button className="promo-banner tone-violet" onClick={() => setActivePromo("refer")} type="button">
        <div className="promo-icon promo-icon-gift" aria-hidden="true" />
        <div>
          <strong>Refer & Earn ₹149</strong>
          <p>Boost new admissions through word of mouth.</p>
        </div>
        <span className="promo-arrow">›</span>
      </button>

      <button className="promo-banner tone-green" onClick={() => setActivePromo("community")} type="button">
        <div className="promo-icon promo-icon-chat" aria-hidden="true" />
        <div>
          <strong>Join Community</strong>
          <p>Get latest updates and library news.</p>
        </div>
        <span className="floating-action community-action">
          New Member
        </span>
      </button>

      {activePromo ? (
        <section className="sheet-card promo-detail-card">
          <div className="section-heading-row">
            <div>
              <p className="screen-kicker">{activePromo === "refer" ? "REFERRAL" : "COMMUNITY"}</p>
              <h3>{activePromo === "refer" ? "Refer & Earn INR 149" : "Join Community"}</h3>
            </div>
            <button className="ghost-button" onClick={() => setActivePromo("")} type="button">
              Close
            </button>
          </div>

          {activePromo === "refer" ? (
            <>
              <div className="referral-code-card">
                <span className="eyebrow">Referral Code</span>
                <strong>{referralCode}</strong>
              </div>
              <div className="info-pill">
                <span className="eyebrow">Share Message</span>
                <p>{referralMessage}</p>
              </div>
              <div className="actions-row">
                <button className="primary-button" onClick={() => handleShareText(referralMessage, "Referral message shared.")} type="button">
                  Share Referral
                </button>
                <button className="ghost-button" onClick={() => handleShareText(referralMessage, "Referral message copied.")} type="button">
                  Copy Message
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="info-pill">
                <span className="eyebrow">WhatsApp Invite</span>
                <p>{communityMessage}</p>
              </div>
              <div className="actions-row">
                <button className="primary-button" onClick={handleOpenCommunity} type="button">
                  Open WhatsApp
                </button>
                <button className="ghost-button" onClick={() => handleShareText(communityMessage, "Community message copied.")} type="button">
                  Copy Invite
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      <Link className="mobile-new-member-fab" to="/students">
        <span>+</span>
        New Member
      </Link>

      <section className="sheet-card">
        <div className="section-heading-row">
          <div>
            <h3>Recent Students</h3>
          </div>
          <Link className="link-button" to="/students">
            View All
          </Link>
        </div>

        <div className="stack-list">
          {students.map((student) => (
            <article className="list-card" key={student._id}>
              <div className="list-avatar">{student.name.slice(0, 2).toUpperCase()}</div>
              <div className="list-content">
                <div className="list-top">
                  <div>
                    <strong>{student.name}</strong>
                    <p className="section-subtitle">ID: {student.memberId}</p>
                  </div>
                  <span className={`tag ${student.status.toLowerCase()}`}>{student.status}</span>
                </div>
                <div className="detail-grid">
                  <div>
                    <span className="eyebrow">Joined</span>
                    <p>{formatDate(student.joinedDate)}</p>
                  </div>
                  <div>
                    <span className="eyebrow">Position</span>
                    <p>{student.hallName} • Seat {student.seatNumber}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sheet-card">
        <div className="section-heading-row">
          <div>
            <h3>Latest Payments</h3>
          </div>
          <Link className="link-button" to="/payments">
            History
          </Link>
        </div>

        <div className="stack-list">
          {payments.map((payment) => (
            <article className="payment-highlight-card" key={payment._id}>
              <div className="list-top">
                <strong>{payment.student?.name || "Deleted student"}</strong>
                <div className="receipt-chip">{payment.method}</div>
              </div>
              <div className="payment-value">{formatCurrency(payment.amount)}</div>
              <div className="payment-period">
                {formatDate(payment.membershipStartDate)} - {formatDate(payment.paidTill)}
              </div>
              <p className="payment-meta">Paid on {formatDate(payment.paymentDate)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
