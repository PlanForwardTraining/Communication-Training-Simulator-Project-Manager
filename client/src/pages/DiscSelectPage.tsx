import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { discApi, type DiscProfile } from '../api/disc';
import { scenariosApi, type ScenarioBriefing } from '../api/scenarios';
import { MarkdownLite } from '../utils/MarkdownLite';
import { PracticeLayout } from '../components/PracticeLayout';

// Brief personality hints for each profile code
const DISC_HINTS: Record<string, string> = {
  D: 'Direct, decisive, results-focused',
  I: 'Warm, expressive, relationship-driven',
  S: 'Calm, loyal, dislikes sudden change',
  C: 'Precise, data-driven, asks hard questions',
  'D/I': 'Confident and charismatic — visionary',
  'D/C': 'Decisive and detail-hungry',
  'I/S': 'Warm and steady — relationship-first',
  'S/C': 'Methodical and careful planner',
};

const DISC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  D:   { bg: 'bg-red-500/20',   text: 'text-red-400',   border: 'border-red-500/40' },
  I:   { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  S:   { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' },
  C:   { bg: 'bg-blue-500/20',  text: 'text-blue-400',  border: 'border-blue-500/40' },
  'D/I': { bg: 'bg-red-500/15',  text: 'text-red-300',   border: 'border-red-500/30' },
  'D/C': { bg: 'bg-red-500/15',  text: 'text-red-300',   border: 'border-red-500/30' },
  'I/S': { bg: 'bg-amber-500/15',text: 'text-amber-300', border: 'border-amber-500/30' },
  'S/C': { bg: 'bg-green-500/15',text: 'text-green-300', border: 'border-green-500/30' },
};

function getDiscColors(code: string) {
  return DISC_COLORS[code] ?? { bg: 'bg-navy-700', text: 'text-slate-muted', border: 'border-navy-600' };
}

export function DiscSelectPage() {
  const { scenarioSlug } = useParams<{ scenarioSlug: string }>();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscProfile[]>([]);
  const [briefing, setBriefing] = useState<ScenarioBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scenarioSlug) return;
    Promise.all([discApi.list(), scenariosApi.getBriefing(scenarioSlug)])
      .then(([p, b]) => {
        setProfiles(p);
        setBriefing(b);
      })
      .finally(() => setLoading(false));
  }, [scenarioSlug]);

  const handleSelect = (code: string) => {
    navigate(`/sessions/${scenarioSlug}/${encodeURIComponent(code)}/simulate`);
  };

  return (
    <PracticeLayout>
      <main className="flex-1 py-8 px-4">
        {/* Back nav */}
        <div className="container-md mx-auto mb-2">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
        <div className="container-md mx-auto">
          {/* Scenario briefing — the PM's "case file" before the call */}
          {briefing && (
            <section className="card p-6 sm:p-7 border-l-4 border-l-gold-500 mb-10">
              <p className="font-display font-semibold text-xs text-gold-500 uppercase tracking-widest mb-1.5">
                Scenario Brief
              </p>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-text mb-4 leading-tight">
                {briefing.title.replace(/^Scenario \d+:\s*/i, '')}
              </h2>
              <MarkdownLite source={briefing.body_briefing} />
            </section>
          )}

          <h1 className="font-display text-2xl font-bold text-slate-text mb-1">
            Pick a client profile to start
          </h1>
          <p className="font-body text-slate-muted mb-2">
            Click any profile below — your session starts as soon as you choose.
          </p>
          <p className="font-body text-xs text-gold-500 uppercase tracking-widest font-semibold mb-6">
            ↓ Choose your client
          </p>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {profiles.map(profile => {
                const colors = getDiscColors(profile.code);
                return (
                  <button
                    key={profile.id}
                    onClick={() => handleSelect(profile.code)}
                    className={`card p-4 text-left hover:scale-[1.02] hover:border-gold-500/50 active:scale-[0.98] transition-all duration-200 group border ${colors.border} relative`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colors.bg}`}>
                        <span className={`font-display font-bold text-sm ${colors.text}`}>{profile.code}</span>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gold-500 font-body text-[10px] font-semibold uppercase tracking-widest">
                        Start →
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-slate-text text-sm leading-tight mb-1">
                      {profile.name.split(' — ')[0].split(' (')[0]}
                    </h3>
                    <p className="font-body text-xs text-slate-muted leading-relaxed">
                      {DISC_HINTS[profile.code] ?? ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </PracticeLayout>
  );
}
