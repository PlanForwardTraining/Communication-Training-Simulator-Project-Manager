import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi } from '../../api/admin';
import type { Branding } from '../../api/admin';
import { applyBrandingValues } from '../../utils/applyBranding';

const DEFAULTS: Branding = { primary: '#1C8CAB', secondary: '#0E2A33', text: '#F8FAFC', logoUrl: '' };

// Fix 1: hoisted to module scope so it never remounts on parent re-render
function ColorRow({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-5">
      <div className="font-display text-slate-text text-sm">{label}</div>
      <div className="text-slate-muted text-xs mb-2">{hint}</div>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-10 w-12 rounded bg-transparent border border-navy-600" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="input w-32 text-sm" />
      </div>
    </div>
  );
}

export function AdminBrandingPage() {
  const [b, setB] = useState<Branding>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null); // Fix 5: replaces boolean `saved`

  useEffect(() => { adminApi.branding().then(setB).catch(e => setError((e as Error).message)); }, []);

  const field = (k: keyof Branding, v: string) => setB(s => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const next = await adminApi.setBranding(b);
      setB(next);
      applyBrandingValues(next.primary, next.secondary, next.text);
      // Fix 4: dispatch live logo update
      window.dispatchEvent(new CustomEvent('branding:logo', { detail: next.logoUrl }));
      setNotice('Saved — colors applied.'); // Fix 5
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const reset = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const next = await adminApi.resetBranding();
      setB(next);
      applyBrandingValues(next.primary, next.secondary, next.text);
      // Fix 4: dispatch live logo update
      window.dispatchEvent(new CustomEvent('branding:logo', { detail: next.logoUrl }));
      setNotice('Reset to default colors.'); // Fix 5
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl text-slate-text mb-1">Branding</h1>
      <p className="text-slate-muted text-sm mb-6">Colors and logo used across the whole app, including the login screen.</p>
      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
      {notice && <div className="mb-4 text-sm text-green-400">{notice}</div>}

      <div className="card p-5 max-w-xl">
        <div className="mb-5">
          <div className="font-display text-slate-text text-sm">Logo URL</div>
          <div className="text-slate-muted text-xs mb-2">Direct link to a PNG or SVG. Leave blank to use the text wordmark.</div>
          <input type="text" placeholder="https://example.com/logo.png" value={b.logoUrl} onChange={e => field('logoUrl', e.target.value)} className="input w-full text-sm" />
        </div>
        <ColorRow label="Primary color" hint="Buttons, accents, highlights." value={b.primary} onChange={v => field('primary', v)} />
        <ColorRow label="Secondary color" hint="Backgrounds, sidebar, headers (use a dark color — the app is a dark theme)." value={b.secondary} onChange={v => field('secondary', v)} />
        <ColorRow label="Text color" hint="Body text and headings across the app." value={b.text} onChange={v => field('text', v)} />

        {/* Live preview */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-slate-muted mb-2">Preview</div>
          <div className="rounded-xl overflow-hidden border border-navy-600">
            <div className="px-4 py-3 font-display text-sm" style={{ background: b.secondary, color: b.text }}>
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
