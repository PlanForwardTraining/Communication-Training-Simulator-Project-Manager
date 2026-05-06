import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const rawPath = process.env.DATABASE_PATH;
const dbPath = rawPath === ':memory:'
  ? ':memory:'
  : rawPath
    ? path.resolve(rawPath)
    : path.resolve(__dirname, '../../../data/simulator.db');

// Ensure parent directory exists (handles Railway volumes + local first run)
if (dbPath !== ':memory:') {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
