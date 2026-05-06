import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

// Must be called before any import of db/connection
export function setupTestDb() {
  process.env.DATABASE_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
  process.env.NODE_ENV = 'test';
}

export function runMigrations(db: Database.Database) {
  const schemaPath = path.resolve(__dirname, '../src/db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    db.exec(stmt + ';');
  }
}

export function seedTestData(db: Database.Database) {
  const adminHash = bcrypt.hashSync('admin123', 1); // fast rounds for tests
  const pmHash = bcrypt.hashSync('pm123', 1);

  db.prepare(
    'INSERT INTO users (name, email, password_hash, disc_profile, role) VALUES (?, ?, ?, ?, ?)'
  ).run('Admin User', 'admin@test.com', adminHash, 'D', 'admin');

  db.prepare(
    'INSERT INTO users (name, email, password_hash, disc_profile, role) VALUES (?, ?, ?, ?, ?)'
  ).run('PM User', 'pm@test.com', pmHash, 'S', 'pm');

  db.prepare(
    'INSERT INTO scenarios (slug, title, description, body_markdown) VALUES (?, ?, ?, ?)'
  ).run('test-scenario', 'Test Scenario', 'A test scenario', '# Test\nBody content');

  db.prepare(
    'INSERT INTO disc_profiles (code, name, body_markdown) VALUES (?, ?, ?)'
  ).run('D', 'Dominance', '# D Profile\nBody');

  db.prepare(
    'INSERT INTO rubric_items (name, weight, description, display_order) VALUES (?, ?, ?, ?)'
  ).run('Empathy', 15, 'Measures empathy', 1);
}
