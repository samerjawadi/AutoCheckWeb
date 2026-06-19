import { useState, useEffect } from "react";
import { HiPlus, HiPencil, HiTrash, HiPhone } from "react-icons/hi";
import { TbHistory } from "react-icons/tb";
import { Link } from "react-router-dom";
import { db } from "../../services/localDB";
import LoadingState from "../../components/LoadingState";
import Modal from "../../components/Modal";
import { useLanguage } from "../../context/LanguageContext";

const EMPTY = { name: "", phones: [""], email: "" };

// phones stored as "num1 / num2" string in DB
const phonesToStr = (phones) => phones.filter(Boolean).join(" / ");
const strToPhones = (str) => str ? str.split(" / ").map(s => s.trim()).filter(Boolean) : [""];

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";

const labelCls = "block text-xs font-medium text-neutral-400 mb-1";

export default function Customers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [allCars, setAllCars]       = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = async (showSpinner = false) => {
    const start = Date.now();
    try {
      setCustomers(await db.customers.getAll());
      setAllCars(await db.cars.getAll());
    } finally {
      if (showSpinner) {
        const delta = Date.now() - start;
        const minMs = import.meta.env.MODE === "test" ? 0 : 1000;
        const wait = Math.max(0, minMs - delta);
        setTimeout(() => setLoading(false), wait);
      } else {
        setLoading(false);
      }
    }
  };
  useEffect(() => { reload(true); }, []);

  const openAdd = () => {
    setForm(EMPTY);
    setModal("add");
  };

  const openEdit = (c) => {
    setForm({ name: c.name, phones: strToPhones(c.phone), email: c.email ?? "" });
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

  const setPhone = (idx, val) =>
    setForm((prev) => ({ ...prev, phones: prev.phones.map((p, i) => i === idx ? val : p) }));
  const addPhone = () =>
    setForm((prev) => ({ ...prev, phones: [...prev.phones, ""] }));
  const removePhone = (idx) =>
    setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = { ...form, phone: phonesToStr(form.phones) };
      if (modal === "add") await db.customers.add(payload);
      else await db.customers.update(editId, payload);
      await reload();
      close();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    await db.customers.delete(deleteTarget.id);
    await reload();
    close();
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  // Keep filters visible; show loader inside table while loading

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{t("customers_title")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{customers.length} total</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <HiPlus className="w-4 h-4" /> {t("customers_add")}
        </button>
      </div>

      <input type="text" placeholder={t("customers_search")} value={search}
        onChange={(e) => setSearch(e.target.value)} className={`${inputCls} mb-4 max-w-sm`} />

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 text-left">
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("phone")}</th>
              <th className="px-4 py-3 font-medium">{t("email")}</th>
              <th className="px-4 py-3 font-medium text-center">{t("customers_cars")}</th>
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
                  {search ? t("customers_empty_search") : t("customers_empty")}
                </td>
              </tr>
            ) : filtered.map((c) => {
              const carCount = allCars.filter((car) => car.customerId === c.id).length;
              return (
                <tr key={c.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3 text-neutral-100 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-300">
                    <div className="flex flex-wrap gap-1">
                      {strToPhones(c.phone).filter(Boolean).length === 0 ? (
                        <span className="text-neutral-500">—</span>
                      ) : strToPhones(c.phone).filter(Boolean).map((p, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs bg-neutral-800 px-2 py-0.5 rounded-full">
                          <HiPhone className="w-3 h-3 text-neutral-500" />{p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-neutral-800 text-neutral-300 text-xs px-2 py-0.5 rounded-full">{carCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link to={`/history/customer/${c.id}`}
                        className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-700 rounded transition-colors" title="View history">
                        <TbHistory className="w-4 h-4" />
                      </Link>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-neutral-400 hover:text-violet-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("edit")}>
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDelete(c)} className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("delete")}>
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

      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? t("customers_add") : t("customers_edit")} onClose={close}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="name">{t("name")} *</label>
              <input id="name" name="name" required value={form.name} onChange={handleChange} className={inputCls} placeholder={t("name")} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>{t("phone")}</label>
                <button type="button" onClick={addPhone}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors cursor-pointer">
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
              <label className={labelCls} htmlFor="email">{t("email")}</label>
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} className={inputCls} placeholder={t("optional")} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={close} disabled={submitting} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">{t("cancel")}</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer">
                {submitting ? t("loading") : (modal === "add" ? t("customers_add") : t("save"))}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "delete" && deleteTarget && (
        <Modal title={t("customers_delete")} onClose={close}>
          <p className="text-neutral-300 text-sm">
            {t("customers_delete_msg", { name: "" }).split(deleteTarget.name)[0]}
            <span className="font-semibold text-neutral-100">{deleteTarget.name}</span>
            {t("customers_delete_msg", { name: "" }).split(deleteTarget.name)[1]}
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
