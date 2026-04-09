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
  ChevronRight,
  Sparkles,
  RefreshCw,
  Download,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
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
  color: string;
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
      className="absolute right-0 top-full mt-2 w-[380px] bg-[#0a0a0c] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
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
        color: 'rose',
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
        color: 'amber',
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
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'rose' },
    { label: 'Active Venues', value: stats.activeVenues, icon: MapPin, color: 'emerald' },
    { label: 'Tournaments', value: stats.activeTournaments, icon: Trophy, color: 'amber' },
    { label: 'Bookings', value: stats.totalBookings, icon: Calendar, color: 'blue' },
    { label: 'Pending', value: stats.pendingVerifications, icon: Shield, color: 'red' },
    { label: 'New Today', value: stats.newUsersToday, icon: TrendingUp, color: 'cyan' },
  ];

  const quickNavLinks = [
    { label: 'User Management', href: '/admin/tools/user-management', icon: Users, color: 'rose' },
    { label: 'Tournament Management', href: '/admin/tools/tournament-management', icon: Trophy, color: 'amber' },
    { label: 'Team Management', href: '/admin/tools/team-management', icon: UsersRound, color: 'cyan' },
    { label: 'Venue Management', href: '/admin/tools/venue-management', icon: MapPin, color: 'emerald', badge: stats.pendingVenues },
    { label: 'Sponsor CRM', href: '/admin/tools/sponsor-management', icon: Megaphone, color: 'violet' },

    { label: 'Verification System', href: '/admin/tools/verification-system', icon: Shield, color: 'red', badge: stats.pendingVerifications },
    { label: 'License Management', href: '/admin/tools/license-management', icon: Award, color: 'violet', badge: stats.pendingLicenses },
    { label: 'Dispute Center', href: '/admin/disputes', icon: AlertTriangle, color: 'amber' },
    { label: 'Alert Center', href: '/admin/tools/alerts', icon: Bell, color: 'amber' },
    { label: 'Analytics', href: '/admin/tools/analytics', icon: BarChart3, color: 'blue' },
    { label: 'Audit Logs', href: '/admin/audit', icon: FileText, color: 'zinc' },
    { label: 'Admin Access', href: '/admin/access', icon: UserCheck, color: 'rose' },
    { label: 'Role Builder', href: '/admin/tools/role-builder', icon: ShieldPlus, color: 'rose' },
    { label: 'Content Moderation', href: '/admin/tools/moderation', icon: Shield, color: 'amber' },
    { label: 'Session Management', href: '/admin/tools/sessions', icon: Monitor, color: 'cyan' },
    { label: 'IP Allowlist', href: '/admin/tools/ip-allowlist', icon: Globe, color: 'emerald' },
  { label: 'Scheduled Reports', href: '/admin/tools/scheduled-reports', icon: CalendarClock, color: 'violet' },
  { label: 'GDPR Compliance', href: '/admin/tools/gdpr', icon: FileText, color: 'rose' },
  { label: 'Anomaly Detection', href: '/admin/tools/anomaly-detection', icon: Zap, color: 'orange' },
  { label: 'Dashboard Layout', href: '/admin/tools/dashboard-customization', icon: LayoutDashboard, color: 'blue' },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/30' },
      amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
      violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
      red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
      cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
      zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    };
    return colors[color] || colors.rose;
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Top Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              Admin Dashboard
            </h1>
            <p className="text-zinc-500 text-sm">Platform management & analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Alert Bell */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAlertPanel(!showAlertPanel)}
              className="border-zinc-800 text-zinc-400 hover:text-white hover:border-rose-500/30 relative"
            >
              <Bell className="w-4 h-4" />
              {(alertSummary?.active_count ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {alertSummary!.active_count > 99 ? '99+' : alertSummary!.active_count}
                </span>
              )}
            </Button>

            {/* Alert Dropdown Panel */}
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
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-zinc-800 text-zinc-400 hover:text-white hover:border-rose-500/30"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Link to="/">
            <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-400 hover:text-white">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs text-zinc-500">Signed in as</p>
              <p className="text-sm font-medium text-white">{profile?.full_name || profile?.username}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-rose-500" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-zinc-500 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Stats Grid */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8"
      >
        {statCards.map((stat, idx) => {
          const colorClasses = getColorClasses(stat.color);
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              whileHover={{ y: -2, scale: 1.02 }}
              className="p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 hover:border-rose-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${colorClasses.text}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-white">
                {loading ? '...' : stat.isString ? stat.value : typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </p>
              <p className="text-xs text-zinc-500 truncate">{stat.label}</p>
            </motion.div>
          );
        })}
      </motion.section>

      {/* Quick Navigation */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-wider mb-3">Quick Access</h2>
        <div className="flex flex-wrap gap-2">
          {quickNavLinks.map((link) => {
            const colorClasses = getColorClasses(link.color);
            return (
              <Link key={link.href} to={link.href}>
                <Button
                  variant="outline"
                  size="sm"
                  className={`border-zinc-800 text-zinc-300 hover:${colorClasses.border} hover:${colorClasses.text} transition-all`}
                >
                  <link.icon className={`w-4 h-4 mr-2 ${colorClasses.text}`} />
                  {link.label}
                  {link.badge ? (
                    <Badge className="ml-2 bg-red-500 text-white text-xs">{link.badge}</Badge>
                  ) : null}
                </Button>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              Activity Feed
            </h3>
            <span className="text-xs text-zinc-500">Live</span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {recentActivities.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">No recent activity</p>
            ) : (
              recentActivities.map((activity, idx) => {
                const colorClasses = getColorClasses(activity.color);
                return (
                  <motion.div
                    key={activity.id + idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${colorClasses.bg} flex items-center justify-center shrink-0`}>
                      <activity.icon className={`w-4 h-4 ${colorClasses.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-400">{activity.title}</p>
                      <p className="text-sm text-white truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0">{formatTimeAgo(activity.time)}</span>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.section>

        {/* Audit Logs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
        >
          <div className="p-5 border-b border-zinc-800/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Audit Logs
                <Badge className="bg-zinc-800 text-zinc-400 text-xs">{auditLogs.length}</Badge>
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search logs..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-9 w-48 bg-zinc-900/50 border-zinc-800 focus:border-rose-500 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={exportAuditCSV}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {auditLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-zinc-500 text-center py-12">No audit logs found</p>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {filteredLogs.slice(0, 50).map((log, idx) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    onClick={() => setSelectedLog(log)}
                    className="px-5 py-3 hover:bg-zinc-900/50 cursor-pointer transition-colors flex items-center gap-4"
                  >
                    <div className="w-16 shrink-0">
                      <p className="text-xs text-zinc-500">{new Date(log.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-zinc-600">{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium uppercase ${getActionColor(log.action_type)}`}>
                      {log.action_type?.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-medium">{log.admin_name || 'System'}</span>
                        <span className="text-[10px] text-zinc-600">→</span>
                        <span className="text-xs text-zinc-400 capitalize">{log.target_type}</span>
                      </div>
                      <p className="text-[10px] text-zinc-600 truncate">
                        {log.target_name || log.target_id?.slice(0, 12)}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-zinc-600" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* Audit Log Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-500" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <p className="text-xs text-zinc-500 uppercase">Action</p>
                  <p className={`text-sm font-medium mt-1 ${getActionColor(selectedLog.action_type).split(' ')[0]}`}>
                    {selectedLog.action_type?.replace('_', ' ')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <p className="text-xs text-zinc-500 uppercase">Timestamp</p>
                  <p className="text-white text-sm mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <p className="text-xs text-zinc-500 uppercase">Admin</p>
                  <p className="text-white text-sm mt-1">{selectedLog.admin_name || 'System'}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <p className="text-xs text-zinc-500 uppercase">Target</p>
                  <p className="text-white text-sm mt-1">{selectedLog.target_type} / {selectedLog.target_name || selectedLog.target_id?.slice(0, 12)}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/50">
                <p className="text-xs text-zinc-500 uppercase mb-2">Details</p>
                <pre className="text-sm text-zinc-300 overflow-x-auto font-mono bg-zinc-950 p-4 rounded-lg max-h-48">
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
