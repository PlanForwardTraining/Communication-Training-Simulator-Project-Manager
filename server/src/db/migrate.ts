import fs from 'fs';
import path from 'path';
import db from './connection';

const schemaPath = path.resolve(__dirname, 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf-8');

// Run the schema (CREATE TABLE IF NOT EXISTS — only adds tables that don't yet exist).
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

for (const statement of statements) {
  db.exec(statement + ';');
}

// Idempotent column adds for tables that may already exist on a deployed volume.
// SQLite doesn't have ADD COLUMN IF NOT EXISTS, so we check the pragma first.
function ensureColumn(table: string, column: string, ddl: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const has = cols.some(c => c.name === column);
  if (!has) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl};`);
    console.log(`Added column ${table}.${column}`);
  }
}

ensureColumn('users', 'active', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('sessions', 'deleted_at', 'TEXT');
ensureColumn('users', 'user_type', 'TEXT');
ensureColumn('scenarios', 'visible_to_types', 'TEXT');
ensureColumn('coaching', 'coaching_provider', 'TEXT');
ensureColumn('coaching', 'coaching_model', 'TEXT');

console.log('Migration complete.');
