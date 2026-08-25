import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Database,
  Flag,
  Shield,
  TrendingUp,
  WifiOff,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAdminHub } from '@/hooks/useAdminHub';
import { adminNavGroups } from '@/components/admin/adminNav';
import {
  CommandButton,
  CommandHeader,
  CommandSection,
  CommandShell,
} from '@/components/management/CommandSurface';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingCounts {
  verifications: number;
  verifications_stale: number;
  disputes: number;
  disputes_stale: number;
  ghost_approvals: number;
  alerts: number;
  alerts_critical: number;
  moderation: number;
  moderation_today: number;
  gdpr: number;
  gdpr_due_soon: number;
}

interface Stats {
  users_total: number;
  users_growth: number;
  tournaments_total: number;
  tournaments_growth: number;
  admins_active_recently: number;
}

interface SponsorKpis {
  impressions_30d: number;
  clicks_30d: number;
  active_sponsors: number;
}

interface SystemHealth {
  kill_switches_armed: number;
  kill_switches_total: number;
  anomalies_unresolved: number;
  feature_flags_enabled: number;
}

interface ActivityItem {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_name: string | null;
  created_at: string;
  actor_name: string | null;
}

interface PendingVerification {
  id: string;
  requested_role: string;
  status: string;
  business_name: string | null;
  first_name: string;
  last_name: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
}

interface CommandCentreCharts {
  signups_14d: { day: string; count: number }[];
  tournaments_14d: { day: string; count: number }[];
  disputes_14d: { day: string; count: number }[];
  sponsor_daily_14d: { day: string; impressions: number; clicks: number }[];
}

interface CommandCentreData {
  pending_counts: PendingCounts;
  stats: Stats;
  sponsor_kpis: SponsorKpis;
  system_health: SystemHealth;
  payments_available: boolean;
  signups_7d: { day: string; count: number }[];
  recent_activity: ActivityItem[];
  oldest_pending: PendingVerification[];
  charts?: CommandCentreCharts;
}

const actionTypeLabels: Record<string, string> = {
  user_created: 'User signed up',
  user_suspended: 'User suspended',
  user_unsuspended: 'User unsuspended',
  verification_approved: 'Verification approved',
  verification_rejected: 'Verification rejected',
  tournament_created: 'Tournament created',
  tournament_cancelled: 'Tournament cancelled',
  dispute_opened: 'Dispute opened',
  dispute_resolved: 'Dispute resolved',
  role_assigned: 'Role assigned',
  role_removed: 'Role removed',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-zinc-500">
      {children}
    </p>
  );
}

const chartTick = {
  fill: '#52525b',
  fontSize: 10,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

const formatDayTick = (day: string) => format(new Date(`${day}T00:00:00`), 'MMM d');

function mergeDailyCounts(
  primary: { day: string; count: number }[],
  secondary: { day: string; count: number }[],
) {
  const byDay = new Map<string, { day: string; signups: number; tournaments: number }>();
  primary.forEach(p => byDay.set(p.day, { day: p.day, signups: p.count, tournaments: 0 }));
  secondary.forEach(p => {
    const row = byDay.get(p.day) ?? { day: p.day, signups: 0, tournaments: 0 };
    row.tournaments = p.count;
    byDay.set(p.day, row);
  });
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="border border-[#3f3f46] bg-[#18181b] px-3 py-2 font-mono text-xs text-zinc-200">
      {label ? <p className="mb-1 uppercase tracking-wider text-zinc-500">{formatDayTick(String(label))}</p> : null}
      <div className="space-y-0.5">
        {payload.map(entry => (
          <p key={String(entry.dataKey)} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5" style={{ background: entry.color ?? '#f43f5e' }} />
            <span className="uppercase tracking-wider">{entry.name}</span>
            <span className="ml-auto pl-4 font-bold text-white">{Number(entry.value).toLocaleString()}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export default function CommandCentre() {
  const { can, isSuperAdmin } = useAdminAccess();
  const { connected: hubConnected, refreshCounts } = useAdminHub();

  useEffect(() => {
    if (hubConnected) {
      refreshCounts();
    }
  }, [hubConnected, refreshCounts]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'command-centre'],
    queryFn: () => apiClient.get<CommandCentreData>('/api/admin/command-centre'),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-6 h-24 w-full -none" />
        <div className="space-y-5">
          <Skeleton className="h-32 w-full -none" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Skeleton className="h-56 -none lg:col-span-2" />
            <Skeleton className="h-56 -none" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="border border-red-500/25 bg-red-950/20 p-4 font-mono text-xs uppercase tracking-wider text-red-300">
          Failed to load dashboard data
        </div>
      </div>
    );
  }

  const { pending_counts, stats, sponsor_kpis, system_health, payments_available, recent_activity, oldest_pending } = data;
  const charts = data.charts;
  const activitySeries = charts ? mergeDailyCounts(charts.signups_14d, charts.tournaments_14d) : [];

  const attentionItems = [
    { title: 'Verifications', count: pending_counts.verifications, staleCount: pending_counts.verifications_stale, staleLabel: 'stale (3+ days)', icon: Shield, href: '/admin/users/verifications', permission: 'verification:view' },
    { title: 'Disputes', count: pending_counts.disputes, staleCount: pending_counts.disputes_stale, staleLabel: 'open 7+ days', icon: Flag, href: '/admin/operations/disputes', permission: 'disputes:view' },
    { title: 'Alerts', count: pending_counts.alerts, staleCount: pending_counts.alerts_critical, staleLabel: 'critical', icon: Bell, href: '/admin/operations/alerts', permission: 'alerts:view' },
    { title: 'Moderation', count: pending_counts.moderation, staleCount: pending_counts.moderation_today, staleLabel: 'today', icon: AlertTriangle, href: '/admin/content/moderation', permission: 'moderation:view' },
    ...(isSuperAdmin ? [{ title: 'Ghost Approvals', count: pending_counts.ghost_approvals, staleCount: 0, staleLabel: '', icon: Shield, href: '/admin/security/ghost', permission: '' }] : []),
    ...(isSuperAdmin ? [{ title: 'GDPR', count: pending_counts.gdpr, staleCount: pending_counts.gdpr_due_soon, staleLabel: 'due soon', icon: Database, href: '/admin/security/gdpr', permission: 'gdpr:view' }] : []),
  ].filter(item => !item.permission || can(item.permission));

  const fleetCtr = sponsor_kpis.impressions_30d > 0
    ? (sponsor_kpis.clicks_30d / sponsor_kpis.impressions_30d) * 100
    : 0;

  const maxSignup = Math.max(...data.signups_7d.map(x => x.count), 1);

  return (
    <CommandShell className="p-0">
      <div className="esportra-ambient-content mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
        <CommandHeader
          eyebrow="Admin"
          title="Command Centre"
          description="Platform overview and pending actions."
          actions={
            hubConnected ? (
              <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                <span className="h-1.5 w-1.5 animate-pulse bg-rose-500" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <WifiOff className="h-3.5 w-3.5" /> Connecting
              </span>
            )
          }
        />

        {/* Needs Attention — inline strip */}
        <CommandSection className="p-0">
          <p className="border-b border-white/10 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">
            Needs Attention
          </p>
          <div className="grid grid-cols-2 divide-x divide-white/5 md:grid-cols-3 lg:grid-cols-5">
            {attentionItems.map((item, i) => (
              <Link
                key={item.href}
                to={item.href}
                className={`group p-4 transition-colors hover:bg-white/[0.03] ${i >= attentionItems.length - (attentionItems.length % 5 || 5) ? '' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors group-hover:text-zinc-200">
                    <item.icon className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-rose-400" />
                    {item.title}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-white" />
                </div>
                <p className="mt-2 font-heading text-3xl font-black text-white">{item.count}</p>
                {item.staleCount > 0 ? (
                  <p className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                    <AlertTriangle className="h-3 w-3" /> {item.staleCount} {item.staleLabel}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-700">clear</p>
                )}
              </Link>
            ))}
          </div>
        </CommandSection>

        {/* Middle row */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Platform pulse */}
          <CommandSection className="lg:col-span-2">
            <SectionLabel>Platform Pulse</SectionLabel>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="font-heading text-2xl font-black text-white">{stats.users_total.toLocaleString()}</p>
                  {stats.users_growth > 0 && (
                    <span className="flex items-center font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">
                      <TrendingUp className="h-3 w-3" />+{stats.users_growth}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Users</p>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="font-heading text-2xl font-black text-white">{stats.tournaments_total.toLocaleString()}</p>
                  {stats.tournaments_growth > 0 && (
                    <span className="flex items-center font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">
                      <TrendingUp className="h-3 w-3" />+{stats.tournaments_growth}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tournaments</p>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-rose-500" />
                  <p className="font-heading text-2xl font-black text-white">{stats.admins_active_recently.toLocaleString()}</p>
                </div>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Admins Active · 15 min</p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/5 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Signups · 7 days</p>
                <BarChart3 className="h-3.5 w-3.5 text-zinc-600" />
              </div>
              <div className="flex h-14 items-end gap-1.5">
                {data.signups_7d.map((d, i) => (
                  <div
                    key={i}
                    className={`flex-1 transition-colors ${i === data.signups_7d.length - 1 ? 'bg-rose-500' : 'bg-rose-500/35 hover:bg-rose-500/60'}`}
                    style={{ height: `${Math.max((d.count / maxSignup) * 100, d.count > 0 ? 5 : 2)}%` }}
                    title={`${d.count} signups`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[9px] uppercase tracking-wider text-zinc-700">
                <span>{data.signups_7d[0]?.day}</span>
                <span>{data.signups_7d[data.signups_7d.length - 1]?.day}</span>
              </div>
            </div>
          </CommandSection>

          {/* Oldest pending */}
          <CommandSection>
            <SectionLabel>Oldest Pending</SectionLabel>
            <div className="space-y-1">
              {oldest_pending.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-600">No pending verifications</p>
              ) : (
                oldest_pending.map(item => (
                  <Link
                    key={item.id}
                    to={`/admin/users/verifications?id=${item.id}`}
                    className="-mx-2 flex items-center gap-3 border border-transparent p-2 transition-colors hover:border-white/10 hover:bg-white/[0.02]"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden border border-white/10 bg-black/40">
                      {item.avatar_url ? (
                        <img src={item.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                          {item.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{item.username}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="outline" className="-none border-white/15 px-1.5 py-0 font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                          {item.requested_role}
                        </Badge>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CommandSection>
      </div>

      {/* Fleet + system health row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Sponsors fleet · 30d */}
        <CommandSection className="lg:col-span-2">
          <SectionLabel>Sponsor Fleet · 30 Days</SectionLabel>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <div>
              <p className="font-heading text-2xl font-black text-white">{sponsor_kpis.impressions_30d.toLocaleString()}</p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Impressions</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-black text-white">{sponsor_kpis.clicks_30d.toLocaleString()}</p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Clicks</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-black text-white">{fleetCtr.toFixed(2)}%</p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fleet CTR</p>
            </div>
            <div>
              <p className="flex items-center gap-2 font-heading text-2xl font-black text-white">
                <span className="h-1.5 w-1.5 bg-rose-500" />
                {sponsor_kpis.active_sponsors.toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Partners</p>
            </div>
          </div>

          {/* Revenue placeholder — no payment pipeline exists yet (D3) */}
          {!payments_available && (
            <p className="mt-6 border-t border-white/5 pt-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">
              Revenue — no payment system yet
            </p>
          )}
        </CommandSection>

        {/* System health */}
        <CommandSection>
          <SectionLabel>System Health</SectionLabel>
          <div className="space-y-3">
            <Link to="/admin/system/kill-switches" className="group flex items-center justify-between border border-transparent p-2 transition-colors hover:border-white/10 hover:bg-white/[0.02]">
              <span className="text-xs text-zinc-400">Kill switches armed</span>
              <span className={`font-heading text-lg font-black ${system_health.kill_switches_armed > 0 ? 'text-red-300' : 'text-white'}`}>
                {system_health.kill_switches_armed}<span className="text-zinc-600">/{system_health.kill_switches_total}</span>
              </span>
            </Link>
            <Link to="/admin/system/anomalies" className="group flex items-center justify-between border border-transparent p-2 transition-colors hover:border-white/10 hover:bg-white/[0.02]">
              <span className="text-xs text-zinc-400">Unresolved anomalies</span>
              <span className={`font-heading text-lg font-black ${system_health.anomalies_unresolved > 0 ? 'text-amber-300' : 'text-white'}`}>
                {system_health.anomalies_unresolved}
              </span>
            </Link>
            <Link to="/admin/system/feature-flags" className="group flex items-center justify-between border border-transparent p-2 transition-colors hover:border-white/10 hover:bg-white/[0.02]">
              <span className="text-xs text-zinc-400">Feature flags enabled</span>
              <span className="font-heading text-lg font-black text-white">{system_health.feature_flags_enabled}</span>
            </Link>
          </div>
        </CommandSection>
      </div>

      {/* 14-day analytics */}
      {charts && (
        <>
          <CommandSection>
            <SectionLabel>Activity · 14 Days</SectionLabel>
            <div className="mb-3 flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                <span className="h-1.5 w-1.5 bg-rose-500" /> Signups
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                <span className="h-1.5 w-1.5 bg-zinc-400" /> Tournament creations
              </span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activitySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ccSignupsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={formatDayTick} tick={chartTick} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={chartTick} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3f3f46', strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="signups" name="Signups" stroke="#f43f5e" strokeWidth={2} fill="url(#ccSignupsFill)" animationDuration={300} />
                  <Area type="monotone" dataKey="tournaments" name="Tournament Creations" stroke="#a1a1aa" strokeWidth={2} fill="transparent" animationDuration={300} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CommandSection>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CommandSection className="lg:col-span-2">
              <SectionLabel>Disputes · 14 Days</SectionLabel>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.disputes_14d} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={formatDayTick} tick={chartTick} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={chartTick} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(63, 63, 70, 0.15)' }} />
                    <Bar dataKey="count" name="Disputes" fill="#f43f5e" fillOpacity={0.6} barSize={10} animationDuration={300} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CommandSection>
          </div>

          <CommandSection>
            <SectionLabel>Sponsor Performance · 14 Days</SectionLabel>
            <div className="mb-3 flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                <span className="h-1.5 w-1.5 bg-rose-500" /> Impressions
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                <span className="h-1.5 w-1.5 bg-zinc-400" /> Clicks
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.sponsor_daily_14d} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ccImpressionsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={formatDayTick} tick={chartTick} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis yAxisId="impressions" hide allowDecimals={false} />
                  <YAxis yAxisId="clicks" orientation="right" hide allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3f3f46', strokeDasharray: '3 3' }} />
                  <Area yAxisId="impressions" type="monotone" dataKey="impressions" name="Impressions" stroke="#f43f5e" strokeWidth={2} fill="url(#ccImpressionsFill)" animationDuration={300} />
                  <Area yAxisId="clicks" type="monotone" dataKey="clicks" name="Clicks" stroke="#a1a1aa" strokeWidth={2} fill="transparent" animationDuration={300} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CommandSection>
        </>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Recent activity */}
          <CommandSection className="lg:col-span-2">
            <SectionLabel>Recent Activity</SectionLabel>
            <div className="divide-y divide-white/5">
              {recent_activity.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-600">No recent activity</p>
              ) : (
                recent_activity.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-2.5 transition-colors hover:bg-white/[0.02]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-1.5 w-1.5 shrink-0 bg-rose-500/70" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">
                          {actionTypeLabels[item.action_type] ?? item.action_type}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {item.actor_name ?? 'System'}
                          {item.target_name && (
                            <>
                              {' '}<span className="text-zinc-700">on</span> {item.target_name}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CommandSection>

          {/* Quick access */}
          <CommandSection>
            <SectionLabel>Quick Access</SectionLabel>
            <div className="space-y-4">
              {adminNavGroups.map(group => {
                const items = group.items.filter(item => !item.permission || can(item.permission));
                if (items.length === 0) return null;
                return (
                  <div key={group.label}>
                    <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      {items.map(item => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="group flex items-center gap-2.5 border border-transparent px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-rose-400" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
              {isSuperAdmin && (
                <CommandButton variant="ghost" size="sm" asChild className="w-full">
                  <Link to="/admin/security/admins">Manage Admin Access</Link>
                </CommandButton>
              )}
            </div>
          </CommandSection>
        </div>
      </div>
    </CommandShell>
  );
}
