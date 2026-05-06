import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi, type SessionSummary } from '../api/sessions';

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-muted font-body text-sm">—</span>;
  const color =
    score >= 80 ? 'text-green-400 bg-green-500/10 border-green-500/30' :
    score >= 70 ? 'text-gold-400 bg-gold-500/10 border-gold-500/30' :
    score >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                  'text-red-400 bg-red-500/10 border-red-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-display font-bold text-sm ${color}`}>
      {score}
    </span>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionsApi.list()
      .then(list => setSessions([...list].reverse()))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <header className="border-b border-navy-600 px-4 py-4">
        <div className="container-md flex items-center justify-between mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="btn-ghost text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">Session History</span>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="container-md mx-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse h-16" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-display text-slate-muted text-lg mb-2">No sessions yet</p>
              <p className="font-body text-slate-muted text-sm mb-6">Complete a simulation to see your history here.</p>
              <button onClick={() => navigate('/')} className="btn-primary">Start Practicing</button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => session.ended_at && navigate(`/sessions/${session.id}/debrief`)}
                  disabled={!session.ended_at}
                  className="card p-4 w-full text-left flex items-center justify-between gap-4 hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-default"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-slate-text">
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    <p className="font-body text-xs text-slate-muted mt-0.5">
                      {session.voice_name ?? 'AI Client'} · Session #{session.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ScoreBadge score={session.total_score} />
                    {session.ended_at && (
                      <svg className="w-4 h-4 text-slate-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
