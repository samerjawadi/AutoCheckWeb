import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { HiPlus, HiPencil, HiTrash, HiEye, HiCash, HiPrinter } from "react-icons/hi";
import { db } from "../../services/localDB";
import { calcTotal, calcPaid, calcBalance, payLabel } from "../../utils/finance";
import LoadingState from "../../components/LoadingState";
import Modal from "../../components/Modal";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];

const STATUS_STYLE = {
  Pending: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  "In Progress": "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  Done: "bg-green-500/10 text-green-400 border border-green-500/30",
};

const genLineId = () => Math.random().toString(36).slice(2);

const EMPTY_JOB = {
  customerId: "",
  carId: "",
  dateIn: new Date().toISOString().slice(0, 10),
  dateOut: "",
  status: "Pending",
  notes: "",
  lines: [],
};

const EMPTY_LINE = { id: "", description: "", price: "", supplierId: "" };

const inputCls =
  "w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";
const labelCls = "block text-xs font-medium text-neutral-400 mb-1";

const PAY_STYLE = {
  Paid: "bg-green-500/10 text-green-400 border border-green-500/30",
  Partial: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  Unpaid: "bg-red-500/10 text-red-400 border border-red-500/30",
};

const fmt = (n) =>
  n.toLocaleString("fr-TN", { style: "currency", currency: "TND" });

export default function Jobs() {
  const { t } = useLanguage();
  const [printJob, setPrintJob] = useState(null); // job to print

  const tStatus = (s) => {
    if (s === "Pending") return t("status_pending");
    if (s === "In Progress") return t("status_in_progress");
    if (s === "Done") return t("status_done");
    return s;
  };

  const tPay = (s) => {
    if (s === "Paid") return t("pay_paid");
    if (s === "Partial") return t("pay_partial");
    if (s === "Unpaid") return t("pay_unpaid");
    return s;
  };
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cars, setCars] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState("All");
  const [payFilter, setPay] = useState("All");
  const [dateFilter, setDate] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_JOB);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [payModal, setPayModal] = useState(false);
  const [payJobId, setPayJobId] = useState(null);
  const [payEditId, setPayEditId] = useState(null); // null = new, string = editing
  const [payForm, setPayForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  const reload = async (showSpinner = false) => {
    const start = Date.now();
    try {
      setJobs(await db.jobs.getAll());
      setCustomers(await db.customers.getAll());
      setCars(await db.cars.getAll());
      setSuppliers(await db.suppliers.getAll());
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

  const customerName = (id) => customers.find((c) => c.id === id)?.name ?? "Unknown";
  const supplierName = (id) => suppliers.find((s) => s.id === id)?.name ?? "AutoCheck";
  const defaultSupplier = () => suppliers.find((s) => s.name === "AutoCheck")?.id ?? (suppliers[0]?.id ?? "");
  const carLabel = (id) => {
    const car = cars.find((c) => c.id === id);
    return car ? `${car.manufacturer} ${car.model} — ${car.plate}` : "Unknown";
  };
  const carsForCustomer = (cid) => cars.filter((c) => c.customerId === cid);

  /* ── open modals ── */
  const openAdd = () => { setForm(EMPTY_JOB); setModal("add"); };

  const openEdit = (job) => {
    const custExists = customers.some((c) => c.id === job.customerId);
    const carExists = cars.some((c) => c.id === job.carId);
    setForm({
      customerId: custExists ? job.customerId : "",
      carId: carExists ? job.carId : "",
      dateIn: job.dateIn ?? "",
      dateOut: job.dateOut ?? "",
      status: job.status ?? "Pending",
      notes: job.notes ?? "",
      lines: job.lines ?? [],
    });
    setEditId(job.id);
    setModal("edit");
  };

  const openDelete = (job) => { setDeleteTarget(job); setModal("delete"); };
  const openView = (job) => { setViewTarget(job); setModal("view"); };
  const openPay = (job) => {
    setPayJobId(job.id);
    setPayEditId(null);
    setPayForm({ date: new Date().toISOString().slice(0, 10), amount: "", note: "" });
    setPayModal(true);
  };

  const openEditPay = (job, payment) => {
    setPayJobId(job.id);
    setPayEditId(payment.id);
    setPayForm({ date: payment.date, amount: payment.amount, note: payment.note ?? "" });
    setPayModal(true);
  };

  const deletePayment = async (job, paymentId) => {
    const payments = (job.payments ?? []).filter((p) => p.id !== paymentId);
    await db.jobs.update(job.id, { payments });
    await reload();
    if (viewTarget?.id === job.id) setViewTarget(await db.jobs.getById(job.id));
  };

  const close = () => {
    setModal(null);
    setDeleteTarget(null);
    setEditId(null);
    setViewTarget(null);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert(t("pay_amount") + ": must be greater than 0");
      return;
    }
    const job = await db.jobs.getById(payJobId);
    const existing = job.payments ?? [];
    const payments = payEditId
      ? existing.map((p) => p.id === payEditId ? { ...p, ...payForm } : p)
      : [...existing, { id: genLineId(), ...payForm }];
    await db.jobs.update(payJobId, { payments });
    await reload();
    setPayModal(false);
    if (viewTarget?.id === payJobId) setViewTarget(await db.jobs.getById(payJobId));
  };

  /* ── form helpers ── */
  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // reset car when customer changes
      ...(name === "customerId" ? { carId: "" } : {}),
    }));
  };

  /* ── lines helpers ── */
  const addLine = () =>
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...EMPTY_LINE, id: genLineId(), supplierId: defaultSupplier() }],
    }));

  const updateLine = (id, field, value) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    }));

  const removeLine = (id) =>
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));

  /* ── submit / delete ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (form.dateOut && form.dateIn && form.dateOut < form.dateIn) {
      alert(t("jobs_date_in") + " / " + t("jobs_date_out") + ": date out cannot be before date in");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, lines: form.lines.filter((l) => l.description.trim()) };
      if (modal === "add") await db.jobs.add(payload);
      else await db.jobs.update(editId, payload);
      await reload();
      close();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    await db.jobs.delete(deleteTarget.id);
    await reload();
    close();
  };

  /* ── filter ── */
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchSearch =
      customerName(j.customerId).toLowerCase().includes(q) ||
      carLabel(j.carId).toLowerCase().includes(q) ||
      (j.status ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || j.status === statusFilter;
    const matchPay = payFilter === "All" || payLabel(j.lines, j.payments) === payFilter;
    const matchDate =
      dateFilter === "All" ? true :
        dateFilter === "Today" ? j.dateIn === today :
          dateFilter === "This Week" ? j.dateIn >= weekStart && j.dateIn <= today :
            /* Custom range */
            (!dateFrom || j.dateIn >= dateFrom) && (!dateTo || j.dateIn <= dateTo);
    return matchSearch && matchStatus && matchPay && matchDate;
  });

  /* ── form modal content ── */
  const FormModal = (
    <Modal title={modal === "add" ? t("jobs_new") : t("jobs_edit")} onClose={close}>
      {customers.length === 0 ? (
        <p className="text-neutral-400 text-sm">{t("jobs_no_customers")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Customer + Car */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="customerId">{t("jobs_customer")} *</label>
              <select id="customerId" name="customerId" required value={form.customerId}
                onChange={handleField} className={inputCls}>
                <option value="" disabled>{t("jobs_select_customer")}</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="carId">{t("jobs_car")} *</label>
              <select id="carId" name="carId" required value={form.carId}
                onChange={handleField} className={inputCls}
                disabled={!form.customerId}>
                <option value="" disabled>
                  {form.customerId ? t("jobs_car") : t("jobs_pick_customer")}
                </option>
                {carsForCustomer(form.customerId).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.manufacturer} {c.model} — {c.plate}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates + Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls} htmlFor="dateIn">{t("jobs_date_in")} *</label>
              <input id="dateIn" name="dateIn" type="date" required
                value={form.dateIn} onChange={handleField} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="dateOut">{t("jobs_date_out")}</label>
              <input id="dateOut" name="dateOut" type="date"
                value={form.dateOut} onChange={handleField} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="status">{t("status")}</label>
              <select id="status" name="status" value={form.status}
                onChange={handleField} className={inputCls}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{tStatus(s)}</option>)}
              </select>
            </div>
          </div>

          {/* Job lines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-neutral-200">{t("jobs_lines")}</span>
              <button type="button" onClick={addLine}
                className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors cursor-pointer font-medium">
                <HiPlus className="w-4 h-4" /> {t("jobs_add_line")}
              </button>
            </div>
            {form.lines.length === 0 && (
              <p className="text-sm text-neutral-600 italic py-3 text-center border border-dashed border-neutral-700 rounded-lg">{t("jobs_no_lines")}</p>
            )}
            <div className="flex flex-col gap-3">
              {form.lines.map((line, idx) => (
                <div key={line.id} className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t("jobs_line_n", { n: idx + 1 })}</span>
                    <button type="button" onClick={() => removeLine(line.id)}
                      className="p-1 text-neutral-600 hover:text-red-400 transition-colors cursor-pointer rounded">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className={labelCls}>{t("jobs_what_done")}</label>
                    <textarea
                      value={line.description}
                      rows={2}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      className={`${inputCls} resize-none`}
                      placeholder={t("jobs_what_done_ph")}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className={labelCls}>{t("jobs_supplier")}</label>
                      <select
                        value={line.supplierId}
                        onChange={(e) => updateLine(line.id, "supplierId", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">{t("none")}</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>{t("jobs_price")}</label>
                      <input
                        value={line.price}
                        onChange={(e) => updateLine(line.id, "price", e.target.value)}
                        className={inputCls}
                        placeholder="0.000"
                        type="number"
                        min="0"
                        step="0.001"
                      />
                    </div>
                    <div className="text-right shrink-0">
                      <p className={labelCls}>{t("jobs_line_total")}</p>
                      <p className="text-neutral-100 font-mono font-semibold text-sm">{fmt(parseFloat(line.price) || 0)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {form.lines.length > 0 && (
              <div className="flex justify-end mt-3 px-1 text-base font-bold text-neutral-100">
                Total: <span className="ml-2 font-mono text-violet-300">{fmt(calcTotal(form.lines))}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls} htmlFor="notes">{t("notes")}</label>
            <textarea id="notes" name="notes" rows={2}
              value={form.notes} onChange={handleField}
              className={`${inputCls} resize-none`}
              placeholder={t("notes")} />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={close} disabled={submitting}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">
              {t("cancel")}
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors cursor-pointer">
              {submitting ? t("loading") : (modal === "add" ? t("jobs_new") : t("save"))}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );

  // Keep filters visible; show loader inside table while loading

  return (
    <div className="page-enter p-3 md:p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">{t("jobs_title")}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{jobs.length} total</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <HiPlus className="w-4 h-4" /> {t("jobs_new")}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 overflow-x-auto pb-1">
        {/* Search */}
        <input type="text" placeholder={t("jobs_search")}
          value={search} onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} max-w-xs`} />

        {/* Status pills */}
        <div className="flex items-center gap-1.5">
          {[{ key: "All", label: t("period_all") }, ...STATUS_OPTIONS.map(s => ({ key: s, label: tStatus(s) }))].map(({ key, label }) => (
            <button key={key} onClick={() => setStatus(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${statusFilter === key
                ? "bg-violet-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
                }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Pay pills */}
        <div className="flex items-center gap-1.5">
          {[{ key: "All", label: t("period_all") }, { key: "Paid", label: t("pay_paid") }, { key: "Partial", label: t("pay_partial") }, { key: "Unpaid", label: t("pay_unpaid") }].map(({ key, label }) => (
            <button key={key} onClick={() => setPay(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${payFilter === key
                ? "bg-green-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
                }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Date pills */}
        <div className="flex items-center gap-1.5">
          {[{ key: "All", label: t("period_all") }, { key: "Today", label: t("period_today") }, { key: "This Week", label: t("period_week") }, { key: "Custom", label: t("period_custom") }].map(({ key, label }) => (
            <button key={key} onClick={() => { setDate(key); if (key !== "Custom") { setDateFrom(""); setDateTo(""); } }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${dateFilter === key
                ? "bg-orange-600 text-white"
                : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
                }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {dateFilter === "Custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" />
            <span className="text-neutral-600 text-xs">{t("date_from_to")}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" />
          </div>
        )}

        {/* Active count */}
        <span className="ml-auto text-xs text-neutral-500">
          {filtered.length} / {jobs.length} {t("jobs_title").toLowerCase()}
        </span>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 text-left">
              <th className="px-4 py-3 font-medium">{t("jobs_customer")}</th>
              <th className="px-4 py-3 font-medium">{t("jobs_car")}</th>
              <th className="px-4 py-3 font-medium">{t("jobs_date_in")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("total")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("jobs_paid")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("jobs_balance")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center">
                  <LoadingState inline label={t("loading")} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
                  {search || statusFilter !== "All" || dateFilter !== "All"
                    ? t("jobs_empty_filter")
                    : t("jobs_empty")}
                </td>
              </tr>
            ) : filtered.map((job) => (
              <tr key={job.id}
                className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-4 py-3 text-neutral-100 font-medium">{customerName(job.customerId)}</td>
                <td className="px-4 py-3 text-neutral-300">{carLabel(job.carId)}</td>
                <td className="px-4 py-3 text-neutral-400">{job.dateIn || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_STYLE[job.status] ?? ""}`}>
                      {tStatus(job.status)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PAY_STYLE[payLabel(job.lines, job.payments)]}`}>
                      {tPay(payLabel(job.lines, job.payments))}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-neutral-200 font-mono">{fmt(calcTotal(job.lines ?? []))}</td>
                <td className="px-4 py-3 text-right text-green-400 font-mono">{fmt(calcPaid(job.payments))}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${calcBalance(job.lines ?? [], job.payments) <= 0 ? "text-green-400" : "text-orange-400"
                  }`}>
                  {fmt(Math.max(0, calcBalance(job.lines ?? [], job.payments)))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openView(job)}
                      className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("view")}>
                      <HiEye className="w-4 h-4" />
                    </button>
                    <button onClick={async () => {
                      const customer = await db.customers.getById(job.customerId);
                      const cars = await db.cars.getAll();
                      const car = cars.find((c) => c.id === job.carId);
                      setPrintJob({ job, customer, car });
                    }}
                      className="p-1.5 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("jobs_print_sheet")}>
                      <HiPrinter className="w-4 h-4" />
                    </button>
                    <button onClick={() => openPay(job)}
                      className="p-1.5 text-neutral-400 hover:text-green-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("record_payment")}>
                      <HiCash className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(job)}
                      className="p-1.5 text-neutral-400 hover:text-violet-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("edit")}>
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDelete(job)}
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title={t("delete")}>
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
      {(modal === "add" || modal === "edit") && FormModal}

      {/* View modal */}
      {modal === "view" && viewTarget && (
        <Modal title={t("jobs_details")} onClose={close}>
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={labelCls}>{t("jobs_customer")}</p>
                <p className="text-neutral-100 font-medium">{customerName(viewTarget.customerId)}</p>
              </div>
              <div>
                <p className={labelCls}>{t("jobs_car")}</p>
                <p className="text-neutral-100 font-medium">{carLabel(viewTarget.carId)}</p>
              </div>
              <div>
                <p className={labelCls}>{t("jobs_date_in")}</p>
                <p className="text-neutral-300">{viewTarget.dateIn || "—"}</p>
              </div>
              <div>
                <p className={labelCls}>{t("jobs_date_out")}</p>
                <p className="text-neutral-300">{viewTarget.dateOut || "—"}</p>
              </div>
            </div>
            <div>
              <p className={labelCls}>{t("status")}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[viewTarget.status] ?? ""}`}>
                {tStatus(viewTarget.status)}
              </span>
            </div>
            {viewTarget.notes && (
              <div>
                <p className={labelCls}>{t("notes")}</p>
                <p className="text-neutral-300">{viewTarget.notes}</p>
              </div>
            )}
            {(viewTarget.lines ?? []).length > 0 && (
              <div>
                <p className={`${labelCls} mb-2`}>{t("jobs_lines")}</p>
                <div className="flex flex-col gap-1.5 bg-neutral-800/50 rounded-lg p-3">
                  {viewTarget.lines.map((l) => (
                    <div key={l.id} className="flex justify-between items-start gap-2 text-neutral-300 py-1">
                      <div className="flex-1">
                        <p>{l.description}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{supplierName(l.supplierId)}</p>
                      </div>
                      <span className="font-mono text-neutral-100 shrink-0">{fmt(parseFloat(l.price) || 0)}</span>
                    </div>
                  ))}
                  <div className="border-t border-neutral-700 mt-2 pt-2 flex justify-between font-semibold text-neutral-100">
                    <span>Total</span>
                    <span className="font-mono">{fmt(calcTotal(viewTarget.lines))}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={labelCls}>{t("jobs_payments")}</p>
                <button onClick={() => openPay(viewTarget)}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors cursor-pointer">
                  <HiPlus className="w-3.5 h-3.5" /> {t("jobs_record_pay")}
                </button>
              </div>
              {(viewTarget.payments ?? []).length === 0 ? (
                <p className="text-xs text-neutral-600 italic">{t("jobs_no_payments")}</p>
              ) : (
                <div className="flex flex-col gap-1.5 bg-neutral-800/50 rounded-lg p-3">
                  {viewTarget.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-neutral-300">{p.date}</span>
                        {p.note && <span className="text-neutral-500 ml-2 text-xs">{p.note}</span>}
                      </div>
                      <span className="font-mono text-green-400 font-semibold shrink-0">{fmt(parseFloat(p.amount) || 0)}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => openEditPay(viewTarget, p)}
                          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors cursor-pointer rounded">
                          <HiPencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deletePayment(viewTarget, p.id)}
                          className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer rounded">
                          <HiTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-neutral-700 mt-2 pt-2 space-y-1">
                    <div className="flex justify-between text-sm text-neutral-400">
                      <span>{t("jobs_total_paid")}</span>
                      <span className="font-mono text-green-400 font-semibold">{fmt(calcPaid(viewTarget.payments))}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-neutral-200">{t("jobs_balance_due")}</span>
                      <span className={`font-mono ${calcBalance(viewTarget.lines, viewTarget.payments) <= 0 ? "text-green-400" : "text-orange-400"
                        }`}>
                        {fmt(Math.max(0, calcBalance(viewTarget.lines, viewTarget.payments)))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment modal */}
      {payModal && (
        <Modal title={payEditId ? t("jobs_edit_payment") : t("record_payment")} onClose={() => setPayModal(false)}>
          <form onSubmit={handlePaySubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="payDate">{t("date")} *</label>
              <input id="payDate" type="date" required
                value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="payAmount">{t("pay_amount")} *</label>
              <input id="payAmount" type="number" required min="0.001" step="0.001"
                value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                className={inputCls} placeholder="0.000" />
            </div>
            <div>
              <label className={labelCls} htmlFor="payNote">{t("pay_note")}</label>
              <input id="payNote" type="text"
                value={payForm.note} onChange={(e) => setPayForm((p) => ({ ...p, note: e.target.value }))}
                className={inputCls} placeholder={t("pay_note_ph")} />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setPayModal(false)}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">
                {t("cancel")}
              </button>
              <button type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
                {payEditId ? t("save") : t("record_payment")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete modal */}
      {modal === "delete" && deleteTarget && (
        <Modal title={t("jobs_delete")} onClose={close}>
          <p className="text-neutral-300 text-sm">
            {t("jobs_delete_msg", { name: "" }).split(customerName(deleteTarget.customerId))[0]}
            <span className="font-semibold text-neutral-100">{customerName(deleteTarget.customerId)}</span>
            {t("jobs_delete_msg", { name: "" }).split(customerName(deleteTarget.customerId))[1]}
          </p>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={close}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">
              {t("cancel")}
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
              {t("delete")}
            </button>
          </div>
        </Modal>
      )}

      {/* Print portal — renders fiche and triggers print */}
      {printJob && createPortal(
        <PrintFiche data={printJob} onDone={() => setPrintJob(null)} />,
        document.body
      )}
    </div>
  );
}

// ── Print Fiche component ──────────────────────────────────────────────────
const fmtNum = (n) =>
  Number(n || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function FicheBody({
  copy,
  customer,
  car,
  job,
  lines,
  total,
  paid,
  balance,
  advances,
}) {
  return (
    <div className="fiche-copy">
      <div className="fiche-header">
        <div className="fiche-logo">
          <div className="fiche-brand"><span className="fiche-auto">Auto</span>.<span className="fiche-check">Check</span></div>
          <div className="fiche-addr">Rue Téboulba, Moknine, 5050</div>
          <div className="fiche-addr">96 066 335 / 54 326 862 &nbsp;|&nbsp; MF : 1625326/A</div>
        </div>
        <div className="fiche-title-block">
          <div className="fiche-title">FICHE DE RÉPARATION</div>
          <div className="fiche-copy-label">{copy}</div>
        </div>
      </div>
      <div className="fiche-client">
        <div className="fiche-row"><span className="fiche-label">Nom du Client :</span><span className="fiche-value">{customer?.name ?? ""}</span><span className="fiche-label">Tél :</span><span className="fiche-value">{customer?.phone ?? ""}</span></div>
        <div className="fiche-row"><span className="fiche-label">Voiture :</span><span className="fiche-value">{car ? `${car.manufacturer} ${car.model} — ${car.plate}` : ""}</span><span className="fiche-label">VIN :</span><span className="fiche-value">{car?.vin ?? ""}</span></div>
        <div className="fiche-row"><span className="fiche-label">Entrée le :</span><span className="fiche-value">{job.dateIn ?? ""}</span><span className="fiche-label">Promis le :</span><span className="fiche-value">{job.dateOut ?? ""}</span></div>
        {job.notes && <div className="fiche-row"><span className="fiche-label">Observations :</span><span className="fiche-value fiche-obs">{job.notes}</span></div>}
      </div>
      <table className="fiche-table">
        <thead><tr><th style={{ width: "55%" }}>Description des travaux</th><th style={{ width: "15%" }}>Date</th><th style={{ width: "15%" }}>Prix (DT)</th><th style={{ width: "15%" }}>Qté</th></tr></thead>
        <tbody>{lines.map((line, i) => (
          <tr key={i}>
            <td className="fiche-td-desc">{line?.description ?? ""}</td>
            <td>{line ? (job.dateIn ?? "") : ""}</td>
            <td className="fiche-td-right">{line ? fmtNum(line.price) : ""}</td>
            <td className="fiche-td-right">{line ? "1" : ""}</td>
          </tr>
        ))}</tbody>
      </table>
      <div className="fiche-totals">
        <div className="fiche-total-row fiche-total-main"><span>Total TTC</span><span className="fiche-amount">{fmtNum(total)} DT</span></div>
        <div className="fiche-total-row"><span>Avance{(job.payments ?? []).length > 1 ? "s" : ""}</span><span className="fiche-amount">{fmtNum(paid)} DT</span></div>
        {advances && <div className="fiche-total-row fiche-total-detail"><span style={{ fontStyle: "italic", fontSize: "0.75em", color: "#555" }}>{advances}</span></div>}
        <div className="fiche-total-row"><span>Payé</span><span className="fiche-amount">{fmtNum(paid)} DT</span></div>
        <div className={`fiche-total-row ${balance > 0 ? "fiche-unpaid" : "fiche-paid"}`}><span>Reste à payer</span><span className="fiche-amount">{fmtNum(balance)} DT</span></div>
      </div>
      <div className="fiche-signatures">
        <div className="fiche-sig"><div className="fiche-sig-line" /><div className="fiche-sig-label">Signature client</div></div>
        <div className="fiche-sig"><div className="fiche-sig-line" /><div className="fiche-sig-label">Cachet &amp; Signature garage</div></div>
      </div>
    </div>
  );
}
function PrintFiche({ data, onDone }) {
  const { job, customer, car } = data;

  const total = calcTotal(job.lines);
  const paid = calcPaid(job.payments);
  const balance = Math.max(0, total - paid);

  const ROWS = 12;
  const lines = [...(job.lines ?? [])];
  while (lines.length < ROWS) lines.push(null);

  const advances = (job.payments ?? [])
    .map(
      (p) =>
        `${p.date}${p.note ? " — " + p.note : ""}: ${fmtNum(p.amount)} DT`
    )
    .join(" | ");

  useEffect(() => {
    const t = setTimeout(() => {
      window.print();
      setTimeout(onDone, 200);
    }, 300);

    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      id="fiche"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 9999,
        background: "#fff",
        width: "210mm",
      }}
    >
      <style>{`
        @media print {
          body > *:not(#fiche) { display: none !important; }
          #fiche { position: static !important; width: 100% !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <FicheBody
        copy="Original"
        customer={customer}
        car={car}
        job={job}
        lines={lines}
        total={total}
        paid={paid}
        balance={balance}
        advances={advances}
      />

      <FicheBody
        copy="Copie client"
        customer={customer}
        car={car}
        job={job}
        lines={lines}
        total={total}
        paid={paid}
        balance={balance}
        advances={advances}
      />
    </div>
  );
}