import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';

const db = new Database('src/assets/AutoCheck.db', { readonly: true });

// ── Customers CSV ──────────────────────────────────────────────────────────
const customers = db.prepare('SELECT * FROM Customers').all();

const cleanPhone = (phones) =>
  (phones ?? '').replace(/\/$/, '').replace(/\//g, ' / ').trim();

const cleanCarIds = (carIds) =>
  (carIds ?? '').replace(/\/$/, '').replace(/\//g, ',').trim();

const customerRows = customers.map(c => ({
  id:              c.CustomerId,
  name:            c.FullName ?? '',
  phone:           cleanPhone(c.Phones),
  email:           c.Email ?? '',
  address:         c.Address ?? '',
  matriculeFiscal: c.MatriculeFiscal ?? '',
  carIds:          cleanCarIds(c.CarId),
  type:            c.Type === 1 ? 'Company' : 'Individual',
}));

const toCsv = (rows, cols) => {
  const header = cols.join(',');
  const lines = rows.map(r =>
    cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  return [header, ...lines].join('\n');
};

const customerCsv = toCsv(customerRows, ['id','name','phone','email','address','matriculeFiscal','type','carIds']);
writeFileSync('src/assets/export_customers.csv', customerCsv, 'utf8');
console.log(`✅ Customers: ${customerRows.length} rows → src/assets/export_customers.csv`);

// ── Cars CSV ────────────────────────────────────────────────────────────────
const cars = db.prepare('SELECT * FROM Cars').all();

// Build a map: CarId → customer name (via Customers.CarId field which contains "carId/")
const carToCustomer = {};
for (const c of customers) {
  const ids = (c.CarId ?? '').split('/').map(s => s.trim()).filter(Boolean);
  for (const id of ids) {
    carToCustomer[parseInt(id)] = c.FullName ?? '';
  }
}

const carRows = cars.map(car => ({
  id:           car.CarId,
  plate:        car.LicensePlate ?? '',
  manufacturer: car.Maker ?? '',
  model:        car.Model ?? '',
  vin:          car.Vin ?? '',
  color:        car.Color ?? '',
  customerName: carToCustomer[car.CarId] ?? '',
}));

const carCsv = toCsv(carRows, ['id','plate','manufacturer','model','vin','color','customerName']);
writeFileSync('src/assets/export_cars.csv', carCsv, 'utf8');
console.log(`✅ Cars: ${carRows.length} rows → src/assets/export_cars.csv`);

// ── Suppliers CSV ───────────────────────────────────────────────────────────
const suppliers = db.prepare('SELECT * FROM Suppliers').all();

const supplierRows = suppliers.map(s => ({
  id:      s.SupplierId,
  name:    s.FullName ?? '',
  phone:   cleanPhone(s.Phones),
  type:    (s.Type ?? '').split('/').filter(Boolean).join(' | '),
  address: s.Address ?? '',
  matricul: s.Matricul ?? '',
}));

const supplierCsv = toCsv(supplierRows, ['id','name','phone','type','address','matricul']);
writeFileSync('src/assets/export_suppliers.csv', supplierCsv, 'utf8');
console.log(`✅ Suppliers: ${supplierRows.length} rows → src/assets/export_suppliers.csv`);

console.log('\n📋 Summary:');
console.log(`  Customers: ${customerRows.length}`);
console.log(`  Cars:      ${carRows.length}`);
console.log(`  Suppliers: ${supplierRows.length}`);

db.close();
