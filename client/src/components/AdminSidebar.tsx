import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';

interface SideNavLinkProps {
  to: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}

function SideNavLink({ to, label, active, icon, onClick }: SideNavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={
        'relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold font-body transition-colors ' +
        (active
          ? 'text-gold-400 bg-navy-800'
          : 'text-slate-muted hover:text-slate-text hover:bg-navy-800')
      }
    >
      {active && (
        <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-gold-500 rounded-full" />
      )}
      <span className={active ? 'text-gold-400' : 'text-slate-muted'}>{icon}</span>
      {label}
    </Link>
  );
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const IconSessions = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconScenarios = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconCoaching = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const IconBranding = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const IconPlay = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconPerson = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ─── Sidebar content ──────────────────────────────────────────────────────────

interface AdminSidebarProps {
  /** When provided, close the mobile drawer after a nav click */
  onNavClick?: () => void;
}

export function AdminSidebarContent({ onNavClick }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Active-state detection — mirrors the original AdminLayout logic, split across sidebar items
  const path = location.pathname;
  // Dashboard: exact /admin, or session-detail pages (entered from dashboard)
  const onDashboard = path === '/admin' || path.startsWith('/admin/sessions');
  // Users: /admin/users list and /admin/users/:id detail
  const onUsers = path.startsWith('/admin/users');
  // Sessions: /admin/sessions list (future route) — also catches session-detail but
  // we prefer onDashboard for detail pages to preserve the original grouping intent.
  // Fine-grained: session detail → Dashboard highlighted, sessions list → Sessions highlighted.
  const onSessions = path === '/admin/sessions';
  const onScenarios = path.startsWith('/admin/scenarios');
  const onCoaching = path.startsWith('/admin/coaching');
  const onBranding = path.startsWith('/admin/branding');

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-navy-600">
        <Link to="/admin" onClick={onNavClick} className="flex flex-col leading-tight">
          <BrandLogo>
            <span className="font-wordmark text-sm font-bold tracking-widest text-gold-500 uppercase">
              Plan Forward
            </span>
          </BrandLogo>
          <span className="font-body text-[10px] uppercase tracking-widest text-slate-muted mt-0.5">
            Admin
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <SideNavLink
          to="/admin"
          label="Dashboard"
          active={onDashboard && !onSessions}
          icon={<IconDashboard />}
          onClick={onNavClick}
        />
        <SideNavLink
          to="/"
          label="Run Practice"
          active={false}
          icon={<IconPlay />}
          onClick={onNavClick}
        />
        <SideNavLink
          to="/admin/sessions"
          label="Sessions"
          active={onSessions}
          icon={<IconSessions />}
          onClick={onNavClick}
        />
        <SideNavLink
          to="/admin/users"
          label="Users"
          active={onUsers}
          icon={<IconUsers />}
          onClick={onNavClick}
        />
        <SideNavLink
          to="/admin/scenarios"
          label="Scenarios"
          active={onScenarios}
          icon={<IconScenarios />}
          onClick={onNavClick}
        />
        <SideNavLink
          to="/admin/coaching"
          label="Coaching"
          active={onCoaching}
          icon={<IconCoaching />}
          onClick={onNavClick}
        />
        <SideNavLink
          to="/admin/branding"
          label="Branding"
          active={onBranding}
          icon={<IconBranding />}
          onClick={onNavClick}
        />
      </nav>

      {/* Footer actions */}
      <div className="border-t border-navy-600 px-3 py-3 space-y-0.5">
        <div className="px-3 py-2 flex items-center gap-2 text-xs font-body text-slate-muted">
          <IconPerson />
          <span className="truncate">{user?.name}</span>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold font-body text-slate-muted hover:text-slate-text hover:bg-navy-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Full sidebar (desktop static + mobile overlay) ───────────────────────────

interface AdminSidebarProps2 {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps2) {
  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-navy-900 border-r border-navy-600 h-screen sticky top-0">
        <AdminSidebarContent />
      </aside>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={
          'fixed inset-y-0 left-0 z-50 w-64 bg-navy-900 border-r border-navy-600 flex flex-col md:hidden transition-transform duration-200 ' +
          (mobileOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        {/* Close button */}
        <button
          onClick={onMobileClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-slate-muted hover:text-slate-text hover:bg-navy-800 transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <AdminSidebarContent onNavClick={onMobileClose} />
      </aside>
    </>
  );
}
