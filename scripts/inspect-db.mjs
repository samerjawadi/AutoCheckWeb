import Database from 'better-sqlite3';
import { writeFileSync } from 'fs';

const db = new Database('src/assets/AutoCheck.db', { readonly: true });

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables found:', tables.map(t => t.name));

// Show schema for each table
for (const { name } of tables) {
  const cols = db.prepare(`PRAGMA table_info(${name})`).all();
  console.log(`\n[${name}] columns:`, cols.map(c => c.name).join(', '));
  const rows = db.prepare(`SELECT * FROM ${name} LIMIT 3`).all();
  console.log('Sample rows:', JSON.stringify(rows, null, 2));
}

db.close();
