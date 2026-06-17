import Database from 'better-sqlite3';
import { setupTestDb, runMigrations } from './helpers';

setupTestDb();

describe('coaching settings schema', () => {
  it('creates app_settings and provider_keys tables', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().map((r: any) => r.name);
    expect(tables).toContain('app_settings');
    expect(tables).toContain('provider_keys');
  });
});
