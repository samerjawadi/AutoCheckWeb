import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../components/Layout";

// Lazy-loaded pages — each becomes its own JS chunk
const Home             = lazy(() => import("../pages/Home/Home"));
const Customers        = lazy(() => import("../pages/Customers/Customers"));
const Cars             = lazy(() => import("../pages/Cars/Cars"));
const Jobs             = lazy(() => import("../pages/Jobs/Jobs"));
const Suppliers        = lazy(() => import("../pages/Suppliers/Suppliers"));
const Finance          = lazy(() => import("../pages/Finance/Finance"));
const Invoice          = lazy(() => import("../pages/Invoice/Invoice"));
const CustomerHistory  = lazy(() => import("../pages/History/CustomerHistory"));
const CarHistory       = lazy(() => import("../pages/History/CarHistory"));
const SupplierHistory  = lazy(() => import("../pages/History/SupplierHistory"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-500">Chargement…</p>
      </div>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/"                                element={<Home />} />
            <Route path="/customers"                       element={<Customers />} />
            <Route path="/cars"                            element={<Cars />} />
            <Route path="/jobs"                            element={<Jobs />} />
            <Route path="/suppliers"                       element={<Suppliers />} />
            <Route path="/finance"                         element={<Finance />} />
            <Route path="/history/customer/:customerId"    element={<CustomerHistory />} />
            <Route path="/history/car/:carId"              element={<CarHistory />} />
            <Route path="/history/supplier/:supplierId"    element={<SupplierHistory />} />
          </Route>
          <Route path="/invoice/:jobId" element={<Invoice />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
