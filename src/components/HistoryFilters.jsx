// Shared filter bar for all history pages

const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];
const PAY_OPTIONS    = ["Paid", "Partial", "Unpaid"];

const inputCls = "bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer";

const pillCls = (active, color = "violet") =>
  `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
    active
      ? color === "orange" ? "bg-orange-600 text-white" : "bg-violet-600 text-white"
      : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
  }`;

export const TODAY       = new Date().toISOString().slice(0, 10);
export const WEEK_START  = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); })();
export const MONTH_START = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; })();

export function applyFilters(jobs, { statusFilter, payFilter, dateFilter, dateFrom, dateTo, search, searchFn }) {
  return jobs.filter((job) => {
    const matchStatus = statusFilter === "All" || job.status === statusFilter;
    const matchPay    = payFilter === "All"    || job._payLabel === payFilter;
    const matchDate   =
      dateFilter === "All"       ? true :
      dateFilter === "Today"     ? job.dateIn === TODAY :
      dateFilter === "This Week" ? job.dateIn >= WEEK_START && job.dateIn <= TODAY :
      dateFilter === "This Month"? job.dateIn >= MONTH_START && job.dateIn <= TODAY :
      /* Custom */ (!dateFrom || job.dateIn >= dateFrom) && (!dateTo || job.dateIn <= dateTo);
    const matchSearch = !search || (searchFn ? searchFn(job, search) : true);
    return matchStatus && matchPay && matchDate && matchSearch;
  });
}

export default function HistoryFilters({ t, tStatus, tPay, statusFilter, setStatus, payFilter, setPay, dateFilter, setDate, dateFrom, setDateFrom, dateTo, setDateTo, search, setSearch, total, filtered, searchPlaceholder }) {
  const DATE_PERIODS = [
    { key: "All",        label: t("period_all") },
    { key: "Today",      label: t("period_today") },
    { key: "This Week",  label: t("period_week") },
    { key: "This Month", label: t("period_month") },
    { key: "Custom",     label: t("period_custom") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      {setSearch && (
        <input type="text" placeholder={searchPlaceholder ?? t("jobs_search")}
          value={search} onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} max-w-xs text-sm`} />
      )}

      {/* Status pills */}
      <div className="flex items-center gap-1.5">
        <button onClick={() => setStatus("All")} className={pillCls(statusFilter === "All")}>{t("period_all")}</button>
        {STATUS_OPTIONS.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={pillCls(statusFilter === s)}>{tStatus(s, t)}</button>
        ))}
      </div>

      {/* Pay pills */}
      <div className="flex items-center gap-1.5">
        <button onClick={() => setPay("All")} className={pillCls(payFilter === "All")}>{t("period_all")}</button>
        {PAY_OPTIONS.map((p) => (
          <button key={p} onClick={() => setPay(p)} className={pillCls(payFilter === p)}>{tPay(p, t)}</button>
        ))}
      </div>

      {/* Date pills */}
      <div className="flex items-center gap-1.5">
        {DATE_PERIODS.map(({ key, label }) => (
          <button key={key}
            onClick={() => { setDate(key); if (key !== "Custom") { setDateFrom(""); setDateTo(""); } }}
            className={pillCls(dateFilter === key, "orange")}>
            {label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {dateFilter === "Custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
          <span className="text-neutral-600 text-xs">{t("date_from_to")}</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
        </div>
      )}

      {/* Count */}
      <span className="ml-auto text-xs text-neutral-500">{filtered} / {total}</span>
    </div>
  );
}
