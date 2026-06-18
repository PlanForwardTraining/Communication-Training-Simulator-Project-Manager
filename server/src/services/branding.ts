import db from '../db/connection';

export interface Branding {
  primary: string;
  secondary: string;
  logoUrl: string;
}

export const DEFAULT_BRANDING: Branding = {
  primary: '#1C8CAB',   // Plan Forward teal (accent)
  secondary: '#0E2A33', // dark teal-slate (dark-theme base)
  logoUrl: '',
};

const KEYS = {
  primary: 'brand_primary',
  secondary: 'brand_secondary',
  logoUrl: 'brand_logo_url',
} as const;

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}
export function isLogoUrl(v: unknown): v is string {
  return typeof v === 'string' && (v === '' || /^https?:\/\/.+/i.test(v));
}

function get(key: string): string | null {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string } | undefined;
  return row?.value ?? null;
}
function set(key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
  ).run(key, value);
}

export function getBranding(): Branding {
  return {
    primary: get(KEYS.primary) ?? DEFAULT_BRANDING.primary,
    secondary: get(KEYS.secondary) ?? DEFAULT_BRANDING.secondary,
    logoUrl: get(KEYS.logoUrl) ?? DEFAULT_BRANDING.logoUrl,
  };
}

export function setBranding(b: Branding): void {
  set(KEYS.primary, b.primary);
  set(KEYS.secondary, b.secondary);
  set(KEYS.logoUrl, b.logoUrl);
}

export function resetBranding(): void {
  db.prepare('DELETE FROM app_settings WHERE key IN (?, ?, ?)').run(
    KEYS.primary, KEYS.secondary, KEYS.logoUrl,
  );
}
