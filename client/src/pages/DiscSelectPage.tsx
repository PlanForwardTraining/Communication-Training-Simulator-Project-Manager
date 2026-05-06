import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { discApi, type DiscProfile } from '../api/disc';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    discApi.list()
      .then(setProfiles)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (code: string) => {
    navigate(`/sessions/${scenarioSlug}/${encodeURIComponent(code)}/simulate`);
  };

  return (
    <div className="page">
      {/* Top bar */}
      <header className="border-b border-navy-600 px-4 py-4">
        <div className="container-md flex items-center gap-3 mx-auto">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">Plan Forward</span>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="container-md mx-auto">
          <h1 className="font-display text-2xl font-bold text-slate-text mb-1">Select Client Profile</h1>
          <p className="font-body text-slate-muted mb-8">Who are you speaking with today?</p>

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
                    className={`card p-4 text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group border ${colors.border}`}
                  >
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colors.bg} mb-3`}>
                      <span className={`font-display font-bold text-sm ${colors.text}`}>{profile.code}</span>
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
    </div>
  );
}
