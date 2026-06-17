import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi } from '../../api/admin';
import type { CoachingSettings, CoachingProviderRow } from '../../api/admin';

export function AdminCoachingSettingsPage() {
  const [settings, setSettings] = useState<CoachingSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which provider row is currently showing its "paste a key" input, and the draft value.
  const [connecting, setConnecting] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState('');

  const load = () =>
    adminApi.coachingSettings().then(setSettings).catch(e => setError((e as Error).message));

  useEffect(() => { load(); }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveKey = (provider: string) =>
    run(async () => {
      await adminApi.setCoachingKey(provider, keyDraft.trim());
      setConnecting(null);
      setKeyDraft('');
    });

  const removeKey = (provider: string) => run(() => adminApi.removeCoachingKey(provider));
  const selectModel = (provider: string, model: string) =>
    run(() => adminApi.setCoachingSelection(provider, model));

  const startConnect = (provider: string) => {
    setConnecting(provider);
    setKeyDraft('');
    setError(null);
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl text-slate-text mb-1">Coaching Engine</h1>
      <p className="text-slate-muted text-sm mb-6">
        Choose which AI provider and model generate the post-call coaching, and manage their API keys.
        Pick a model from a connected provider to make it active.
      </p>

      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

      {!settings ? (
        <p className="text-slate-muted">Loading…</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-left text-xs uppercase tracking-wide text-slate-muted">
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium text-right">API key</th>
              </tr>
            </thead>
            <tbody>
              {settings.providers.map((row: CoachingProviderRow) => {
                const isConnecting = connecting === row.id;
                return (
                  <tr key={row.id} className="border-b border-navy-700/60 last:border-0 align-top">
                    {/* Provider */}
                    <td className="px-4 py-4">
                      <div className="font-display text-slate-text">{row.label}</div>
                      {settings.activeProvider === row.id && (
                        <div className="text-[11px] text-gold-300 mt-0.5">Active engine</div>
                      )}
                    </td>

                    {/* Models */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {row.models.map(model => {
                          const active =
                            settings.activeProvider === row.id && settings.activeModel === model;
                          return (
                            <button
                              key={model}
                              disabled={!row.connected || busy}
                              onClick={() => selectModel(row.id, model)}
                              title={!row.connected ? `Connect ${row.label} to enable` : undefined}
                              className={
                                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ' +
                                (active
                                  ? 'bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/40 '
                                  : 'text-slate-text hover:bg-navy-700 ') +
                                (!row.connected ? 'opacity-40 cursor-not-allowed' : '')
                              }
                            >
                              {active && <span className="text-gold-400">✓</span>}
                              {model}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* API key status / action */}
                    <td className="px-4 py-4 text-right">
                      {isConnecting ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="password"
                            autoFocus
                            placeholder={`Paste ${row.label} key`}
                            value={keyDraft}
                            onChange={e => setKeyDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && keyDraft.trim().length >= 10) saveKey(row.id);
                              if (e.key === 'Escape') setConnecting(null);
                            }}
                            className="input w-48 text-xs"
                          />
                          <button
                            className="btn-primary text-xs px-3 py-1.5"
                            disabled={busy || keyDraft.trim().length < 10}
                            onClick={() => saveKey(row.id)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-ghost text-xs"
                            disabled={busy}
                            onClick={() => setConnecting(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : row.connected ? (
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-green-400 text-xs whitespace-nowrap">
                            Connected ···· {row.last4}
                          </span>
                          {row.source === 'db' ? (
                            <button
                              className="btn-ghost text-xs"
                              disabled={busy}
                              onClick={() => removeKey(row.id)}
                            >
                              Remove
                            </button>
                          ) : (
                            <span
                              className="text-[11px] text-slate-muted whitespace-nowrap"
                              title="This key is set as a server environment variable. Remove it from the server config (or override it by connecting an in-app key here)."
                            >
                              from server env
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          className="btn-primary text-xs px-3 py-1.5"
                          disabled={busy}
                          onClick={() => startConnect(row.id)}
                        >
                          Connect
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-slate-muted text-xs mt-4">
        Keys are stored encrypted and never shown again — only the last 4 characters. Removing an
        in-app key falls back to the matching environment variable if one is set on the server.
      </p>
    </AdminLayout>
  );
}
