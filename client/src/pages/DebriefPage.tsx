import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sessionsApi, type CoachingResult, type SessionDetail } from '../api/sessions';
import { MarkdownLite } from '../utils/MarkdownLite';
import { PracticeLayout } from '../components/PracticeLayout';

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const band =
    score >= 90 ? { label: 'Exceptional', color: 'text-green-400' } :
    score >= 80 ? { label: 'Strong', color: 'text-green-400' } :
    score >= 70 ? { label: 'Solid', color: 'text-gold-400' } :
    score >= 60 ? { label: 'Developing', color: 'text-amber-400' } :
                  { label: 'Needs Practice', color: 'text-red-400' };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" className="stroke-navy-700" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            className="stroke-gold-500" strokeWidth="10"
            strokeDasharray={`${filled} ${circumference - filled}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold text-slate-text">{score}</span>
          <span className="font-body text-xs text-slate-muted">/ 100</span>
        </div>
      </div>
      <span className={`font-display font-semibold text-lg ${band.color}`}>{band.label}</span>
    </div>
  );
}

function CategoryBar({ name, score }: { name: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-body text-xs text-slate-muted w-36 flex-shrink-0 truncate">{name}</span>
      <div className="flex-1 bg-navy-700 rounded-full h-1.5">
        <div
          className="bg-gold-500 h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <span className="font-display text-sm font-semibold text-slate-text w-6 text-right">{score}</span>
    </div>
  );
}

function FeedbackSection({ title, content, borderColor }: { title: string; content: string; borderColor: string }) {
  return (
    <div className={`card p-5 border-l-4 ${borderColor}`}>
      <h3 className="font-display text-sm font-semibold text-slate-text mb-3">{title}</h3>
      <MarkdownLite source={content} />
    </div>
  );
}

export function DebriefPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    sessionsApi.get(Number(sessionId))
      .then(s => {
        setSession(s);
        if (s.coaching) setCoaching(s.coaching);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <PracticeLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PracticeLayout>
    );
  }

  if (!coaching) {
    return (
      <PracticeLayout>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-slate-muted font-body">No coaching data found.</p>
          <button onClick={() => navigate('/')} className="btn-secondary mt-4">Back to Home</button>
        </div>
      </PracticeLayout>
    );
  }

  const categories = [
    { name: 'Empathy & Acknowledgment', score: coaching.scoreBreakdown.empathy },
    { name: 'Clarity & Honesty', score: coaching.scoreBreakdown.clarity },
    { name: 'DISC Adaptation', score: coaching.scoreBreakdown.discAdaptation },
    { name: 'Solution Orientation', score: coaching.scoreBreakdown.solutionOrientation },
    { name: 'Ownership & Accountability', score: coaching.scoreBreakdown.ownership },
    { name: 'Confidence & Composure', score: coaching.scoreBreakdown.composure },
    { name: 'Active Listening', score: coaching.scoreBreakdown.activeListening },
  ];

  return (
    <PracticeLayout>
      <main className="flex-1 py-8 px-4 pb-24">
        <div className="container-md mx-auto space-y-8">
          {/* Score */}
          <div className="card p-8 flex flex-col items-center">
            <ScoreRing score={coaching.totalScore} />
          </div>

          {/* Category breakdown */}
          <div className="card p-6">
            <h2 className="font-display font-semibold text-slate-text mb-5">Score Breakdown</h2>
            <div className="space-y-3">
              {categories.map(c => <CategoryBar key={c.name} {...c} />)}
            </div>
          </div>

          {/* Qualitative feedback */}
          <FeedbackSection title="What You Did Well" content={coaching.strengths} borderColor="border-green-500" />
          <FeedbackSection title="Opportunities to Improve" content={coaching.misses} borderColor="border-amber-500" />
          <FeedbackSection title="Try These Instead" content={coaching.alternatives} borderColor="border-blue-500" />
          <FeedbackSection title="DISC Adaptation Note" content={coaching.discAdaptation} borderColor="border-gold-500" />

          {/* Transcript — collapsible so it doesn't dominate the page */}
          {session && session.turns.length > 0 && (
            <section className="card p-5">
              <button
                onClick={() => setShowTranscript(s => !s)}
                className="w-full flex items-center justify-between text-left"
              >
                <div>
                  <h3 className="font-display font-semibold text-slate-text">Conversation Transcript</h3>
                  <p className="font-body text-xs text-slate-muted mt-1">
                    {session.turns.length} turn{session.turns.length === 1 ? '' : 's'}
                    {session.events.length > 0 && (
                      <> · {session.events.length} interruption{session.events.length === 1 ? '' : 's'} logged</>
                    )}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-muted transition-transform duration-200 ${showTranscript ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTranscript && (
                <div className="mt-5 pt-5 border-t border-navy-700 space-y-3">
                  {session.turns.map(t => (
                    <div
                      key={t.id}
                      className={`flex ${t.speaker === 'pm' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl font-body text-sm leading-relaxed ${
                          t.speaker === 'pm'
                            ? 'bg-gold-500/15 border border-gold-500/25 text-gold-400 rounded-br-sm'
                            : 'bg-navy-700 border border-navy-600 text-slate-text rounded-bl-sm'
                        }`}
                      >
                        <p className="mb-0.5 font-semibold text-[10px] opacity-60 uppercase tracking-widest">
                          {t.speaker === 'pm' ? 'You' : 'Client'}
                        </p>
                        {t.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-navy-600 px-4 py-4">
        <div className="container-md mx-auto flex gap-3">
          <button onClick={() => navigate('/')} className="btn-primary flex-1">
            Practice Again
          </button>
          <button onClick={() => navigate('/history')} className="btn-secondary flex-1">
            View History
          </button>
        </div>
      </div>
    </PracticeLayout>
  );
}
