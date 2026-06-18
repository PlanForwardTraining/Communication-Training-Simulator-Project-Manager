import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { scenariosApi, type Scenario } from '../api/scenarios';
import { DataTable, type Column } from '../components/DataTable';
import { PracticeLayout } from '../components/PracticeLayout';

// Strip markdown emphasis markers so descriptions read cleanly in the table cell.
const stripMd = (s: string) =>
  s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

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
        {stripMd(s.description)}
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
    <PracticeLayout>
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
    </PracticeLayout>
  );
}
