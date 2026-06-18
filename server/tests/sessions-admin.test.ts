import Database from 'better-sqlite3';
import { setupTestDb, runMigrations } from './helpers';
setupTestDb();

describe('admin overhaul migrations', () => {
  it('adds deleted_at, user_type, visible_to_types, and user_types table', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as any[]).map(c => c.name);
    expect(cols('sessions')).toContain('deleted_at');
    expect(cols('users')).toContain('user_type');
    expect(cols('scenarios')).toContain('visible_to_types');
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name);
    expect(tables).toContain('user_types');
  });
});
