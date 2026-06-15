import { useState, useEffect } from "react";
import { HiPlus, HiPencil, HiTrash } from "react-icons/hi";
import { db } from "../../services/localDB";
import Modal from "../../components/Modal";
import { useLanguage } from "../../context/LanguageContext";

const EMPTY = { customerId: "", vin: "", plate: "", manufacturer: "", model: "", description: "" };

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";

const labelCls = "block text-xs font-medium text-neutral-400 mb-1";

export default function Cars() {
  const { t } = useLanguage();
  const [cars, setCars] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const reload = () => {
    setCars(db.cars.getAll());
    setCustomers(db.customers.getAll());
  };
  useEffect(reload, []);

  const customerName = (id) =>
    customers.find((c) => c.id === id)?.name ?? "Unknown";

  const openAdd = () => {
    setForm(EMPTY);
    setModal("add");
  };

  const openEdit = (car) => {
    const ownerExists = customers.some((c) => c.id === car.customerId);
    setForm({
      customerId: ownerExists ? car.customerId : "",
      vin: car.vin,
      plate: car.plate,
      manufacturer: car.manufacturer,
      model: car.model ?? "",
      description: car.description ?? "",
    });
    setEditId(car.id);
    setModal("edit");
  };

  const openDelete = (car) => {
    setDeleteTarget(car);
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
    if (modal === "add") db.cars.add(form);
    else db.cars.update(editId, form);
    reload();
    close();
  };

  const handleDelete = () => {
    db.cars.delete(deleteTarget.id);
    reload();
    close();
  };

  const filtered = cars.filter(
    (car) =>
      car.plate.toLowerCase().includes(search.toLowerCase()) ||
      (car.vin ?? "").toLowerCase().includes(search.toLowerCase()) ||
      car.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
      (car.model ?? "").toLowerCase().includes(search.toLowerCase()) ||
      customerName(car.customerId).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{t("cars_title")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{cars.length} total</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <HiPlus className="w-4 h-4" /> {t("cars_add")}
        </button>
      </div>

      <input type="text" placeholder={t("cars_search")} value={search}
        onChange={(e) => setSearch(e.target.value)} className={`${inputCls} mb-4 max-w-sm`} />

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 text-left">
              <th className="px-4 py-3 font-medium">{t("cars_plate")}</th>
              <th className="px-4 py-3 font-medium">{t("cars_vin")}</th>
              <th className="px-4 py-3 font-medium">{t("cars_constructor")}</th>
              <th className="px-4 py-3 font-medium">{t("cars_model")}</th>
              <th className="px-4 py-3 font-medium">{t("owner")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  {search ? t("cars_empty_search") : t("cars_empty")}
                </td>
              </tr>
            )}
            {filtered.map((car) => (
              <tr key={car.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-4 py-3 text-neutral-100 font-medium font-mono">{car.plate}</td>
                <td className="px-4 py-3 text-neutral-400 font-mono text-xs">{car.vin || "—"}</td>
                <td className="px-4 py-3 text-neutral-300">{car.manufacturer}</td>
                <td className="px-4 py-3 text-neutral-300">{car.model || "—"}</td>
                <td className="px-4 py-3 text-neutral-400">{customerName(car.customerId)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(car)} className="p-1.5 text-neutral-400 hover:text-violet-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("edit")}>
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDelete(car)} className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("delete")}>
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
        <Modal title={modal === "add" ? t("cars_add") : t("cars_edit")} onClose={close}>
          {customers.length === 0 ? (
            <p className="text-neutral-400 text-sm">{t("cars_no_customers")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelCls} htmlFor="customerId">{t("owner")} *</label>
                <select id="customerId" name="customerId" required value={form.customerId} onChange={handleChange} className={inputCls}>
                  <option value="" disabled>{t("jobs_customer")}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="plate">{t("cars_plate")} *</label>
                  <input id="plate" name="plate" required value={form.plate} onChange={handleChange} className={inputCls} placeholder="ABC-1234" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="vin">{t("cars_vin")}</label>
                  <input id="vin" name="vin" value={form.vin} onChange={handleChange} className={`${inputCls} font-mono`} placeholder={t("cars_vin_placeholder")} maxLength={17} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="manufacturer">{t("cars_constructor")} *</label>
                  <input id="manufacturer" name="manufacturer" required value={form.manufacturer} onChange={handleChange} className={inputCls} placeholder="e.g. Toyota, BMW" />
                </div>
                <div>
                  <label className={labelCls} htmlFor="model">{t("cars_model")} *</label>
                  <input id="model" name="model" required value={form.model} onChange={handleChange} className={inputCls} placeholder="e.g. Corolla, X5" />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="description">{t("cars_description")}</label>
                <textarea id="description" name="description" rows={2} value={form.description} onChange={handleChange} className={`${inputCls} resize-none`} placeholder={t("cars_desc_placeholder")} />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={close} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">{t("cancel")}</button>
                <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
                  {modal === "add" ? t("cars_add") : t("save")}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {modal === "delete" && deleteTarget && (
        <Modal title={t("cars_delete")} onClose={close}>
          <p className="text-neutral-300 text-sm"
            dangerouslySetInnerHTML={{ __html: t("cars_delete_msg", { plate: `<span class="font-semibold font-mono text-neutral-100">${deleteTarget.plate}</span>` }) }}
          />
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={close} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">{t("cancel")}</button>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer">{t("delete")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
