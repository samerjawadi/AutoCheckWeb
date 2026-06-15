import { supabase } from "../config/axios";
export { calcTotal, calcPaid, calcBalance, payLabel, validators } from "../utils/finance";

const toCustomer = (r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email ?? "" });
const toCar      = (r) => ({ id: r.id, customerId: r.customer_id, plate: r.plate, vin: r.vin ?? "", manufacturer: r.manufacturer, model: r.model, description: r.description ?? "" });
const toSupplier = (r) => ({ id: r.id, name: r.name, type: r.type, phone: r.phone ?? "", notes: r.notes ?? "" });
const toJob      = (r) => ({ id: r.id, customerId: r.customer_id, carId: r.car_id, dateIn: r.date_in ?? "", dateOut: r.date_out ?? "", status: r.status, notes: r.notes ?? "", lines: r.lines ?? [], payments: r.payments ?? [] });

// ── Helpers ────────────────────────────────────────────────────────────────
const throwIfError = (error, context) => {
  if (error) {
    console.error(`[DB] ${context}:`, error.message);
    throw new Error(error.message);
  }
};

// ── CRUD ───────────────────────────────────────────────────────────────────
export const db = {
  customers: {
    getAll:   async ()       => { const { data, error } = await supabase.from("customers").select("*").order("name"); throwIfError(error, "customers.getAll"); return (data ?? []).map(toCustomer); },
    getById:  async (id)     => { const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle(); throwIfError(error, "customers.getById"); return data ? toCustomer(data) : null; },
    add:      async (item)   => { const { data, error } = await supabase.from("customers").insert({ name: item.name, phone: item.phone, email: item.email ?? "" }).select().single(); throwIfError(error, "customers.add"); return toCustomer(data); },
    update:   async (id, p)  => { const d = {}; if (p.name !== undefined) d.name = p.name; if (p.phone !== undefined) d.phone = p.phone; if (p.email !== undefined) d.email = p.email; const { error } = await supabase.from("customers").update(d).eq("id", id); throwIfError(error, "customers.update"); },
    delete:   async (id)     => { const { error } = await supabase.from("customers").delete().eq("id", id); throwIfError(error, "customers.delete"); },
  },

  cars: {
    getAll:   async ()       => { const { data, error } = await supabase.from("cars").select("*").order("plate"); throwIfError(error, "cars.getAll"); return (data ?? []).map(toCar); },
    getById:  async (id)     => { const { data, error } = await supabase.from("cars").select("*").eq("id", id).maybeSingle(); throwIfError(error, "cars.getById"); return data ? toCar(data) : null; },
    add:      async (item)   => { const { data, error } = await supabase.from("cars").insert({ customer_id: item.customerId, plate: item.plate, vin: item.vin ?? "", manufacturer: item.manufacturer, model: item.model, description: item.description ?? "" }).select().single(); throwIfError(error, "cars.add"); return toCar(data); },
    update:   async (id, p)  => { const d = {}; if (p.customerId !== undefined) d.customer_id = p.customerId; if (p.plate !== undefined) d.plate = p.plate; if (p.vin !== undefined) d.vin = p.vin; if (p.manufacturer !== undefined) d.manufacturer = p.manufacturer; if (p.model !== undefined) d.model = p.model; if (p.description !== undefined) d.description = p.description; const { error } = await supabase.from("cars").update(d).eq("id", id); throwIfError(error, "cars.update"); },
    delete:   async (id)     => { const { error } = await supabase.from("cars").delete().eq("id", id); throwIfError(error, "cars.delete"); },
  },

  suppliers: {
    getAll:   async ()       => { const { data, error } = await supabase.from("suppliers").select("*").order("name"); throwIfError(error, "suppliers.getAll"); return (data ?? []).map(toSupplier); },
    getById:  async (id)     => { const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).maybeSingle(); throwIfError(error, "suppliers.getById"); return data ? toSupplier(data) : null; },
    add:      async (item)   => { const { data, error } = await supabase.from("suppliers").insert({ name: item.name, type: item.type, phone: item.phone ?? "", notes: item.notes ?? "" }).select().single(); throwIfError(error, "suppliers.add"); return toSupplier(data); },
    update:   async (id, p)  => { const d = {}; if (p.name !== undefined) d.name = p.name; if (p.type !== undefined) d.type = p.type; if (p.phone !== undefined) d.phone = p.phone; if (p.notes !== undefined) d.notes = p.notes; const { error } = await supabase.from("suppliers").update(d).eq("id", id); throwIfError(error, "suppliers.update"); },
    delete:   async (id)     => { const { error } = await supabase.from("suppliers").delete().eq("id", id); throwIfError(error, "suppliers.delete"); },
  },

  jobs: {
    getAll:   async ()       => { const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false }); throwIfError(error, "jobs.getAll"); return (data ?? []).map(toJob); },
    getById:  async (id)     => { const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle(); throwIfError(error, "jobs.getById"); return data ? toJob(data) : null; },
    add:      async (item)   => { const { data, error } = await supabase.from("jobs").insert({ customer_id: item.customerId, car_id: item.carId, date_in: item.dateIn || null, date_out: item.dateOut || null, status: item.status, notes: item.notes ?? "", lines: item.lines ?? [], payments: item.payments ?? [] }).select().single(); throwIfError(error, "jobs.add"); return toJob(data); },
    update:   async (id, p)  => { const d = {}; if (p.customerId !== undefined) d.customer_id = p.customerId; if (p.carId !== undefined) d.car_id = p.carId; if (p.dateIn !== undefined) d.date_in = p.dateIn || null; if (p.dateOut !== undefined) d.date_out = p.dateOut || null; if (p.status !== undefined) d.status = p.status; if (p.notes !== undefined) d.notes = p.notes; if (p.lines !== undefined) d.lines = p.lines; if (p.payments !== undefined) d.payments = p.payments; const { error } = await supabase.from("jobs").update(d).eq("id", id); throwIfError(error, "jobs.update"); },
    delete:   async (id)     => { const { error } = await supabase.from("jobs").delete().eq("id", id); throwIfError(error, "jobs.delete"); },
  },
};

// ── Seed (only when DB is empty) ───────────────────────────────────────────
export async function seedIfEmpty() {
  const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
  if (count > 0) return;

  const c1 = await db.customers.add({ name: "James Carter",  phone: "+1 555 010 1234", email: "james.carter@email.com" });
  const c2 = await db.customers.add({ name: "Sofia Nguyen",  phone: "+1 555 020 5678", email: "sofia.n@email.com" });
  const c3 = await db.customers.add({ name: "Marcus Okafor", phone: "+1 555 030 9012", email: "" });

  const sAC = await db.suppliers.add({ name: "AutoCheck",        type: "Internal",       phone: "",               notes: "In-house work" });
  const sP1 = await db.suppliers.add({ name: "TunisAuto Parts",  type: "Parts Supplier", phone: "+216 71 100 200", notes: "Main parts wholesaler" });
  const sP2 = await db.suppliers.add({ name: "SpeedParts SARL",  type: "Parts Supplier", phone: "+216 71 300 400", notes: "Brakes & suspension specialist" });
  const sB1 = await db.suppliers.add({ name: "Carrosserie Slim", type: "Body Shop",       phone: "+216 98 111 222", notes: "Body & paint partner" });

  const car1 = await db.cars.add({ customerId: c1.id, plate: "ABC-1234", vin: "1HGCM82633A123456", manufacturer: "Toyota",   model: "Camry",   description: "White, 2021" });
  const car2 = await db.cars.add({ customerId: c1.id, plate: "XYZ-5678", vin: "",                  manufacturer: "Ford",     model: "F-150",   description: "Black pickup, 2019" });
  const car3 = await db.cars.add({ customerId: c2.id, plate: "LMN-4321", vin: "2T1BURHE0JC043821", manufacturer: "BMW",      model: "X5",      description: "Silver, 2022" });
  const car4 = await db.cars.add({ customerId: c3.id, plate: "QRS-9900", vin: "WBAJB0C51BC461987", manufacturer: "Mercedes", model: "C-Class", description: "Navy blue, 2020" });
  const car5 = await db.cars.add({ customerId: c2.id, plate: "DEF-7777", vin: "",                  manufacturer: "Honda",    model: "Civic",   description: "Red hatchback, 2018" });

  await db.jobs.add({ customerId: c1.id, carId: car1.id, dateIn: "2026-06-01", dateOut: "2026-06-02", status: "Done",        notes: "Express service.", lines: [{ id: "l1", description: "Oil & filter change", price: "55.00", supplierId: sP1.id }, { id: "l2", description: "Tyre rotation", price: "30.00", supplierId: sAC.id }], payments: [{ id: "p1", date: "2026-06-01", amount: "30.00", note: "Advance" }, { id: "p2", date: "2026-06-02", amount: "55.00", note: "Final" }] });
  await db.jobs.add({ customerId: c2.id, carId: car3.id, dateIn: "2026-06-10", dateOut: "",          status: "In Progress",  notes: "",          lines: [{ id: "l3", description: "Brake pad replacement", price: "180.00", supplierId: sP2.id }, { id: "l4", description: "Brake fluid flush", price: "45.00", supplierId: sAC.id }], payments: [{ id: "p3", date: "2026-06-10", amount: "100.00", note: "Advance" }] });
  await db.jobs.add({ customerId: c3.id, carId: car4.id, dateIn: "2026-06-15", dateOut: "",          status: "Pending",      notes: "Engine light on.", lines: [{ id: "l5", description: "Diagnostics scan", price: "75.00", supplierId: sAC.id }], payments: [] });
  await db.jobs.add({ customerId: c1.id, carId: car2.id, dateIn: "2026-05-20", dateOut: "2026-05-21",status: "Done",         notes: "",          lines: [{ id: "l6", description: "Air filter", price: "25.00", supplierId: sP1.id }, { id: "l7", description: "Cabin filter", price: "35.00", supplierId: sP1.id }, { id: "l8", description: "Wiper blades", price: "40.00", supplierId: sP1.id }], payments: [{ id: "p4", date: "2026-05-21", amount: "100.00", note: "Cash" }] });
  await db.jobs.add({ customerId: c2.id, carId: car5.id, dateIn: "2026-06-14", dateOut: "",          status: "Pending",      notes: "AC issue.", lines: [{ id: "l9", description: "AC regas", price: "120.00", supplierId: sAC.id }, { id: "l10", description: "AC inspection", price: "60.00", supplierId: sB1.id }], payments: [] });
}

