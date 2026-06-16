/**
 * Generate Supabase-compatible CSVs from AutoCheck.db
 * Columns match exactly what Supabase expects for each table.
 * Run: node scripts/generate-supabase-csv.mjs
 */
import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';
import { randomUUID } from 'crypto';

const sqlite = new Database('src/assets/AutoCheck.db', { readonly: true });

const cleanPhone = (phones) =>
  (phones ?? '').replace(/\/$/, '').split('/').map(p => p.trim()).filter(Boolean).join(' / ');

const toCsv = (rows, cols) => {
  const header = cols.join(',');
  const lines = rows.map(r =>
    cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  return '\uFEFF' + [header, ...lines].join('\n'); // BOM for Excel UTF-8
};

// ── Suppliers ──────────────────────────────────────────────────────────────
const mapType = (raw) => {
  const types = (raw ?? '').split('/').map(s => s.trim()).filter(Boolean);
  if (types.some(t => t === 'BodyShop' || t === 'body_shop')) return 'Body Shop';
  if (types.some(t => t.includes('Parts') || t === 'LocalGarageStock')) return 'Parts Supplier';
  if (types.includes('Internal')) return 'Internal';
  if (types[0]?.toLowerCase().includes('auto_check')) return 'Internal';
  return 'Other';
};

const sqliteSuppliers = sqlite.prepare('SELECT * FROM Suppliers').all();
const supplierUuids = {};
const supplierRows = sqliteSuppliers.map(s => {
  const id = randomUUID();
  supplierUuids[s.SupplierId] = id;
  return {
    id,
    name:  (s.FullName ?? '').trim(),
    type:  mapType(s.Type),
    phone: cleanPhone(s.Phones),
    notes: [s.Address, s.Matricul].filter(Boolean).join(' — '),
  };
});
writeFileSync('src/assets/supabase_suppliers.csv', toCsv(supplierRows, ['id','name','type','phone','notes']));
console.log(`✅ suppliers: ${supplierRows.length} rows → src/assets/supabase_suppliers.csv`);

// ── Customers ──────────────────────────────────────────────────────────────
const sqliteCustomers = sqlite.prepare('SELECT * FROM Customers').all();
const customerUuids = {};
const customerRows = sqliteCustomers.map(c => {
  const id = randomUUID();
  customerUuids[c.CustomerId] = id;
  return {
    id,
    name:  (c.FullName ?? '').trim(),
    phone: cleanPhone(c.Phones),
    email: (c.Email ?? '').trim(),
  };
});
writeFileSync('src/assets/supabase_customers.csv', toCsv(customerRows, ['id','name','phone','email']));
console.log(`✅ customers: ${customerRows.length} rows → src/assets/supabase_customers.csv`);

// ── Cars (need customer_id from the mapping above) ─────────────────────────
// Build carId → customer uuid map
const carToCustomerId = {};
for (const c of sqliteCustomers) {
  const ids = (c.CarId ?? '').split('/').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  for (const id of ids) {
    carToCustomerId[id] = customerUuids[c.CustomerId];
  }
}

const sqliteCars = sqlite.prepare('SELECT * FROM Cars').all();
let unmapped = 0;
const carRows = sqliteCars.map(car => {
  const customerId = carToCustomerId[car.CarId] ?? '';
  if (!customerId) unmapped++;
  return {
    id:           randomUUID(),
    customer_id:  customerId,
    plate:        (car.LicensePlate ?? '').trim(),
    vin:          (car.Vin ?? '').trim(),
    manufacturer: (car.Maker ?? '').trim(),
    model:        (car.Model ?? '').trim(),
    description:  car.Color ? `Couleur: ${car.Color}` : '',
  };
});
writeFileSync('src/assets/supabase_cars.csv', toCsv(carRows, ['id','customer_id','plate','vin','manufacturer','model','description']));
console.log(`✅ cars: ${carRows.length} rows → src/assets/supabase_cars.csv`);
if (unmapped > 0) console.log(`   ⚠ ${unmapped} cars had no matching customer (customer_id will be empty)`);

console.log('\n📋 Import order in Supabase Table Editor:');
console.log('   1. suppliers  → supabase_suppliers.csv');
console.log('   2. customers  → supabase_customers.csv');
console.log('   3. cars       → supabase_cars.csv  (must be after customers)');

sqlite.close();
