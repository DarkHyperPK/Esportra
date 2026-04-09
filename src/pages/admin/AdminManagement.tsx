import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminStats, useAdminAuditLogs, useAdminUsersList, useAdminTournaments, useAdminAlertSummary, useAdminAlerts, useAcknowledgeAlert } from "@/hooks/useAdminQueries";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MapPin,
  Trophy,
  Shield,
  FileText,
  BarChart3,
  UserCheck,
  Activity,
  RefreshCw,
  Download,
  Search,
  Eye,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Globe,
  Home,
  LogOut,
  Megaphone,
  Award,
  UsersRound,
  Bell,
  ShieldPlus,
  Monitor,
  CalendarClock,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  action_type: string;
  admin_id: string | null;
  admin_name: string | null;
  target_type: string;
  target_id: string;
  target_name: string | null;
  details: any;
  created_at: string;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'tournament' | 'venue' | 'booking' | 'verification';
  title: string;
  description: string;
  time: string;
  icon: any;
}

function AlertDropdownPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useAdminAlerts({ status: 'active', limit: 8 });
  const acknowledge = useAcknowledgeAlert();
  const navigate = useNavigate();
  const { toast } = useToast();

  const alerts = data?.data ?? [];

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <Activity className="w-4 h-4 text-blue-400" />;
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-[380px] bg-[#0a0a0c] border border-zinc-800 rounded-md shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Admin Alerts</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { navigate('/admin/tools/alerts'); onClose(); }}
          className="text-xs text-rose-400 hover:text-rose-300 px-2 h-7"
        >
          View All
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm">
            No active alerts
          </div>
        ) : (
          alerts.map((alert: any) => (
            <div
              key={alert.id}
              className="px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{severityIcon(alert.severity)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{alert.message}</p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(alert.created_at)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => acknowledge.mutate(alert.id, {
                    onError: () => toast({ title: 'Failed to acknowledge', variant: 'destructive' }),
                  })}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-green-400 h-7 px-2 transition-opacity"
                  title="Acknowledge"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

const AdminManagement = () => {
  const { profile, signOut } = useAuth();
  const { roles, hasPermission } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();

  // React Query hooks
  const statsQuery = useAdminStats();
  const auditQuery = useAdminAuditLogs({ limit: 100 });
  const usersQuery = useAdminUsersList({ limit: 3 });
  const tournamentsQuery = useAdminTournaments();

  const [refreshing, setRefreshing] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tournaments' | 'venues' | 'audit' | 'analytics'>('overview');
  const { data: alertSummary } = useAdminAlertSummary();
  const [showAlertPanel, setShowAlertPanel] = useState(false);

  // Derived stats
  const loading = statsQuery.isLoading;
  const stats = {
    totalUsers: statsQuery.data?.totalUsers || 0,
    activeVenues: statsQuery.data?.activeVenues || 0,
    activeTournaments: statsQuery.data?.activeTournaments || 0,
    pendingVerifications: statsQuery.data?.pendingVerifications || 0,
    totalBookings: statsQuery.data?.totalBookings || 0,
    newUsersToday: statsQuery.data?.newUsersToday || 0,
    pendingVenues: statsQuery.data?.pendingVenues || 0,
    pendingLicenses: statsQuery.data?.pendingLicenses || 0,
  };

  // Derived audit logs with column mapping
  const auditLoading = auditQuery.isLoading;
  const auditLogs: AuditLog[] = useMemo(() => {
    const response = auditQuery.data;
    const logsArray = Array.isArray(response) ? response : (response?.data || []);
    return logsArray.map((log: any) => ({
      ...log,
      action_type: log.action_type || log.action,
      admin_id: log.admin_id || log.actor_id,
      admin_name: log.admin_name || log.actor_name,
    }));
  }, [auditQuery.data]);

  // Derived recent activities from users + tournaments queries
  const recentActivities: RecentActivity[] = useMemo(() => {
    const activities: RecentActivity[] = [];

    const usersResponse = usersQuery.data;
    const recentUsers: Array<{ id: string; username: string; full_name: string; created_at: string }> =
      Array.isArray(usersResponse) ? usersResponse : ((usersResponse as any)?.users || []);

    (recentUsers || []).forEach(user => {
      activities.push({
        id: user.id,
        type: 'user',
        title: 'New User Registered',
        description: user.full_name || user.username || 'Unknown',
        time: user.created_at,
        icon: Users,
      });
    });

    const tournamentsResponse = tournamentsQuery.data;
    const recentTournaments: Array<{ id: string; name: string; created_at: string }> =
      Array.isArray(tournamentsResponse) ? tournamentsResponse : ((tournamentsResponse as any)?.tournaments || (tournamentsResponse as any)?.items || []);

    (recentTournaments || []).slice(0, 3).forEach(t => {
      activities.push({
        id: t.id,
        type: 'tournament',
        title: 'Tournament Created',
        description: t.name || 'Untitled',
        time: t.created_at,
        icon: Trophy,
      });
    });

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return activities.slice(0, 10);
  }, [usersQuery.data, tournamentsQuery.data]);

  // Poll audit logs every 30s
  useEffect(() => {
    const id = setInterval(() => auditQuery.refetch(), 30_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      statsQuery.refetch(),
      auditQuery.refetch(),
      usersQuery.refetch(),
      tournamentsQuery.refetch(),
    ]).finally(() => setRefreshing(false));
    toast({ title: 'Data refreshed', description: 'All statistics updated' });
  };

  const exportAuditCSV = () => {
    const csv = [
      ['Date', 'Action', 'Admin', 'Target Type', 'Target ID', 'Target Name', 'Details'],
      ...auditLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.action_type,
        log.admin_name || log.admin_id || 'system',
        log.target_type || '',
        log.target_id || '',
        log.target_name || '',
        JSON.stringify(log.details)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = auditLogs.filter(log =>
    !auditSearch ||
    log.action_type?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.admin_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.target_type?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.target_name?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getActionColor = (action: string) => {
    if (!action) return 'text-zinc-400 bg-zinc-500/10';
    if (action.includes('create') || action.includes('add')) return 'text-emerald-400 bg-emerald-500/10';
    if (action.includes('delete') || action.includes('remove')) return 'text-red-400 bg-red-500/10';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-400 bg-blue-500/10';
    return 'text-zinc-400 bg-zinc-500/10';
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users },
    { label: 'Active Venues', value: stats.activeVenues, icon: MapPin },
    { label: 'Tournaments', value: stats.activeTournaments, icon: Trophy },
    { label: 'Bookings', value: stats.totalBookings, icon: Calendar },
    { label: 'Pending', value: stats.pendingVerifications, icon: Shield },
    { label: 'New Today', value: stats.newUsersToday, icon: TrendingUp },
  ];

  const quickNavLinks = [
    { label: 'User Management', href: '/admin/tools/user-management', icon: Users, permission: 'users:view' },
    { label: 'Tournament Management', href: '/admin/tools/tournament-management', icon: Trophy, permission: 'tournaments:view' },
    { label: 'Team Management', href: '/admin/tools/team-management', icon: UsersRound, permission: 'users:view' },
    { label: 'Venue Management', href: '/admin/tools/venue-management', icon: MapPin, badge: stats.pendingVenues, permission: 'venues:view' },
    { label: 'Sponsor CRM', href: '/admin/tools/sponsor-management', icon: Megaphone, permission: 'system:settings' },

    { label: 'Verification System', href: '/admin/tools/verification-system', icon: Shield, badge: stats.pendingVerifications, permission: 'users:edit' },
    { label: 'License Management', href: '/admin/tools/license-management', icon: Award, badge: stats.pendingLicenses, permission: 'users:view' },
    { label: 'Dispute Center', href: '/admin/disputes', icon: AlertTriangle, permission: 'disputes:view' },
    { label: 'Alert Center', href: '/admin/tools/alerts', icon: Bell, permission: 'system:audit' },
    { label: 'Analytics', href: '/admin/tools/analytics', icon: BarChart3, permission: 'analytics:view' },
    { label: 'Audit Logs', href: '/admin/audit', icon: FileText, permission: 'system:audit' },
    { label: 'Admin Access', href: '/admin/access', icon: UserCheck, permission: 'system:settings' },
    { label: 'Role Builder', href: '/admin/tools/role-builder', icon: ShieldPlus, permission: 'system:settings' },
    { label: 'Content Moderation', href: '/admin/tools/moderation', icon: Shield, permission: 'content:moderate' },
    { label: 'Session Management', href: '/admin/tools/sessions', icon: Monitor, permission: 'system:settings' },
    { label: 'IP Allowlist', href: '/admin/tools/ip-allowlist', icon: Globe, permission: 'system:settings' },
    { label: 'Scheduled Reports', href: '/admin/tools/scheduled-reports', icon: CalendarClock, permission: 'system:settings' },
    { label: 'GDPR Compliance', href: '/admin/tools/gdpr', icon: FileText, permission: 'system:settings' },
    { label: 'Anomaly Detection', href: '/admin/tools/anomaly-detection', icon: Zap, permission: 'system:settings' },
    { label: 'Dashboard Layout', href: '/admin/tools/dashboard-customization', icon: LayoutDashboard, permission: 'system:audit' },
  ].filter(link => hasPermission(link.permission));



  // -- Navigation groups derived from quickNavLinks --
  const navGroups = useMemo(() => {
    const groupDefs: { group: string; labels: string[] }[] = [
      { group: 'MANAGEMENT', labels: ['User Management', 'Tournament Management', 'Team Management', 'Venue Management', 'Sponsor CRM'] },
      { group: 'OPERATIONS', labels: ['Verification System', 'License Management', 'Dispute Center', 'Alert Center'] },
      { group: 'INTELLIGENCE', labels: ['Analytics', 'Audit Logs'] },
      { group: 'SYSTEM', labels: ['Admin Access', 'Role Builder', 'Content Moderation', 'Session Management', 'IP Allowlist', 'Scheduled Reports', 'GDPR Compliance', 'Anomaly Detection', 'Dashboard Layout'] },
    ];
    return groupDefs.map(def => ({
      group: def.group,
      items: def.labels
        .map(label => quickNavLinks.find(l => l.label === label))
        .filter(Boolean) as typeof quickNavLinks,
    })).filter(g => g.items.length > 0);
  }, [quickNavLinks]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-[#050505] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-0.5 h-6 bg-rose-500" />
          <h1 className="text-sm font-bold tracking-widest text-white uppercase font-mono">Control Center</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Role badge + username */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border-0 rounded font-mono uppercase px-1.5 py-0 h-5">
              {roles?.[0] || 'admin'}
            </Badge>
            <span className="text-xs text-zinc-400 font-medium">{profile?.full_name || profile?.username}</span>
          </div>

          <div className="h-5 w-px bg-zinc-800 hidden md:block" />

          {/* Alert Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAlertPanel(!showAlertPanel)}
              className="text-zinc-500 hover:text-white h-8 w-8 p-0 relative"
              aria-label="Alerts"
            >
              <Bell className="w-3.5 h-3.5" />
              {(alertSummary?.active_count ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                  {alertSummary!.active_count > 99 ? '99+' : alertSummary!.active_count}
                </span>
              )}
            </Button>
            <AnimatePresence>
              {showAlertPanel && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAlertPanel(false)} />
                  <AlertDropdownPanel onClose={() => setShowAlertPanel(false)} />
                </>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-zinc-500 hover:text-white h-8 w-8 p-0"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Link to="/">
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white h-8 w-8 p-0" aria-label="Home">
              <Home className="w-3.5 h-3.5" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-zinc-500 hover:text-red-400 h-8 w-8 p-0"
            aria-label="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Metrics Strip ── */}
      <div className="flex items-stretch border-b border-zinc-800 bg-[#050505] shrink-0 overflow-x-auto">
        {statCards.map((stat, idx) => (
          <div
            key={stat.label}
            className={`flex flex-col justify-center px-5 py-2.5 min-w-[120px] ${idx < statCards.length - 1 ? 'border-r border-zinc-800' : ''}`}
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 leading-none">{stat.label}</span>
            <span className="text-lg font-bold font-mono text-white leading-tight mt-0.5">
              {loading ? <span className="text-zinc-600">--</span> : typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar Nav */}
        <nav className="hidden lg:flex flex-col w-60 border-r border-zinc-800 bg-[#050505] overflow-y-auto shrink-0 py-3">
          {navGroups.map((group, gIdx) => (
            <div key={group.group} className={gIdx > 0 ? 'mt-2' : ''}>
              <div className="px-3 pt-2 pb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{group.group}</span>
              </div>
              <div className="border-t border-zinc-800/60 mx-3 mb-1" />
              {group.items.map(link => (
                <Link key={link.href} to={link.href} className="block">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors cursor-pointer group">
                    <link.icon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                    <span className="truncate">{link.label}</span>
                    {link.badge ? (
                      <Badge className="ml-auto bg-rose-500/15 text-rose-400 text-[10px] border-0 rounded px-1.5 py-0 h-4 font-mono">{link.badge}</Badge>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Mobile nav (collapsible row below metrics on small screens) */}
        <div className="lg:hidden border-b border-zinc-800 bg-[#050505] overflow-x-auto">
          <div className="flex items-center gap-1 px-3 py-2">
            {quickNavLinks.map(link => (
              <Link key={link.href} to={link.href}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors whitespace-nowrap">
                  <link.icon className="w-3 h-3 shrink-0" />
                  <span>{link.label}</span>
                  {link.badge ? (
                    <Badge className="bg-rose-500/15 text-rose-400 text-[9px] border-0 rounded px-1 py-0 h-3.5 font-mono">{link.badge}</Badge>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column — Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          {/* Activity Feed */}
          <section className="border-b border-zinc-800">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50">
              <Activity className="w-3.5 h-3.5 text-zinc-600" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Recent Activity</h2>
              <div className="flex items-center gap-1 ml-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] text-emerald-500 font-mono">Live</span>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-6 font-mono">No recent activity</p>
              ) : (
                recentActivities.slice(0, 8).map((activity, idx) => (
                  <div
                    key={activity.id + idx}
                    className={`flex items-center gap-3 px-4 py-1.5 hover:bg-zinc-900/40 transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'}`}
                  >
                    <activity.icon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span className="text-xs text-zinc-400 truncate flex-1">
                      <span className="text-zinc-300">{activity.title}</span>
                      <span className="text-zinc-600 mx-1">·</span>
                      {activity.description}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono shrink-0">{formatTimeAgo(activity.time)}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Audit Log Table */}
          <section className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-zinc-600" />
                <h2 className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Audit Log</h2>
                <Badge className="bg-zinc-800 text-zinc-500 text-[10px] border-0 rounded px-1.5 py-0 h-4 font-mono">
                  {auditLogs.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                  <Input
                    placeholder="Search..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-7 h-7 w-40 bg-transparent border-zinc-800 focus:border-rose-500/50 text-xs rounded"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={exportAuditCSV}
                  variant="ghost"
                  className="text-zinc-500 hover:text-white h-7 px-2 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[100px_120px_100px_1fr_40px] gap-2 px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-600 border-b border-zinc-800/50 shrink-0 bg-zinc-900/20">
              <span>Date</span>
              <span>Action</span>
              <span>Admin</span>
              <span>Target</span>
              <span></span>
            </div>

            {/* Table body */}
            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {auditLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-10 font-mono">No audit logs found</p>
              ) : (
                filteredLogs.slice(0, 50).map((log, idx) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`grid grid-cols-[100px_120px_100px_1fr_40px] gap-2 px-4 py-1.5 cursor-pointer hover:bg-zinc-800/40 transition-colors items-center ${idx % 2 === 1 ? 'bg-zinc-900/30' : ''}`}
                  >
                    <div className="font-mono text-[11px] text-zinc-500 leading-tight">
                      <div>{new Date(log.created_at).toLocaleDateString()}</div>
                      <div className="text-zinc-700">{new Date(log.created_at).toLocaleTimeString()}</div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase w-fit ${getActionColor(log.action_type)}`}>
                      {log.action_type?.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-zinc-500 truncate">{log.admin_name || 'System'}</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-zinc-400 capitalize">{log.target_type}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-[11px] text-zinc-600 truncate font-mono">{log.target_name || log.target_id?.slice(0, 12)}</span>
                    </div>
                    <Eye className="w-3.5 h-3.5 text-zinc-700 hover:text-zinc-400 transition-colors justify-self-end" />
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Audit Log Detail Modal (unchanged) */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-2xl rounded">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-zinc-400" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded bg-zinc-900/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">Action</p>
                  <p className={`text-sm font-medium mt-0.5 ${getActionColor(selectedLog.action_type).split(' ')[0]}`}>
                    {selectedLog.action_type?.replace('_', ' ')}
                  </p>
                </div>
                <div className="p-2.5 rounded bg-zinc-900/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">Timestamp</p>
                  <p className="text-white text-xs mt-0.5 font-mono">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded bg-zinc-900/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">Admin</p>
                  <p className="text-white text-xs mt-0.5">{selectedLog.admin_name || 'System'}</p>
                </div>
                <div className="p-2.5 rounded bg-zinc-900/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-mono">Target</p>
                  <p className="text-white text-xs mt-0.5">{selectedLog.target_type} / {selectedLog.target_name || selectedLog.target_id?.slice(0, 12)}</p>
                </div>
              </div>
              <div className="p-2.5 rounded bg-zinc-900/50">
                <p className="text-[10px] text-zinc-500 uppercase font-mono mb-1.5">Details</p>
                <pre className="text-xs text-zinc-300 overflow-x-auto font-mono bg-zinc-950 p-3 rounded max-h-48">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminManagement;
