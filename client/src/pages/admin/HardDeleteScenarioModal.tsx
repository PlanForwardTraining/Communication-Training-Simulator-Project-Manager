import { useState } from 'react';
import { scenariosApi, type AdminScenarioRow } from '../../api/scenarios';

interface Props {
  row: AdminScenarioRow;
  onClose: () => void;
  onDeleted: () => void;
  onDeactivate: () => Promise<void>;
}

const CONFIRM_WORD = 'DELETE';

export function HardDeleteScenarioModal({ row, onClose, onDeleted, onDeactivate }: Props) {
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSessions = row.session_count > 0;
  const canHardDelete = !hasSessions && typed === CONFIRM_WORD;

  const handleHardDelete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await scenariosApi.hardDelete(row.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hard delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-navy-900/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-lg text-slate-text">Permanently delete scenario?</h2>
            <p className="font-body text-sm text-slate-muted mt-1 leading-relaxed">
              You're about to permanently remove <span className="font-semibold text-slate-text">{row.title}</span> from the system.
            </p>
          </div>
        </div>

        {hasSessions ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
            <p className="font-body text-sm text-amber-400 font-semibold">
              {row.session_count} past session{row.session_count === 1 ? '' : 's'} reference{row.session_count === 1 ? 's' : ''} this scenario.
            </p>
            <p className="font-body text-xs text-slate-muted leading-relaxed">
              Hard delete is blocked to preserve session history and admin reports. <span className="text-slate-text font-medium">Deactivate instead</span> — it disappears from the PM scenario picker but past sessions still display correctly.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2">
              <p className="font-body text-sm text-red-400 font-semibold">This is permanent.</p>
              <p className="font-body text-xs text-slate-muted leading-relaxed">
                The scenario row will be removed from the database. There are no sessions to lose, but you cannot undo this.
              </p>
            </div>
            <label className="block">
              <span className="font-body text-xs text-slate-muted block mb-1">
                Type <span className="font-mono font-semibold text-slate-text">{CONFIRM_WORD}</span> to confirm
              </span>
              <input
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                autoFocus
                className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-text font-body font-mono focus:outline-none focus:border-red-500"
                placeholder={CONFIRM_WORD}
              />
            </label>
          </>
        )}

        {error && <p className="font-body text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2 border-t border-navy-700">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onDeactivate}
            disabled={submitting || row.active === 0}
            className="flex-1 px-4 py-3 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-body font-semibold text-sm transition-colors disabled:opacity-40"
          >
            {row.active === 1 ? 'Deactivate instead' : 'Already inactive'}
          </button>
          <button
            type="button"
            onClick={handleHardDelete}
            disabled={!canHardDelete || submitting}
            className="flex-1 bg-red-500 hover:bg-red-400 disabled:bg-red-500/30 disabled:cursor-not-allowed text-white font-body font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            {submitting ? 'Deleting…' : 'Hard delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
