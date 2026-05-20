import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import QRCodePublicLanding from "./pages/QRCodePublicLanding";
import SeatQRPublicPage from "./pages/SeatQRPublicPage";
import { useAuth } from "./context/AuthContext";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const SeatsPage = lazy(() => import("./pages/SeatsPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProductOwnerAnalyticsPage = lazy(() => import("./pages/ProductOwnerAnalyticsPage"));

function PublicLanding() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function RouteFallback() {
  return (
    <div className="grid gap-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/20">
        <div className="grid gap-3">
          <div className="app-skeleton h-4 w-28 rounded-full" />
          <div className="app-skeleton h-12 w-52 rounded-3xl" />
          <div className="app-skeleton h-4 w-40 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-300/20" key={index}>
            <div className="grid gap-3">
              <div className="app-skeleton h-10 w-10 rounded-2xl" />
              <div className="app-skeleton h-8 w-24 rounded-2xl" />
              <div className="app-skeleton h-4 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function withSuspense(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLanding />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/public/qr" element={<QRCodePublicLanding />} />
      <Route path="/public/qr/seats/:libraryId" element={<SeatQRPublicPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={withSuspense(<DashboardPage />)} />
        <Route path="/students" element={withSuspense(<StudentsPage />)} />
        <Route path="/seats" element={withSuspense(<SeatsPage />)} />
        <Route path="/payments" element={withSuspense(<PaymentsPage />)} />
        <Route path="/analytics" element={withSuspense(<AnalyticsPage />)} />
        <Route path="/expenses" element={withSuspense(<ExpensesPage />)} />
        <Route path="/settings" element={withSuspense(<SettingsPage />)} />
        <Route path="/admin" element={withSuspense(<ProductOwnerAnalyticsPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
