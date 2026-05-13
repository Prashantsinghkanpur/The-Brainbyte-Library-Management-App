import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const isSubscriptionActive = (user) => {
  return user?.subscriptionPlan === "PRO" && user?.subscriptionStatus === "ACTIVE";
};

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If subscription is expired (or not PRO/ACTIVE), allow only /settings for renewal.
  if (!isSubscriptionActive(user)) {
    if (location.pathname !== "/settings") {
      return <Navigate to="/settings" replace />;
    }
  }

  return children;
}

