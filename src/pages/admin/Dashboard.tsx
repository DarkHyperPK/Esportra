import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Shield, Users, Trophy, DollarSign, UserPlus, Activity, MapPin,
  AlertTriangle, ShieldCheck, Building, FileCheck, RefreshCw,
  Megaphone, ScrollText, BarChart3, Settings, TrendingUp, TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminDashboardStats, useAdminActivityFeed, useAdminTrends,
} from '@/hooks/useAdminQueries';

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

const relativeTime = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
};

/* ═══════════════════════════════════════════════════════════════════════════
   Config Arrays
   ═══════════════════════════════════════════════════════════════════════ */

type KpiCfg = {
  icon: LucideIcon; label: string; iconBg: string; iconTxt: string;
  getValue: (d: Record<string, any>) => string;
  getGrowth?: (d: Record<string, any>) => number | undefined;
  getSecondary?: (d: Record<string, any>) => string | undefined;
};

const KPI_CARDS: KpiCfg[] = [
  { icon: Users, label: 'Total Users', iconBg: 'bg-rose-500/10', iconTxt: 'text-rose-400',
    getValue: d => fmtNum(d.totalUsers ?? 0), getGrowth: d => d.signupsGrowth },
  { icon: Trophy, label: 'Active Tournaments', iconBg: 'bg-amber-500/10', iconTxt: 'text-amber-400',
    getValue: d => fmtNum(d.activeTournaments ?? 0),
    getSecondary: d => `${d.tournamentsCreatedToday ?? 0} new today` },
  { icon: DollarSign, label: 'Total Prize Pool', iconBg: 'bg-emerald-500/10', iconTxt: 'text-emerald-400',
    getValue: d => fmtCurrency(d.totalPrizePool ?? 0), getGrowth: d => d.tournamentsGrowth },
  { icon: UserPlus, label: 'Signups Today', iconBg: 'bg-blue-500/10', iconTxt: 'text-blue-400',
    getValue: d => fmtNum(d.signupsToday ?? 0),
    getSecondary: d => `${d.signupsThisWeek ?? 0} this week` },
  { icon: Activity, label: 'Active Users (24h)', iconBg: 'bg-violet-500/10', iconTxt: 'text-violet-400',
    getValue: d => fmtNum(d.activeUsers24h ?? 0) },
  { icon: MapPin, label: 'Total Venues', iconBg: 'bg-cyan-500/10', iconTxt: 'text-cyan-400',
    getValue: d => fmtNum(d.totalVenues ?? 0),
    getSecondary: d => `${d.totalBookings ?? 0} bookings` },
];

const PENDING_ITEMS = [
  { key: 'pendingDisputes', label: 'Pending Disputes', to: '/admin/disputes',
    icon: AlertTriangle, dot: 'bg-amber-400', txt: 'text-amber-400', bdr: 'hover:border-amber-500/30' },
  { key: 'pendingVerifications', label: 'Pending Verifications', to: '/admin/tools/verification-system',
    icon: ShieldCheck, dot: 'bg-blue-400', txt: 'text-blue-400', bdr: 'hover:border-blue-500/30' },
  { key: 'pendingVenues', label: 'Pending Venues', to: '/admin/tools/venue-management',
    icon: Building, dot: 'bg-violet-400', txt: 'text-violet-400', bdr: 'hover:border-violet-500/30' },
  { key: 'pendingLicenses', label: 'Pending Licenses', to: '/admin/tools/license-management',
    icon: FileCheck, dot: 'bg-emerald-400', txt: 'text-emerald-400', bdr: 'hover:border-emerald-500/30' },
] as const;

const NAV_ITEMS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'User Management', to: '/admin/tools/user-management', icon: Users },
  { label: 'Tournaments', to: '/admin/tools/tournament-management', icon: Trophy },
  { label: 'Venues', to: '/admin/tools/venue-management', icon: MapPin },
  { label: 'Disputes', to: '/admin/disputes', icon: AlertTriangle },
  { label: 'Sponsors', to: '/admin/tools/sponsor-management', icon: Megaphone },
  { label: 'Audit Logs', to: '/admin/tools/audit-logs', icon: ScrollText },
  { label: 'Analytics', to: '/admin/tools/analytics', icon: BarChart3 },
  { label: 'System Settings', to: '/admin/tools/system-settings', icon: Settings },
];

const PERIOD_OPTIONS = [{ label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: '90d', value: 90 }] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   KPI Card
   ═══════════════════════════════════════════════════════════════════════ */

const KpiCard = ({ cfg, data, index }: { cfg: KpiCfg; data: Record<string, any>; index: number }) => {
  const growth = cfg.getGrowth?.(data);
  const secondary = cfg.getSecondary?.(data);
  const Icon = cfg.icon;

  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show"
      className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.iconBg}`}>
          <Icon className={`h-5 w-5 ${cfg.iconTxt}`} />
        </div>
        {growth != null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{cfg.getValue(data)}</p>
      <p className="text-sm text-zinc-400">{cfg.label}</p>
      {secondary && <p className="mt-1 text-xs text-zinc-500">{secondary}</p>}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Chart Tooltip
   ═══════════════════════════════════════════════════════════════════════ */

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#121214] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-zinc-400">{label}</p>
      {payload.map((e: any) => (
        <p key={e.dataKey} className="text-sm font-medium" style={{ color: e.color }}>
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Growth Trends Chart
   ═══════════════════════════════════════════════════════════════════════ */

const GrowthTrendsChart = () => {
  const [days, setDays] = useState(30);
  const { data: trends, isLoading, error: trendsError, refetch: refetchTrends } = useAdminTrends(days);

  const tournamentsMap = new Map(
    (trends?.tournamentCreations ?? []).map((t: any) => [t.date, t.count])
  );
  const chartData = (trends?.userSignups ?? []).map((s: any) => ({
    date: format(new Date(s.date), 'MMM d'),
    Signups: s.count,
    Tournaments: tournamentsMap.get(s.date) ?? 0,
  }));

  return (
    <motion.div variants={fadeUp} custom={7} initial="hidden" animate="show"
      className="min-w-0 flex-1 rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-white">Growth Trends</h3>
        <div className="flex gap-1 rounded-lg bg-[#121214] p-1" role="group" aria-label="Period selector">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setDays(p.value)}
              aria-pressed={days === p.value}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                days === p.value ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-[280px] w-full rounded-xl" />
      ) : trendsError ? (
        <div className="flex flex-col items-center justify-center h-[300px] text-zinc-400">
          <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-sm">Failed to load trends</p>
          <Button variant="ghost" size="sm" className="mt-2 text-rose-400" onClick={() => refetchTrends()}>
            Retry
          </Button>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradTournaments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fill: '#71717a', fontSize: 12 }} width={40} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="Signups" stroke="#f43f5e" strokeWidth={2}
              fill="url(#gradSignups)" name="Signups" />
            <Area type="monotone" dataKey="Tournaments" stroke="#3b82f6" strokeWidth={2}
              fill="url(#gradTournaments)" name="Tournaments" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Activity Feed
   ═══════════════════════════════════════════════════════════════════════ */

const ActivityFeed = () => {
  const { data: activities, isLoading, error: feedError, refetch: refetchFeed } = useAdminActivityFeed(15);

  return (
    <motion.div variants={fadeUp} custom={8} initial="hidden" animate="show"
      className="w-full rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 lg:w-80 xl:w-96">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <Link to="/admin/tools/audit-logs"
          className="text-xs text-rose-400 transition-colors hover:text-rose-300">
          View All
        </Link>
      </div>
      <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : feedError ? (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
            <p className="text-sm">Failed to load activity</p>
            <Button variant="ghost" size="sm" className="mt-2 text-rose-400" onClick={() => refetchFeed()}>
              Retry
            </Button>
          </div>
        ) : !activities?.length ? (
          <p className="py-8 text-center text-sm text-zinc-500">No recent activity</p>
        ) : (
          activities.map((a: any, i: number) => (
            <div key={`${a.created_at}-${i}`} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#121214] text-xs font-bold text-zinc-300">
                {(a.actor_name ?? '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-300">
                  <span className="font-medium text-white">{a.actor_name ?? 'System'}</span>{' '}
                  {a.action}{' '}
                  <span className="text-zinc-500">
                    {a.target_type}{a.target_id ? ` ${a.target_id.slice(0, 8)}` : ''}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">{relativeTime(a.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton State
   ═══════════════════════════════════════════════════════════════════════ */

const DashboardSkeleton = () => (
  <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div className="space-y-1">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-40" />
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[130px] rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}
    </div>
    <div className="flex flex-col gap-4 lg:flex-row">
      <Skeleton className="h-[360px] flex-1 rounded-2xl" />
      <Skeleton className="h-[360px] w-full rounded-2xl lg:w-80" />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Main Dashboard
   ═══════════════════════════════════════════════════════════════════════ */

const Dashboard = () => {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useAdminDashboardStats();

  if (isLoading) return <div className="min-h-screen bg-[#050505]"><DashboardSkeleton /></div>;

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#050505] px-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-8 py-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Failed to load dashboard</h2>
          <p className="mt-1 text-sm text-zinc-400">{(error as Error).message ?? 'An unexpected error occurred.'}</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4 gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const d: Record<string, any> = data ?? {};

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <Shield className="h-7 w-7 text-rose-500" /> Command Center
            </h1>
            <p className="mt-1 text-sm text-zinc-400">Real-time platform overview</p>
          </div>
          <div className="flex items-center gap-3">
            {dataUpdatedAt > 0 && (
              <span className="text-xs text-zinc-500">
                Updated {format(new Date(dataUpdatedAt), 'h:mm:ss a')}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}
              aria-label="Refresh dashboard data" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* ── Row 1 · KPI Cards ──────────────────────────────────────────── */}
        <section aria-label="Key performance indicators"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KPI_CARDS.map((cfg, i) => <KpiCard key={cfg.label} cfg={cfg} data={d} index={i} />)}
        </section>

        {/* ── Row 2 · Pending Actions ────────────────────────────────────── */}
        <section aria-label="Pending actions" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PENDING_ITEMS.map((item, i) => {
            const count: number = d[item.key] ?? 0;
            const Icon = item.icon;
            return (
              <motion.div key={item.key} custom={i + 6} variants={fadeUp} initial="hidden" animate="show">
                <Link to={item.to}
                  className={`relative flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 transition-all hover:bg-[#121214] ${item.bdr}`}>
                  {count > 0 && (
                    <span className={`absolute right-3 top-3 h-2 w-2 animate-pulse rounded-full ${item.dot}`} />
                  )}
                  <Icon className={`h-5 w-5 shrink-0 ${count > 0 ? item.txt : 'text-zinc-600'}`} />
                  <div className="min-w-0">
                    <p className={`text-lg font-bold ${count > 0 ? 'text-white' : 'text-zinc-600'}`}>{count}</p>
                    <p className="truncate text-xs text-zinc-400">{item.label}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </section>

        {/* ── Row 3 · Chart + Activity Feed ──────────────────────────────── */}
        <section aria-label="Analytics and activity" className="flex flex-col gap-4 lg:flex-row">
          <GrowthTrendsChart />
          <ActivityFeed />
        </section>

        {/* ── Row 4 · Quick Navigation ───────────────────────────────────── */}
        <motion.section variants={fadeUp} custom={9} initial="hidden" animate="show" aria-label="Quick navigation">
          <h3 className="mb-3 text-lg font-semibold text-white">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to}
                className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 transition-all hover:scale-[1.02] hover:border-rose-500/20 hover:bg-[#121214]">
                <Icon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-rose-400" />
                <span className="text-sm font-medium text-zinc-300 transition-colors group-hover:text-white">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </motion.section>

      </div>
    </div>
  );
};

export default Dashboard;
