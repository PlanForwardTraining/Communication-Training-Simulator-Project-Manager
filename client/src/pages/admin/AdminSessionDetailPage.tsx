import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi, type AdminSessionDetail } from '../../api/admin';
import { AdminLayout } from './AdminLayout';
import { MarkdownLite } from '../../utils/MarkdownLite';
import { DiscBadge } from '../../components/DiscBadge';

const CATEGORY_LABELS: Record<string, string> = {
  empathy: 'Empathy & Acknowledgment',
  clarity: 'Clarity & Honesty',
  discAdaptation: 'DISC Adaptation',
  solutionOrientation: 'Solution Orientation',
  ownership: 'Ownership & Accountability',
  composure: 'Confidence & Composure',
  activeListening: 'Active Listening',
};

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" className="stroke-navy-700" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          className="stroke-gold-500" strokeWidth="8"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-slate-text">{score}</span>
        <span className="font-body text-[10px] text-slate-muted">/ 100</span>
      </div>
    </div>
  );
}

function CategoryBar({ name, score }: { name: string; score: number }) {
  const flagged = score < 3;
  const color =
    score < 3 ? 'bg-red-500' :
    score < 3.5 ? 'bg-amber-500' :
    score < 4 ? 'bg-gold-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-3">
      <span className={`font-body text-xs w-44 flex-shrink-0 truncate ${flagged ? 'text-red-400 font-semibold' : 'text-slate-muted'}`}>
        {name}
      </span>
      <div className="flex-1 bg-navy-700 rounded-full h-1.5">
        <div
          className={`${color} h-1.5 rounded-full transition-all duration-700`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <span className="font-display text-sm font-semibold text-slate-text w-6 text-right">{score}</span>
    </div>
  );
}

export function AdminSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    adminApi.session(Number(id))
      .then(setDetail)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load session'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminLayout
      back={
        detail
          ? { label: detail.session.user_name, to: `/admin/users/${detail.session.user_id}` }
          : { label: 'Dashboard', to: '/admin' }
      }
    >
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
          {/* Header */}
          <section className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <p className="font-body text-[10px] uppercase tracking-widest text-gold-500 mb-2 font-semibold">Session Detail</p>
                <h1 className="font-display text-2xl font-bold text-slate-text mb-1">
                  {detail.session.scenario_title.replace(/^Scenario \d+:\s*/i, '')}
                </h1>
                <p className="font-body text-sm text-slate-muted mb-3">
                  {new Date(detail.session.started_at).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="inline-flex items-center gap-2">
                    <DiscBadge code={detail.session.user_disc} />
                    <span className="font-body text-sm text-slate-text">{detail.session.user_name}</span>
                  </span>
                  <span className="font-body text-xs text-slate-muted">
                    spoke with{' '}
                    <span className="text-slate-text font-semibold">{detail.session.client_disc_code}</span> client
                    {detail.session.voice_name && (
                      <> · voice: <span className="text-slate-text">{detail.session.voice_name}</span></>
                    )}
                  </span>
                </div>
              </div>
              {detail.coaching && (
                <ScoreRing score={detail.coaching.totalScore} />
              )}
            </div>
          </section>

          {detail.coaching ? (
            <>
              {/* Score breakdown */}
              {detail.coaching.scoreBreakdown && (
                <section className="card p-6">
                  <h2 className="font-display font-semibold text-slate-text mb-4">Score Breakdown</h2>
                  <div className="space-y-3">
                    {Object.entries(detail.coaching.scoreBreakdown).map(([key, score]) => (
                      <CategoryBar key={key} name={CATEGORY_LABELS[key] ?? key} score={score} />
                    ))}
                  </div>
                </section>
              )}

              {/* Coaching feedback (matches PM debrief format) */}
              <section className="card p-5 border-l-4 border-green-500">
                <h3 className="font-display text-sm font-semibold text-slate-text mb-3">What the PM Did Well</h3>
                <MarkdownLite source={detail.coaching.strengths} />
              </section>
              <section className="card p-5 border-l-4 border-amber-500">
                <h3 className="font-display text-sm font-semibold text-slate-text mb-3">Opportunities to Improve</h3>
                <MarkdownLite source={detail.coaching.misses} />
              </section>
              <section className="card p-5 border-l-4 border-blue-500">
                <h3 className="font-display text-sm font-semibold text-slate-text mb-3">Suggested Alternatives</h3>
                <MarkdownLite source={detail.coaching.alternatives} />
              </section>
              <section className="card p-5 border-l-4 border-gold-500">
                <h3 className="font-display text-sm font-semibold text-slate-text mb-3">DISC Adaptation Note</h3>
                <MarkdownLite source={detail.coaching.discAdaptation} />
              </section>
            </>
          ) : (
            <div className="card p-5 border-amber-500/30 text-amber-400 font-body text-sm">
              No coaching record for this session. The session may have ended without a transcript or with a coaching error.
            </div>
          )}

          {/* Transcript */}
          <section>
            <h2 className="font-display font-semibold text-slate-text mb-3">Transcript</h2>
            <div className="card p-5 space-y-3">
              {detail.turns.length === 0 ? (
                <p className="font-body text-sm text-slate-muted">No turns recorded.</p>
              ) : (
                detail.turns.map(t => (
                  <div
                    key={t.id}
                    className={`flex ${t.speaker === 'pm' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-4 py-3 rounded-2xl font-body text-sm leading-relaxed ${
                        t.speaker === 'pm'
                          ? 'bg-gold-500/15 border border-gold-500/25 text-gold-400 rounded-br-sm'
                          : 'bg-navy-700 border border-navy-600 text-slate-text rounded-bl-sm'
                      }`}
                    >
                      <p className="mb-0.5 font-semibold text-[10px] opacity-60 uppercase tracking-widest">
                        {t.speaker === 'pm' ? detail.session.user_name : detail.session.client_disc_name.split(' — ')[0]}
                      </p>
                      {t.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
