/**
 * Import AutoCheck.db → Supabase
 * Clears: customers, cars, suppliers (keeps jobs empty, keeps profiles/auth)
 * Run: node scripts/import-to-supabase.mjs
 */
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ── Config ─────────────────────────────────────────────────────────────────
// Read env from .env.local
const envRaw = readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envRaw.split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const sqlite   = new Database('src/assets/AutoCheck.db', { readonly: true });

const cleanPhone = (phones) =>
  (phones ?? '').replace(/\/$/, '').split('/').map(p => p.trim()).filter(Boolean).join(' / ');

// Batch insert helper
async function batchInsert(table, rows, batchSize = 50) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`[${table}] batch ${i}–${i + batchSize}: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length} rows`);
  }
  console.log();
}

async function main() {
  console.log('\n🚀 AutoCheck DB → Supabase import\n');

  // ── 1. Clear existing data (order matters for FK constraints) ─────────────
  console.log('🗑  Clearing existing data...');
  for (const table of ['jobs', 'cars', 'customers', 'suppliers']) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) console.warn(`  Warning clearing ${table}:`, error.message);
  }
  console.log('  Done.\n');

  // ── 2. Import Suppliers ───────────────────────────────────────────────────
  const supplierTypeMap = {
    'CarPartsSupplier':   'Parts Supplier',
    'DiagnosticService':  'Other',
    'Handyman':           'Other',
    'LocalGarageStock':   'Parts Supplier',
    'Specialist':         'Other',
    'BodyShop':           'Body Shop',
    'body_shop':          'Body Shop',
    'Internal':           'Internal',
  };

  const mapType = (raw) => {
    const types = (raw ?? '').split('/').map(s => s.trim()).filter(Boolean);
    if (types.includes('BodyShop') || types.includes('body_shop')) return 'Body Shop';
    if (types.some(t => t.includes('Parts') || t === 'LocalGarageStock')) return 'Parts Supplier';
    if (types.includes('Internal') || types[0] === 'auto_check') return 'Internal';
    return 'Other';
  };

  const sqliteSuppliers = sqlite.prepare('SELECT * FROM Suppliers').all();
  const supplierRows = sqliteSuppliers.map(s => ({
    name:  s.FullName ?? '',
    type:  mapType(s.Type),
    phone: cleanPhone(s.Phones),
    notes: [s.Address, s.Matricul].filter(Boolean).join(' — '),
  }));

  console.log(`📦 Inserting ${supplierRows.length} suppliers...`);
  await batchInsert('suppliers', supplierRows);

  // Fetch back with IDs for later reference (not needed for jobs in this import)
  const { data: insertedSuppliers } = await supabase.from('suppliers').select('id, name');

  // ── 3. Import Customers ───────────────────────────────────────────────────
  const sqliteCustomers = sqlite.prepare('SELECT * FROM Customers').all();
  const customerInserts = sqliteCustomers.map(c => ({
    name:  (c.FullName ?? '').trim(),
    phone: cleanPhone(c.Phones),
    email: c.Email ?? '',
  }));

  console.log(`👤 Inserting ${customerInserts.length} customers...`);
  await batchInsert('customers', customerInserts);

  // Fetch back with IDs, matched by name+phone
  const { data: insertedCustomers } = await supabase.from('customers').select('id, name, phone');

  // Build lookup: "name|phone" → supabase id
  const customerLookup = {};
  for (const c of insertedCustomers) {
    customerLookup[`${c.name}|${c.phone}`] = c.id;
  }

  // ── 4. Import Cars ────────────────────────────────────────────────────────
  // Build SQLite carId → customerId (supabase uuid) map
  const carToCustomer = {};
  for (const c of sqliteCustomers) {
    const ids = (c.CarId ?? '').split('/').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const phone  = cleanPhone(c.Phones);
    const name   = (c.FullName ?? '').trim();
    const supId  = customerLookup[`${name}|${phone}`];
    for (const id of ids) {
      if (supId) carToCustomer[id] = supId;
    }
  }

  const sqliteCars = sqlite.prepare('SELECT * FROM Cars').all();
  const carInserts = sqliteCars.map(car => ({
    customer_id:  carToCustomer[car.CarId] ?? null,
    plate:        (car.LicensePlate ?? '').trim(),
    vin:          (car.Vin ?? '').trim(),
    manufacturer: (car.Maker ?? '').trim(),
    model:        (car.Model ?? '').trim(),
    description:  car.Color ? `Color: ${car.Color}` : '',
  }));

  console.log(`🚗 Inserting ${carInserts.length} cars...`);
  await batchInsert('cars', carInserts);

  console.log('\n✅ Import complete!\n');
  console.log(`  Suppliers: ${supplierRows.length}`);
  console.log(`  Customers: ${customerInserts.length}`);
  console.log(`  Cars:      ${carInserts.length}`);
  console.log('\nJobs: not imported (empty in source DB)');
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
