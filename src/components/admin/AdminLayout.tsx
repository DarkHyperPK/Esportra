import React, { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { motion } from 'framer-motion';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { Loader2 } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarClock,
  Database,
  FileText,
  Flag,
  Gamepad2,
  Home,
  LayoutDashboard,
  Lock,
  LucideIcon,
  MapPin,
  Megaphone,
  Monitor,
  Scale,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  Smile,
  ToggleRight,
  Trophy,
  UserSearch,
  Users,
  UsersRound,
} from 'lucide-react';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  superOnly?: boolean;
};

type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Command Centre', href: '/admin/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
    ],
  },
  {
    label: 'Users & Access',
    items: [
      { label: 'All Users', href: '/admin/users', icon: Users, permission: 'users:view' },
      { label: 'Verifications', href: '/admin/users/verifications', icon: ShieldCheck, permission: 'verification:view' },
      { label: 'Licenses', href: '/admin/users/licenses', icon: Scale, permission: 'licenses:view' },
      { label: 'Sessions', href: '/admin/users/sessions', icon: Monitor, permission: 'security:view_sessions' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Tournaments', href: '/admin/content/tournaments', icon: Trophy, permission: 'tournaments:view' },
      { label: 'Teams', href: '/admin/content/teams', icon: UsersRound, permission: 'teams:view' },
      { label: 'Venues', href: '/admin/content/venues', icon: MapPin, permission: 'venues:view' },
      { label: 'Games', href: '/admin/content/games', icon: Gamepad2, permission: 'games:manage' },
      { label: 'Moderation', href: '/admin/content/moderation', icon: Shield, permission: 'moderation:view' },
      { label: 'Avatar Pool', href: '/admin/tools/avatar-pool', icon: Smile, permission: 'system:config_view', superOnly: true },
    ],
  },
  {
    label: 'Partners',
    items: [
      { label: 'Sponsors', href: '/admin/partners/sponsors', icon: Flag, permission: 'sponsors:view' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Disputes', href: '/admin/operations/disputes', icon: AlertTriangle, permission: 'disputes:view' },
      { label: 'Alerts', href: '/admin/operations/alerts', icon: Bell, permission: 'alerts:view' },
      { label: 'Reports', href: '/admin/operations/reports', icon: CalendarClock, permission: 'reports:view' },
      { label: 'Broadcasts', href: '/admin/operations/broadcasts', icon: Megaphone, permission: 'broadcasts:view' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Feature Flags', href: '/admin/system/feature-flags', icon: ToggleRight, permission: 'feature_flags:view' },
      { label: 'Settings', href: '/admin/system/settings', icon: Settings, permission: 'system:config_view' },
      { label: 'Kill Switches', href: '/admin/system/kill-switches', icon: ShieldAlert, permission: 'system:config_view' },
      { label: 'Anomalies', href: '/admin/system/anomalies', icon: AlertTriangle, permission: 'system:config_view' },
    ],
  },
  {
    label: 'Security',
    items: [
      { label: 'Role Builder', href: '/admin/security/roles', icon: Lock, permission: 'rbac:view' },
      { label: 'Admin Access', href: '/admin/security/admins', icon: ShieldPlus, permission: 'admin_users:view' },
      { label: 'IP Allowlist', href: '/admin/security/ip-allowlist', icon: SlidersHorizontal, permission: 'security:manage_ip_allowlist' },
      { label: 'Audit Logs', href: '/admin/security/audit-logs', icon: FileText, permission: 'audit:view' },
      { label: 'GDPR', href: '/admin/security/gdpr', icon: Database, permission: 'gdpr:view' },
      { label: 'Ghost Mode', href: '/admin/security/ghost', icon: UserSearch, permission: 'users:impersonate', superOnly: true },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { label: 'Overview', href: '/admin/analytics', icon: BarChart3, permission: 'analytics:view' },
    ],
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const {
    isAdmin,
    isSuperAdmin,
    roles = [],
    permissions = [],
    loading,
    can,
  } = useAdminAccess();

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
