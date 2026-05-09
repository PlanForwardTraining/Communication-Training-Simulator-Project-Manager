import { useEffect, useState } from 'react';
import { scenariosApi, type AdminScenarioRow, type ScenarioFull } from '../../api/scenarios';
import { AdminLayout } from './AdminLayout';
import { ScenarioFormModal } from './ScenarioFormModal';
import { HardDeleteScenarioModal } from './HardDeleteScenarioModal';

function StatusPill({ active }: { active: number }) {
  if (active === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-body text-[10px] font-semibold uppercase tracking-widest">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-muted/15 border border-slate-muted/30 text-slate-muted font-body text-[10px] font-semibold uppercase tracking-widest">
      Inactive
    </span>
  );
}

export function AdminScenariosPage() {
  const [rows, setRows] = useState<AdminScenarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<ScenarioFull | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminScenarioRow | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await scenariosApi.adminList());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleEdit = async (row: AdminScenarioRow) => {
    try {
      const full = await scenariosApi.get(row.id);
      setEditTarget(full);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load scenario');
    }
  };

  const handleToggleActive = async (row: AdminScenarioRow) => {
    try {
      await scenariosApi.update(row.id, { active: row.active === 0 });
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    }
  };

  return (
    <AdminLayout back={{ label: 'Dashboard', to: '/admin' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-text">Scenarios</h1>
          <p className="font-body text-sm text-slate-muted mt-1">
            Add, edit, and remove the situations PMs practice against.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          + New Scenario
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card p-5 border-red-500/30 text-red-400 font-body text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700 text-left">
                  <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 pl-4 pr-2">Title</th>
                  <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2">Slug</th>
                  <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2 text-center">Status</th>
                  <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2 text-center">Sessions</th>
                  <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-2">Updated</th>
                  <th className="font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 pl-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-navy-700 hover:bg-navy-800/60 transition-colors">
                    <td className="py-3 pl-4 pr-2">
                      <div className="font-display font-semibold text-sm text-slate-text">
                        {row.title.replace(/^Scenario \d+:\s*/i, '')}
                      </div>
                      <div className="font-body text-xs text-slate-muted truncate max-w-md">{row.description}</div>
                    </td>
                    <td className="py-3 px-2 font-mono text-xs text-slate-muted">{row.slug}</td>
                    <td className="py-3 px-2 text-center">
                      <StatusPill active={row.active} />
                    </td>
                    <td className="py-3 px-2 text-center font-display text-sm font-semibold text-slate-text">
                      {row.session_count}
                    </td>
                    <td className="py-3 px-2 font-body text-xs text-slate-muted">
                      {row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 pl-2 pr-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(row)}
                          className="px-2 py-1 rounded-md text-xs font-body font-semibold text-slate-text hover:bg-navy-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(row)}
                          className="px-2 py-1 rounded-md text-xs font-body font-semibold text-slate-muted hover:bg-navy-700 hover:text-slate-text"
                        >
                          {row.active === 1 ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(row)}
                          className="px-2 py-1 rounded-md text-xs font-body font-semibold text-red-400 hover:bg-red-500/10"
                          title="Hard delete (requires confirmation)"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="py-12 text-center font-body text-sm text-slate-muted">
              No scenarios yet. Click "+ New Scenario" to add one.
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <ScenarioFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            reload();
          }}
        />
      )}

      {editTarget && (
        <ScenarioFormModal
          mode="edit"
          scenario={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            reload();
          }}
        />
      )}

      {deleteTarget && (
        <HardDeleteScenarioModal
          row={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            reload();
          }}
          onDeactivate={async () => {
            await scenariosApi.update(deleteTarget.id, { active: false });
            setDeleteTarget(null);
            reload();
          }}
        />
      )}
    </AdminLayout>
  );
}
