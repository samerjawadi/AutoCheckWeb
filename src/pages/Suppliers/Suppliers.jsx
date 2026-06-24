import { useState, useEffect } from "react";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import { TbHistory } from "react-icons/tb";
import { Link } from "react-router-dom";
import { db } from "../../services/localDB";
import LoadingState from "../../components/LoadingState";
import Modal from "../../components/Modal";
import { useLanguage } from "../../context/LanguageContext";

const TYPE_STYLE = {
  Internal:         "bg-yellow-500/10 text-yellow-400 border border-yellow-400/30",
  "Parts Supplier": "bg-blue-500/10   text-blue-400   border border-blue-500/30",
  "Body Shop":      "bg-orange-500/10 text-orange-400  border border-orange-500/30",
  Other:            "bg-neutral-500/10 text-neutral-400 border border-neutral-600",
};

const EMPTY = { name: "", type: "Parts Supplier", phones: [""], notes: "" };

// phones stored as "num1 / num2" string in DB
const phonesToStr = (phones) => phones.filter(Boolean).join(" / ");
const strToPhones = (str) => str ? str.split(" / ").map(s => s.trim()).filter(Boolean) : [""];

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm";
const labelCls = "block text-xs font-medium text-neutral-400 mb-1";

export default function Suppliers() {
  const { t } = useLanguage();
  const SUPPLIER_TYPES_KEYS = [
    { key: "Internal",       label: () => t("suppliers_internal") },
    { key: "Parts Supplier", label: () => t("suppliers_parts") },
    { key: "Body Shop",      label: () => t("suppliers_body") },
    { key: "Other",          label: () => t("suppliers_other") },
  ];
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      setSuppliers(await db.suppliers.getAll());
    } finally {
      const delta = Date.now() - start;
      const minMs = import.meta.env.MODE === "test" ? 0 : 1000;
      const wait = Math.max(0, minMs - delta);
      setTimeout(() => setLoading(false), wait);
    }
  };
  useEffect(() => {
    const id = setTimeout(() => { reload(); }, 0);
    return () => clearTimeout(id);
  }, []);

  const openAdd    = () => { setForm(EMPTY); setModal("add"); };
  const openEdit   = (s) => { setForm({ name: s.name, type: s.type, phones: strToPhones(s.phone), notes: s.notes ?? "" }); setEditId(s.id); setModal("edit"); };
  const openDelete = (s) => { setDeleteTarget(s); setModal("delete"); };
  const close      = () => { setModal(null); setDeleteTarget(null); setEditId(null); setSaving(false); setDeleting(false); };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const setPhone = (idx, val) =>
    setForm((prev) => ({ ...prev, phones: prev.phones.map((p, i) => i === idx ? val : p) }));
  const addPhone = () =>
    setForm((prev) => ({ ...prev, phones: [...prev.phones, ""] }));
  const removePhone = (idx) =>
    setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const payload = { ...form, phone: phonesToStr(form.phones) };
    try {
      if (modal === "add") {
        const created = await db.suppliers.add(payload);
        setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        await db.suppliers.update(editId, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === editId ? { ...s, ...payload } : s)));
      }
      close();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await db.suppliers.delete(deleteTarget.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      close();
    } finally {
      setDeleting(false);
    }
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  // Keep filters visible; show loader inside table while loading

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{t("suppliers_title")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{suppliers.length} total</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <HiPlus className="w-4 h-4" /> {t("suppliers_add")}
        </button>
      </div>

      <input type="text" placeholder={t("suppliers_search")} value={search}
        onChange={(e) => setSearch(e.target.value)} className={`${inputCls} mb-4 max-w-sm`} />

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 text-left">
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("suppliers_type")}</th>
              <th className="px-4 py-3 font-medium">{t("phone")}</th>
              <th className="px-4 py-3 font-medium">{t("notes")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <LoadingState inline label={t("loading")} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                  {search ? t("suppliers_empty_search") : t("suppliers_empty")}
                </td>
              </tr>
            ) : filtered.map((s) => (
              <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-4 py-3 text-neutral-100 font-medium">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[s.type] ?? TYPE_STYLE.Other}`}>
                    {SUPPLIER_TYPES_KEYS.find(k => k.key === s.type)?.label() ?? s.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-300">
                  <div className="flex flex-wrap gap-1">
                    {strToPhones(s.phone).filter(Boolean).length === 0 ? (
                      <span className="text-neutral-500">—</span>
                    ) : strToPhones(s.phone).filter(Boolean).map((p, i) => (
                      <span key={i} className="text-xs bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400">{p}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">{s.notes || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Link to={`/history/supplier/${s.id}`}
                      className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-700 rounded transition-colors" title="View history">
                      <TbHistory className="w-4 h-4" />
                    </Link>
                    <button onClick={() => openEdit(s)} className="p-1.5 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("edit")}>
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDelete(s)} className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("delete")}>
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? t("suppliers_add") : t("suppliers_edit")} onClose={close}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="name">{t("name")} *</label>
              <input id="name" name="name" required value={form.name} onChange={handleChange} className={inputCls} placeholder={t("name")} />
            </div>
            <div>
              <label className={labelCls} htmlFor="type">{t("suppliers_type")} *</label>
              <select id="type" name="type" required value={form.type} onChange={handleChange} className={inputCls}>
                {SUPPLIER_TYPES_KEYS.map(({ key, label }) => <option key={key} value={key}>{label()}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>{t("phone")}</label>
                <button type="button" onClick={addPhone}
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-400 transition-colors cursor-pointer">
                  <HiPlus className="w-3.5 h-3.5" /> Add number
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {form.phones.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={p}
                      onChange={(e) => setPhone(idx, e.target.value)}
                      className={inputCls}
                      placeholder="+216 XX XXX XXX"
                    />
                    {form.phones.length > 1 && (
                      <button type="button" onClick={() => removePhone(idx)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer shrink-0">
                        <HiTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="notes">{t("notes")}</label>
              <textarea id="notes" name="notes" rows={2} value={form.notes} onChange={handleChange} className={`${inputCls} resize-none`} placeholder={t("notes")} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={close} disabled={saving} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{t("cancel")}</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />}
                {modal === "add" ? t("suppliers_add") : t("save")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "delete" && deleteTarget && (
        <Modal title={t("suppliers_delete")} onClose={close}>
          <p className="text-neutral-300 text-sm">
            {t("suppliers_delete_msg", { name: "" }).split(deleteTarget.name)[0]}
            <span className="font-semibold text-neutral-100">{deleteTarget.name}</span>
            {t("suppliers_delete_msg", { name: "" }).split(deleteTarget.name)[1]}
          </p>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={close} disabled={deleting} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{t("cancel")}</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
              {deleting && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />}
              {t("delete")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
