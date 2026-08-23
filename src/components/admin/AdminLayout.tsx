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

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px] [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_72%)]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-black/70 backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="border-b border-white/10 p-5">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className="h-10 w-auto object-contain"
            />
            <div>
              <p className="font-heading text-lg font-black uppercase tracking-tight text-white">Esportra Admin</p>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Command Center</p>
            </div>
          </Link>
        </div>

        <div className="space-y-3 border-b border-white/10 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Access</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                isSuperAdmin
                  ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/25'
                  : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
              }`}
              >
                {primaryRole.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-black/30 p-3">
                <p className="text-2xl font-black text-white">{roles.length}</p>
                <p className="text-xs text-zinc-500">Roles</p>
              </div>
              <div className="rounded-xl bg-black/30 p-3">
                <p className="text-2xl font-black text-white">{permissions.length}</p>
                <p className="text-xs text-zinc-500">Permissions</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5" data-lenis-prevent>
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        isActive
                          ? 'bg-rose-500/15 text-white ring-1 ring-rose-500/25'
                          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-400 transition hover:border-rose-500/30 hover:text-white"
          >
            <Home className="h-4 w-4" />
            Back to Platform
          </Link>
        </div>
      </aside>

      <main className="relative z-10 min-h-screen lg:pl-72">
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
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{primaryRole.replace('_', ' ')}</p>
              </div>
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400"
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
                  `flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                    isActive
                      ? 'border-rose-500/40 bg-rose-500/15 text-white'
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
