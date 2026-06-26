import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import { RequireAuth, RequireAdmin } from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";

// Lazy-loaded pages
const LoginPage       = lazy(() => import("../pages/Login/LoginPage"));
const Home            = lazy(() => import("../pages/Home/Home"));
const Customers       = lazy(() => import("../pages/Customers/Customers"));
const Cars            = lazy(() => import("../pages/Cars/Cars"));
const Jobs            = lazy(() => import("../pages/Jobs/Jobs"));
const Suppliers       = lazy(() => import("../pages/Suppliers/Suppliers"));
const Finance         = lazy(() => import("../pages/Finance/Finance"));
const Invoice         = lazy(() => import("../pages/Invoice/Invoice"));
const AdminPanel      = lazy(() => import("../pages/Admin/AdminPanel"));
const CustomerHistory = lazy(() => import("../pages/History/CustomerHistory"));
const CarHistory      = lazy(() => import("../pages/History/CarHistory"));
const SupplierHistory = lazy(() => import("../pages/History/SupplierHistory"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-500">Chargement…</p>
      </div>
    </div>
  );
}

// Redirect logged-in users away from /login
function PublicRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/invoice/:jobId" element={<Invoice />} />

          {/* Protected — all authenticated users */}
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/"                                 element={<Home />} />
            <Route path="/customers"                        element={<Customers />} />
            <Route path="/cars"                             element={<Cars />} />
            <Route path="/jobs"                             element={<Jobs />} />
            <Route path="/suppliers"                        element={<Suppliers />} />
            <Route path="/finance"                          element={<Finance />} />
            <Route path="/history/customer/:customerId"     element={<CustomerHistory />} />
            <Route path="/history/car/:carId"               element={<CarHistory />} />
            <Route path="/history/supplier/:supplierId"     element={<SupplierHistory />} />

            {/* Admin only */}
            <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
