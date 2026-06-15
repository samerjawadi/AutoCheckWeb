import { useState, useEffect } from "react";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import { db } from "../../services/localDB";
import Modal from "../../components/Modal";

const EMPTY = { name: "", phone: "", email: "" };

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";

const labelCls = "block text-xs font-medium text-neutral-400 mb-1";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const reload = () => setCustomers(db.customers.getAll());
  useEffect(reload, []);

  const openAdd = () => {
    setForm(EMPTY);
    setModal("add");
  };

  const openEdit = (c) => {
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "" });
    setEditId(c.id);
    setModal("edit");
  };

  const openDelete = (c) => {
    setDeleteTarget(c);
    setModal("delete");
  };

  const close = () => {
    setModal(null);
    setDeleteTarget(null);
    setEditId(null);
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal === "add") db.customers.add(form);
    else db.customers.update(editId, form);
    reload();
    close();
  };

  const handleDelete = () => {
    db.customers.delete(deleteTarget.id);
    reload();
    close();
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="page-enter p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Customers</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {customers.length} total
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <HiPlus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or phone..."
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
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium text-center">Cars</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-neutral-500"
                >
                  {search ? "No customers match your search." : "No customers yet. Add one to get started."}
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const carCount = db.cars
                .getAll()
                .filter((car) => car.customerId === c.id).length;
              return (
                <tr
                  key={c.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-100 font-medium">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{c.phone}</td>
                  <td className="px-4 py-3 text-neutral-400">
                    {c.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-neutral-800 text-neutral-300 text-xs px-2 py-0.5 rounded-full">
                      {carCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 text-neutral-400 hover:text-violet-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDelete(c)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add Customer" : "Edit Customer"}
          onClose={close}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="name">Name *</label>
              <input
                id="name"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className={inputCls}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="phone">Phone *</label>
              <input
                id="phone"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                className={inputCls}
                placeholder="+1 555 000 0000"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={inputCls}
                placeholder="optional"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                {modal === "add" ? "Add Customer" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {modal === "delete" && deleteTarget && (
        <Modal title="Delete Customer" onClose={close}>
          <p className="text-neutral-300 text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-neutral-100">
              {deleteTarget.name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={close}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
