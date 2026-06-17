import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi } from '../../api/admin';
import type { CoachingSettings } from '../../api/admin';

const PROVIDER_LABELS: Record<string, string> = { openai: 'OpenAI', gemini: 'Google Gemini' };

export function AdminCoachingSettingsPage() {
  const [settings, setSettings] = useState<CoachingSettings | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({ openai: '', gemini: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    adminApi.coachingSettings().then(setSettings).catch(e => setError((e as Error).message));

  useEffect(() => { load(); }, []);

  const saveKey = async (provider: string) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setCoachingKey(provider, keyInputs[provider]);
      setKeyInputs(s => ({ ...s, [provider]: '' }));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeKey = async (provider: string) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.removeCoachingKey(provider);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selectModel = async (provider: string, model: string) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setCoachingSelection(provider, model);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl text-slate-text mb-1">Coaching Engine</h1>
      <p className="text-slate-muted text-sm mb-6">
        Choose which AI provider and model generate the post-call coaching, and manage their API keys.
      </p>

      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

      {!settings ? (
        <p className="text-slate-muted">Loading…</p>
      ) : (
        <div className="space-y-8">
          {/* Provider key cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(['openai', 'gemini'] as const).map(provider => {
              const status = settings.providers[provider];
              return (
                <div key={provider} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-slate-text">{PROVIDER_LABELS[provider]}</span>
                    <span className={status.connected ? 'text-green-400 text-xs' : 'text-slate-muted text-xs'}>
                      {status.connected ? `Connected ···· ${status.last4}` : 'Not connected'}
                    </span>
                  </div>
                  <input
                    type="password"
                    placeholder="Paste API key to set/replace"
                    value={keyInputs[provider]}
                    onChange={e => setKeyInputs(s => ({ ...s, [provider]: e.target.value }))}
                    className="input w-full mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      className="btn-primary text-sm px-4 py-2"
                      disabled={busy || keyInputs[provider].length < 10}
                      onClick={() => saveKey(provider)}
                    >
                      Save key
                    </button>
                    {status.connected && (
                      <button
                        className="btn-ghost text-sm"
                        disabled={busy}
                        onClick={() => removeKey(provider)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Model picker */}
          <div className="card p-4">
            <h2 className="font-display text-slate-text mb-4">Active model</h2>
            {(['openai', 'gemini'] as const).map(provider => {
              const connected = settings.providers[provider].connected;
              return (
                <div key={provider} className="mb-4 last:mb-0">
                  <div className="text-xs uppercase tracking-wide text-slate-muted mb-2">
                    {PROVIDER_LABELS[provider]}
                  </div>
                  <div className="space-y-1">
                    {settings.models[provider].map(model => {
                      const active =
                        settings.activeProvider === provider && settings.activeModel === model;
                      return (
                        <button
                          key={model}
                          disabled={!connected || busy}
                          onClick={() => selectModel(provider, model)}
                          className={
                            'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ' +
                            (active
                              ? 'bg-gold-500/15 text-gold-300 '
                              : 'text-slate-text hover:bg-navy-700 ') +
                            (!connected ? 'opacity-40 cursor-not-allowed' : '')
                          }
                        >
                          <span>{model}</span>
                          {active && <span className="text-gold-400 font-semibold">✓</span>}
                          {!connected && (
                            <span className="text-xs text-slate-muted">
                              Add a {PROVIDER_LABELS[provider]} key to enable
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
