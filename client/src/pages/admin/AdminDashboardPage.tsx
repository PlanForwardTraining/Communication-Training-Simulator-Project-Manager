import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type AdminSummary, type AdminUserStats, type FlaggedPM, type CategoryAverage, type UserType } from '../../api/admin';
import { AdminLayout } from './AdminLayout';
import { UserModalForm } from './UserModalForm';
import { DiscBadge } from '../../components/DiscBadge';

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-green-400 font-body text-xs font-semibold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-400 font-body text-xs font-semibold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    );
  }
  return <span className="text-slate-muted font-body text-xs">—</span>;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-muted font-body text-sm">—</span>;
  const color =
    score >= 80 ? 'text-green-400' :
    score >= 70 ? 'text-gold-400' :
    score >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-display font-semibold text-base ${color}`}>{score}</span>;
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="font-body text-[10px] uppercase tracking-widest text-slate-muted mb-1">{label}</p>
      <p className="font-display text-3xl font-bold text-slate-text">{value}</p>
      {sub && <p className="font-body text-xs text-slate-muted mt-1">{sub}</p>}
    </div>
  );
}

function CategoryStrip({ categories }: { categories: CategoryAverage[] }) {
  return (
    <div className="space-y-2.5">
      {categories.map(c => {
        const a = c.average ?? 0;
        const pct = (a / 5) * 100;
        const color =
          c.average === null ? 'bg-navy-700' :
          a < 3 ? 'bg-red-500' :
          a < 3.5 ? 'bg-amber-500' :
          a < 4 ? 'bg-gold-500' : 'bg-green-500';
        return (
          <div key={c.key} className="flex items-center gap-3">
            <span className="font-body text-xs text-slate-muted w-44 flex-shrink-0 truncate">{c.label}</span>
            <div className="flex-1 bg-navy-700 rounded-full h-1.5 relative">
              <div
                className={`${color} h-1.5 rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-display text-sm font-semibold text-slate-text w-10 text-right">
              {c.average !== null ? c.average.toFixed(1) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FlaggedCard({ pm, onClick }: { pm: FlaggedPM; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card p-4 text-left hover:bg-navy-700 transition-all border-l-4 border-l-amber-500 group"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <DiscBadge code={pm.disc_profile} />
          <span className="font-display font-semibold text-sm text-slate-text truncate group-hover:text-gold-400 transition-colors">
            {pm.name}
          </span>
        </div>
        <ScorePill score={pm.averageScore} />
      </div>
      <ul className="font-body text-xs text-slate-muted space-y-1">
        {pm.reasons.map((reason, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function PmRow({
  pm,
  onClick,
}: {
  pm: AdminUserStats;
  onClick: () => void;
}) {
  const lastSession = pm.lastSessionAt
    ? pm.daysSinceLastSession === 0 ? 'Today'
    : pm.daysSinceLastSession === 1 ? 'Yesterday'
    : `${pm.daysSinceLastSession}d ago`
    : 'Never';

  return (
    <tr
      onClick={onClick}
      className="border-b border-navy-700 hover:bg-navy-800 cursor-pointer transition-colors"
    >
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2.5">
          <DiscBadge code={pm.disc_profile} />
          <div className="flex flex-col">
            <span className="font-display font-semibold text-sm text-slate-text">{pm.name}</span>
            <span className="font-body text-xs text-slate-muted">{pm.email}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-2 text-center">
        <span className="font-display font-semibold text-sm text-slate-text">{pm.totalSessions}</span>
      </td>
      <td className="py-3 px-2 text-center font-body text-xs text-slate-muted">
        {lastSession}
      </td>
      <td className="py-3 px-2 text-center">
        <ScorePill score={pm.averageScore} />
      </td>
      <td className="py-3 px-2 text-center">
        <TrendIcon trend={pm.trend} />
      </td>
      <td className="py-3 px-2">
        {pm.focusAreas.length === 0 ? (
          <span className="font-body text-xs text-slate-muted">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {pm.focusAreas.slice(0, 2).map(f => (
              <span
                key={f.key}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-body text-[10px] font-semibold whitespace-nowrap"
                title={`Average ${f.average} across ${f.sessionsScored} sessions`}
              >
                {f.label}
              </span>
            ))}
            {pm.focusAreas.length > 2 && (
              <span className="font-body text-[10px] text-slate-muted">
                +{pm.focusAreas.length - 2}
              </span>
            )}
          </div>
        )}
      </td>
      <td className="py-3 pl-2 pr-4 text-right">
        {pm.active === 0 && (
          <span className="font-body text-[10px] uppercase tracking-widest text-slate-muted">
            Inactive
          </span>
        )}
      </td>
    </tr>
  );
}

function UserTypesPanel() {
  const [types, setTypes] = useState<UserType[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    adminApi.userTypes().then(setTypes).catch(() => {/* non-blocking */});
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const updated = await adminApi.addUserType(trimmed);
      setTypes(updated);
      setNewName('');
      inputRef.current?.focus();
    } catch (e) {
      // silently surface in the input area — unlikely but possible
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (name: string) => {
    setRemoveErrors(prev => ({ ...prev, [name]: '' }));
    try {
      const updated = await adminApi.removeUserType(name);
      setTypes(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cannot remove';
      setRemoveErrors(prev => ({ ...prev, [name]: msg }));
    }
  };

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold text-slate-text mb-1">User Types</h2>
      <p className="font-body text-xs text-slate-muted mb-4 leading-relaxed">
        Group users by role/team. Assign types to users and restrict scenario visibility by type.
      </p>

      {types.length === 0 ? (
        <p className="font-body text-xs text-slate-muted italic mb-3">No types yet.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {types.map(t => (
            <li key={t.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-sm text-slate-text">{t.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(t.name)}
                  className="text-slate-muted hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10"
                  title={`Remove "${t.name}"`}
                  aria-label={`Remove ${t.name}`}
                >
                  ×
                </button>
              </div>
              {removeErrors[t.name] && (
                <p className="font-body text-xs text-red-400 mt-0.5 pl-0">{removeErrors[t.name]}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="New type name…"
          className="flex-1 bg-navy-800 border border-navy-600 rounded-lg px-3 py-1.5 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500 placeholder:text-slate-muted/50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
        >
          {adding ? '…' : 'Add'}
        </button>
      </div>
    </section>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, users] = await Promise.all([adminApi.summary(), adminApi.users()]);
      setSummary(s);
      setAllUsers(users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-text">Dashboard</h1>
          <p className="font-body text-sm text-slate-muted mt-1">Cohort health and per-PM focus areas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          + Add User
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card p-5 border-red-500/30 text-red-400 font-body text-sm">
          {error}
        </div>
      )}

      {summary && !loading && (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Active PMs" value={summary.cohort.totalPMs} />
            <KpiCard
              label="Sessions This Week"
              value={summary.cohort.sessionsThisWeek}
              sub={`${summary.cohort.totalSessionsAllTime} all-time`}
            />
            <KpiCard
              label="Team Avg Score"
              value={summary.cohort.teamAverageScore ?? '—'}
              sub="across all completed sessions"
            />
            <KpiCard
              label="Flagged PMs"
              value={summary.flaggedPMs.length}
              sub="needing attention"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team focus areas */}
            <section className="card p-6 lg:col-span-2">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-display font-semibold text-slate-text">Team Performance by Category</h2>
                <span className="font-body text-xs text-slate-muted">across all completed sessions</span>
              </div>
              <CategoryStrip categories={summary.teamCategoryAverages} />

              {summary.teamFocusAreas.length > 0 && (
                <div className="mt-5 pt-4 border-t border-navy-700">
                  <p className="font-body text-[10px] uppercase tracking-widest text-amber-500 mb-2 font-semibold">
                    Where the cohort needs the most work
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {summary.teamFocusAreas.map(f => (
                      <span
                        key={f.key}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-body text-xs font-semibold"
                      >
                        {f.label}
                        <span className="opacity-60">{f.average.toFixed(1)}/5</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* PMs needing attention */}
            <section className="card p-6">
              <h2 className="font-display font-semibold text-slate-text mb-1">PMs Needing Attention</h2>
              <p className="font-body text-xs text-slate-muted mb-4">
                Flagged for stale activity, declining trend, or persistent weak categories
              </p>
              {summary.flaggedPMs.length === 0 ? (
                <p className="font-body text-sm text-slate-muted py-4">
                  No PMs flagged. The cohort is on track.
                </p>
              ) : (
                <div className="space-y-3">
                  {summary.flaggedPMs.map(pm => (
                    <FlaggedCard key={pm.id} pm={pm} onClick={() => navigate(`/admin/users/${pm.id}`)} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* User Types management */}
          <UserTypesPanel />

          {/* All Users table */}
          <section>
            <h2 className="font-display font-semibold text-slate-text mb-4">All Users</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-700 text-left">
                      <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 pl-4 pr-2">PM</th>
                      <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2 text-center">Sessions</th>
                      <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2 text-center">Last</th>
                      <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2 text-center">Avg</th>
                      <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2 text-center">Trend</th>
                      <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2">Focus Areas</th>
                      <th className="py-3 pl-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.filter(u => u.role === 'pm').map(pm => (
                      <PmRow key={pm.id} pm={pm} onClick={() => navigate(`/admin/users/${pm.id}`)} />
                    ))}
                  </tbody>
                </table>
              </div>
              {allUsers.filter(u => u.role === 'pm').length === 0 && (
                <div className="py-12 text-center font-body text-sm text-slate-muted">
                  No users yet. Click "+ Add User" to onboard your first.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {showModal && (
        <UserModalForm
          mode="create"
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            reload();
          }}
        />
      )}
    </AdminLayout>
  );
}
