import { useState, useEffect } from "react";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import { db } from "../../services/localDB";
import Modal from "../../components/Modal";

const SUPPLIER_TYPES = ["Internal", "Parts Supplier", "Body Shop", "Other"];

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
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const reload = () => setSuppliers(db.suppliers.getAll());
  useEffect(reload, []);

  const openAdd    = () => { setForm(EMPTY); setModal("add"); };
  const openEdit   = (s) => { setForm({ name: s.name, type: s.type, phone: s.phone ?? "", notes: s.notes ?? "" }); setEditId(s.id); setModal("edit"); };
  const openDelete = (s) => { setDeleteTarget(s); setModal("delete"); };
  const close      = () => { setModal(null); setDeleteTarget(null); setEditId(null); };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal === "add") db.suppliers.add(form);
    else db.suppliers.update(editId, form);
    reload();
    close();
  };

  const handleDelete = () => {
    db.suppliers.delete(deleteTarget.id);
    reload();
    close();
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Suppliers</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{suppliers.length} total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <HiPlus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or type..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${inputCls} mb-4 max-w-sm`}
      />

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                  {search ? "No suppliers match your search." : "No suppliers yet. Add one to get started."}
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-4 py-3 text-neutral-100 font-medium">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[s.type] ?? TYPE_STYLE.Other}`}>
                    {s.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-400">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">{s.notes || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(s)}
                      className="p-1.5 text-neutral-400 hover:text-violet-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title="Edit">
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDelete(s)}
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title="Delete">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Add Supplier" : "Edit Supplier"} onClose={close}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="name">Name *</label>
              <input id="name" name="name" required value={form.name}
                onChange={handleChange} className={inputCls} placeholder="Supplier name" />
            </div>
            <div>
              <label className={labelCls} htmlFor="type">Type *</label>
              <select id="type" name="type" required value={form.type}
                onChange={handleChange} className={inputCls}>
                {SUPPLIER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone}
                onChange={handleChange} className={inputCls} placeholder="+216 XX XXX XXX" />
            </div>
            <div>
              <label className={labelCls} htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" rows={2} value={form.notes}
                onChange={handleChange} className={`${inputCls} resize-none`}
                placeholder="Any additional info..." />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={close}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
                {modal === "add" ? "Add Supplier" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete modal */}
      {modal === "delete" && deleteTarget && (
        <Modal title="Delete Supplier" onClose={close}>
          <p className="text-neutral-300 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-neutral-100">{deleteTarget.name}</span>?
            Job lines referencing this supplier will show as unknown.
          </p>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={close}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
