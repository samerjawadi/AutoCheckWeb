import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../services/localDB";

const fmt = (n) =>
  Number(n || 0).toLocaleString("fr-TN", { style: "currency", currency: "TND" });

const calcTotal = (lines)    => (lines ?? []).reduce((s, l) => s + (parseFloat(l.price) || 0), 0);
const calcPaid  = (payments) => (payments ?? []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

export default function Invoice() {
  const { jobId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const job      = db.jobs.getById(jobId);
    if (!job) return;
    const customer = db.customers.getById(job.customerId);
    const car      = db.cars.getAll().find((c) => c.id === job.carId);
    setData({ job, customer, car });
  }, [jobId]);

  useEffect(() => {
    if (data) document.title = `Facture — ${data.customer?.name ?? "Job"}`;
  }, [data]);

  if (!data) return <p style={{ padding: 40, fontFamily: "sans-serif" }}>Chargement…</p>;

  const { job, customer, car } = data;
  const total   = calcTotal(job.lines);
  const paid    = calcPaid(job.payments);
  const balance = total - paid;
  const invoiceNumber = `FAC-${job.id.toUpperCase().slice(-6)}`;
  const today   = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div id="invoice">
      {/* Print button — screen only */}
      <div className="inv-print-btn">
        <button onClick={() => window.print()}>🖨️ Imprimer / Enregistrer PDF</button>
      </div>

      {/* Header */}
      <div className="inv-header">
        <div>
          <h1 className="inv-brand"><span className="inv-auto">Auto</span>Check</h1>
          <p className="inv-sub">Garage &amp; Services Automobiles</p>
        </div>
        <div className="inv-meta">
          <h2>FACTURE</h2>
          <p><strong>N°</strong> {invoiceNumber}</p>
          <p><strong>Date :</strong> {today}</p>
          {job.dateIn  && <p><strong>Entrée :</strong>  {job.dateIn}</p>}
          {job.dateOut && <p><strong>Sortie :</strong>  {job.dateOut}</p>}
        </div>
      </div>

      <hr className="inv-divider" />

      {/* Client + Vehicle */}
      <div className="inv-info">
        <div className="inv-box">
          <h3>Client</h3>
          <p><strong>{customer?.name ?? "—"}</strong></p>
          {customer?.phone && <p>{customer.phone}</p>}
          {customer?.email && <p>{customer.email}</p>}
        </div>
        {car && (
          <div className="inv-box">
            <h3>Véhicule</h3>
            <p><strong>{car.manufacturer} {car.model}</strong></p>
            {car.plate       && <p>Immatriculation : <strong>{car.plate}</strong></p>}
            {car.vin         && <p>VIN : {car.vin}</p>}
            {car.description && <p style={{ color: "#666", fontSize: 12 }}>{car.description}</p>}
          </div>
        )}
      </div>

      {/* Jobs table — description + price only */}
      <table className="inv-table">
        <thead>
          <tr>
            <th style={{ width: "80%" }}>Désignation / Travaux effectués</th>
            <th className="inv-th-price">Montant</th>
          </tr>
        </thead>
        <tbody>
          {(job.lines ?? []).length === 0 && (
            <tr><td colSpan={2} style={{ color: "#999", fontStyle: "italic" }}>Aucune prestation</td></tr>
          )}
          {(job.lines ?? []).map((line, i) => (
            <tr key={line.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td>{line.description || "—"}</td>
              <td className="inv-amount">{fmt(line.price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="inv-total-row">
            <td><strong>Total TTC</strong></td>
            <td className="inv-amount"><strong>{fmt(total)}</strong></td>
          </tr>
          {paid > 0 && (
            <tr>
              <td>Avance(s) reçue(s)</td>
              <td className="inv-amount" style={{ color: "#16a34a" }}>- {fmt(paid)}</td>
            </tr>
          )}
          <tr className={balance > 0 ? "inv-unpaid" : "inv-paid"}>
            <td><strong>Reste à payer</strong></td>
            <td className="inv-amount"><strong>{fmt(Math.max(0, balance))}</strong></td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {job.notes && (
        <div className="inv-notes">
          <h3>Observations</h3>
          <p>{job.notes}</p>
        </div>
      )}

      <div className="inv-footer">
        <p>Merci de votre confiance — AutoCheck Garage &amp; Services</p>
      </div>
    </div>
  );
}
