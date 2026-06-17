import Database from 'better-sqlite3';
import { setupTestDb, runMigrations } from './helpers';
import { isCuratedModel, isPickerProvider } from '../src/services/coaching/models';
import db from '../src/db/connection';
import {
  getActiveProvider, getActiveModel, setActiveSelection,
  getProviderKey, setProviderKey, deleteProviderKey, getProviderStatus,
} from '../src/services/coaching/settings';

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

describe('settings resolution', () => {
  beforeAll(() => { runMigrations(db); });
  beforeEach(() => {
    db.prepare('DELETE FROM app_settings').run();
    db.prepare('DELETE FROM provider_keys').run();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.COACHING_PROVIDER;
  });

  it('defaults to gemini/gemini-2.5-pro when nothing set', () => {
    expect(getActiveProvider()).toBe('gemini');
    expect(getActiveModel('gemini')).toBe('gemini-2.5-pro');
  });

  it('DB selection overrides default', () => {
    setActiveSelection('openai', 'gpt-4o');
    expect(getActiveProvider()).toBe('openai');
    expect(getActiveModel('openai')).toBe('gpt-4o');
  });

  it('key resolution: DB beats env', () => {
    process.env.OPENAI_API_KEY = 'env-key';
    setProviderKey('openai', 'db-key-XY99');
    expect(getProviderKey('openai')).toBe('db-key-XY99');
    expect(getProviderStatus('openai')).toEqual({ connected: true, last4: 'XY99' });
  });

  it('key resolution: falls back to env when no DB key', () => {
    process.env.GEMINI_API_KEY = 'env-gemini-1234';
    expect(getProviderKey('gemini')).toBe('env-gemini-1234');
    expect(getProviderStatus('gemini')).toEqual({ connected: true, last4: '1234' });
  });

  it('not connected when neither DB nor env', () => {
    expect(getProviderStatus('openai')).toEqual({ connected: false, last4: null });
    expect(getProviderKey('openai')).toBeNull();
  });

  it('deleteProviderKey reverts to env fallback', () => {
    process.env.OPENAI_API_KEY = 'env-key-AAAA';
    setProviderKey('openai', 'db-key-BBBB');
    deleteProviderKey('openai');
    expect(getProviderKey('openai')).toBe('env-key-AAAA');
  });

  it('corrupted encrypted_key falls back to env instead of throwing', () => {
    // Insert a row with a deliberately corrupted/undecryptable blob
    db.prepare(
      `INSERT INTO provider_keys (provider, encrypted_key, last4, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(provider) DO UPDATE SET encrypted_key = excluded.encrypted_key,
         last4 = excluded.last4, updated_at = CURRENT_TIMESTAMP`,
    ).run('openai', 'not:valid:base64ciphertext', '0000');
    process.env.OPENAI_API_KEY = 'env-fallback-key';
    // Should not throw; should return the env var
    expect(getProviderKey('openai')).toBe('env-fallback-key');
  });
});
