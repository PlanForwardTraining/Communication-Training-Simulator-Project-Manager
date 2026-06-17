import Database from 'better-sqlite3';
import { setupTestDb, runMigrations } from './helpers';
import { isCuratedModel, isPickerProvider } from '../src/services/coaching/models';

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

describe('curated models', () => {
  it('accepts known models, rejects unknown', () => {
    expect(isCuratedModel('gemini', 'gemini-2.5-pro')).toBe(true);
    expect(isCuratedModel('openai', 'gpt-4o')).toBe(true);
    expect(isCuratedModel('gemini', 'whisper-1')).toBe(false);
    expect(isCuratedModel('anthropic', 'claude-sonnet-4-6')).toBe(false);
  });
  it('identifies picker providers', () => {
    expect(isPickerProvider('openai')).toBe(true);
    expect(isPickerProvider('anthropic')).toBe(false);
  });
});
