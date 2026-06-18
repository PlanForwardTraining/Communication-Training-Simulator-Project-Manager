import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, type AdminUserStats } from '../../api/admin';
import { AdminLayout } from './AdminLayout';
import { UserModalForm } from './UserModalForm';
import { DiscBadge } from '../../components/DiscBadge';
import { DataTable, type Column } from '../../components/DataTable';
import { UserTypesPanel } from '../../components/admin/UserTypesPanel';

// AdminUserStats now includes user_type in the shared type; alias kept for clarity
type AdminUserStatsWithType = AdminUserStats;

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-0.5 text-green-400 font-body text-xs font-semibold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-400 font-body text-xs font-semibold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    );
  }
  return <span className="text-slate-muted font-body text-xs">—</span>;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-muted font-body text-sm">—</span>;
  const color =
    score >= 80 ? 'text-green-400' :
    score >= 70 ? 'text-gold-400' :
    score >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-display font-semibold text-base ${color}`}>{score}</span>;
}

function formatLastActive(pm: AdminUserStats): string {
  if (!pm.lastSessionAt) return 'Never';
  if (pm.daysSinceLastSession === 0) return 'Today';
  if (pm.daysSinceLastSession === 1) return 'Yesterday';
  return `${pm.daysSinceLastSession}d ago`;
}

const pmTableColumns: Column<AdminUserStatsWithType>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (pm) => (
      <div className="flex items-center gap-2.5">
        <DiscBadge code={pm.disc_profile} />
        <span className="font-display font-semibold text-sm text-slate-text">{pm.name}</span>
        {pm.active === 0 && (
          <span className="font-body text-[10px] uppercase tracking-widest text-slate-muted border border-navy-600 rounded px-1">
            Inactive
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    render: (pm) => (
      <span className="font-body text-xs text-slate-muted">{pm.email}</span>
    ),
  },
  {
    key: 'user_type',
    header: 'Role',
    render: (pm) => (
      <span className="font-body text-xs text-slate-text">
        {pm.user_type || (pm.role === 'admin' ? 'Admin' : '—')}
      </span>
    ),
  },
  {
    key: 'totalSessions',
    header: 'Sessions',
    sortable: true,
    className: 'text-center',
    render: (pm) => (
      <span className="font-display font-semibold text-sm text-slate-text">{pm.totalSessions}</span>
    ),
  },
  {
    key: 'averageScore',
    header: 'Avg Score',
    sortable: true,
    sortValue: (pm) => pm.averageScore ?? -1,
    className: 'text-center',
    render: (pm) => <ScorePill score={pm.averageScore} />,
  },
  {
    key: 'daysSinceLastSession',
    header: 'Last Active',
    sortable: true,
    sortValue: (pm) => pm.daysSinceLastSession ?? 99999,
    className: 'text-center',
    render: (pm) => (
      <span className="font-body text-xs text-slate-muted">{formatLastActive(pm)}</span>
    ),
  },
  {
    key: 'focusAreas',
    header: 'Focus Areas',
    render: (pm) =>
      pm.focusAreas.length === 0 ? (
        <span className="font-body text-xs text-slate-muted">—</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {pm.focusAreas.slice(0, 2).map(f => (
            <span
              key={f.key}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-body text-[10px] font-semibold whitespace-nowrap"
              title={`Average ${f.average} across ${f.sessionsScored} sessions`}
            >
              {f.label}
            </span>
          ))}
          {pm.focusAreas.length > 2 && (
            <span className="font-body text-[10px] text-slate-muted">
              +{pm.focusAreas.length - 2}
            </span>
          )}
        </div>
      ),
  },
  {
    key: 'trend',
    header: 'Trend',
    className: 'text-center',
    render: (pm) => <TrendIcon trend={pm.trend} />,
  },
];

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<AdminUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const users = await adminApi.users();
      setAllUsers(users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-text">Users</h1>
          <p className="font-body text-sm text-slate-muted mt-1">Manage users and roles</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          + Add User
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card p-5 border-red-500/30 text-red-400 font-body text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-8">
          {/* User Types management */}
          <UserTypesPanel />

          {/* All Users table */}
          <section>
            <h2 className="font-display font-semibold text-slate-text mb-4">All Users</h2>
            <DataTable<AdminUserStatsWithType>
              columns={pmTableColumns}
              rows={allUsers as AdminUserStatsWithType[]}
              onRowClick={(pm) => navigate(`/admin/users/${pm.id}`)}
              empty='No users yet. Click "+ Add User" to onboard your first.'
            />
          </section>
        </div>
      )}

      {showModal && (
        <UserModalForm
          mode="create"
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            reload();
          }}
        />
      )}
    </AdminLayout>
  );
}
