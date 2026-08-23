import React, { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { motion } from 'framer-motion';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { Home, Loader2, Shield } from 'lucide-react';
import { adminNavGroups } from './adminNav';
import { NAV_FEATURES } from './featureGates';
import { usePlatformFeatures } from '@/hooks/usePlatformFeatures';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const {
    isAdmin,
    isSuperAdmin,
    roles = [],
    permissions = [],
    loading,
    can,
  } = useAdminAccess();
  const { isEnabled: isFeatureEnabled } = usePlatformFeatures();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-white/10 bg-[#0a0a0c]/90 p-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-red-500/30 bg-red-950/20">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-black uppercase tracking-tight text-white">Access Denied</h1>
          <p className="text-zinc-500">You don't have admin privileges.</p>
        </motion.div>
      </div>
    );
  }

  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.superOnly && !isSuperAdmin) return false;
        const feature = NAV_FEATURES[item.href];
        if (feature && !isFeatureEnabled(feature)) return false;
        return !item.permission || can(item.permission);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const primaryRole = isSuperAdmin ? 'super_admin' : roles[0] ?? 'admin';
  let runningIndex = 0;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 border-l-2 py-2 pl-3 pr-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
      isActive
        ? 'border-rose-500 text-white'
        : 'border-transparent text-zinc-500 hover:text-white'
    }`;

  const navInner = (isActive: boolean, index: number, item: (typeof adminNavGroups)[number]['items'][number]) => (
    <>
      <span className={`w-5 shrink-0 text-[10px] ${isActive ? 'text-rose-400' : 'text-zinc-700 group-hover:text-zinc-500'}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_72%)]" />
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/10 bg-black/70 backdrop-blur-2xl lg:flex">
        <div className="border-b border-white/10 p-5">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className="h-10 w-auto object-contain"
            />
            <div>
              <p className="font-heading text-lg font-black uppercase tracking-tight text-white">Esportra</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Command Centre</p>
            </div>
          </Link>
        </div>

        {/* Access — inline meta, no boxed card */}
        <div className="border-b border-white/10 px-5 py-4">
          <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Access</p>
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-xs font-bold uppercase tracking-wider ${isSuperAdmin ? 'text-rose-400' : 'text-emerald-300'}`}>
              {primaryRole.replace('_', ' ')}
            </span>
            {isSuperAdmin && <span className="h-1.5 w-1.5 bg-rose-500" />}
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {roles.length} roles <span className="text-rose-500">/</span> {permissions.length} permissions
          </p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5" data-lenis-prevent>
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const index = runningIndex++;
                  return (
                    <NavLink key={item.href} to={item.href} className={navLinkClass}>
                      {({ isActive }) => navInner(isActive, index, item)}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            to="/"
            className="flex items-center gap-3 border-l-2 border-transparent px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:border-white/25 hover:text-white"
          >
            <Home className="h-4 w-4" />
            Back to Platform
          </Link>
        </div>
      </aside>

      <main className="relative z-10 min-h-screen lg:pl-72">
        {/* ── Mobile bar ────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-2xl lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <img
                src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                alt="Esportra"
                className="h-8 w-auto object-contain"
              />
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-white">Admin</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{primaryRole.replace('_', ' ')}</p>
              </div>
            </Link>
            <Link
              to="/"
              className="border border-white/10 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400"
            >
              Home
            </Link>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" data-lenis-prevent>
            {visibleGroups.flatMap((group) => group.items).slice(0, 10).map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'border-rose-500/50 bg-rose-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-zinc-400'
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1800px]">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          }>
            {children ?? <Outlet />}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
