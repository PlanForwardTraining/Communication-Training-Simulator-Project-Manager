import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scenariosApi, type Scenario } from '../api/scenarios';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { DataTable, type Column } from '../components/DataTable';

const scenarioColumns: Column<Scenario>[] = [
  {
    key: 'title',
    header: 'Name',
    sortable: true,
    render: (s) => (
      <span className="font-body font-medium text-slate-text">
        {s.title.replace(/^Scenario \d+:\s*/i, '')}
      </span>
    ),
  },
  {
    key: 'description',
    header: 'Description',
    className: 'w-1/2',
    render: (s) => (
      <span
        className="font-body text-slate-muted"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {s.description}
      </span>
    ),
  },
  {
    key: 'visible_to_types',
    header: 'Role(s)',
    render: (s) => {
      const label = s.visible_to_types?.length
        ? s.visible_to_types.join(', ')
        : 'All';
      return (
        <span className="inline-block font-body text-xs text-slate-muted bg-navy-700 rounded px-2 py-0.5 whitespace-nowrap">
          {label}
        </span>
      );
    },
  },
];

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
            <BrandLogo>
              <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">
                Plan Forward
              </span>
            </BrandLogo>
            <p className="font-body text-xs text-slate-muted mt-0.5">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-ghost text-sm text-gold-500"
              >
                Admin
              </button>
            )}
            <button onClick={() => navigate('/history')} className="btn-ghost text-sm">
              History
            </button>
            <button onClick={logout} className="btn-ghost text-sm text-slate-muted">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10">
        <div className="container-lg">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-text mb-2">
            Select a Scenario
          </h1>
          <p className="font-body text-slate-muted mb-8 text-base">
            Choose the situation you want to practice
          </p>

          {loading && (
            <div className="card overflow-hidden animate-pulse">
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-4 bg-navy-700 rounded w-1/4" />
                    <div className="h-4 bg-navy-700 rounded w-1/2" />
                    <div className="h-4 bg-navy-700 rounded w-1/8" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="card p-5 border-red-500/30 text-red-400 font-body text-sm">
              Failed to load scenarios: {error}
            </div>
          )}

          {!loading && !error && (
            <DataTable<Scenario>
              columns={scenarioColumns}
              rows={scenarios}
              onRowClick={(s) => navigate(`/sessions/new/${s.slug}`)}
              empty="No scenarios available."
            />
          )}
        </div>
      </main>
    </div>
  );
}
