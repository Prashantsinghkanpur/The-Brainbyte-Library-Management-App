import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isProductOwner } from "../lib/productOwner";
import { hasAppAccess } from "../lib/subscription";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isBootstrapping) {
    return null;
  }

  const isOwnerAdminRoute = isProductOwner(user) && location.pathname === "/admin";

  // If the paid plan is inactive and the trial window has ended, allow only /settings.
  if (!hasAppAccess(user)) {
    if (location.pathname !== "/settings" && !isOwnerAdminRoute) {
      return <Navigate to="/settings" replace />;
    }
  }

  return children;
}
