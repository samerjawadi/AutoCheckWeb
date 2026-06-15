import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TbCar, TbTool, TbBuildingStore } from "react-icons/tb";
import { HiUsers, HiArrowRight, HiClock, HiCheckCircle, HiExclamationCircle } from "react-icons/hi";
import { db } from "../../services/localDB";
import { useLanguage } from "../../context/LanguageContext";

const fmt = (n) => n.toLocaleString("fr-TN", { style: "currency", currency: "TND" });

const calcTotal   = (lines)    => (lines ?? []).reduce((s, l) => s + (parseFloat(l.price) || 0), 0);
const calcPaid    = (payments) => (payments ?? []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

const STATUS_STYLE = {
  Pending:       "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
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

const DATE_PERIODS = ["All", "Today", "This Week", "This Month"];

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
  const [period, setPeriod] = useState("All");

  const DATE_PERIODS = [
    { key: "All",        label: t("period_all") },
    { key: "Today",      label: t("period_today") },
    { key: "This Week",  label: t("period_week") },
    { key: "This Month", label: t("period_month") },
  ];

  useEffect(() => {
    const jobs      = db.jobs.getAll();
    const customers = db.customers.getAll();
    const cars      = db.cars.getAll();
    const suppliers = db.suppliers.getAll();
    setData({ jobs, customers, cars, suppliers });
  }, []);

  if (!data) return null;

  const { jobs, customers, cars, suppliers } = data;

  const scoped     = filterByPeriod(jobs, period);
  const pending    = scoped.filter((j) => j.status === "Pending");
  const inProgress = scoped.filter((j) => j.status === "In Progress");
  const done       = scoped.filter((j) => j.status === "Done");
  const revenue    = done.reduce((s, j) => s + calcPaid(j.payments), 0);
  const open       = [...pending, ...inProgress];
  const openValue  = open.reduce((s, j) => s + Math.max(0, calcTotal(j.lines) - calcPaid(j.payments)), 0);
  const todayCount = jobs.filter((j) => j.dateIn === today).length;

  const recent = [...scoped].reverse().slice(0, 5).map((j) => ({
    ...j,
    customerName: customers.find((c) => c.id === j.customerId)?.name ?? "Unknown",
    carLabel: (() => {
      const car = cars.find((c) => c.id === j.carId);
      return car ? `${car.manufacturer} ${car.model} — ${car.plate}` : "Unknown";
    })(),
  }));

  return (
    <div className="page-enter p-6 w-full">
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
                  ? "bg-violet-600 text-white shadow"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={HiUsers}         label={t("dashboard_customers")} value={customers.length}   color="bg-violet-500/10 text-violet-400" />
        <StatCard icon={TbCar}           label={t("dashboard_cars")}      value={cars.length}        color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={TbTool}          label={t("dashboard_jobs")}      value={scoped.length}      sub={period === "All" ? t("dashboard_today", { n: todayCount }) : undefined} color="bg-orange-500/10 text-orange-400" />
        <StatCard icon={TbBuildingStore} label={t("dashboard_suppliers")} value={suppliers.length}   color="bg-emerald-500/10 text-emerald-400" />
      </div>

      {/* Job status + financials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Status breakdown */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">{t("dashboard_job_status")}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center bg-yellow-500/5 border border-yellow-500/20 rounded-xl py-5 gap-1">
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

        {/* Financials */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">{t("dashboard_revenue")}</h2>
          <div className="flex flex-col gap-3">
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-neutral-500 mb-0.5">{t("dashboard_collected")}</p>
              <p className="text-xl font-bold font-mono text-green-400">{fmt(revenue)}</p>
            </div>
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-neutral-500 mb-0.5">{t("dashboard_open")}</p>
              <p className="text-xl font-bold font-mono text-orange-400">{fmt(openValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">
            {period === "All" ? t("dashboard_recent") : t("dashboard_jobs_period", { period: DATE_PERIODS.find(d => d.key === period)?.label ?? period })}
          </h2>
          <Link to="/jobs" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
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
            {recent.map((job) => (
              <tr key={job.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-5 py-3 text-neutral-100 font-medium">{job.customerName}</td>
                <td className="px-5 py-3 text-neutral-400">{job.carLabel}</td>
                <td className="px-5 py-3 text-neutral-400">{job.dateIn || "—"}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[job.status] ?? ""}`}>
                    {job.status}
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

