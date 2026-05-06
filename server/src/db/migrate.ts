import fs from 'fs';
import path from 'path';
import db from './connection';

const schemaPath = path.resolve(__dirname, 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf-8');

// Split on semicolons and run each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

for (const statement of statements) {
  db.exec(statement + ';');
}

console.log('Migration complete.');
