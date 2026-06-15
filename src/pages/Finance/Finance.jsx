import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { db } from "../../services/localDB";
import { calcTotal, calcPaid } from "../../utils/finance";
import { useLanguage } from "../../context/LanguageContext";
import PinLock, { revokeSession } from "../../components/PinLock";
import { HiLockClosed } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

const fmt = (n) => Number(n || 0).toLocaleString("fr-TN", { style: "currency", currency: "TND" });

const TODAY       = new Date().toISOString().slice(0, 10);
const WEEK_START  = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); })();
const MONTH_START = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; })();

function filterByPeriod(jobs, period) {
  if (period === "Today")      return jobs.filter((j) => j.dateIn === TODAY);
  if (period === "This Week")  return jobs.filter((j) => j.dateIn >= WEEK_START && j.dateIn <= TODAY);
  if (period === "This Month") return jobs.filter((j) => j.dateIn >= MONTH_START && j.dateIn <= TODAY);
  return jobs;
}

function StatCard({ label, value, sub, color = "text-neutral-100" }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-sm text-neutral-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-neutral-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function Finance() {
  const { t, lang } = useLanguage();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [period, setPeriod] = useState("All");

  const PERIODS = [
    { key: "All",        label: t("period_all") },
    { key: "Today",      label: t("period_today") },
    { key: "This Week",  label: t("period_week") },
    { key: "This Month", label: t("period_month") },
  ];

  useEffect(() => {
    const load = async () => {
      const [jobs, customers, cars, suppliers] = await Promise.all([
        db.jobs.getAll(), db.customers.getAll(),
        db.cars.getAll(), db.suppliers.getAll(),
      ]);
      setData({ jobs, customers, cars, suppliers });
    };
    load();
  }, []);

  if (!data) return null;
  const { jobs, customers, suppliers } = data;

  const scoped = filterByPeriod(jobs, period);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalBilled  = scoped.reduce((s, j) => s + calcTotal(j.lines), 0);
  const totalPaid    = scoped.reduce((s, j) => s + calcPaid(j.payments), 0);
  const totalBalance = totalBilled - totalPaid;
  const avgJob       = scoped.length ? totalBilled / scoped.length : 0;

  // Paid / Partial / Unpaid counts
  let paidCount = 0, partialCount = 0, unpaidCount = 0;
  scoped.forEach((j) => {
    const total = calcTotal(j.lines);
    const paid  = calcPaid(j.payments);
    if (total === 0 || paid >= total) paidCount++;
    else if (paid > 0) partialCount++;
    else unpaidCount++;
  });

  // ── Revenue by month (last 12) ────────────────────────────────────────────
  const revenueByMonth = (() => {
    const months = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      months[key] = { month: label, billed: 0, collected: 0, balance: 0 };
    }
    jobs.forEach((j) => {
      if (!j.dateIn) return;
      const key = j.dateIn.slice(0, 7);
      if (!months[key]) return;
      months[key].billed    += calcTotal(j.lines);
      months[key].collected += calcPaid(j.payments);
      months[key].balance   += Math.max(0, calcTotal(j.lines) - calcPaid(j.payments));
    });
    return Object.values(months);
  })();

  // ── Payment breakdown pie ─────────────────────────────────────────────────
  const payPie = [
    { name: t("pay_paid"),    value: paidCount,    color: "#4ade80" },
    { name: t("pay_partial"), value: partialCount, color: "#facc15" },
    { name: t("pay_unpaid"),  value: unpaidCount,  color: "#f87171" },
  ].filter((d) => d.value > 0);

  // ── Top 10 customers by revenue ───────────────────────────────────────────
  const topCustomers = (() => {
    const map = {};
    scoped.forEach((j) => {
      const c = customers.find((c) => c.id === j.customerId);
      const name = c?.name ?? "Unknown";
      map[name] = (map[name] ?? 0) + calcPaid(j.payments);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, revenue]) => ({ name, revenue }));
  })();

  // ── Supplier spend ────────────────────────────────────────────────────────
  const supplierSpend = (() => {
    const map = {};
    scoped.forEach((j) => {
      (j.lines ?? []).forEach((l) => {
        const s = suppliers.find((s) => s.id === l.supplierId);
        const name = s?.name ?? (fr ? "Inconnu" : "Unknown");
        map[name] = (map[name] ?? 0) + (parseFloat(l.price) || 0);
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, spend]) => ({ name, spend }));
  })();

  const tooltipStyle = { background: "#171717", border: "1px solid #404040", borderRadius: 8, color: "#e5e5e5", fontSize: 12 };

  return (
    <PinLock>
      <div className="page-enter p-6 w-full">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100">
              {fr ? "Finances" : "Finance"}
              <span className="ml-2 text-xs font-normal text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full align-middle">
                🔒 {fr ? "Confidentiel" : "Confidential"}
              </span>
            </h1>
            <p className="text-neutral-500 text-sm mt-0.5">
              {new Date().toLocaleDateString(fr ? "fr-FR" : "en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {/* Period filter + lock */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
              {PERIODS.map(({ key, label }) => (
                <button key={key} onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    period === key ? "bg-violet-600 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { revokeSession(); navigate("/"); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 border border-neutral-800 hover:border-red-500/50 hover:bg-red-500/5 text-neutral-400 hover:text-red-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title={fr ? "Verrouiller" : "Lock"}
            >
              <HiLockClosed className="w-4 h-4" />
              {fr ? "Verrouiller" : "Lock"}
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label={fr ? "Chiffre d'affaires" : "Total Billed"} value={fmt(totalBilled)} color="text-neutral-100" />
          <StatCard label={fr ? "Encaissé" : "Collected"} value={fmt(totalPaid)} color="text-green-400" />
          <StatCard label={fr ? "Solde restant" : "Outstanding"} value={fmt(Math.max(0, totalBalance))} color={totalBalance > 0 ? "text-orange-400" : "text-green-400"} />
          <StatCard label={fr ? "Panier moyen" : "Avg Job Value"} value={fmt(avgJob)} sub={`${scoped.length} ${t("nav_jobs").toLowerCase()}`} color="text-violet-400" />
        </div>

        {/* Payment status cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-green-400">{paidCount}</p>
            <p className="text-xs text-neutral-400 mt-1">{t("pay_paid")}</p>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-yellow-400">{partialCount}</p>
            <p className="text-xs text-neutral-400 mt-1">{t("pay_partial")}</p>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold text-red-400">{unpaidCount}</p>
            <p className="text-xs text-neutral-400 mt-1">{t("pay_unpaid")}</p>
          </div>
        </div>

        {/* Revenue line chart — 12 months */}
        <div className="mb-8">
          <Section title={fr ? "Évolution du chiffre d'affaires (12 mois)" : "Revenue over 12 months"}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueByMonth} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="month" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [fmt(v), name]} />
                <Legend formatter={(v) => <span style={{ color: "#a3a3a3", fontSize: 11 }}>{v}</span>} />
                <Line type="monotone" dataKey="billed"    name={fr ? "Facturé" : "Billed"}    stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="collected" name={fr ? "Encaissé" : "Collected"} stroke="#4ade80" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="balance"   name={fr ? "Impayé" : "Outstanding"} stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        </div>

        {/* Bottom row: payment pie + top customers + supplier spend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Payment pie */}
          <Section title={fr ? "Répartition paiements" : "Payment Breakdown"}>
            {payPie.length === 0 ? (
              <p className="text-neutral-600 italic text-xs text-center py-8">{t("dashboard_no_jobs")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={payPie} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {payPie.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={9} formatter={(v) => <span style={{ color: "#a3a3a3", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Top customers */}
          <Section title={fr ? "Top clients (encaissé)" : "Top Customers (collected)"}>
            {topCustomers.length === 0 ? (
              <p className="text-neutral-600 italic text-xs">{t("dashboard_no_jobs")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topCustomers.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-600 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-neutral-300 truncate">{c.name}</span>
                        <span className="text-green-400 font-mono shrink-0 ml-2">{fmt(c.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.round((c.revenue / topCustomers[0].revenue) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Supplier spend */}
          <Section title={fr ? "Dépenses fournisseurs" : "Supplier Spend"}>
            {supplierSpend.length === 0 ? (
              <p className="text-neutral-600 italic text-xs">{t("dashboard_no_jobs")}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {supplierSpend.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-600 w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-neutral-300 truncate">{s.name}</span>
                        <span className="text-orange-400 font-mono shrink-0 ml-2">{fmt(s.spend)}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${Math.round((s.spend / supplierSpend[0].spend) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Revenue bar chart */}
        <Section title={fr ? "Facturé vs Encaissé par mois" : "Billed vs Collected by month"}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByMonth} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="month" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [fmt(v), name]} />
              <Legend formatter={(v) => <span style={{ color: "#a3a3a3", fontSize: 11 }}>{v}</span>} />
              <Bar dataKey="billed"    name={fr ? "Facturé" : "Billed"}    fill="#8b5cf6" radius={[4,4,0,0]} />
              <Bar dataKey="collected" name={fr ? "Encaissé" : "Collected"} fill="#4ade80" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>
    </PinLock>
  );
}
