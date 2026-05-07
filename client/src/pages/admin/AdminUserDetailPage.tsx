import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, type AdminUserDetail, type CategoryAverage } from '../../api/admin';
import { AdminLayout } from './AdminLayout';
import { UserModalForm } from './UserModalForm';
import { TrendChart } from './TrendChart';
import { DiscBadge } from '../../components/DiscBadge';

function CategoryStrip({ categories }: { categories: CategoryAverage[] }) {
  return (
    <div className="space-y-2.5">
      {categories.map(c => {
        const a = c.average ?? 0;
        const pct = (a / 5) * 100;
        const flagged = c.average !== null && c.sessionsScored >= 3 && (c.average as number) < 3;
        const color =
          c.average === null ? 'bg-navy-700' :
          a < 3 ? 'bg-red-500' :
          a < 3.5 ? 'bg-amber-500' :
          a < 4 ? 'bg-gold-500' : 'bg-green-500';
        return (
          <div key={c.key} className="flex items-center gap-3">
            <span className={`font-body text-xs w-44 flex-shrink-0 truncate ${flagged ? 'text-red-400 font-semibold' : 'text-slate-muted'}`}>
              {c.label}
            </span>
            <div className="flex-1 bg-navy-700 rounded-full h-1.5">
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

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-muted font-body">—</span>;
  const color =
    score >= 80 ? 'text-green-400' :
    score >= 70 ? 'text-gold-400' :
    score >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-display font-semibold ${color}`}>{score}</span>;
}

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const reload = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const d = await adminApi.user(Number(id));
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [id]);

  return (
    <AdminLayout back={{ label: 'Dashboard', to: '/admin' }}>
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card p-5 border-red-500/30 text-red-400 font-body text-sm">{error}</div>
      )}

      {detail && !loading && (
        <div className="space-y-6">
          {/* Header card */}
          <section className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <DiscBadge code={detail.disc_profile} />
                <div>
                  <h1 className="font-display text-2xl font-bold text-slate-text">{detail.name}</h1>
                  <p className="font-body text-sm text-slate-muted">{detail.email}</p>
                </div>
                {detail.active === 0 && (
                  <span className="font-body text-[10px] uppercase tracking-widest text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 ml-2">
                    Inactive
                  </span>
                )}
              </div>
              <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm">
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-navy-700">
              <div>
                <p className="font-body text-[10px] uppercase tracking-widest text-slate-muted">Sessions</p>
                <p className="font-display text-2xl font-bold text-slate-text">{detail.totalSessions}</p>
              </div>
              <div>
                <p className="font-body text-[10px] uppercase tracking-widest text-slate-muted">Average</p>
                <p className="font-display text-2xl font-bold">
                  <ScorePill score={detail.averageScore} />
                </p>
              </div>
              <div>
                <p className="font-body text-[10px] uppercase tracking-widest text-slate-muted">Last Session</p>
                <p className="font-display text-sm font-semibold text-slate-text">
                  {detail.lastSessionAt
                    ? detail.daysSinceLastSession === 0 ? 'Today'
                    : detail.daysSinceLastSession === 1 ? 'Yesterday'
                    : `${detail.daysSinceLastSession} days ago`
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="font-body text-[10px] uppercase tracking-widest text-slate-muted">Trend</p>
                <p className="font-display text-sm font-semibold capitalize">
                  {detail.trend === 'up' && <span className="text-green-400">Improving ↑</span>}
                  {detail.trend === 'down' && <span className="text-red-400">Declining ↓</span>}
                  {detail.trend === 'flat' && <span className="text-slate-muted">Steady —</span>}
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend chart */}
            <section className="card p-6 lg:col-span-2">
              <h2 className="font-display font-semibold text-slate-text mb-1">Score Trend</h2>
              <p className="font-body text-xs text-slate-muted mb-4">
                Total score across completed sessions, oldest to newest. Dashed line is the average.
              </p>
              <TrendChart points={detail.trendPoints} />
            </section>

            {/* Focus areas */}
            <section className="card p-6">
              <h2 className="font-display font-semibold text-slate-text mb-1">Focus Areas</h2>
              <p className="font-body text-xs text-slate-muted mb-4">
                Categories averaging below 3 across at least 3 sessions.
              </p>
              {detail.focusAreas.length === 0 ? (
                <p className="font-body text-sm text-slate-muted py-4">
                  None flagged — this PM is meeting the standard across all categories.
                </p>
              ) : (
                <ul className="space-y-3">
                  {detail.focusAreas.map(f => (
                    <li key={f.key} className="border-l-2 border-l-red-500 pl-3 py-1">
                      <p className="font-display font-semibold text-sm text-slate-text">{f.label}</p>
                      <p className="font-body text-xs text-slate-muted">
                        Avg <span className="text-red-400 font-semibold">{f.average.toFixed(1)}</span> across {f.sessionsScored} sessions
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Category averages */}
          <section className="card p-6">
            <h2 className="font-display font-semibold text-slate-text mb-1">Category Performance</h2>
            <p className="font-body text-xs text-slate-muted mb-4">
              Average score (1–5) per rubric category across all sessions.
            </p>
            <CategoryStrip categories={detail.categoryAverages} />
          </section>

          {/* Sessions list */}
          <section>
            <h2 className="font-display font-semibold text-slate-text mb-4">Session History</h2>
            <div className="card overflow-hidden">
              {detail.sessions.length === 0 ? (
                <div className="py-12 text-center font-body text-sm text-slate-muted">
                  No completed sessions yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-navy-700 text-left">
                        <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 pl-4 pr-2">Date</th>
                        <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2">Scenario</th>
                        <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2 text-center">Client DISC</th>
                        <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2">Voice</th>
                        <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 pl-2 pr-4 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.sessions.map(s => (
                        <tr
                          key={s.id}
                          onClick={() => navigate(`/admin/sessions/${s.id}`)}
                          className="border-b border-navy-700 hover:bg-navy-800 cursor-pointer transition-colors"
                        >
                          <td className="py-3 pl-4 pr-2 font-body text-xs text-slate-muted">
                            {new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-2 font-body text-sm text-slate-text">
                            {s.scenario_title.replace(/^Scenario \d+:\s*/i, '')}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-navy-700 font-display font-semibold text-xs text-slate-text">
                              {s.client_disc_code}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-body text-xs text-slate-muted">
                            {s.voice_name || '—'}
                          </td>
                          <td className="py-3 pl-2 pr-4 text-right">
                            <ScorePill score={s.total_score} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {showEdit && detail && (
        <UserModalForm
          mode="edit"
          user={detail}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            reload();
          }}
        />
      )}
    </AdminLayout>
  );
}
