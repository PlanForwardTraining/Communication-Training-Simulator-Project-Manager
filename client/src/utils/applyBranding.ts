import { deriveBrandShades } from './deriveBrandShades';

const DEFAULTS = { primary: '#1C8CAB', secondary: '#0E2A33' };

export function applyBrandingValues(primary: string, secondary: string): void {
  const root = document.documentElement;
  const shades = deriveBrandShades(primary, secondary);
  const isDefault = primary === DEFAULTS.primary && secondary === DEFAULTS.secondary;
  for (const [k, v] of Object.entries(shades)) {
    if (isDefault) root.style.removeProperty(k); // Fix 2: remove inline props so CSS :root defaults take over
    else root.style.setProperty(k, v);
  }
}

const API = import.meta.env.VITE_API_BASE_URL ?? '';

export async function applyBranding(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000); // Fix 3: 4 s timeout prevents blank-page hang
    const res = await fetch(`${API}/api/branding`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const b = await res.json();
    if (b?.primary && b?.secondary) applyBrandingValues(b.primary, b.secondary);
  } catch {
    /* timeout or network error — fall back to baked-in :root defaults */
  }
}
