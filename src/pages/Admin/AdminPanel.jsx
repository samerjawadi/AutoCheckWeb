import { useState } from "react";
import { HiDownload, HiDatabase, HiCheckCircle, HiUsers } from "react-icons/hi";
import { TbCar, TbTool, TbBuildingStore } from "react-icons/tb";
import { db } from "../../services/localDB";
import { supabase } from "../../config/axios";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const fmt = (n) => Number(n || 0).toLocaleString("fr-TN", { style: "currency", currency: "TND" });

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows, cols) {
  const header = cols.join(",");
  const lines  = rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","));
  return [header, ...lines].join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPanel() {
  const { profile } = useAuth();
  const { t, lang } = useLanguage();
  const fr = lang === "fr";
  const [status, setStatus] = useState("");
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);

  const withStatus = async (fn, msg) => {
    setLoading(true);
    setStatus("");
    try { await fn(); setStatus(msg); }
    catch (e) { setStatus("❌ " + e.message); }
    finally { setLoading(false); setTimeout(() => setStatus(""), 4000); }
  };

  const backupAll = () => withStatus(async () => {
    const [customers, cars, jobs, suppliers] = await Promise.all([
      db.customers.getAll(), db.cars.getAll(), db.jobs.getAll(), db.suppliers.getAll(),
    ]);
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON({ customers, cars, jobs, suppliers, exportedAt: new Date().toISOString() }, `autocheck-backup-${date}.json`);
  }, fr ? "✅ Sauvegarde téléchargée" : "✅ Backup downloaded");

  const exportCustomers = () => withStatus(async () => {
    const rows = await db.customers.getAll();
    downloadCSV(toCSV(rows, ["id", "name", "phone", "email"]), "customers.csv");
  }, "✅ customers.csv");

  const exportCars = () => withStatus(async () => {
    const rows = await db.cars.getAll();
    downloadCSV(toCSV(rows, ["id", "customerId", "plate", "vin", "manufacturer", "model", "description"]), "cars.csv");
  }, "✅ cars.csv");

  const exportJobs = () => withStatus(async () => {
    const rows = await db.jobs.getAll();
    const flat = rows.map((j) => ({
      id: j.id, customerId: j.customerId, carId: j.carId,
      dateIn: j.dateIn, dateOut: j.dateOut, status: j.status, notes: j.notes,
      totalLines: j.lines?.length ?? 0,
      totalAmount: j.lines?.reduce((s, l) => s + (parseFloat(l.price) || 0), 0) ?? 0,
      totalPaid: j.payments?.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) ?? 0,
    }));
    downloadCSV(toCSV(flat, ["id", "customerId", "carId", "dateIn", "dateOut", "status", "notes", "totalLines", "totalAmount", "totalPaid"]), "jobs.csv");
  }, "✅ jobs.csv");

  const loadUsers = () => withStatus(async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) throw error;
    setUsers(data ?? []);
  }, "");

  const changeRole = async (userId, newRole) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) { alert(error.message); return; }
    setUsers((u) => u.map((p) => p.id === userId ? { ...p, role: newRole } : p));
  };

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-100">
          {fr ? "Panneau Admin" : "Admin Panel"}
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {fr ? `Connecté en tant que ${profile?.name ?? "Admin"}` : `Signed in as ${profile?.name ?? "Admin"}`}
        </p>
      </div>

      {status && (
        <div className="mb-4 text-sm bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-300">
          {status}
        </div>
      )}

      {/* Backup section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <HiDatabase className="w-4 h-4" /> {fr ? "Sauvegarde" : "Backup"}
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={backupAll} disabled={loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
            <HiDownload className="w-4 h-4" />
            {fr ? "Tout sauvegarder (JSON)" : "Full Backup (JSON)"}
          </button>
        </div>
      </div>

      {/* Export section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <HiDownload className="w-4 h-4" /> {fr ? "Exporter en CSV" : "Export as CSV"}
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportCustomers} disabled={loading}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
            <HiUsers className="w-4 h-4 text-violet-400" /> {t("nav_customers")}
          </button>
          <button onClick={exportCars} disabled={loading}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
            <TbCar className="w-4 h-4 text-blue-400" /> {t("nav_cars")}
          </button>
          <button onClick={exportJobs} disabled={loading}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
            <TbTool className="w-4 h-4 text-orange-400" /> {t("nav_jobs")}
          </button>
        </div>
      </div>

      {/* User management */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
            <HiUsers className="w-4 h-4" /> {fr ? "Utilisateurs" : "Users"}
          </h2>
          <button onClick={loadUsers} disabled={loading}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
            {fr ? "Charger" : "Load"}
          </button>
        </div>

        {users.length === 0 ? (
          <p className="text-neutral-600 italic text-sm">
            {fr ? 'Cliquez sur "Charger" pour voir les utilisateurs.' : 'Click "Load" to see users.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-neutral-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-100">{u.name || u.id.slice(0, 8)}</p>
                  <p className="text-xs text-neutral-500">{u.id}</p>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  disabled={u.id === profile?.id}
                  className="bg-neutral-700 border border-neutral-600 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 cursor-pointer"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
