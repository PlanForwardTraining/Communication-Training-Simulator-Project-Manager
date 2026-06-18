import { useEffect, useRef, useState } from 'react';
import { adminApi, type UserType } from '../../api/admin';

export function UserTypesPanel() {
  const [types, setTypes] = useState<UserType[]>([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    adminApi.userTypes().then(setTypes).catch(() => {/* non-blocking */});
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const updated = await adminApi.addUserType(trimmed);
      setTypes(updated);
      setNewName('');
      inputRef.current?.focus();
    } catch (e) {
      // silently surface in the input area — unlikely but possible
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (name: string) => {
    setRemoveErrors(prev => ({ ...prev, [name]: '' }));
    try {
      const updated = await adminApi.removeUserType(name);
      setTypes(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cannot remove';
      setRemoveErrors(prev => ({ ...prev, [name]: msg }));
    }
  };

  return (
    <section className="card p-5">
      <h2 className="font-display font-semibold text-slate-text mb-1">Roles</h2>
      <p className="font-body text-xs text-slate-muted mb-4 leading-relaxed">
        Define the roles people can have. <strong className="text-slate-text font-medium">Admin</strong> grants dashboard access; other roles are members and control which scenarios they see.
      </p>

      {types.length === 0 ? (
        <p className="font-body text-xs text-slate-muted italic mb-3">No roles yet.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {types.map(t => (
            <li key={t.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-sm text-slate-text">
                  {t.name}
                  {t.name === 'Admin' && (
                    <span className="ml-2 font-body text-[10px] uppercase tracking-widest text-slate-muted border border-navy-600 rounded px-1">
                      reserved
                    </span>
                  )}
                </span>
                {t.name !== 'Admin' && (
                  <button
                    type="button"
                    onClick={() => handleRemove(t.name)}
                    className="text-slate-muted hover:text-red-400 transition-colors text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10"
                    title={`Remove "${t.name}"`}
                    aria-label={`Remove ${t.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
              {removeErrors[t.name] && (
                <p className="font-body text-xs text-red-400 mt-0.5 pl-0">{removeErrors[t.name]}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="New role name…"
          className="flex-1 bg-navy-800 border border-navy-600 rounded-lg px-3 py-1.5 text-sm text-slate-text font-body focus:outline-none focus:border-gold-500 placeholder:text-slate-muted/50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
        >
          {adding ? '…' : 'Add'}
        </button>
      </div>
    </section>
  );
}
