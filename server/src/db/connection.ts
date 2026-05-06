import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const rawPath = process.env.DATABASE_PATH;
const dbPath = rawPath === ':memory:'
  ? ':memory:'
  : rawPath
    ? path.resolve(rawPath)
    : path.resolve(__dirname, '../../../data/simulator.db');

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
