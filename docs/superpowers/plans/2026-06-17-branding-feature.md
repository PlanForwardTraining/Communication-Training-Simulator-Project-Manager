# Branding / White-Label Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin set a primary color, secondary color, and logo URL from an in-app Branding page that re-skins the whole app live (no redeploy), defaulting to today's look when unset.

**Architecture:** Tailwind's named `navy-*`/`gold-*` shades are repointed at CSS variables, so every existing component re-themes with zero edits. The admin picks two colors; a pure `deriveBrandShades()` derives the full ramp. Colors persist in the existing `app_settings` table, are served by a public `GET /api/branding`, and are applied to `:root` at app boot.

**Tech Stack:** React + Vite + Tailwind (client), Node + Express + better-sqlite3 (server), Jest + supertest (server tests).

**Branch:** Continue on `feat/coaching-provider-switch` (this is part of the same pre-handoff polish; merges to `main` together).

---

## File Structure

**Create:**
- `client/src/utils/deriveBrandShades.ts` — pure: two hex colors → CSS-var channel map.
- `client/src/utils/applyBranding.ts` — fetch `/api/branding`, set CSS vars on `:root`.
- `client/src/components/BrandLogo.tsx` — renders logo `<img>` if URL set, else the text wordmark.
- `client/src/pages/admin/AdminBrandingPage.tsx` — the settings UI.
- `server/src/services/branding.ts` — get/set/reset + validation, backed by `app_settings`.
- `server/src/routes/branding.ts` — `GET /` (public), `PATCH /` + `DELETE /` (admin).
- `server/tests/branding.test.ts` — service + route tests.

**Modify:**
- `client/tailwind.config.js` — `navy-*`/`gold-*` → `rgb(var(--x) / <alpha-value>)`.
- `client/src/index.css` — add `:root` channel defaults; switch TipTap hardcoded hex to `rgb(var(--x))`.
- `client/src/main.tsx` — call `applyBranding()` before render.
- `client/src/api/admin.ts` — branding types + `adminApi` methods.
- `client/src/App.tsx` — `/admin/branding` route.
- `client/src/pages/admin/AdminLayout.tsx` — "Branding" nav link; use `BrandLogo`.
- `client/src/pages/LoginPage.tsx`, `client/src/pages/ScenarioSelectPage.tsx` — use `BrandLogo`.
- `server/src/index.ts` — mount `brandingRouter` at `/api/branding`.

---

### Task 1: CSS-variable color foundation (no visual change)

**Files:** Modify `client/tailwind.config.js`, `client/src/index.css`

- [ ] **Step 1: Repoint the palette at CSS vars in `tailwind.config.js`**

Replace the `navy`, `gold`, and `slate` color objects with:
```js
        navy: {
          900: 'rgb(var(--navy-900) / <alpha-value>)',
          800: 'rgb(var(--navy-800) / <alpha-value>)',
          700: 'rgb(var(--navy-700) / <alpha-value>)',
          600: 'rgb(var(--navy-600) / <alpha-value>)',
          500: 'rgb(var(--navy-500) / <alpha-value>)',
        },
        gold: {
          400: 'rgb(var(--gold-400) / <alpha-value>)',
          500: 'rgb(var(--gold-500) / <alpha-value>)',
          600: 'rgb(var(--gold-600) / <alpha-value>)',
        },
        slate: {
          text: 'rgb(var(--slate-text) / <alpha-value>)',
          muted: 'rgb(var(--slate-muted) / <alpha-value>)',
        },
```
Leave `disc`, fonts, radius, and shadows unchanged.

- [ ] **Step 2: Declare the channel defaults in `index.css`**

In the `@layer base` block (it starts at line 7), add a `:root` rule with the current colors as space-separated RGB channels:
```css
  :root {
    --navy-900: 11 20 38;
    --navy-800: 17 29 53;
    --navy-700: 26 43 74;
    --navy-600: 30 58 95;
    --navy-500: 42 74 117;
    --gold-400: 232 201 106;
    --gold-500: 201 168 76;
    --gold-600: 168 136 46;
    --slate-text: 240 237 232;
    --slate-muted: 138 155 181;
  }
```

- [ ] **Step 3: Switch the TipTap editor's hardcoded hex to vars**

In `index.css`, replace the hardcoded hex in the `.scenario-editor` rules:
- `color: #C9A84C;` → `color: rgb(var(--gold-500));`
- `border-left: 3px solid #C9A84C;` → `border-left: 3px solid rgb(var(--gold-500));`
- `color: #F0EDE8;` → `color: rgb(var(--slate-text));` (both occurrences)
- `color: #8A9BB5;` → `color: rgb(var(--slate-muted));`
- `background: #111D35;` → `background: rgb(var(--navy-800));`

- [ ] **Step 4: Verify the app looks identical**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: clean build. Then load the app — colors must be visually unchanged (defaults equal the old hex).

- [ ] **Step 5: Commit**

```bash
git add client/tailwind.config.js client/src/index.css
git commit -m "refactor: drive theme colors through CSS variables (no visual change)"
```

---

### Task 2: `deriveBrandShades` utility

**Files:** Create `client/src/utils/deriveBrandShades.ts`

> The client has no test runner (consistent with `stripAudioTags.ts`). Verify via type-check/build + the manual sanity snippet in Step 2.

- [ ] **Step 1: Implement the pure function**

```typescript
// client/src/utils/deriveBrandShades.ts
/**
 * Derives the full navy/gold shade ramp (as "R G B" channel strings, ready for
 * `rgb(var(--x))`) from a primary (accent) and secondary (dark base) hex color.
 * The app is a dark theme, so `secondary` is treated as the mid-dark background
 * (navy-800) and other navy steps are derived around it.
 */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const lighten = ([r, g, b]: number[], amt: number): number[] =>
  [r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt];
const darken = ([r, g, b]: number[], amt: number): number[] =>
  [r * (1 - amt), g * (1 - amt), b * (1 - amt)];
const channels = (rgb: number[]): string => rgb.map(clamp).join(' ');

export function deriveBrandShades(primaryHex: string, secondaryHex: string): Record<string, string> {
  const primary = hexToRgb(primaryHex);
  const secondary = hexToRgb(secondaryHex);
  return {
    '--gold-400': channels(lighten(primary, 0.18)),
    '--gold-500': channels(primary),
    '--gold-600': channels(darken(primary, 0.25)),
    '--navy-900': channels(darken(secondary, 0.25)),
    '--navy-800': channels(secondary),
    '--navy-700': channels(lighten(secondary, 0.12)),
    '--navy-600': channels(lighten(secondary, 0.22)),
    '--navy-500': channels(lighten(secondary, 0.35)),
  };
}
```

- [ ] **Step 2: Manual sanity check**

Run:
```bash
cd client && npx tsx -e "import('./src/utils/deriveBrandShades.ts').then(m => console.log(m.deriveBrandShades('#C9A84C', '#111D35')))"
```
Expected: an object where `--gold-500` is `201 168 76`, `--navy-800` is `17 29 53`, and every value is three integers in 0–255. (If `tsx` isn't available, eyeball the math: base values pass through unchanged.)

- [ ] **Step 3: Commit**

```bash
git add client/src/utils/deriveBrandShades.ts
git commit -m "feat: deriveBrandShades — two colors to a full theme ramp"
```

---

### Task 3: Backend branding service

**Files:** Create `server/src/services/branding.ts`; Test `server/tests/branding.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// server/tests/branding.test.ts
import { setupTestDb, runMigrations } from './helpers';
setupTestDb();
import db from '../src/db/connection';
import { getBranding, setBranding, resetBranding, isHexColor, isLogoUrl, DEFAULT_BRANDING } from '../src/services/branding';

describe('branding service', () => {
  beforeAll(() => { runMigrations(db); });
  beforeEach(() => { db.prepare('DELETE FROM app_settings').run(); });

  it('returns defaults when unset', () => {
    expect(getBranding()).toEqual(DEFAULT_BRANDING);
  });
  it('persists and reads back a partial update', () => {
    setBranding({ primary: '#FF8800', secondary: '#222222', logoUrl: 'https://x.com/l.png' });
    expect(getBranding()).toEqual({ primary: '#FF8800', secondary: '#222222', logoUrl: 'https://x.com/l.png' });
  });
  it('reset reverts to defaults', () => {
    setBranding({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    resetBranding();
    expect(getBranding()).toEqual(DEFAULT_BRANDING);
  });
  it('validates hex and url', () => {
    expect(isHexColor('#A1B2C3')).toBe(true);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#FFF')).toBe(false);
    expect(isLogoUrl('')).toBe(true);
    expect(isLogoUrl('https://x.com/l.png')).toBe(true);
    expect(isLogoUrl('ftp://x')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd server && npx jest branding`
Expected: FAIL — cannot find module `../src/services/branding`.

- [ ] **Step 3: Implement `branding.ts`**

```typescript
// server/src/services/branding.ts
import db from '../db/connection';

export interface Branding {
  primary: string;
  secondary: string;
  logoUrl: string;
}

export const DEFAULT_BRANDING: Branding = {
  primary: '#C9A84C',   // gold-500
  secondary: '#111D35', // navy-800
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd server && npx jest branding`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/branding.ts server/tests/branding.test.ts
git commit -m "feat: branding service (app_settings-backed, with validation)"
```

---

### Task 4: Branding routes (public GET, admin PATCH/DELETE)

**Files:** Create `server/src/routes/branding.ts`; Modify `server/src/index.ts`; add tests to `server/tests/branding.test.ts`

- [ ] **Step 1: Implement `branding.ts` router**

```typescript
// server/src/routes/branding.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleGuard';
import { getBranding, setBranding, resetBranding, isHexColor, isLogoUrl } from '../services/branding';

const router = Router();

// Public — applied app-wide incl. the login page.
router.get('/', (_req: Request, res: Response): void => {
  res.json(getBranding());
});

router.patch('/', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  const { primary, secondary, logoUrl } = req.body ?? {};
  if (!isHexColor(primary)) { res.status(400).json({ error: 'primary must be a #RRGGBB hex color' }); return; }
  if (!isHexColor(secondary)) { res.status(400).json({ error: 'secondary must be a #RRGGBB hex color' }); return; }
  if (!isLogoUrl(logoUrl)) { res.status(400).json({ error: 'logoUrl must be empty or an http(s) URL' }); return; }
  setBranding({ primary, secondary, logoUrl });
  res.json(getBranding());
});

router.delete('/', requireAuth, requireAdmin, (_req: Request, res: Response): void => {
  resetBranding();
  res.json(getBranding());
});

export default router;
```

- [ ] **Step 2: Mount it in `index.ts`**

After line 49 (`app.use('/api/coaching-cards', coachingCardsRouter);`), add:
```typescript
app.use('/api/branding', brandingRouter);
```
And add the import near the other route imports at the top:
```typescript
import brandingRouter from './routes/branding';
```

- [ ] **Step 3: Add route tests** (append to `server/tests/branding.test.ts`)

```typescript
import request from 'supertest';
import app from '../src/index';
import { seedTestData } from './helpers';

describe('branding routes', () => {
  let token: string;
  beforeAll(async () => {
    runMigrations(db); seedTestData(db);
    const res = await request(app).post('/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
    token = res.body.token;
  });
  beforeEach(() => { db.prepare('DELETE FROM app_settings').run(); });

  it('GET /api/branding is public and returns defaults', async () => {
    const res = await request(app).get('/api/branding');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(DEFAULT_BRANDING);
  });
  it('PATCH requires admin', async () => {
    const res = await request(app).patch('/api/branding').send({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    expect(res.status).toBe(401);
  });
  it('PATCH validates and saves', async () => {
    const bad = await request(app).patch('/api/branding').set('Authorization', `Bearer ${token}`).send({ primary: 'nope', secondary: '#222222', logoUrl: '' });
    expect(bad.status).toBe(400);
    const ok = await request(app).patch('/api/branding').set('Authorization', `Bearer ${token}`).send({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    expect(ok.status).toBe(200);
    expect(ok.body.primary).toBe('#FF8800');
  });
  it('DELETE resets to defaults', async () => {
    await request(app).patch('/api/branding').set('Authorization', `Bearer ${token}`).send({ primary: '#FF8800', secondary: '#222222', logoUrl: '' });
    const res = await request(app).delete('/api/branding').set('Authorization', `Bearer ${token}`);
    expect(res.body).toEqual(DEFAULT_BRANDING);
  });
});
```

- [ ] **Step 4: Run + full suite**

Run: `cd server && npx jest branding && npx jest`
Expected: branding tests PASS; full suite still green.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/branding.ts server/src/index.ts server/tests/branding.test.ts
git commit -m "feat: branding routes (public GET, admin PATCH/DELETE)"
```

---

### Task 5: Client API wrappers + boot application

**Files:** Modify `client/src/api/admin.ts`, `client/src/main.tsx`; Create `client/src/utils/applyBranding.ts`

- [ ] **Step 1: Add types + methods to `admin.ts`**

After the `CoachingSettings` interface add:
```typescript
export interface Branding {
  primary: string;
  secondary: string;
  logoUrl: string;
}
```
Add to the `adminApi` object:
```typescript
  branding: () => api.get<Branding>('/api/branding'),
  setBranding: (b: Branding) => api.patch<Branding>('/api/branding', b),
  resetBranding: () => api.delete<Branding>('/api/branding'),
```

- [ ] **Step 2: Create `applyBranding.ts`**

```typescript
// client/src/utils/applyBranding.ts
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
```

- [ ] **Step 3: Call it before render in `main.tsx`**

Wrap the existing render so branding is applied first:
```typescript
import { applyBranding } from './utils/applyBranding';

applyBranding().finally(() => {
  // existing ReactDOM.createRoot(...).render(...) call goes here
});
```
(Move the existing render call inside the `.finally()` callback; keep all other imports/JSX identical.)

- [ ] **Step 4: Verify**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: clean. App still loads with default colors (no branding saved yet).

- [ ] **Step 5: Commit**

```bash
git add client/src/api/admin.ts client/src/utils/applyBranding.ts client/src/main.tsx
git commit -m "feat: fetch + apply branding colors at app boot"
```

---

### Task 6: `BrandLogo` component + use in headers

**Files:** Create `client/src/components/BrandLogo.tsx`; Modify `client/src/pages/admin/AdminLayout.tsx`, `client/src/pages/LoginPage.tsx`, `client/src/pages/ScenarioSelectPage.tsx`

- [ ] **Step 1: Create `BrandLogo.tsx`**

```tsx
// client/src/components/BrandLogo.tsx
import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

/** Renders the configured logo image if a logo URL is set; otherwise the text wordmark passed as children. */
export function BrandLogo({ children, className }: { children: React.ReactNode; className?: string }) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch(`${API}/api/branding`).then(r => r.ok ? r.json() : null).then(b => { if (b?.logoUrl) setLogoUrl(b.logoUrl); }).catch(() => {});
  }, []);
  if (logoUrl && !failed) {
    return <img src={logoUrl} alt="Logo" className={className ?? 'h-7 w-auto'} onError={() => setFailed(true)} />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Use it for the company wordmark in the three headers**

In `AdminLayout.tsx` (line ~83), `ScenarioSelectPage.tsx` (line ~36), and `LoginPage.tsx` (line ~38), wrap the existing wordmark `<span>`/`<h1>` with `BrandLogo`, passing the original element as children. Example for `ScenarioSelectPage.tsx`:
```tsx
<BrandLogo>
  <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">Plan Forward</span>
</BrandLogo>
```
Add `import { BrandLogo } from '../../components/BrandLogo';` (adjust relative depth: `../components/BrandLogo` from `pages/`, `../../components/BrandLogo` from `pages/admin/`). Do NOT change the "Coaching Debrief" / "Session History" labels — those are page titles, not the brand.

- [ ] **Step 3: Verify**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: clean. With no logo set, all three headers show the text wordmark exactly as before.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/BrandLogo.tsx client/src/pages/admin/AdminLayout.tsx client/src/pages/LoginPage.tsx client/src/pages/ScenarioSelectPage.tsx
git commit -m "feat: BrandLogo — swap wordmark for a configured logo image"
```

---

### Task 7: Admin Branding page

**Files:** Create `client/src/pages/admin/AdminBrandingPage.tsx`; Modify `client/src/App.tsx`, `client/src/pages/admin/AdminLayout.tsx`

- [ ] **Step 1: Create `AdminBrandingPage.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi } from '../../api/admin';
import type { Branding } from '../../api/admin';
import { applyBrandingValues } from '../../utils/applyBranding';

const DEFAULTS: Branding = { primary: '#C9A84C', secondary: '#111D35', logoUrl: '' };

export function AdminBrandingPage() {
  const [b, setB] = useState<Branding>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { adminApi.branding().then(setB).catch(e => setError((e as Error).message)); }, []);

  const field = (k: keyof Branding, v: string) => setB(s => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true); setError(null); setSaved(false);
    try {
      const next = await adminApi.setBranding(b);
      setB(next);
      applyBrandingValues(next.primary, next.secondary);
      setSaved(true);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const reset = async () => {
    setBusy(true); setError(null); setSaved(false);
    try {
      const next = await adminApi.resetBranding();
      setB(next);
      applyBrandingValues(next.primary, next.secondary);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const Color = ({ k, label, hint }: { k: 'primary' | 'secondary'; label: string; hint: string }) => (
    <div className="mb-5">
      <div className="font-display text-slate-text text-sm">{label}</div>
      <div className="text-slate-muted text-xs mb-2">{hint}</div>
      <div className="flex items-center gap-3">
        <input type="color" value={b[k]} onChange={e => field(k, e.target.value)} className="h-10 w-12 rounded bg-transparent border border-navy-600" />
        <input type="text" value={b[k]} onChange={e => field(k, e.target.value)} className="input w-32 text-sm" />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl text-slate-text mb-1">Branding</h1>
      <p className="text-slate-muted text-sm mb-6">Colors and logo used across the whole app, including the login screen.</p>
      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
      {saved && <div className="mb-4 text-sm text-green-400">Saved — colors applied.</div>}

      <div className="card p-5 max-w-xl">
        <div className="mb-5">
          <div className="font-display text-slate-text text-sm">Logo URL</div>
          <div className="text-slate-muted text-xs mb-2">Direct link to a PNG or SVG. Leave blank to use the text wordmark.</div>
          <input type="text" placeholder="https://example.com/logo.png" value={b.logoUrl} onChange={e => field('logoUrl', e.target.value)} className="input w-full text-sm" />
        </div>
        <Color k="primary" label="Primary color" hint="Buttons, accents, highlights." />
        <Color k="secondary" label="Secondary color" hint="Backgrounds, sidebar, headers (use a dark color — the app is a dark theme)." />

        {/* Live preview */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-slate-muted mb-2">Preview</div>
          <div className="rounded-xl overflow-hidden border border-navy-600">
            <div className="px-4 py-3 font-display text-sm" style={{ background: b.secondary, color: '#F0EDE8' }}>
              {b.logoUrl ? <img src={b.logoUrl} alt="Logo" className="h-6 w-auto" /> : 'Plan Forward'}
            </div>
            <div className="px-4 py-3 text-center font-semibold" style={{ background: b.primary, color: b.secondary }}>
              Primary Button
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button className="btn-primary text-sm px-4 py-2" disabled={busy} onClick={save}>Save</button>
          <button className="btn-ghost text-sm" disabled={busy} onClick={reset}>Reset to defaults</button>
        </div>
      </div>
    </AdminLayout>
  );
}
```

- [ ] **Step 2: Add the route in `App.tsx`**

Alongside the other admin routes (e.g. the `/admin/coaching` route), add:
```tsx
<Route path="/admin/branding" element={<ProtectedRoute requireAdmin><AdminBrandingPage /></ProtectedRoute>} />
```
Add the import: `import { AdminBrandingPage } from './pages/admin/AdminBrandingPage';`
(Match the exact `ProtectedRoute` wrapper form used by the neighboring admin routes.)

- [ ] **Step 3: Add the nav link in `AdminLayout.tsx`**

Near the other `path.startsWith` flags add: `const onBranding = path.startsWith('/admin/branding');`
In the `<nav>`, after the "Coaching" link, add:
```tsx
<NavLink to="/admin/branding" label="Branding" active={onBranding} />
```

- [ ] **Step 4: Verify + full client build**

Run: `cd client && npx tsc --noEmit && npm run build`
Expected: clean. Manually: log in as admin → `/admin/branding` → change primary to a test color → Save → buttons/accents change app-wide; Reset → returns to gold/navy.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/AdminBrandingPage.tsx client/src/App.tsx client/src/pages/admin/AdminLayout.tsx
git commit -m "feat: admin Branding page (colors + logo + live preview + reset)"
```

---

### Task 8: Docs sync

**Files:** `REBUILD_ME_GUIDE.md`, `PROGRESS.md`

- [ ] **Step 1:** Add a `### 13.20 — Branding / White-Label Colors` subsection to `REBUILD_ME_GUIDE.md` describing: CSS-var color system, `deriveBrandShades`, the `brand_*` `app_settings` rows, the public `GET /api/branding` + admin `PATCH`/`DELETE`, boot-time `applyBranding`, the `BrandLogo` component, and the Admin → Branding page. Per the paired-file rule, add the matching `### 13.20` checklist block to `PROGRESS.md` in the **same commit**.

- [ ] **Step 2: Commit**

```bash
git add REBUILD_ME_GUIDE.md PROGRESS.md
git commit -m "docs: document branding / white-label colors"
```

---

## Self-Review

- **Spec coverage:** primary/secondary/logo + preview + reset (T7), whole-app reskin via CSS vars (T1), two-colors→ramp derivation (T2), DB persistence in `app_settings` (T3), public `GET /api/branding` + admin `PATCH`/`DELETE` (T4), boot application incl. login page (T5), logo swap (T6), dark-theme/text-fixed constraint (defaults + reset in T3/T7), docs (T8). All spec sections map to a task.
- **Placeholder scan:** none — every code step is complete; the one non-code judgement (client has no test runner) is handled with an explicit manual sanity step (T2 Step 2), consistent with `stripAudioTags.ts`.
- **Type consistency:** `Branding { primary, secondary, logoUrl }` is identical across `branding.ts` (T3), the routes (T4), `admin.ts` wrappers (T5), and the page (T7). `deriveBrandShades(primary, secondary)` signature matches its callers in `applyBranding.ts` (T5) and the page's `applyBrandingValues` (T7). CSS var names (`--gold-400/500/600`, `--navy-900/800/700/600/500`) match between `index.css` defaults (T1), `tailwind.config.js` (T1), and `deriveBrandShades` output (T2).
