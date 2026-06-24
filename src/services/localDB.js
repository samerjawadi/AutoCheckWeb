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

const isMissingTableError = (error) => {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code.startsWith("PGRST") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
};

let isThemeSettingsTableAvailable = true;

// ── CRUD ───────────────────────────────────────────────────────────────────
export const db = {
  themeSettings: {
    getGlobal: async () => {
      if (!isThemeSettingsTableAvailable) return null;

      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "theme")
        .maybeSingle();

      if (error) {
        if (isMissingTableError(error)) {
          isThemeSettingsTableAvailable = false;
          console.warn("[DB] app_settings table not found. Falling back to local theme only.");
          return null;
        }
        throwIfError(error, "themeSettings.getGlobal");
      }

      return data?.value ?? null;
    },

    saveGlobal: async (theme) => {
      if (!isThemeSettingsTableAvailable) return false;

      const payload = {
        dark: Boolean(theme?.dark),
        accent: typeof theme?.accent === "string" ? theme.accent : "yellow",
        accentLevel: Number.isFinite(Number(theme?.accentLevel)) ? Number(theme.accentLevel) : 666,
      };

      const { error } = await supabase
        .from("app_settings")
        .upsert(
          {
            key: "theme",
            value: payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) {
        if (isMissingTableError(error)) {
          isThemeSettingsTableAvailable = false;
          console.warn("[DB] app_settings table not found. Global theme update skipped.");
          return false;
        }
        throwIfError(error, "themeSettings.saveGlobal");
      }

      return true;
    },
  },

  users: {
    getAll:   async ()       => { const { data, error } = await supabase.from("users").select("*").order("name"); throwIfError(error, "users.getAll"); return data ?? []; },
    getById:  async (id)     => { const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle(); throwIfError(error, "users.getById"); return data ?? null; },
    getByEmail: async (email) => { const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle(); throwIfError(error, "users.getByEmail"); return data ?? null; },
    add:      async (item)   => { const { data, error } = await supabase.from("users").insert({ name: item.name, email: item.email, password: item.password, role: item.role ?? "user" }).select().single(); throwIfError(error, "users.add"); return data; },
    update:   async (id, p)  => { const d = {}; if (p.name !== undefined) d.name = p.name; if (p.email !== undefined) d.email = p.email; if (p.role !== undefined) d.role = p.role; const { error } = await supabase.from("users").update(d).eq("id", id); throwIfError(error, "users.update"); },
    delete:   async (id)     => { const { error } = await supabase.from("users").delete().eq("id", id); throwIfError(error, "users.delete"); },
  },

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

  // Add default admin user
  try {
    const existingAdmin = await supabase.from("users").select("*").eq("email", "admin@autocheck.local").single();
    if (!existingAdmin.data) {
      // Simple hash of "admin123"
      const hashedPassword = Math.abs(
        Array.from("admin123").reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
      ).toString(36);
      
      await supabase.from("users").insert([{
        name: "Admin",
        email: "admin@autocheck.local",
        password: hashedPassword,
        role: "admin"
      }]);
    }
  } catch (e) {
    console.warn("[Seed] Could not add default admin user:", e.message);
  }

  const sAC = await db.suppliers.add({ name: "AutoCheck",         type: "Internal",       phone: "",               notes: "In-house work" });
  const sP1 = await db.suppliers.add({ name: "TunisAuto Parts",   type: "Parts Supplier", phone: "+216 71 100 200", notes: "Main parts wholesaler" });
  const sP2 = await db.suppliers.add({ name: "SpeedParts SARL",   type: "Parts Supplier", phone: "+216 71 300 400", notes: "Brakes & suspension specialist" });
  const sB1 = await db.suppliers.add({ name: "Carrosserie Slim",  type: "Body Shop",       phone: "+216 98 111 222", notes: "Body & paint partner" });
  const sP3 = await db.suppliers.add({ name: "Pneus Express",     type: "Parts Supplier", phone: "+216 73 500 600", notes: "Tyres & wheels" });
  const sE1 = await db.suppliers.add({ name: "ElectroGarage",     type: "Other",           phone: "+216 74 200 300", notes: "Electrical & diagnostics" });

  // ── Customers ──────────────────────────────────────────────────────────
  const c1 = await db.customers.add({ name: "James Carter",    phone: "+216 55 010 123", email: "james.carter@email.com" });
  const c2 = await db.customers.add({ name: "Sofia Nguyen",    phone: "+216 55 020 456", email: "sofia.n@email.com" });
  const c3 = await db.customers.add({ name: "Marcus Okafor",   phone: "+216 55 030 789", email: "" });
  const c4 = await db.customers.add({ name: "Leila Mansouri",  phone: "+216 55 040 111", email: "l.mansouri@gmail.com" });
  const c5 = await db.customers.add({ name: "Karim Belhadj",   phone: "+216 55 050 222", email: "" });
  const c6 = await db.customers.add({ name: "Amira Trabelsi",  phone: "+216 55 060 333", email: "amira.t@outlook.com" });
  const c7 = await db.customers.add({ name: "Nizar Ben Salem", phone: "+216 55 070 444", email: "" });

  // ── Cars ──────────────────────────────────────────────────────────────
  const car1  = await db.cars.add({ customerId: c1.id, plate: "ABC-1234", vin: "1HGCM82633A123456", manufacturer: "Toyota",       model: "Camry",      description: "White, 2021" });
  const car2  = await db.cars.add({ customerId: c1.id, plate: "XYZ-5678", vin: "",                  manufacturer: "Ford",         model: "F-150",      description: "Black pickup, 2019" });
  const car3  = await db.cars.add({ customerId: c2.id, plate: "LMN-4321", vin: "2T1BURHE0JC043821", manufacturer: "BMW",          model: "X5",         description: "Silver, 2022" });
  const car4  = await db.cars.add({ customerId: c3.id, plate: "QRS-9900", vin: "WBAJB0C51BC461987", manufacturer: "Mercedes-Benz",model: "C-Class",    description: "Navy blue, 2020" });
  const car5  = await db.cars.add({ customerId: c2.id, plate: "DEF-7777", vin: "",                  manufacturer: "Honda",        model: "Civic",      description: "Red hatchback, 2018" });
  const car6  = await db.cars.add({ customerId: c4.id, plate: "TUN-4400", vin: "VF1AA000551234567", manufacturer: "Renault",      model: "Clio",       description: "White, 2020" });
  const car7  = await db.cars.add({ customerId: c4.id, plate: "TUN-5511", vin: "",                  manufacturer: "Peugeot",      model: "208",        description: "Grey, 2023" });
  const car8  = await db.cars.add({ customerId: c5.id, plate: "SFA-2233", vin: "",                  manufacturer: "Volkswagen",   model: "Golf",       description: "Black, 2019" });
  const car9  = await db.cars.add({ customerId: c6.id, plate: "MON-6677", vin: "TMBJB9NE5H0123456", manufacturer: "Škoda",        model: "Octavia",    description: "Silver, 2021" });
  const car10 = await db.cars.add({ customerId: c7.id, plate: "BIZ-8899", vin: "",                  manufacturer: "Hyundai",      model: "Tucson",     description: "Dark grey, 2022" });
  const car11 = await db.cars.add({ customerId: c5.id, plate: "SFA-3344", vin: "",                  manufacturer: "Kia",          model: "Sportage",   description: "White, 2020" });
  const car12 = await db.cars.add({ customerId: c7.id, plate: "BIZ-9900", vin: "",                  manufacturer: "Chery",        model: "Tiggo 4",    description: "Red, 2023" });

  // ── Jobs ──────────────────────────────────────────────────────────────
  // June 2026
  await db.jobs.add({ customerId: c1.id, carId: car1.id,  dateIn: "2026-06-01", dateOut: "2026-06-02", status: "Done",         notes: "Express service.", lines: [{ id: "j1l1", description: "Oil & filter change", price: "55.000", supplierId: sP1.id }, { id: "j1l2", description: "Tyre rotation", price: "30.000", supplierId: sAC.id }], payments: [{ id: "j1p1", date: "2026-06-01", amount: "30.000", note: "Advance" }, { id: "j1p2", date: "2026-06-02", amount: "55.000", note: "Final" }] });
  await db.jobs.add({ customerId: c2.id, carId: car3.id,  dateIn: "2026-06-10", dateOut: "",           status: "In Progress",  notes: "",          lines: [{ id: "j2l1", description: "Brake pad replacement (front)", price: "180.000", supplierId: sP2.id }, { id: "j2l2", description: "Brake fluid flush", price: "45.000", supplierId: sAC.id }], payments: [{ id: "j2p1", date: "2026-06-10", amount: "100.000", note: "Advance" }] });
  await db.jobs.add({ customerId: c3.id, carId: car4.id,  dateIn: "2026-06-15", dateOut: "",           status: "Pending",      notes: "Engine light on.", lines: [{ id: "j3l1", description: "Diagnostics scan", price: "75.000", supplierId: sAC.id }], payments: [] });
  await db.jobs.add({ customerId: c1.id, carId: car2.id,  dateIn: "2026-05-20", dateOut: "2026-05-21", status: "Done",         notes: "",          lines: [{ id: "j4l1", description: "Air filter replacement", price: "25.000", supplierId: sP1.id }, { id: "j4l2", description: "Cabin filter replacement", price: "35.000", supplierId: sP1.id }, { id: "j4l3", description: "Wiper blades", price: "40.000", supplierId: sP1.id }], payments: [{ id: "j4p1", date: "2026-05-21", amount: "100.000", note: "Cash" }] });
  await db.jobs.add({ customerId: c2.id, carId: car5.id,  dateIn: "2026-06-14", dateOut: "",           status: "Pending",      notes: "AC not cooling.", lines: [{ id: "j5l1", description: "AC regas", price: "120.000", supplierId: sAC.id }, { id: "j5l2", description: "AC system inspection", price: "60.000", supplierId: sB1.id }], payments: [] });
  await db.jobs.add({ customerId: c4.id, carId: car6.id,  dateIn: "2026-06-12", dateOut: "2026-06-13", status: "Done",         notes: "",          lines: [{ id: "j6l1", description: "Full service 60,000 km", price: "220.000", supplierId: sP1.id }, { id: "j6l2", description: "Spark plugs replacement", price: "90.000", supplierId: sP1.id }], payments: [{ id: "j6p1", date: "2026-06-13", amount: "310.000", note: "Full payment" }] });
  await db.jobs.add({ customerId: c5.id, carId: car8.id,  dateIn: "2026-06-11", dateOut: "2026-06-11", status: "Done",         notes: "",          lines: [{ id: "j7l1", description: "Front suspension repair", price: "350.000", supplierId: sP2.id }, { id: "j7l2", description: "Labour", price: "80.000", supplierId: sAC.id }], payments: [{ id: "j7p1", date: "2026-06-11", amount: "200.000", note: "Advance" }] });
  await db.jobs.add({ customerId: c6.id, carId: car9.id,  dateIn: "2026-06-16", dateOut: "",           status: "Pending",      notes: "Strange noise from rear axle.", lines: [{ id: "j8l1", description: "Rear axle inspection", price: "60.000", supplierId: sAC.id }], payments: [] });
  await db.jobs.add({ customerId: c7.id, carId: car10.id, dateIn: "2026-06-15", dateOut: "",           status: "In Progress",  notes: "",          lines: [{ id: "j9l1", description: "Battery replacement", price: "180.000", supplierId: sP1.id }, { id: "j9l2", description: "Alternator check", price: "40.000", supplierId: sE1.id }], payments: [{ id: "j9p1", date: "2026-06-15", amount: "100.000", note: "Advance" }] });
  await db.jobs.add({ customerId: c4.id, carId: car7.id,  dateIn: "2026-06-08", dateOut: "2026-06-09", status: "Done",         notes: "",          lines: [{ id: "j10l1", description: "4 tyres replacement", price: "520.000", supplierId: sP3.id }, { id: "j10l2", description: "Wheel alignment", price: "40.000", supplierId: sAC.id }], payments: [{ id: "j10p1", date: "2026-06-08", amount: "300.000", note: "Advance" }, { id: "j10p2", date: "2026-06-09", amount: "260.000", note: "Final" }] });
  await db.jobs.add({ customerId: c5.id, carId: car11.id, dateIn: "2026-06-05", dateOut: "2026-06-06", status: "Done",         notes: "",          lines: [{ id: "j11l1", description: "Clutch replacement", price: "680.000", supplierId: sP2.id }, { id: "j11l2", description: "Gearbox oil", price: "45.000", supplierId: sP1.id }], payments: [{ id: "j11p1", date: "2026-06-06", amount: "725.000", note: "Full payment" }] });
  await db.jobs.add({ customerId: c7.id, carId: car12.id, dateIn: "2026-06-03", dateOut: "2026-06-03", status: "Done",         notes: "Windshield chip.", lines: [{ id: "j12l1", description: "Windshield chip repair", price: "95.000", supplierId: sB1.id }], payments: [{ id: "j12p1", date: "2026-06-03", amount: "95.000", note: "Cash" }] });

  // May 2026
  await db.jobs.add({ customerId: c3.id, carId: car4.id,  dateIn: "2026-05-15", dateOut: "2026-05-16", status: "Done",         notes: "",          lines: [{ id: "j13l1", description: "Oil change", price: "45.000", supplierId: sP1.id }], payments: [{ id: "j13p1", date: "2026-05-16", amount: "45.000", note: "Cash" }] });
  await db.jobs.add({ customerId: c6.id, carId: car9.id,  dateIn: "2026-05-28", dateOut: "2026-05-29", status: "Done",         notes: "",          lines: [{ id: "j14l1", description: "Full bodywork repair", price: "1200.000", supplierId: sB1.id }], payments: [{ id: "j14p1", date: "2026-05-28", amount: "600.000", note: "Advance" }, { id: "j14p2", date: "2026-05-29", amount: "600.000", note: "Final" }] });
  await db.jobs.add({ customerId: c1.id, carId: car1.id,  dateIn: "2026-05-10", dateOut: "2026-05-10", status: "Done",         notes: "",          lines: [{ id: "j15l1", description: "Brake pads front + rear", price: "280.000", supplierId: sP2.id }], payments: [{ id: "j15p1", date: "2026-05-10", amount: "280.000", note: "Card" }] });

  // April 2026
  await db.jobs.add({ customerId: c2.id, carId: car3.id,  dateIn: "2026-04-20", dateOut: "2026-04-22", status: "Done",         notes: "",          lines: [{ id: "j16l1", description: "Engine full service", price: "450.000", supplierId: sP1.id }, { id: "j16l2", description: "Cooling system flush", price: "75.000", supplierId: sAC.id }], payments: [{ id: "j16p1", date: "2026-04-20", amount: "250.000", note: "Advance" }, { id: "j16p2", date: "2026-04-22", amount: "275.000", note: "Final" }] });
  await db.jobs.add({ customerId: c4.id, carId: car6.id,  dateIn: "2026-04-14", dateOut: "2026-04-14", status: "Done",         notes: "",          lines: [{ id: "j17l1", description: "Oil change + filter", price: "55.000", supplierId: sP1.id }], payments: [{ id: "j17p1", date: "2026-04-14", amount: "55.000", note: "Cash" }] });

  // March 2026
  await db.jobs.add({ customerId: c7.id, carId: car10.id, dateIn: "2026-03-05", dateOut: "2026-03-07", status: "Done",         notes: "",          lines: [{ id: "j18l1", description: "Full electrical diagnosis", price: "120.000", supplierId: sE1.id }, { id: "j18l2", description: "Headlight replacement", price: "90.000", supplierId: sP1.id }], payments: [{ id: "j18p1", date: "2026-03-07", amount: "210.000", note: "Cash" }] });
  await db.jobs.add({ customerId: c5.id, carId: car8.id,  dateIn: "2026-03-18", dateOut: "2026-03-19", status: "Done",         notes: "",          lines: [{ id: "j19l1", description: "Timing belt + water pump", price: "580.000", supplierId: sP2.id }], payments: [{ id: "j19p1", date: "2026-03-18", amount: "300.000", note: "Advance" }, { id: "j19p2", date: "2026-03-19", amount: "280.000", note: "Final" }] });
}

