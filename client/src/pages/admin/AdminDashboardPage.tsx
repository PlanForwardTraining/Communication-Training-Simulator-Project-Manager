import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type AdminSummary, type FlaggedPM, type CategoryAverage } from '../../api/admin';
import { AdminLayout } from './AdminLayout';
import { DiscBadge } from '../../components/DiscBadge';

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

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await adminApi.summary();
      setSummary(s);
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
        </div>
      )}
    </AdminLayout>
  );
}
