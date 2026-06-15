const KEYS = {
  customers:  "ac_customers",
  cars:       "ac_cars",
  jobs:       "ac_jobs",
  suppliers:  "ac_suppliers",
};

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const load = (key) => JSON.parse(localStorage.getItem(key) ?? "[]");
const persist = (key, data) => localStorage.setItem(key, JSON.stringify(data));

function makeCrud(key) {
  return {
    getAll: () => load(key),
    getById: (id) => load(key).find((r) => r.id === id) ?? null,
    add: (item) => {
      const record = { ...item, id: genId() };
      persist(key, [...load(key), record]);
      return record;
    },
    update: (id, patch) => {
      persist(
        key,
        load(key).map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    delete: (id) => {
      persist(key, load(key).filter((r) => r.id !== id));
    },
  };
}

export const db = {
  customers: makeCrud(KEYS.customers),
  cars:      makeCrud(KEYS.cars),
  jobs:      makeCrud(KEYS.jobs),
  suppliers: makeCrud(KEYS.suppliers),
};

export function seedIfEmpty() {
  if (load(KEYS.customers).length > 0) return;

  // ── Suppliers (AutoCheck must be first / default) ──
  const sAC  = db.suppliers.add({ name: "AutoCheck",        type: "Internal",      phone: "",              notes: "In-house work" });
  const sP1  = db.suppliers.add({ name: "TunisAuto Parts",  type: "Parts Supplier",phone: "+216 71 100 200", notes: "Main parts wholesaler" });
  const sP2  = db.suppliers.add({ name: "SpeedParts SARL",  type: "Parts Supplier",phone: "+216 71 300 400", notes: "Brakes & suspension specialist" });
  const sB1  = db.suppliers.add({ name: "Carrosserie Slim", type: "Body Shop",      phone: "+216 98 111 222", notes: "Body & paint partner" });

  const c1 = db.customers.add({ name: "James Carter",  phone: "+1 555 010 1234", email: "james.carter@email.com" });
  const c2 = db.customers.add({ name: "Sofia Nguyen",  phone: "+1 555 020 5678", email: "sofia.n@email.com" });
  const c3 = db.customers.add({ name: "Marcus Okafor", phone: "+1 555 030 9012", email: "" });

  db.cars.add({ customerId: c1.id, plate: "ABC-1234", vin: "1HGCM82633A123456", manufacturer: "Toyota",  model: "Camry",    description: "White, 2021, tinted windows" });
  db.cars.add({ customerId: c1.id, plate: "XYZ-5678", vin: "",                  manufacturer: "Ford",    model: "F-150",    description: "Black pickup, 2019" });
  const car3 = db.cars.add({ customerId: c2.id, plate: "LMN-4321", vin: "2T1BURHE0JC043821", manufacturer: "BMW",     model: "X5",       description: "Silver, 2022, panoramic roof" });
  const car4 = db.cars.add({ customerId: c3.id, plate: "QRS-9900", vin: "WBAJB0C51BC461987", manufacturer: "Mercedes",model: "C-Class",  description: "Navy blue, 2020" });
  const car5 = db.cars.add({ customerId: c2.id, plate: "DEF-7777", vin: "",                  manufacturer: "Honda",   model: "Civic",    description: "Red hatchback, 2018" });

  // need car1 + car2 refs — re-fetch by plate
  const allCars = db.cars.getAll();
  const car1 = allCars.find((c) => c.plate === "ABC-1234");
  const car2 = allCars.find((c) => c.plate === "XYZ-5678");

  db.jobs.add({
    customerId: c1.id, carId: car1.id,
    dateIn: "2026-06-01", dateOut: "2026-06-02", status: "Done",
    notes: "Customer requested express service.",
    lines: [
      { id: "l1", description: "Oil & filter change",   price: "55.00",  supplierId: sP1.id },
      { id: "l2", description: "Tyre rotation",         price: "30.00",  supplierId: sAC.id },
    ],
    payments: [
      { id: "p1", date: "2026-06-01", amount: "30.00", note: "Advance" },
      { id: "p2", date: "2026-06-02", amount: "55.00", note: "Final payment" },
    ],
  });

  db.jobs.add({
    customerId: c2.id, carId: car3.id,
    dateIn: "2026-06-10", dateOut: "", status: "In Progress",
    notes: "",
    lines: [
      { id: "l3", description: "Brake pad replacement (front)", price: "180.00", supplierId: sP2.id },
      { id: "l4", description: "Brake fluid flush",             price: "45.00",  supplierId: sAC.id },
    ],
    payments: [
      { id: "p3", date: "2026-06-10", amount: "100.00", note: "Advance" },
    ],
  });

  db.jobs.add({
    customerId: c3.id, carId: car4.id,
    dateIn: "2026-06-15", dateOut: "", status: "Pending",
    notes: "Engine light on — diagnostics needed.",
    lines: [
      { id: "l5", description: "Diagnostics scan", price: "75.00", supplierId: sAC.id },
    ],
    payments: [],
  });

  db.jobs.add({
    customerId: c1.id, carId: car2.id,
    dateIn: "2026-05-20", dateOut: "2026-05-21", status: "Done",
    notes: "",
    lines: [
      { id: "l6", description: "Air filter replacement",   price: "25.00", supplierId: sP1.id },
      { id: "l7", description: "Cabin filter replacement", price: "35.00", supplierId: sP1.id },
      { id: "l8", description: "Wiper blades",             price: "40.00", supplierId: sP1.id },
    ],
    payments: [
      { id: "p4", date: "2026-05-21", amount: "100.00", note: "Full payment — cash" },
    ],
  });

  db.jobs.add({
    customerId: c2.id, carId: car5.id,
    dateIn: "2026-06-14", dateOut: "", status: "Pending",
    notes: "AC not cooling properly.",
    lines: [
      { id: "l9",  description: "AC regas",             price: "120.00", supplierId: sAC.id },
      { id: "l10", description: "AC system inspection", price: "60.00",  supplierId: sB1.id },
    ],
    payments: [],
  });
}
