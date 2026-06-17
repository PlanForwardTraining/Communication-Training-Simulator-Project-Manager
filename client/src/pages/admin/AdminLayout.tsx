import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';
import { BrandLogo } from '../../components/BrandLogo';

interface Props {
  children: React.ReactNode;
  back?: { label: string; to: string };
}

interface NavLinkProps {
  to: string;
  label: string;
  active: boolean;
}

function NavLink({ to, label, active }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={
        'relative px-3 py-2 font-body text-sm font-semibold transition-colors ' +
        (active
          ? 'text-gold-400'
          : 'text-slate-muted hover:text-slate-text')
      }
    >
      {label}
      {active && (
        <span className="absolute left-3 right-3 -bottom-[17px] h-0.5 bg-gold-500 rounded-full" />
      )}
    </Link>
  );
}

export function AdminLayout({ children, back }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${adminApi.exportUrl()}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `planforward-training-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Excel download failed:', err);
      alert('Excel download failed. Check the console for details.');
    } finally {
      setDownloading(false);
    }
  };

  // Determine which top-level admin section is active. Detail pages
  // (/admin/users/:id, /admin/sessions/:id) belong under "Dashboard" since
  // they're entered from there.
  const path = location.pathname;
  const onScenarios = path.startsWith('/admin/scenarios');
  const onCoaching = path.startsWith('/admin/coaching');
  const onDashboard = path === '/admin' || path.startsWith('/admin/users') || path.startsWith('/admin/sessions');

  return (
    <div className="page">
      <header className="border-b border-navy-600 px-4 sm:px-6 sticky top-0 z-30 bg-navy-900/95 backdrop-blur">
        <div className="container-lg flex items-center justify-between gap-4 h-16">
          {/* LEFT: wordmark + (optional inline back link) + nav links */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/admin" className="flex flex-col leading-tight min-w-0 mr-1 sm:mr-2">
              <BrandLogo>
                <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">
                  Plan Forward
                </span>
              </BrandLogo>
              <span className="font-body text-[10px] uppercase tracking-widest text-slate-muted mt-0.5">
                Admin
              </span>
            </Link>

            {back && (
              <button
                onClick={() => navigate(back.to)}
                className="hidden sm:flex items-center gap-1 text-xs font-body text-slate-muted hover:text-slate-text px-2 py-1 rounded-md hover:bg-navy-700 transition-colors"
                title={`Back to ${back.label}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {back.label}
              </button>
            )}

            <nav className="hidden md:flex items-center ml-2">
              <NavLink to="/admin" label="Dashboard" active={onDashboard} />
              <NavLink to="/admin/scenarios" label="Scenarios" active={onScenarios} />
              <NavLink to="/admin/coaching" label="Coaching" active={onCoaching} />
            </nav>
          </div>

          {/* RIGHT: actions, then identity + sign out */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => navigate('/')}
              className="btn-ghost text-sm hidden sm:inline-flex items-center gap-1.5"
              title="Run a practice session as a PM"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Practice
            </button>

            <button
              onClick={handleExport}
              disabled={downloading}
              className="btn-ghost text-sm flex items-center gap-1.5 disabled:opacity-50"
              title="Download all session data as Excel"
            >
              {downloading ? (
                <span className="w-3.5 h-3.5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span className="hidden sm:inline">Export Excel</span>
              <span className="sm:hidden">Export</span>
            </button>

            <span className="hidden lg:inline-flex items-center w-px h-6 bg-navy-600 mx-1" />

            <span className="hidden lg:inline-flex items-center gap-1.5 text-xs font-body text-slate-muted px-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {user?.name}
            </span>

            <button onClick={logout} className="btn-ghost text-sm text-slate-muted">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="container-lg">{children}</div>
      </main>
    </div>
  );
}
