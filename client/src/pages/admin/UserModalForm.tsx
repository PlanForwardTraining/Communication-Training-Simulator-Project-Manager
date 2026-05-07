import { useState } from 'react';
import { adminApi, type AdminUserStats } from '../../api/admin';

const DISC_OPTIONS = ['D', 'I', 'S', 'C', 'D/I', 'D/C', 'I/S', 'S/C'];

interface Props {
  mode: 'create' | 'edit';
  user?: AdminUserStats;
  onClose: () => void;
  onSaved: () => void;
}

export function UserModalForm({ mode, user, onClose, onSaved }: Props) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [discProfile, setDiscProfile] = useState(user?.disc_profile ?? 'D');
  const [role, setRole] = useState<'pm' | 'admin'>(user?.role === 'admin' ? 'admin' : 'pm');
  const [active, setActive] = useState(user ? user.active === 1 : true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === 'create';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isCreate) {
        if (!password) {
          setError('Password is required when creating a new user.');
          setSubmitting(false);
          return;
        }
        await adminApi.createUser({ name, email, password, disc_profile: discProfile, role });
      } else if (user) {
        await adminApi.updateUser(user.id, {
          name,
          disc_profile: discProfile,
          role,
          active,
          ...(password ? { password } : {}),
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display font-bold text-xl text-slate-text">
          {isCreate ? 'Add New PM' : `Edit ${user?.name}`}
        </h2>

        <div className="space-y-3">
          <label className="block">
            <span className="font-body text-xs text-slate-muted block mb-1">Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500"
            />
          </label>

          <label className="block">
            <span className="font-body text-xs text-slate-muted block mb-1">
              Email {!isCreate && <span className="opacity-60">(cannot change)</span>}
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required={isCreate}
              disabled={!isCreate}
              className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="font-body text-xs text-slate-muted block mb-1">
              {isCreate ? 'Initial Password' : 'New Password'}
              {!isCreate && <span className="opacity-60"> (leave blank to keep current)</span>}
            </span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={isCreate}
              className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500"
            />
          </label>

          <label className="block">
            <span className="font-body text-xs text-slate-muted block mb-1">DISC Profile</span>
            <select
              value={discProfile}
              onChange={e => setDiscProfile(e.target.value)}
              className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500"
            >
              {DISC_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-body text-xs text-slate-muted block mb-1">Role</span>
            <select
              value={role}
              onChange={e => setRole(e.target.value as 'pm' | 'admin')}
              className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500"
            >
              <option value="pm">PM</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {!isCreate && (
            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                className="rounded border-navy-600 bg-navy-800 text-gold-500 focus:ring-gold-500"
              />
              <span className="font-body text-sm text-slate-text">Active (can sign in)</span>
            </label>
          )}
        </div>

        {error && (
          <p className="font-body text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving…' : isCreate ? 'Create PM' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
