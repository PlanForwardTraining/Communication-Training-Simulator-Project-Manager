import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type AdminSessionRow } from '../../api/admin';
import { scenariosApi, type AdminScenarioRow } from '../../api/scenarios';
import { AdminLayout } from './AdminLayout';
import { DataTable, type Column } from '../../components/DataTable';

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: AdminSessionRow['status'] }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 font-body text-[10px] font-semibold uppercase tracking-widest">
        Completed
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-300 font-body text-[10px] font-semibold uppercase tracking-widest">
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-muted/15 border border-slate-muted/30 text-slate-muted font-body text-[10px] font-semibold uppercase tracking-widest">
      Empty
    </span>
  );
}

// ─── Score cell ───────────────────────────────────────────────────────────────

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-muted font-body text-sm">—</span>;
  const color =
    score >= 80 ? 'text-green-400' :
    score >= 70 ? 'text-gold-400' :
    score >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-display font-semibold text-sm ${color}`}>{score}</span>;
}

// ─── Export helper (mirrors AdminSidebar approach: fetch + blob to carry auth) ──

function buildExportUrl(filters: Record<string, string>): string {
  const qs = new URLSearchParams(filters).toString();
  const base = (import.meta.env.VITE_API_BASE_URL as string) ?? '';
  return `${base}/api/admin/export.xlsx${qs ? `?${qs}` : ''}`;
}

async function downloadExcel(filters: Record<string, string>): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch(buildExportUrl(filters), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planforward-sessions-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = '' | 'completed' | 'in_progress' | 'empty';

export function AdminSessionsPage() {
  const navigate = useNavigate();

  // Filter state
  const [userId, setUserId]     = useState('');
  const [scenarioId, setScenarioId] = useState('');
  const [status, setStatus]     = useState<StatusFilter>('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');

  // Data
  const [sessions, setSessions]   = useState<AdminSessionRow[]>([]);
  const [users, setUsers]         = useState<{ id: number; name: string; email: string }[]>([]);
  const [scenarios, setScenarios] = useState<AdminScenarioRow[]>([]);

  // UI state
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [purging, setPurging]     = useState(false);
  const [purgeMsg, setPurgeMsg]   = useState<string | null>(null);

  // ── Build query from non-empty filters ──────────────────────────────────────
  const buildQuery = useCallback((): Record<string, string> => {
    const q: Record<string, string> = {};
    if (userId)     q.userId     = userId;
    if (scenarioId) q.scenarioId = scenarioId;
    if (status)     q.status     = status;
    if (from)       q.from       = from;
    if (to)         q.to         = to;
    return q;
  }, [userId, scenarioId, status, from, to]);

  // ── Fetch sessions ───────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPurgeMsg(null);
    try {
      setSessions(await adminApi.sessions(buildQuery()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  // ── Load filter options once ─────────────────────────────────────────────────
  useEffect(() => {
    adminApi.users()
      .then(us => setUsers(us.map(u => ({ id: u.id, name: u.name, email: u.email }))))
      .catch(() => { /* non-fatal; filter stays empty */ });
    scenariosApi.adminList()
      .then(setScenarios)
      .catch(() => { /* non-fatal */ });
  }, []);

  // ── Re-fetch whenever filters change ─────────────────────────────────────────
  useEffect(() => {
    reload();
  }, [reload]);

  // ── Delete session ───────────────────────────────────────────────────────────
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this session and all its turns, events, and coaching? This cannot be undone.')) return;
    try {
      await adminApi.deleteSession(id);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // ── Purge empty sessions ─────────────────────────────────────────────────────
  const handlePurge = async () => {
    if (!window.confirm('Purge all sessions with no turns and no coaching? This cannot be undone.')) return;
    setPurging(true);
    setPurgeMsg(null);
    try {
      const { purged } = await adminApi.purgeEmpty();
      setPurgeMsg(`Purged ${purged} empty session${purged === 1 ? '' : 's'}.`);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setPurging(false);
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExcel(buildQuery());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────────
  const columns: Column<AdminSessionRow>[] = [
    {
      key: 'started_at',
      header: 'Date',
      sortable: true,
      sortValue: row => row.started_at,
      render: row => (
        <span className="font-body text-xs text-slate-text whitespace-nowrap">
          {new Date(row.started_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'user_name',
      header: 'User',
      sortable: true,
      render: row => (
        <div>
          <div className="font-body text-sm text-slate-text">{row.user_name}</div>
          <div className="font-body text-[11px] text-slate-muted">{row.user_email}</div>
        </div>
      ),
    },
    {
      key: 'scenario_title',
      header: 'Scenario',
      sortable: true,
      render: row => (
        <span className="font-body text-xs text-slate-text">
          {row.scenario_title ?? '—'}
        </span>
      ),
    },
    {
      key: 'client_disc_code',
      header: 'DISC',
      sortable: true,
      render: row => (
        <span className="font-body text-xs font-semibold text-slate-text">
          {row.client_disc_code ?? '—'}
        </span>
      ),
    },
    {
      key: 'total_score',
      header: 'Score',
      sortable: true,
      sortValue: row => row.total_score ?? -1,
      render: row => <ScoreCell score={row.total_score} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: row => <StatusChip status={row.status} />,
    },
    {
      key: '_actions',
      header: '',
      className: 'text-right',
      render: row => (
        <button
          onClick={e => handleDelete(e, row.id)}
          className="px-2 py-1 rounded-md text-xs font-body font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          title="Delete session"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <AdminLayout back={{ label: 'Dashboard', to: '/admin' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-text">Sessions</h1>
          <p className="font-body text-sm text-slate-muted mt-1">
            Browse, filter, and manage all training sessions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePurge}
            disabled={purging}
            className="btn-ghost text-sm disabled:opacity-50"
            title="Delete all sessions that have no turns or coaching"
          >
            {purging ? 'Purging…' : 'Purge empty'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* User */}
          <div>
            <label className="block font-body text-[10px] uppercase tracking-widest text-slate-muted mb-1">
              User
            </label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="input w-full text-xs"
            >
              <option value="">All users</option>
              {users.map(u => (
                <option key={u.id} value={String(u.id)}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scenario */}
          <div>
            <label className="block font-body text-[10px] uppercase tracking-widest text-slate-muted mb-1">
              Scenario
            </label>
            <select
              value={scenarioId}
              onChange={e => setScenarioId(e.target.value)}
              className="input w-full text-xs"
            >
              <option value="">All scenarios</option>
              {scenarios.map(s => (
                <option key={s.id} value={String(s.id)}>
                  {s.title.replace(/^Scenario \d+:\s*/i, '')}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-body text-[10px] uppercase tracking-widest text-slate-muted mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as StatusFilter)}
              className="input w-full text-xs"
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In progress</option>
              <option value="empty">Empty</option>
            </select>
          </div>

          {/* From */}
          <div>
            <label className="block font-body text-[10px] uppercase tracking-widest text-slate-muted mb-1">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="input w-full text-xs"
            />
          </div>

          {/* To */}
          <div>
            <label className="block font-body text-[10px] uppercase tracking-widest text-slate-muted mb-1">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="input w-full text-xs"
            />
          </div>
        </div>
      </div>

      {/* Purge feedback */}
      {purgeMsg && (
        <div className="mb-4 text-sm font-body text-green-400">{purgeMsg}</div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-5 border-red-500/30 text-red-400 font-body text-sm mb-4">{error}</div>
      )}

      {/* Loading spinner */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DataTable<AdminSessionRow>
          columns={columns}
          rows={sessions}
          onRowClick={row => navigate(`/admin/sessions/${row.id}`)}
          empty="No sessions match the current filters."
        />
      )}

      {/* Footer actions */}
      {!loading && sessions.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="font-body text-xs text-slate-muted">
            {sessions.length} session{sessions.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePurge}
              disabled={purging}
              className="btn-ghost text-xs disabled:opacity-50"
            >
              {purging ? 'Purging…' : 'Purge empty'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
