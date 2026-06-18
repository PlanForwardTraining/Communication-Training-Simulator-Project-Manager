/**
 * PracticeLayout
 *
 * Wraps the four PM practice/review screens (ScenarioSelect, DiscSelect,
 * Debrief, History).  SimulationPage is intentionally excluded — it stays
 * full-screen for every user.
 *
 * - Admin users: renders children inside the AdminLayout sidebar shell so the
 *   sidebar persists across the practice flow.  The page contributes only
 *   content; AdminLayout provides all chrome (no top-bar header is added here).
 *
 * - Member users: renders the existing standalone PM shell — a top-bar header
 *   (BrandLogo + "Welcome, {name}" + History + Sign out) above a flex-col
 *   container — exactly matching what the pages used to render themselves.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import { AdminLayout } from '../pages/admin/AdminLayout';

interface PracticeLayoutProps {
  children: React.ReactNode;
}

export function PracticeLayout({ children }: PracticeLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'admin') {
    // Admin path: hand everything to AdminLayout.
    // rawContent=true skips AdminLayout's own <main> + container-lg wrapper so
    // the page can provide its own <main> and container sizing without double
    // padding or nested <main> elements.
    return <AdminLayout rawContent>{children}</AdminLayout>;
  }

  // Member path: reproduce the shared PM top-bar header that all four pages
  // previously duplicated, then render children below it.
  return (
    <div className="page">
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
            <button onClick={() => navigate('/history')} className="btn-ghost text-sm">
              History
            </button>
            <button onClick={logout} className="btn-ghost text-sm text-slate-muted">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Pages render their own <main> / content below */}
      {children}
    </div>
  );
}
