import { deriveBrandShades } from './deriveBrandShades';

const DEFAULTS = { primary: '#C9A84C', secondary: '#111D35' };

export function applyBrandingValues(primary: string, secondary: string): void {
  // Skip work (and avoid overriding the baked-in :root defaults) when unchanged.
  if (primary === DEFAULTS.primary && secondary === DEFAULTS.secondary) return;
  const shades = deriveBrandShades(primary, secondary);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(shades)) root.style.setProperty(k, v);
}

const API = import.meta.env.VITE_API_BASE_URL ?? '';

export async function applyBranding(): Promise<void> {
  try {
    const res = await fetch(`${API}/api/branding`);
    if (!res.ok) return;
    const b = await res.json();
    if (b?.primary && b?.secondary) applyBrandingValues(b.primary, b.secondary);
  } catch {
    /* fall back to baked-in :root defaults */
  }
}
