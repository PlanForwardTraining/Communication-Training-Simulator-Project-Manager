import db from '../../db/connection';
import { encryptSecret, decryptSecret } from '../../utils/crypto';
import { DEFAULT_PROVIDER, DEFAULT_MODEL } from './models';
import { PickerProvider } from './types';

const ENV_KEY: Record<PickerProvider, string> = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
  ).run(key, value);
}

export function getActiveProvider(): PickerProvider {
  const v = getSetting('coaching_provider') || process.env.COACHING_PROVIDER || DEFAULT_PROVIDER;
  return v === 'openai' ? 'openai' : 'gemini';
}

export function getActiveModel(provider: PickerProvider): string {
  return getSetting('coaching_model') || process.env.COACHING_MODEL || DEFAULT_MODEL[provider];
}

export function setActiveSelection(provider: PickerProvider, model: string): void {
  setSetting('coaching_provider', provider);
  setSetting('coaching_model', model);
}

export function getProviderKey(provider: PickerProvider): string | null {
  const row = db.prepare('SELECT encrypted_key FROM provider_keys WHERE provider = ?').get(provider) as
    | { encrypted_key: string }
    | undefined;
  if (row) return decryptSecret(row.encrypted_key);
  return process.env[ENV_KEY[provider]] || null;
}

export function setProviderKey(provider: PickerProvider, apiKey: string): void {
  db.prepare(
    `INSERT INTO provider_keys (provider, encrypted_key, last4, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(provider) DO UPDATE SET encrypted_key = excluded.encrypted_key,
       last4 = excluded.last4, updated_at = CURRENT_TIMESTAMP`,
  ).run(provider, encryptSecret(apiKey), apiKey.slice(-4));
}

export function deleteProviderKey(provider: PickerProvider): void {
  db.prepare('DELETE FROM provider_keys WHERE provider = ?').run(provider);
}

export function getProviderStatus(provider: PickerProvider): { connected: boolean; last4: string | null } {
  const row = db.prepare('SELECT last4 FROM provider_keys WHERE provider = ?').get(provider) as
    | { last4: string }
    | undefined;
  if (row) return { connected: true, last4: row.last4 };
  const envKey = process.env[ENV_KEY[provider]];
  if (envKey) return { connected: true, last4: envKey.slice(-4) };
  return { connected: false, last4: null };
}
