import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Clock,
  Database,
  Flag,
  Shield,
  TrendingUp,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAdminHub } from '@/hooks/useAdminHub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingCounts {
  verifications: number;
  verifications_stale: number;
  disputes: number;
  disputes_high_priority: number;
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
  active_now: number;
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

interface CommandCentreData {
  pending_counts: PendingCounts;
  stats: Stats;
  signups_7d: { day: string; count: number }[];
  recent_activity: ActivityItem[];
  oldest_pending: PendingVerification[];
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

function PendingCountCard({
  title,
  count,
  staleCount,
  staleLabel,
  icon: Icon,
  href,
  permission,
  can,
}: {
  title: string;
  count: number;
  staleCount?: number;
  staleLabel?: string;
  icon: React.ElementType;
  href: string;
  permission?: string;
  can: (p: string) => boolean;
}) {
  if (permission && !can(permission)) return null;

  return (
    <Link
      to={href}
      className="group block p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-rose-500/30 transition"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 transition" />
            <span className="text-sm text-zinc-400">{title}</span>
          </div>
          <p className="text-3xl font-bold text-white mt-2">{count}</p>
          {staleCount !== undefined && staleCount > 0 && (
            <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {staleCount} {staleLabel}
            </p>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function StatCard({
  title,
  value,
  growth,
  icon: Icon,
}: {
  title: string;
  value: number;
  growth?: number;
  icon: React.ElementType;
}) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{title}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        {growth !== undefined && growth > 0 && (
          <span className="flex items-center text-xs text-emerald-400">
            <TrendingUp className="w-3 h-3 mr-0.5" />+{growth}
          </span>
        )}
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
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          Failed to load dashboard data
        </div>
      </div>
    );
  }

  const { pending_counts, stats, recent_activity, oldest_pending } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Centre</h1>
          <p className="text-zinc-400 mt-1">Platform overview and pending actions</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {hubConnected ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3 h-3" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-500">
              <WifiOff className="w-3 h-3" />
              Connecting...
            </span>
          )}
        </div>
      </div>

      {/* Needs Attention */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Needs Attention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <PendingCountCard
            title="Verifications"
            count={pending_counts.verifications}
            staleCount={pending_counts.verifications_stale}
            staleLabel="stale (3+ days)"
            icon={Shield}
            href="/admin/users/verifications"
            permission="verification:view"
            can={can}
          />
          <PendingCountCard
            title="Disputes"
            count={pending_counts.disputes}
            staleCount={pending_counts.disputes_high_priority}
            staleLabel="high priority"
            icon={Flag}
            href="/admin/operations/disputes"
            permission="disputes:view"
            can={can}
          />
          <PendingCountCard
            title="Alerts"
            count={pending_counts.alerts}
            staleCount={pending_counts.alerts_critical}
            staleLabel="critical"
            icon={Bell}
            href="/admin/operations/alerts"
            permission="alerts:view"
            can={can}
          />
          <PendingCountCard
            title="Moderation"
            count={pending_counts.moderation}
            staleCount={pending_counts.moderation_today}
            staleLabel="today"
            icon={AlertTriangle}
            href="/admin/content/moderation"
            permission="moderation:view"
            can={can}
          />
          {isSuperAdmin && (
            <PendingCountCard
              title="GDPR"
              count={pending_counts.gdpr}
              staleCount={pending_counts.gdpr_due_soon}
              staleLabel="due soon"
              icon={Database}
              href="/admin/security/gdpr"
              permission="gdpr:view"
              can={can}
            />
          )}
        </div>
      </section>

      {/* Stats Row */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Quick Stats
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Users"
            value={stats.users_total}
            growth={stats.users_growth}
            icon={Users}
          />
          <StatCard
            title="Tournaments"
            value={stats.tournaments_total}
            growth={stats.tournaments_growth}
            icon={BarChart3}
          />
          <StatCard title="Active Now" value={stats.active_now} icon={Users} />
          <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
            <div className="flex items-center gap-2 text-zinc-500">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">7-Day Growth</span>
            </div>
            <div className="flex items-end gap-1 h-12 mt-2">
              {data.signups_7d.map((d, i) => {
                const maxCount = Math.max(...data.signups_7d.map((x) => x.count), 1);
                const height = (d.count / maxCount) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-rose-500/50 rounded-t"
                    style={{ height: `${height}%`, minHeight: d.count > 0 ? 4 : 0 }}
                    title={`${d.count} signups`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 bg-zinc-900/30 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent_activity.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                No recent activity
              </p>
            ) : (
              recent_activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                      {item.actor_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        {actionTypeLabels[item.action_type] ?? item.action_type}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {item.actor_name ?? 'System'}{' '}
                        {item.target_name && (
                          <>
                            <span className="text-zinc-600">on</span> {item.target_name}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Oldest Pending */}
        <Card className="bg-zinc-900/30 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Oldest Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {oldest_pending.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                No pending verifications
              </p>
            ) : (
              oldest_pending.map((item) => (
                <Link
                  key={item.id}
                  to={`/admin/users/verifications?id=${item.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden">
                    {item.avatar_url ? (
                      <img
                        src={item.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                        {item.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.username}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.requested_role}
                      </Badge>
                      <span className="text-[10px] text-zinc-500">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
