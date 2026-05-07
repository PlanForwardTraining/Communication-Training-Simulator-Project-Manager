import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/admin';

interface Props {
  children: React.ReactNode;
  back?: { label: string; to: string };
}

export function AdminLayout({ children, back }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="page">
      <header className="border-b border-navy-600 px-4 sm:px-6 py-4 sticky top-0 z-30 bg-navy-900/95 backdrop-blur">
        <div className="container-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {back ? (
              <button
                onClick={() => navigate(back.to)}
                className="btn-ghost text-sm flex items-center gap-1.5 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {back.label}
              </button>
            ) : (
              <Link to="/admin" className="flex flex-col leading-tight min-w-0">
                <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">
                  Plan Forward
                </span>
                <span className="font-body text-[10px] uppercase tracking-widest text-slate-muted mt-0.5">
                  Admin Console
                </span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 border border-navy-600 text-slate-text font-body text-xs font-semibold transition-colors disabled:opacity-50"
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
            <button
              onClick={() => navigate('/')}
              className="btn-ghost text-sm hidden sm:inline-block"
            >
              Run Practice
            </button>
            <span className="text-xs text-slate-muted hidden md:inline">
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
