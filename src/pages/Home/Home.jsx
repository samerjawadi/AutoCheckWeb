import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TbCar, TbTool, TbBuildingStore } from "react-icons/tb";
import { HiUsers, HiArrowRight, HiClock, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { db } from "../../services/localDB";
import Skeleton from "../../components/Skeleton";
import { calcTotal } from "../../utils/finance";
import { useLanguage } from "../../context/LanguageContext";

const tStatus = (s, t) => {
  if (s === "Pending")     return t("status_pending");
  if (s === "In Progress") return t("status_in_progress");
  if (s === "Done")        return t("status_done");
  return s;
};

const fmt = (n) => n.toLocaleString("fr-TN", { style: "currency", currency: "TND" });

const STATUS_STYLE = {
  Pending:       "bg-yellow-500/10 text-yellow-400 border border-yellow-400/30",
  "In Progress": "bg-blue-500/10   text-blue-400   border border-blue-500/30",
  Done:          "bg-green-500/10  text-green-400   border border-green-500/30",
};

const today = new Date().toISOString().slice(0, 10);

const weekStart = (() => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
})();

const monthStart = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
})();

function filterByPeriod(jobs, period) {
  if (period === "Today")      return jobs.filter((j) => j.dateIn === today);
  if (period === "This Week")  return jobs.filter((j) => j.dateIn >= weekStart && j.dateIn <= today);
  if (period === "This Month") return jobs.filter((j) => j.dateIn >= monthStart && j.dateIn <= today);
  return jobs;
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center gap-4`}>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-100">{value}</p>
        <p className="text-sm font-medium text-neutral-300">{label}</p>
        {sub && <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const { t, lang } = useLanguage();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("All");

  const DATE_PERIODS = [
    { key: "All",        label: t("period_all") },
    { key: "Today",      label: t("period_today") },
    { key: "This Week",  label: t("period_week") },
    { key: "This Month", label: t("period_month") },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const jobs      = await db.jobs.getAll();
        const customers = await db.customers.getAll();
        const cars      = await db.cars.getAll();
        const suppliers = await db.suppliers.getAll();
        setData({ jobs, customers, cars, suppliers });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const jobs = data?.jobs ?? [];
  const customers = data?.customers ?? [];
  const cars = data?.cars ?? [];
  const suppliers = data?.suppliers ?? [];

  const scoped     = filterByPeriod(jobs, period);
  const pending    = scoped.filter((j) => j.status === "Pending");
  const inProgress = scoped.filter((j) => j.status === "In Progress");
  const done       = scoped.filter((j) => j.status === "Done");
  const todayCount = jobs.filter((j) => j.dateIn === today).length;
  const carsWorked = new Set(scoped.map((j) => j.carId).filter(Boolean)).size;

  // Top 6 most serviced cars
  const topCars = (() => {
    const counts = {};
    scoped.forEach((j) => {
      const car = cars.find((c) => c.id === j.carId);
      if (!car) return;
      const key = `${car.manufacturer} ${car.model} · ${car.plate}`;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  })();

  const recent = [...scoped].reverse().slice(0, 5).map((j) => ({
    ...j,
    customerName: customers.find((c) => c.id === j.customerId)?.name ?? "Unknown",
    carLabel: (() => {
      const car = cars.find((c) => c.id === j.carId);
      return car ? `${car.manufacturer} ${car.model} — ${car.plate}` : "Unknown";
    })(),
  }));

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      {/* Header + period filter */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-100">
            <span className="text-yellow-400">Auto</span><span className="text-white">Check</span>
            <span className="text-neutral-500 font-normal text-xl ml-3">{t("dashboard_title")}</span>
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
          {DATE_PERIODS.map(({ key, label }) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                period === key
                  ? "bg-yellow-600 text-white shadow"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={HiUsers}         label={t("dashboard_customers")} value={loading ? <Skeleton size="small" /> : customers.length}   color="bg-yellow-500/10 text-yellow-400" />
        <StatCard icon={TbCar}           label={t("dashboard_cars")}      value={loading ? <Skeleton size="small" /> : cars.length}        color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={TbTool}          label={t("dashboard_jobs")}      value={loading ? <Skeleton size="small" /> : scoped.length}      sub={period === "All" ? (loading ? undefined : t("dashboard_today", { n: todayCount })) : undefined} color="bg-orange-500/10 text-orange-400" />
        <StatCard icon={TbBuildingStore} label={t("dashboard_suppliers")} value={loading ? <Skeleton size="small" /> : suppliers.length}   color="bg-emerald-500/10 text-emerald-400" />
        <StatCard icon={TbCar}           label={lang === "fr" ? "Véhicules travaillés" : "Cars Worked"} value={loading ? <Skeleton size="small" /> : carsWorked} sub={period !== "All" ? DATE_PERIODS.find(d => d.key === period)?.label : undefined} color="bg-cyan-500/10 text-cyan-400" />
      </div>

      {/* Job status */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">{t("dashboard_job_status")}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center bg-yellow-500/5 border border-yellow-400/20 rounded-xl py-5 gap-1">
            <HiExclamationCircle className="w-6 h-6 text-yellow-400 mb-1" />
            <p className="text-3xl font-bold text-yellow-400">{pending.length}</p>
            <p className="text-xs text-neutral-400">{t("status_pending")}</p>
          </div>
          <div className="flex flex-col items-center justify-center bg-blue-500/5 border border-blue-500/20 rounded-xl py-5 gap-1">
            <HiClock className="w-6 h-6 text-blue-400 mb-1" />
            <p className="text-3xl font-bold text-blue-400">{inProgress.length}</p>
            <p className="text-xs text-neutral-400">{t("status_in_progress")}</p>
          </div>
          <div className="flex flex-col items-center justify-center bg-green-500/5 border border-green-500/20 rounded-xl py-5 gap-1">
            <HiCheckCircle className="w-6 h-6 text-green-400 mb-1" />
            <p className="text-3xl font-bold text-green-400">{done.length}</p>
            <p className="text-xs text-neutral-400">{t("status_done")}</p>
          </div>
        </div>
      </div>

      {/* Top cars bar chart */}
      {!loading && topCars.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">
            {lang === "fr" ? "Véhicules les plus travaillés" : "Most Serviced Cars"}
          </h2>
          <ResponsiveContainer width="100%" height={topCars.length * 44 + 20}>
            <BarChart data={topCars} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#171717", border: "1px solid #404040", borderRadius: 8, color: "#e5e5e5", fontSize: 12 }}
                formatter={(v) => [v, t("nav_jobs")]}
              />
              <Bar dataKey="count" fill="#eab308" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent jobs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">
            {period === "All" ? t("dashboard_recent") : t("dashboard_jobs_period", { period: DATE_PERIODS.find(d => d.key === period)?.label ?? period })}
          </h2>
          <Link to="/jobs" className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-400 transition-colors">
            {t("view_all")} <HiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-500 text-left text-xs uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">{t("jobs_customer")}</th>
              <th className="px-5 py-3 font-medium">{t("jobs_car")}</th>
              <th className="px-5 py-3 font-medium">{t("jobs_date_in")}</th>
              <th className="px-5 py-3 font-medium">{t("status")}</th>
              <th className="px-5 py-3 font-medium text-right">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // show placeholder empty rows while loading
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`ph-${i}`} className="border-b border-neutral-800/50">
                  <td className="px-5 py-4"><Skeleton size="inline" /></td>
                  <td className="px-5 py-4"><Skeleton size="inline" /></td>
                  <td className="px-5 py-4"><Skeleton size="inline" /></td>
                  <td className="px-5 py-4"><Skeleton size="inline" /></td>
                  <td className="px-5 py-4 text-right"><Skeleton size="small" /></td>
                </tr>
              ))
            ) : recent.map((job) => (
              <tr key={job.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-5 py-3 text-neutral-100 font-medium">{job.customerName}</td>
                <td className="px-5 py-3 text-neutral-400">{job.carLabel}</td>
                <td className="px-5 py-3 text-neutral-400">{job.dateIn || "—"}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[job.status] ?? ""}`}>
                    {tStatus(job.status, t)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-neutral-200">{fmt(calcTotal(job.lines))}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-neutral-600">{t("dashboard_no_jobs")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

