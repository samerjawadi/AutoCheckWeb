import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../services/localDB";

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const calcTotal = (lines)    => (lines ?? []).reduce((s, l) => s + (parseFloat(l.price) || 0), 0);
const calcPaid  = (payments) => (payments ?? []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

// Force white/print styles on this page only
const PRINT_STYLE = `
  html, body, #root {
    background: #fff !important;
    color: #111 !important;
    color-scheme: light !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @media print {
    html, body, #root { background: #fff !important; color: #111 !important; }
    .fiche-no-print { display: none !important; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

export default function Invoice() {
  const { jobId } = useParams();
  const [data, setData] = useState(null);

  // Override global dark theme for this page
  useEffect(() => {
    const prev = document.documentElement.style.colorScheme;
    document.documentElement.style.colorScheme = "light";
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    return () => {
      document.documentElement.style.colorScheme = prev;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const job      = await db.jobs.getById(jobId);
      if (!job) return;
      const customer = await db.customers.getById(job.customerId);
      const car      = (await db.cars.getAll()).find((c) => c.id === job.carId);
      setData({ job, customer, car });
    };
    load();
  }, [jobId]);

  useEffect(() => {
    if (data) {
      document.title = `Fiche Réparation — ${data.customer?.name ?? "Job"}`;
    }
  }, [data]);

  if (!data) return (
    <div style={{ padding: 40, fontFamily: "sans-serif", color: "#111", background: "#fff", minHeight: "100vh" }}>
      Chargement…
    </div>
  );

  const { job, customer, car } = data;
  const total   = calcTotal(job.lines);
  const paid    = calcPaid(job.payments);
  const balance = Math.max(0, total - paid);

  // Pad lines to at least 12 rows for the table
  const ROWS    = 12;
  const lines   = [...(job.lines ?? [])];
  while (lines.length < ROWS) lines.push(null);

  // Payments summary (advances)
  const advances = (job.payments ?? []).map((p) =>
    `${p.date}${p.note ? " — " + p.note : ""}: ${fmtNum(p.amount)} DT`
  ).join(" | ");

  return (
    <>
      <style>{PRINT_STYLE}</style>

      {/* ── Print button (screen only) ── */}
      <div className="fiche-no-print" style={{ padding: "16px 24px", background: "#111", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => window.print()}
          style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          🖨️ Imprimer / Enregistrer PDF
        </button>
      </div>

      {/* ── Fiche A4 ── */}
      <div id="fiche">

        {/* TOP COPY */}
        <FicheBody
          customer={customer} car={car} job={job}
          total={total} paid={paid} balance={balance}
          lines={lines} advances={advances} fmtNum={fmtNum}
          copy="Original"
        />

        {/* DIVIDER */}
        <div className="fiche-divider">✂ — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — —</div>

        {/* BOTTOM COPY */}
        <FicheBody
          customer={customer} car={car} job={job}
          total={total} paid={paid} balance={balance}
          lines={lines} advances={advances} fmtNum={fmtNum}
          copy="Copie client"
        />
      </div>
    </>
  );
}

function FicheBody({ customer, car, job, total, paid, balance, lines, advances, fmtNum, copy }) {
  return (
    <div className="fiche-copy">
      {/* Header row */}
      <div className="fiche-header">
        <div className="fiche-logo">
          <div className="fiche-brand"><span className="fiche-auto">Auto</span>.<span className="fiche-check">Check</span></div>
          <div className="fiche-addr">Rue Téboulba, Moknine, 5050</div>
          <div className="fiche-addr">96 066 335 / 54 326 862</div>
          <div className="fiche-addr">MF : 1625326/A</div>
        </div>
        <div className="fiche-title-block">
          <div className="fiche-title">FICHE DE RÉPARATION</div>
          <div className="fiche-copy-label">{copy}</div>
        </div>
      </div>

      {/* Client info */}
      <div className="fiche-client">
        <div className="fiche-row">
          <span className="fiche-label">Nom du Client :</span>
          <span className="fiche-value">{customer?.name ?? ""}</span>
          <span className="fiche-label">Tél :</span>
          <span className="fiche-value">{customer?.phone ?? ""}</span>
        </div>
        <div className="fiche-row">
          <span className="fiche-label">Voiture :</span>
          <span className="fiche-value">{car ? `${car.manufacturer} ${car.model} — ${car.plate}` : ""}</span>
          <span className="fiche-label">VIN :</span>
          <span className="fiche-value">{car?.vin ?? ""}</span>
        </div>
        <div className="fiche-row">
          <span className="fiche-label">Entrée le :</span>
          <span className="fiche-value">{job.dateIn ?? ""}</span>
          <span className="fiche-label">Promis le :</span>
          <span className="fiche-value">{job.dateOut ?? ""}</span>
        </div>
        {job.notes && (
          <div className="fiche-row">
            <span className="fiche-label">Observations :</span>
            <span className="fiche-value fiche-obs">{job.notes}</span>
          </div>
        )}
      </div>

      {/* Work table */}
      <table className="fiche-table">
        <thead>
          <tr>
            <th style={{ width: "55%" }}>Description des travaux</th>
            <th style={{ width: "15%" }}>Date</th>
            <th style={{ width: "15%" }}>Prix (DT)</th>
            <th style={{ width: "15%" }}>Qté</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <td className="fiche-td-desc">{line?.description ?? ""}</td>
              <td>{line ? (job.dateIn ?? "") : ""}</td>
              <td className="fiche-td-right">{line ? fmtNum(line.price) : ""}</td>
              <td className="fiche-td-right">{line ? "1" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="fiche-totals">
        <div className="fiche-total-row fiche-total-main">
          <span>Total TTC</span>
          <span className="fiche-amount">{fmtNum(total)} DT</span>
        </div>
        <div className="fiche-total-row">
          <span>Avance{(job.payments ?? []).length > 1 ? "s" : ""}</span>
          <span className="fiche-amount">{fmtNum(paid)} DT</span>
        </div>
        {advances && (
          <div className="fiche-total-row fiche-total-detail">
            <span style={{ fontStyle: "italic", fontSize: "0.75em", color: "#555" }}>{advances}</span>
          </div>
        )}
        <div className="fiche-total-row">
          <span>Payé</span>
          <span className="fiche-amount">{fmtNum(paid)} DT</span>
        </div>
        <div className={`fiche-total-row fiche-total-balance ${balance > 0 ? "fiche-unpaid" : "fiche-paid"}`}>
          <span>Reste à payer</span>
          <span className="fiche-amount">{fmtNum(balance)} DT</span>
        </div>
      </div>

      {/* Signature */}
      <div className="fiche-signatures">
        <div className="fiche-sig">
          <div className="fiche-sig-line" />
          <div className="fiche-sig-label">Signature client</div>
        </div>
        <div className="fiche-sig">
          <div className="fiche-sig-line" />
          <div className="fiche-sig-label">Cachet &amp; Signature garage</div>
        </div>
      </div>
    </div>
  );
}
