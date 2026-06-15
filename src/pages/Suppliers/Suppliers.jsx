import { useState, useEffect } from "react";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import { db } from "../../services/localDB";
import Modal from "../../components/Modal";
import { useLanguage } from "../../context/LanguageContext";

const SUPPLIER_TYPES = ["Internal", "Parts Supplier", "Body Shop", "Other"]; // kept for EMPTY default

const TYPE_STYLE = {
  Internal:         "bg-violet-500/10 text-violet-400 border border-violet-500/30",
  "Parts Supplier": "bg-blue-500/10   text-blue-400   border border-blue-500/30",
  "Body Shop":      "bg-orange-500/10 text-orange-400  border border-orange-500/30",
  Other:            "bg-neutral-500/10 text-neutral-400 border border-neutral-600",
};

const EMPTY = { name: "", type: "Parts Supplier", phone: "", notes: "" };

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";
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
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const reload = async () => setSuppliers(await db.suppliers.getAll());
  useEffect(() => { reload(); }, []);

  const openAdd    = () => { setForm(EMPTY); setModal("add"); };
  const openEdit   = (s) => { setForm({ name: s.name, type: s.type, phone: s.phone ?? "", notes: s.notes ?? "" }); setEditId(s.id); setModal("edit"); };
  const openDelete = (s) => { setDeleteTarget(s); setModal("delete"); };
  const close      = () => { setModal(null); setDeleteTarget(null); setEditId(null); };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modal === "add") await db.suppliers.add(form);
    else await db.suppliers.update(editId, form);
    await reload();
    close();
  };

  const handleDelete = async () => {
    await db.suppliers.delete(deleteTarget.id);
    await reload();
    close();
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{t("suppliers_title")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{suppliers.length} total</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <HiPlus className="w-4 h-4" /> {t("suppliers_add")}
        </button>
      </div>

      <input type="text" placeholder={t("suppliers_search")} value={search}
        onChange={(e) => setSearch(e.target.value)} className={`${inputCls} mb-4 max-w-sm`} />

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                  {search ? t("suppliers_empty_search") : t("suppliers_empty")}
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-4 py-3 text-neutral-100 font-medium">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[s.type] ?? TYPE_STYLE.Other}`}>
                    {SUPPLIER_TYPES_KEYS.find(k => k.key === s.type)?.label() ?? s.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-400">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">{s.notes || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-neutral-400 hover:text-violet-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("edit")}>
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
              <label className={labelCls} htmlFor="phone">{t("phone")}</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} className={inputCls} placeholder="+216 XX XXX XXX" />
            </div>
            <div>
              <label className={labelCls} htmlFor="notes">{t("notes")}</label>
              <textarea id="notes" name="notes" rows={2} value={form.notes} onChange={handleChange} className={`${inputCls} resize-none`} placeholder={t("notes")} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={close} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">{t("cancel")}</button>
              <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
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
            <button onClick={close} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">{t("cancel")}</button>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer">{t("delete")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
