import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scenariosApi, type Scenario } from '../api/scenarios';
import { useAuth } from '../context/AuthContext';

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .trim();
}

export function ScenarioSelectPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    scenariosApi.list()
      .then(setScenarios)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      {/* Top bar */}
      <header className="border-b border-navy-600 px-4 sm:px-6 py-4">
        <div className="container-lg flex items-center justify-between">
          <div>
            <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">
              Plan Forward
            </span>
            <p className="font-body text-xs text-slate-muted mt-0.5">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => navigate('/history')} className="btn-ghost text-sm">
              History
            </button>
            <button onClick={logout} className="btn-ghost text-sm text-slate-muted">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-12">
        <div className="container-lg">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-text mb-1">
            Select a Scenario
          </h1>
          <p className="font-body text-slate-muted mb-8 sm:mb-10">
            Choose the situation you want to practice
          </p>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse h-40">
                  <div className="h-5 bg-navy-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-navy-700 rounded w-full mb-2" />
                  <div className="h-3 bg-navy-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="card p-5 border-red-500/30 text-red-400 font-body text-sm">
              Failed to load scenarios: {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => navigate(`/sessions/new/${scenario.slug}`)}
                  className="card p-6 text-left hover:bg-navy-700 transition-all duration-200 group border-l-4 border-l-gold-500 hover:border-l-gold-400 active:scale-[0.99] flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 flex-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-base sm:text-[15px] text-slate-text group-hover:text-gold-400 transition-colors duration-200 mb-2.5 leading-snug">
                        {scenario.title.replace(/^Scenario \d+:\s*/i, '')}
                      </h3>
                      <p className="font-body text-sm text-slate-muted line-clamp-3 leading-relaxed">
                        {stripMarkdown(scenario.description)}
                      </p>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-muted group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 mt-0.5"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
