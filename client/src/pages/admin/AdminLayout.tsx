import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AdminSidebar } from '../../components/AdminSidebar';

interface Props {
  children: React.ReactNode;
  back?: { label: string; to: string };
  /**
   * When true, children are rendered directly inside the right-column flex
   * container without the standard `<main py-8 px-4><div container-lg>`
   * wrapper.  Used by PracticeLayout so PM pages can provide their own
   * semantic <main> and container sizing without double-wrapping.
   */
  rawContent?: boolean;
}

export function AdminLayout({ children, back, rawContent = false }: Props) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-navy-900">
      {/* Sidebar — desktop static, mobile drawer */}
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Right column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar (hamburger + optional back) */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-navy-600 bg-navy-900/95 backdrop-blur sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-md text-slate-muted hover:text-slate-text hover:bg-navy-800 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {back && (
            <button
              onClick={() => navigate(back.to)}
              className="flex items-center gap-1 text-xs font-body text-slate-muted hover:text-slate-text px-2 py-1 rounded-md hover:bg-navy-700 transition-colors"
              title={`Back to ${back.label}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {back.label}
            </button>
          )}
        </header>

        {/* Desktop back link (if any) */}
        {back && (
          <div className="hidden md:flex px-6 pt-5">
            <button
              onClick={() => navigate(back.to)}
              className="flex items-center gap-1 text-xs font-body text-slate-muted hover:text-slate-text px-2 py-1 rounded-md hover:bg-navy-700 transition-colors"
              title={`Back to ${back.label}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {back.label}
            </button>
          </div>
        )}

        {rawContent ? (
          // PM practice pages provide their own <main> + container sizing.
          // Render children directly so there's no double padding or
          // nested <main> element.
          <>{children}</>
        ) : (
          <main className="flex-1 py-8 px-4 sm:px-6">
            <div className="container-lg">{children}</div>
          </main>
        )}
      </div>
    </div>
  );
}
