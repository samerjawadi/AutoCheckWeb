import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiArrowLeft, HiCheckCircle, HiClock, HiExclamationCircle, HiUser } from "react-icons/hi";
import { db } from "../../services/localDB";
import { calcTotal, calcPaid, calcBalance, payLabel } from "../../utils/finance";
import { BrandLogo } from "../../components/BrandSelect";
import HistoryFilters, { applyFilters } from "../../components/HistoryFilters";
import { useLanguage } from "../../context/LanguageContext";

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

export default function CarHistory() {
  const { carId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [statusFilter, setStatus] = useState("All");
  const [payFilter, setPay]       = useState("All");
  const [dateFilter, setDate]     = useState("All");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");

  useEffect(() => {
    const load = async () => {
      const [car, allJobs, allCustomers] = await Promise.all([
        db.cars.getById(carId),
        db.jobs.getAll(),
        db.customers.getAll(),
      ]);

      const jobs     = allJobs.filter((j) => j.carId === carId);
      const owner    = allCustomers.find((c) => c.id === car?.customerId) ?? null;

      const enriched = jobs.map((j) => ({ ...j, _payLabel: payLabel(j.lines, j.payments) }));

      const totalSpent   = enriched.reduce((s, j) => s + calcPaid(j.payments), 0);
      const totalBilled  = enriched.reduce((s, j) => s + calcTotal(j.lines), 0);
      const totalBalance = totalBilled - totalSpent;

      setData({ car, owner, jobs: enriched, totalSpent, totalBilled, totalBalance });
    };
    load();
  }, [carId]);

  if (!data) return null;
  const { car, owner, jobs, totalSpent, totalBilled, totalBalance } = data;

  const filtered = applyFilters(jobs, { statusFilter, payFilter, dateFilter, dateFrom, dateTo });

  const toggleJob = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white mb-6 transition-colors cursor-pointer">
        <HiArrowLeft className="w-4 h-4" /> {t("nav_cars")}
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BrandLogo manufacturer={car?.manufacturer} size={40} />
            <h1 className="text-2xl font-bold text-neutral-100">
              {car?.manufacturer} {car?.model}
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="font-mono text-sm text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">{car?.plate}</span>
            {car?.vin && <span className="font-mono text-xs text-neutral-500">{car.vin}</span>}
            {owner && (
              <button onClick={() => navigate(`/history/customer/${owner.id}`)}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
                <HiUser className="w-3.5 h-3.5" /> {owner.name}
              </button>
            )}
          </div>
          {car?.description && <p className="text-xs text-neutral-500 mt-1">{car.description}</p>}
        </div>

        {/* Summary cards */}
        <div className="flex gap-3 flex-wrap">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center">
            <p className="text-xl font-bold text-neutral-100">{jobs.length}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("nav_jobs")}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center">
            <p className="text-xl font-bold font-mono text-neutral-300">{fmt(totalBilled)}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("total")}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center">
            <p className="text-xl font-bold font-mono text-green-400">{fmt(totalSpent)}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("jobs_paid")}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-center">
            <p className={`text-xl font-bold font-mono ${totalBalance > 0 ? "text-orange-400" : "text-green-400"}`}>{fmt(Math.max(0, totalBalance))}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("jobs_balance")}</p>
          </div>
        </div>
      </div>

      {/* Service timeline */}
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
          const open    = expanded[job.id];

          return (
            <div key={job.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <button onClick={() => toggleJob(job.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-neutral-800/40 transition-colors cursor-pointer">
                <span className="shrink-0">{STATUS_ICON[job.status]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-100">
                    {job.dateIn || "—"}{job.dateOut ? ` → ${job.dateOut}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {(job.lines ?? []).map((l) => l.description).filter(Boolean).join(" · ") || "No lines"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[job.status] ?? ""}`}>{tStatus(job.status, t)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_STYLE[label]}`}>{tPay(label, t)}</span>
                  <span className="text-sm font-mono font-semibold text-neutral-200">{fmt(total)}</span>
                  <span className={`text-xs ${open ? "rotate-180" : ""} transition-transform text-neutral-500`}>▼</span>
                </div>
              </button>

              {open && (
                <div className="border-t border-neutral-800 px-5 py-4 text-sm flex flex-col gap-4">
                  {(job.lines ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{t("jobs_lines")}</p>
                      <div className="flex flex-col gap-1">
                        {job.lines.map((l) => (
                          <div key={l.id} className="flex justify-between text-neutral-300">
                            <span>{l.description}</span>
                            <span className="font-mono">{fmt(l.price)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-semibold text-neutral-100 border-t border-neutral-800 mt-1 pt-1">
                          <span>{t("total")}</span>
                          <span className="font-mono">{fmt(total)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {(job.payments ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{t("jobs_payments")}</p>
                      <div className="flex flex-col gap-1">
                        {job.payments.map((p) => (
                          <div key={p.id} className="flex justify-between text-neutral-300">
                            <span>{p.date}{p.note ? ` — ${p.note}` : ""}</span>
                            <span className="font-mono text-green-400">{fmt(p.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-neutral-800 mt-1 pt-1">
                          <span className="text-neutral-400">{t("jobs_balance_due")}</span>
                          <span className={`font-mono font-semibold ${balance > 0 ? "text-orange-400" : "text-green-400"}`}>
                            {fmt(Math.max(0, balance))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
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
