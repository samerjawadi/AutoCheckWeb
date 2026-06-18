import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft, HiCheckCircle, HiClock, HiExclamationCircle } from "react-icons/hi";
import { TbBuildingStore } from "react-icons/tb";
import { db } from "../../services/localDB";
import { calcTotal, calcPaid, calcBalance, payLabel } from "../../utils/finance";
import { useLanguage } from "../../context/LanguageContext";
import HistoryFilters, { applyFilters } from "../../components/HistoryFilters";

const fmt = (n) => Number(n || 0).toLocaleString("fr-TN", { style: "currency", currency: "TND" });

const STATUS_STYLE = {
  Pending:       "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  "In Progress": "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  Done:          "bg-green-500/10 text-green-400 border border-green-500/30",
};

const PAY_STYLE = {
  Paid:    "bg-green-500/10 text-green-400 border border-green-500/30",
  Partial: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  Unpaid:  "bg-red-500/10 text-red-400 border border-red-500/30",
};

const STATUS_ICON = {
  Done:          <HiCheckCircle className="w-4 h-4 text-green-400" />,
  "In Progress": <HiClock className="w-4 h-4 text-blue-400" />,
  Pending:       <HiExclamationCircle className="w-4 h-4 text-yellow-400" />,
};

const tStatus = (s, t) => {
  if (s === "Pending")     return t("status_pending");
  if (s === "In Progress") return t("status_in_progress");
  if (s === "Done")        return t("status_done");
  return s;
};

const tPay = (s, t) => {
  if (s === "Paid")    return t("pay_paid");
  if (s === "Partial") return t("pay_partial");
  if (s === "Unpaid")  return t("pay_unpaid");
  return s;
};

const TYPE_STYLE = {
  Internal:         "bg-violet-500/10 text-violet-400 border border-violet-500/30",
  "Parts Supplier": "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  "Body Shop":      "bg-orange-500/10 text-orange-400 border border-orange-500/30",
  Other:            "bg-neutral-500/10 text-neutral-400 border border-neutral-600",
};

export default function SupplierHistory() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData]     = useState(null);
  const [expanded, setExpanded] = useState({});
  const [statusFilter, setStatus] = useState("All");
  const [payFilter, setPay]       = useState("All");
  const [dateFilter, setDate]     = useState("All");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");

  useEffect(() => {
    const load = async () => {
      const [supplier, allJobs, allCustomers, allCars] = await Promise.all([
        db.suppliers.getById(supplierId),
        db.jobs.getAll(),
        db.customers.getAll(),
        db.cars.getAll(),
      ]);

      // Jobs that have at least one line from this supplier
      const jobs = allJobs
        .map((job) => ({
          ...job,
          supplierLines: (job.lines ?? []).filter((l) => l.supplierId === supplierId),
          _payLabel: payLabel(job.lines, job.payments),
        }))
        .filter((job) => job.supplierLines.length > 0);

      const totalBilled = jobs.reduce(
        (s, j) => s + j.supplierLines.reduce((ls, l) => ls + (parseFloat(l.price) || 0), 0),
        0
      );
      const jobCount = jobs.length;
      const lineCount = jobs.reduce((s, j) => s + j.supplierLines.length, 0);

      const enriched = jobs.map((job) => ({
        ...job,
        customerName: allCustomers.find((c) => c.id === job.customerId)?.name ?? "Unknown",
        carLabel: (() => {
          const car = allCars.find((c) => c.id === job.carId);
          return car ? `${car.manufacturer} ${car.model} — ${car.plate}` : "Unknown";
        })(),
      }));

      setData({ supplier, jobs: enriched, totalBilled, jobCount, lineCount });
    };
    load();
  }, [supplierId]);

  if (!data) return null;
  const { supplier, jobs, totalBilled, jobCount, lineCount } = data;

  const filtered = applyFilters(jobs, { statusFilter, payFilter, dateFilter, dateFrom, dateTo });

  const toggleJob = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 transition-colors cursor-pointer">
        <HiArrowLeft className="w-4 h-4" /> {t("nav_suppliers")}
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 rounded-xl">
              <TbBuildingStore className="w-6 h-6 text-neutral-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-100">{supplier?.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[supplier?.type] ?? TYPE_STYLE.Other}`}>
                  {supplier?.type}
                </span>
                {supplier?.phone && (
                  <div className="flex flex-wrap gap-1">
                    {supplier.phone.split(" / ").map((p, i) => (
                      <span key={i} className="text-xs text-neutral-500">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {supplier?.notes && <p className="text-xs text-neutral-500 mt-2 ml-1">{supplier.notes}</p>}
        </div>

        {/* Summary cards */}
        <div className="flex gap-3 flex-wrap">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center">
            <p className="text-xl font-bold text-neutral-100">{jobCount}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("nav_jobs")}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center">
            <p className="text-xl font-bold text-violet-400">{lineCount}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("jobs_lines")}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center">
            <p className="text-xl font-bold font-mono text-orange-400">{fmt(totalBilled)}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("total")}</p>
          </div>
        </div>
      </div>

      {/* Job list */}
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">
        {t("nav_jobs")} — {t("period_all")}
      </h2>

      <HistoryFilters t={t} tStatus={tStatus} tPay={tPay}
        statusFilter={statusFilter} setStatus={setStatus}
        payFilter={payFilter} setPay={setPay}
        dateFilter={dateFilter} setDate={setDate}
        dateFrom={dateFrom} setDateFrom={setDateFrom}
        dateTo={dateTo} setDateTo={setDateTo}
        total={jobs.length} filtered={filtered.length}
      />

      {filtered.length === 0 && (
        <p className="text-neutral-600 italic text-sm">{t("jobs_empty")}</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((job) => {
          const total   = calcTotal(job.lines);
          const paid    = calcPaid(job.payments);
          const balance = calcBalance(job.lines, job.payments);
          const label   = payLabel(job.lines, job.payments);
          const supplierTotal = job.supplierLines.reduce((s, l) => s + (parseFloat(l.price) || 0), 0);
          const open = expanded[job.id];

          return (
            <div key={job.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <button onClick={() => toggleJob(job.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-neutral-800/40 transition-colors cursor-pointer">
                <span className="shrink-0">{STATUS_ICON[job.status]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-100">
                    {job.customerName} — <span className="text-neutral-400 font-normal">{job.carLabel}</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {job.dateIn || "—"}{job.dateOut ? ` → ${job.dateOut}` : ""}
                    {" · "}{job.supplierLines.map((l) => l.description).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[job.status] ?? ""}`}>{tStatus(job.status, t)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_STYLE[label]}`}>{tPay(label, t)}</span>
                  <span className="text-sm font-mono font-semibold text-orange-400">{fmt(supplierTotal)}</span>
                  <span className={`text-xs ${open ? "rotate-180" : ""} transition-transform text-neutral-500`}>▼</span>
                </div>
              </button>

              {open && (
                <div className="border-t border-neutral-800 px-5 py-4 text-sm flex flex-col gap-4">
                  {/* Supplier lines for this job */}
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                      {t("jobs_lines")} ({supplier?.name})
                    </p>
                    <div className="flex flex-col gap-1">
                      {job.supplierLines.map((l) => (
                        <div key={l.id} className="flex justify-between text-neutral-300">
                          <span>{l.description}</span>
                          <span className="font-mono text-orange-400">{fmt(l.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full job total / balance */}
                  <div className="flex gap-6 text-xs text-neutral-500 border-t border-neutral-800 pt-3">
                    <span>{t("total")} job: <span className="text-neutral-200 font-mono">{fmt(total)}</span></span>
                    <span>{t("jobs_paid")}: <span className="text-green-400 font-mono">{fmt(paid)}</span></span>
                    <span>{t("jobs_balance_due")}: <span className={`font-mono ${balance > 0 ? "text-orange-400" : "text-green-400"}`}>{fmt(Math.max(0, balance))}</span></span>
                  </div>

                  {job.notes && <p className="text-neutral-500 text-xs italic">{job.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
