import { useCallback, useEffect, useState } from "react";
import { HiDownload, HiDatabase, HiCheckCircle, HiUsers, HiUser, HiTrash, HiPencil } from "react-icons/hi";
import { TbCar, TbTool, TbTruckDelivery } from "react-icons/tb";
import { db } from "../../services/localDB";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import Modal from "../../components/Modal";

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
  const { accent, setAccent, accentLevel, setAccentLevel, accentOptions, accentLevels } = useTheme();
  const fr = lang === "fr";
  const [activeTab, setActiveTab] = useState("db");
  const [status, setStatus] = useState("");
  const [users, setUsers]   = useState([]);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "" });

  const withStatus = useCallback(async (fn, msg) => {
    setLoading(true);
    const start = Date.now();
    setStatus("");
    try { await fn(); setStatus(msg); }
    catch (e) { setStatus("❌ " + e.message); }
    finally {
      const delta = Date.now() - start;
      const minMs = import.meta.env.MODE === "test" ? 0 : 1000;
      const wait = Math.max(0, minMs - delta);
      setTimeout(() => { setLoading(false); setTimeout(() => setStatus(""), 4000); }, wait);
    }
  }, []);

  const loadUsers = useCallback(() => withStatus(async () => {
    const users = await authService.getAllUsers();
    setUsers(users);
  }, ""), [withStatus]);

  useEffect(() => {
    if (activeTab === "users") {
      const id = setTimeout(() => { loadUsers(); }, 0);
      return () => clearTimeout(id);
    }
  }, [activeTab, loadUsers]);

  useEffect(() => {
    const id = setTimeout(() => { loadUsers(); }, 0);
    return () => clearTimeout(id);
  }, [loadUsers]);

  const backupAll = () => withStatus(async () => {
    const [customers, cars, jobs, suppliers, users] = await Promise.all([
      db.customers.getAll(), db.cars.getAll(), db.jobs.getAll(), db.suppliers.getAll(),
      db.users.getAll(),
    ]);
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON({ customers, cars, jobs, suppliers, users, exportedAt: new Date().toISOString() }, `autocheck-backup-${date}.json`);
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

    const exportSuppliers = () => withStatus(async () => {
    const rows = await db.suppliers.getAll();
    downloadCSV(toCSV(rows, ["id", "name", "phone", "email"]), "suppliers.csv");
  }, "✅ suppliers.csv");

    const exportUsers = () => withStatus(async () => {
    const rows = await db.users.getAll();
    downloadCSV(toCSV(rows, ["id", "name", "email", "role"]), "users.csv");
  }, "✅ users.csv");

  const changeRole = async (userId, newRole) => {
    const error = await authService.updateUser(userId, { role: newRole });
    if (error) { alert(error.message); return; }
    setUsers((u) => u.map((p) => p.id === userId ? { ...p, role: newRole } : p));
  };

  const openDeleteUser = (user) => {
    setDeleteTarget(user);
    setModal("delete");
  };

  const openEditUser = (user) => {
    setEditTarget(user);
    setEditForm({ name: user.name ?? "", email: user.email ?? "", password: "" });
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setDeleteTarget(null);
    setEditTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await authService.deleteUser(deleteTarget.id);
    setUsers((u) => u.filter((p) => p.id !== deleteTarget.id));
    closeModal();
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.name) {
      throw new Error(fr ? "Le nom est requis." : "Name is required.");
    }

    const updates = { name: editForm.name.trim() };
    if (editForm.email !== undefined) updates.email = editForm.email.trim() || null;
    if (editForm.password) updates.password = editForm.password;

    await authService.updateUser(editTarget.id, updates);
    setUsers((u) => u.map((p) => p.id === editTarget.id ? { ...p, name: updates.name, email: updates.email ?? p.email } : p));
    closeModal();
  };

  const addUser = () => withStatus(async () => {
    if (!newUser.name || !newUser.password) {
      throw new Error(fr ? "Remplissez le nom et le mot de passe." : "Fill in name and password.");
    }

    await authService.addUser(newUser.name, newUser.email, newUser.password, newUser.role);
    setNewUser({ email: "", password: "", name: "", role: "user" });
    await loadUsers();
  }, fr ? "✅ Utilisateur ajouté" : "✅ User added");

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

      {status && activeTab !== "users" && (
        <div className="mb-4 text-sm bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-300">
          {status}
        </div>
      )}

      {status && activeTab === "users" && (
        <div className="mb-4 text-sm bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-neutral-300">
          {status}
        </div>
      )}

      <div className="mb-6 border-b border-neutral-800">
        <div className="flex gap-3">
          {[
            { id: "db", label: fr ? "Gestion BD" : "Database" },
            { id: "users", label: fr ? "Utilisateurs" : "Users" },
          ].map((tab) => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-2xl border border-b-0 ${activeTab === tab.id ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-950 border-neutral-900 text-neutral-500 hover:text-neutral-200"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "db" ? (
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <HiDatabase className="w-4 h-4" /> {fr ? "Sauvegarde" : "Backup"}
            </h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={backupAll} disabled={loading}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                <HiDownload className="w-4 h-4" />
                {fr ? "Exporter toutes les données (JSON)" : "Export all data (JSON)"}
              </button>
              <button disabled
                className="flex items-center gap-2 bg-neutral-700 text-neutral-400 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-not-allowed">
                <HiDatabase className="w-4 h-4" />
                {fr ? "SQL désactivé" : "SQL export disabled"}
              </button>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">
              {fr ? "Thème" : "Theme"}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              {fr ? "Choisissez la couleur d'accent de l'interface." : "Choose the interface accent color."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {accentOptions.map((opt) => {
                const active = accent === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAccent(opt.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "border-neutral-500 bg-neutral-800 text-white"
                        : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-600"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.swatch }} />
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-neutral-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-400">
                  {fr ? "Intensité de la teinte" : "Shade intensity"}
                </span>
                <span className="text-xs font-semibold text-neutral-200">{accentLevel}</span>
              </div>

              <input
                type="range"
                min={0}
                max={1000}
                step={10}
                value={accentLevel}
                onChange={(e) => setAccentLevel(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-800"
              />

              <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
                {accentLevels.map((level) => (
                  <span key={level}>{level}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <HiDownload className="w-4 h-4" /> {fr ? "Exporter en CSV" : "Export as CSV"}
            </h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportCustomers} disabled={loading}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                <HiUsers className="w-4 h-4 text-yellow-400" /> {t("nav_customers")}
              </button>
              <button onClick={exportCars} disabled={loading}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                <TbCar className="w-4 h-4 text-blue-400" /> {t("nav_cars")}
              </button>
              <button onClick={exportJobs} disabled={loading}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                <TbTool className="w-4 h-4 text-orange-400" /> {t("nav_jobs")}
              </button>
              <button onClick={exportSuppliers} disabled={loading}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                <TbTruckDelivery  className="w-4 h-4 text-green-400" /> {t("nav_suppliers")}
              </button>
              <button onClick={exportUsers} disabled={loading}
                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50">
                <HiUser className="w-4 h-4 text-pink-400" /> {t("users")}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <HiUsers className="w-4 h-4" /> {fr ? "Ajouter un utilisateur" : "Add User"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-xs text-neutral-400">{fr ? "Nom" : "Name"}</span>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  placeholder={fr ? "Nom complet" : "Full name"}
                />
              </label>

              <label className="block">
                <span className="text-xs text-neutral-400">Email</span>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="text-xs text-neutral-400">{fr ? "Mot de passe" : "Password"}</span>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  placeholder="••••••••"
                />
              </label>

              <label className="block">
                <span className="text-xs text-neutral-400">{fr ? "Rôle" : "Role"}</span>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                  className="mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>

            <button
              onClick={addUser}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              <HiCheckCircle className="w-4 h-4" />
              {fr ? "Ajouter l'utilisateur" : "Add user"}
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <HiUsers className="w-4 h-4" /> {fr ? "Liste des utilisateurs" : "User list"}
              </h2>
            </div>

            {users.length === 0 ? (
              <p className="text-neutral-600 italic text-sm">
                {fr ? 'Aucun utilisateur trouvé.' : 'No users found.'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between bg-neutral-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-100">{u.name || u.id.slice(0, 8)}</p>
                      <p className="text-xs text-neutral-500">{u.email || u.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        disabled={u.id === profile?.id}
                        className="bg-neutral-700 border border-neutral-600 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => openEditUser(u)}
                        disabled={u.id === profile?.id}
                        className="p-1.5 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer disabled:opacity-50"
                        title={fr ? "Modifier" : "Edit"}
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteUser(u)}
                        disabled={u.id === profile?.id}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer disabled:opacity-50"
                        title={fr ? "Supprimer" : "Delete"}
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {modal === "delete" && deleteTarget && (
        <Modal title={fr ? "Supprimer l'utilisateur" : "Delete User"} onClose={closeModal}>
          <p className="text-neutral-300 text-sm">
            {fr ? "Êtes-vous sûr de vouloir supprimer" : "Are you sure you want to delete"} <span className="font-semibold text-neutral-100">{deleteTarget.name}</span>?
          </p>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">{fr ? "Annuler" : "Cancel"}</button>
            <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer">{fr ? "Supprimer" : "Delete"}</button>
          </div>
        </Modal>
      )}

      {modal === "edit" && editTarget && (
        <Modal title={fr ? "Modifier l'utilisateur" : "Edit User"} onClose={closeModal}>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-neutral-400">{fr ? "Nom" : "Name"}</span>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs text-neutral-400">Email</span>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs text-neutral-400">{fr ? "Nouveau mot de passe" : "New password"}</span>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                className="mt-2 w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                placeholder={fr ? "Laissez vide pour conserver" : "Leave blank to keep current"}
              />
            </label>

            <div className="flex justify-end gap-3 mt-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">{fr ? "Annuler" : "Cancel"}</button>
              <button onClick={async () => {
                await withStatus(handleSaveEdit, fr ? "✅ Utilisateur mis à jour" : "✅ User updated");
              }} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors cursor-pointer">{fr ? "Enregistrer" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
