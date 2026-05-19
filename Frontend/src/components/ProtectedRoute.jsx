import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isProductOwner } from "../lib/productOwner";
import { hasProAccess } from "../lib/subscription";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const isOwnerAdminRoute = isProductOwner(user) && location.pathname === "/admin";

  // If subscription is expired (or not PRO/ACTIVE), allow only /settings for renewal.
  if (!hasProAccess(user)) {
    if (location.pathname !== "/settings" && !isOwnerAdminRoute) {
      return <Navigate to="/settings" replace />;
    }
  }

  return children;
}
