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
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm";

const labelCls = "block text-xs font-medium text-neutral-400 mb-1";

let _cache = null;

export default function Customers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState(() => _cache?.customers ?? []);
  const [allCars, setAllCars]       = useState(() => _cache?.allCars ?? []);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [loading, setLoading] = useState(!_cache);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async (showLoading) => {
    if (showLoading) setLoading(true);
    const start = Date.now();
    try {
      const [freshCustomers, freshCars] = await Promise.all([
        db.customers.getAll(),
        db.cars.getAll(),
      ]);
      setCustomers(freshCustomers);
      setAllCars(freshCars);
      _cache = { customers: freshCustomers, allCars: freshCars };
    } finally {
      if (showLoading) {
        const delta = Date.now() - start;
        const minMs = import.meta.env.MODE === "test" ? 0 : 1000;
        const wait = Math.max(0, minMs - delta);
        setTimeout(() => setLoading(false), wait);
      }
    }
  };
  useEffect(() => {
    const id = setTimeout(() => { reload(!_cache); }, 0);
    return () => clearTimeout(id);
  }, []);

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
    setSaving(false);
    setDeleting(false);
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
    if (saving) return;
    setSaving(true);
    const payload = { ...form, phone: phonesToStr(form.phones) };
    try {
      if (modal === "add") {
        const created = await db.customers.add(payload);
        setCustomers((prev) => {
          const next = [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
          _cache = { ..._cache, customers: next };
          return next;
        });
      } else {
        await db.customers.update(editId, payload);
        setCustomers((prev) => {
          const next = prev.map((c) => (c.id === editId ? { ...c, ...payload } : c));
          _cache = { ..._cache, customers: next };
          return next;
        });
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
      await db.customers.delete(deleteTarget.id);
      setCustomers((prev) => {
        const next = prev.filter((c) => c.id !== deleteTarget.id);
        _cache = { ..._cache, customers: next };
        return next;
      });
      close();
    } finally {
      setDeleting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  // Keep filters visible; show loader inside table while loading

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{t("customers_title")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{customers.length} total</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full sm:w-auto">
          <HiPlus className="w-4 h-4" /> {t("customers_add")}
        </button>
      </div>

      <input type="text" placeholder={t("customers_search")} value={search}
        onChange={(e) => setSearch(e.target.value)} className={`${inputCls} mb-4 w-full sm:max-w-sm`} />

      <div className="md:hidden flex flex-col gap-3 mb-4">
        {loading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-8 text-center">
            <LoadingState inline label={t("loading")} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-8 text-center text-neutral-500 text-sm">
            {search ? t("customers_empty_search") : t("customers_empty")}
          </div>
        ) : filtered.map((c) => {
          const carCount = allCars.filter((car) => car.customerId === c.id).length;
          return (
            <div key={c.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-neutral-100 font-semibold leading-tight">{c.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">{t("customers_cars")}: {carCount}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Link to={`/history/customer/${c.id}`}
                    className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-neutral-700 rounded transition-colors" title="View history">
                    <TbHistory className="w-4 h-4" />
                  </Link>
                  <button onClick={() => openEdit(c)} className="p-2 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("edit")}>
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => openDelete(c)} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("delete")}>
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {strToPhones(c.phone).filter(Boolean).length === 0 ? (
                  <span className="text-neutral-500 text-sm">-</span>
                ) : strToPhones(c.phone).filter(Boolean).map((p, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-neutral-800 px-2 py-1 rounded-full">
                    <HiPhone className="w-3 h-3 text-neutral-500" />{p}
                  </span>
                ))}
              </div>

              <p className="text-sm text-neutral-400 break-all">{c.email || "-"}</p>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
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
                      <button onClick={() => openEdit(c)} className="p-1.5 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("edit")}>
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
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-400 transition-colors cursor-pointer">
                  <HiPlus className="w-3.5 h-3.5" /> Add number
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {form.phones.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto] items-center gap-2">
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
              <button type="button" onClick={close} disabled={saving} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">{t("cancel")}</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />}
                {modal === "add" ? t("customers_add") : t("save")}
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
