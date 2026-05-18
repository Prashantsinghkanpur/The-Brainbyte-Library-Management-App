import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasProAccess } from "../lib/subscription";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If subscription is expired (or not PRO/ACTIVE), allow only /settings for renewal.
  if (!hasProAccess(user)) {
    if (location.pathname !== "/settings") {
      return <Navigate to="/settings" replace />;
    }
  }

  return children;
}
