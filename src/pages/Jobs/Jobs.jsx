import { useState, useEffect } from "react";
import { HiPlus, HiPencil, HiTrash, HiEye, HiCash } from "react-icons/hi";
import { db } from "../../services/localDB";
import Modal from "../../components/Modal";

const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];

const STATUS_STYLE = {
  Pending:     "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  "In Progress": "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  Done:        "bg-green-500/10 text-green-400 border border-green-500/30",
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

const calcTotal   = (lines)    => (lines ?? []).reduce((sum, l) => sum + (parseFloat(l.price) || 0), 0);
const calcPaid    = (payments) => (payments ?? []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
const calcBalance = (lines, payments) => calcTotal(lines) - calcPaid(payments);

const PAY_STYLE = {
  Paid:    "bg-green-500/10 text-green-400 border border-green-500/30",
  Partial: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  Unpaid:  "bg-red-500/10 text-red-400 border border-red-500/30",
};

const payLabel = (lines, payments) => {
  const total = calcTotal(lines);
  const paid  = calcPaid(payments);
  if (total === 0)    return "Paid";
  if (paid <= 0)      return "Unpaid";
  if (paid >= total)  return "Paid";
  return "Partial";
};

const fmt = (n) =>
  n.toLocaleString("fr-TN", { style: "currency", currency: "TND" });

export default function Jobs() {
  const [jobs, setJobs]           = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cars, setCars]           = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("All");
  const [dateFilter, setDate]       = useState("All");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(EMPTY_JOB);
  const [editId, setEditId]       = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [viewTarget, setViewTarget]       = useState(null);
  const [payModal, setPayModal]           = useState(false);
  const [payJobId, setPayJobId]           = useState(null);
  const [payForm, setPayForm]             = useState({ date: new Date().toISOString().slice(0,10), amount: "", note: "" });

  const reload = () => {
    setJobs(db.jobs.getAll());
    setCustomers(db.customers.getAll());
    setCars(db.cars.getAll());
    setSuppliers(db.suppliers.getAll());
  };
  useEffect(reload, []);

  const customerName   = (id) => customers.find((c) => c.id === id)?.name ?? "Unknown";
  const supplierName   = (id) => suppliers.find((s) => s.id === id)?.name ?? "AutoCheck";
  const defaultSupplier = () => suppliers.find((s) => s.name === "AutoCheck")?.id ?? (suppliers[0]?.id ?? "");
  const carLabel     = (id) => {
    const car = cars.find((c) => c.id === id);
    return car ? `${car.manufacturer} ${car.model} — ${car.plate}` : "Unknown";
  };
  const carsForCustomer = (cid) => cars.filter((c) => c.customerId === cid);

  /* ── open modals ── */
  const openAdd = () => { setForm(EMPTY_JOB); setModal("add"); };

  const openEdit = (job) => {
    const custExists = customers.some((c) => c.id === job.customerId);
    const carExists  = cars.some((c) => c.id === job.carId);
    setForm({
      customerId: custExists ? job.customerId : "",
      carId:      carExists  ? job.carId      : "",
      dateIn:     job.dateIn  ?? "",
      dateOut:    job.dateOut ?? "",
      status:     job.status  ?? "Pending",
      notes:      job.notes   ?? "",
      lines:      job.lines   ?? [],
    });
    setEditId(job.id);
    setModal("edit");
  };

  const openDelete = (job) => { setDeleteTarget(job); setModal("delete"); };
  const openView   = (job) => { setViewTarget(job);   setModal("view");   };
  const openPay    = (job) => {
    setPayJobId(job.id);
    setPayForm({ date: new Date().toISOString().slice(0,10), amount: "", note: "" });
    setPayModal(true);
  };

  const close = () => {
    setModal(null);
    setDeleteTarget(null);
    setEditId(null);
    setViewTarget(null);
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    const job = db.jobs.getById(payJobId);
    const payments = [...(job.payments ?? []), { id: genLineId(), ...payForm }];
    db.jobs.update(payJobId, { payments });
    reload();
    setPayModal(false);
    // refresh viewTarget if open
    if (viewTarget?.id === payJobId) setViewTarget({ ...job, payments });
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
  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, lines: form.lines.filter((l) => l.description.trim()) };
    if (modal === "add") db.jobs.add(payload);
    else db.jobs.update(editId, payload);
    reload();
    close();
  };

  const handleDelete = () => {
    db.jobs.delete(deleteTarget.id);
    reload();
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
    const matchDate =
      dateFilter === "All"       ? true :
      dateFilter === "Today"     ? j.dateIn === today :
      dateFilter === "This Week" ? j.dateIn >= weekStart && j.dateIn <= today :
      /* Custom range */
        (!dateFrom || j.dateIn >= dateFrom) && (!dateTo || j.dateIn <= dateTo);
    return matchSearch && matchStatus && matchDate;
  });

  /* ── form modal content ── */
  const FormModal = (
    <Modal title={modal === "add" ? "New Job" : "Edit Job"} onClose={close}>
      {customers.length === 0 ? (
        <p className="text-neutral-400 text-sm">Add a customer first before creating a job.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Customer + Car */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="customerId">Customer *</label>
              <select id="customerId" name="customerId" required value={form.customerId}
                onChange={handleField} className={inputCls}>
                <option value="" disabled>Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="carId">Car *</label>
              <select id="carId" name="carId" required value={form.carId}
                onChange={handleField} className={inputCls}
                disabled={!form.customerId}>
                <option value="" disabled>
                  {form.customerId ? "Select car" : "Pick customer first"}
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
              <label className={labelCls} htmlFor="dateIn">Date In *</label>
              <input id="dateIn" name="dateIn" type="date" required
                value={form.dateIn} onChange={handleField} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="dateOut">Date Out</label>
              <input id="dateOut" name="dateOut" type="date"
                value={form.dateOut} onChange={handleField} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status}
                onChange={handleField} className={inputCls}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Job lines */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-neutral-200">Job Lines</span>
              <button type="button" onClick={addLine}
                className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors cursor-pointer font-medium">
                <HiPlus className="w-4 h-4" /> Add line
              </button>
            </div>
            {form.lines.length === 0 && (
              <p className="text-sm text-neutral-600 italic py-3 text-center border border-dashed border-neutral-700 rounded-lg">No lines yet — click "Add line".</p>
            )}
            <div className="flex flex-col gap-3">
              {form.lines.map((line, idx) => (
                <div key={line.id} className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Line {idx + 1}</span>
                    <button type="button" onClick={() => removeLine(line.id)}
                      className="p-1 text-neutral-600 hover:text-red-400 transition-colors cursor-pointer rounded">
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <label className={labelCls}>What was done</label>
                    <textarea
                      value={line.description}
                      rows={2}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      className={`${inputCls} resize-none`}
                      placeholder="e.g. Replaced front brake pads and bled the system..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className={labelCls}>Supplier</label>
                      <select
                        value={line.supplierId}
                        onChange={(e) => updateLine(line.id, "supplierId", e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— None —</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>Price (TND)</label>
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
                      <p className={labelCls}>Line total</p>
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
            <label className={labelCls} htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={2}
              value={form.notes} onChange={handleField}
              className={`${inputCls} resize-none`}
              placeholder="Internal notes..." />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={close}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
              {modal === "add" ? "Create Job" : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );

  return (
    <div className="page-enter p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Jobs</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{jobs.length} total</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <HiPlus className="w-4 h-4" /> New Job
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <input type="text" placeholder="Search customer, car..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} max-w-xs`} />

        {/* Status pills */}
        <div className="flex items-center gap-1.5">
          {["All", ...STATUS_OPTIONS].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === s
                  ? "bg-violet-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* Date pills */}
        <div className="flex items-center gap-1.5">
          {["All", "Today", "This Week", "Custom"].map((d) => (
            <button key={d} onClick={() => { setDate(d); if (d !== "Custom") { setDateFrom(""); setDateTo(""); } }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                dateFilter === d
                  ? "bg-orange-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
              }`}>
              {d}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {dateFilter === "Custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" />
            <span className="text-neutral-600 text-xs">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" />
          </div>
        )}

        {/* Active count */}
        <span className="ml-auto text-xs text-neutral-500">
          {filtered.length} / {jobs.length} jobs
        </span>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 text-left">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Car</th>
              <th className="px-4 py-3 font-medium">Date In</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-right">Paid</th>
              <th className="px-4 py-3 font-medium text-right">Balance</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
                  {search || statusFilter !== "All" || dateFilter !== "All"
                    ? "No jobs match your filters."
                    : "No jobs yet. Create one to get started."}
                </td>
              </tr>
            )}
            {filtered.map((job) => (
              <tr key={job.id}
                className="border-b border-neutral-800/50 hover:bg-neutral-800/40 transition-colors">
                <td className="px-4 py-3 text-neutral-100 font-medium">{customerName(job.customerId)}</td>
                <td className="px-4 py-3 text-neutral-300">{carLabel(job.carId)}</td>
                <td className="px-4 py-3 text-neutral-400">{job.dateIn || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_STYLE[job.status] ?? ""}`}>
                      {job.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PAY_STYLE[payLabel(job.lines, job.payments)]}`}>
                      {payLabel(job.lines, job.payments)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-neutral-200 font-mono">{fmt(calcTotal(job.lines ?? []))}</td>
                <td className="px-4 py-3 text-right text-green-400 font-mono">{fmt(calcPaid(job.payments))}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${
                  calcBalance(job.lines ?? [], job.payments) <= 0 ? "text-green-400" : "text-orange-400"
                }`}>
                  {fmt(Math.max(0, calcBalance(job.lines ?? [], job.payments)))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openView(job)}
                      className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title="View">
                      <HiEye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openPay(job)}
                      className="p-1.5 text-neutral-400 hover:text-green-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title="Record Payment">
                      <HiCash className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(job)}
                      className="p-1.5 text-neutral-400 hover:text-violet-400 hover:bg-neutral-700 rounded transition-colors cursor-pointer" title="Edit">
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDelete(job)}
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
      {(modal === "add" || modal === "edit") && FormModal}

      {/* View modal */}
      {modal === "view" && viewTarget && (
        <Modal title="Job Details" onClose={close}>
          <div className="flex flex-col gap-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={labelCls}>Customer</p>
                <p className="text-neutral-100 font-medium">{customerName(viewTarget.customerId)}</p>
              </div>
              <div>
                <p className={labelCls}>Car</p>
                <p className="text-neutral-100 font-medium">{carLabel(viewTarget.carId)}</p>
              </div>
              <div>
                <p className={labelCls}>Date In</p>
                <p className="text-neutral-300">{viewTarget.dateIn || "—"}</p>
              </div>
              <div>
                <p className={labelCls}>Date Out</p>
                <p className="text-neutral-300">{viewTarget.dateOut || "—"}</p>
              </div>
            </div>
            <div>
              <p className={labelCls}>Status</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[viewTarget.status] ?? ""}`}>
                {viewTarget.status}
              </span>
            </div>
            {viewTarget.notes && (
              <div>
                <p className={labelCls}>Notes</p>
                <p className="text-neutral-300">{viewTarget.notes}</p>
              </div>
            )}
            {(viewTarget.lines ?? []).length > 0 && (
              <div>
                <p className={`${labelCls} mb-2`}>Job Lines</p>
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
                <p className={labelCls}>Payments</p>
                <button onClick={() => openPay(viewTarget)}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors cursor-pointer">
                  <HiPlus className="w-3.5 h-3.5" /> Record payment
                </button>
              </div>
              {(viewTarget.payments ?? []).length === 0 ? (
                <p className="text-xs text-neutral-600 italic">No payments recorded yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5 bg-neutral-800/50 rounded-lg p-3">
                  {viewTarget.payments.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="text-neutral-300">{p.date}</span>
                        {p.note && <span className="text-neutral-500 ml-2 text-xs">{p.note}</span>}
                      </div>
                      <span className="font-mono text-green-400 font-semibold">{fmt(parseFloat(p.amount) || 0)}</span>
                    </div>
                  ))}
                  <div className="border-t border-neutral-700 mt-2 pt-2 space-y-1">
                    <div className="flex justify-between text-sm text-neutral-400">
                      <span>Total paid</span>
                      <span className="font-mono text-green-400 font-semibold">{fmt(calcPaid(viewTarget.payments))}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-neutral-200">Balance due</span>
                      <span className={`font-mono ${
                        calcBalance(viewTarget.lines, viewTarget.payments) <= 0 ? "text-green-400" : "text-orange-400"
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
        <Modal title="Record Payment" onClose={() => setPayModal(false)}>
          <form onSubmit={handlePaySubmit} className="flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="payDate">Date *</label>
              <input id="payDate" type="date" required
                value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="payAmount">Amount (TND) *</label>
              <input id="payAmount" type="number" required min="0.001" step="0.001"
                value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                className={inputCls} placeholder="0.000" />
            </div>
            <div>
              <label className={labelCls} htmlFor="payNote">Note</label>
              <input id="payNote" type="text"
                value={payForm.note} onChange={(e) => setPayForm((p) => ({ ...p, note: e.target.value }))}
                className={inputCls} placeholder="e.g. Advance payment, Cash..." />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setPayModal(false)}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors cursor-pointer">
                Record Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete modal */}
      {modal === "delete" && deleteTarget && (
        <Modal title="Delete Job" onClose={close}>
          <p className="text-neutral-300 text-sm">
            Are you sure you want to delete the job for{" "}
            <span className="font-semibold text-neutral-100">{customerName(deleteTarget.customerId)}</span>?
            This cannot be undone.
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
