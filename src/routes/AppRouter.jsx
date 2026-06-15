import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "../components/Layout";
import Home from "../pages/Home/Home";
import Customers from "../pages/Customers/Customers";
import Cars from "../pages/Cars/Cars";
import Jobs from "../pages/Jobs/Jobs";
import Suppliers from "../pages/Suppliers/Suppliers";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/suppliers" element={<Suppliers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
