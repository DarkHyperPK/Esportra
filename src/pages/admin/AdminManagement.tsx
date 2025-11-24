import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  MapPin, 
  Trophy, 
  CreditCard, 
  Shield, 
  FileText, 
  Settings, 
  BarChart3,
  UserCheck,
  Ban,
  AlertTriangle,
  TrendingUp,
  Activity,
  Database,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminManagement = () => {
  const { profile } = useAuth();
  const { roles, hasPermission } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeVenues: 0,
    activeTournaments: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
    systemHealth: "Loading..."
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    try {
      setLoading(true);
      
      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch active venues (assuming venues table exists)
      const { count: venueCount } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });

      // Fetch active tournaments
      const { count: tournamentCount } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact', head: true });

      // Fetch pending verification requests
      const { count: verificationCount } = await supabase
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Calculate total revenue from tournaments (if prize_pool is numeric)
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('prize_pool')
        .neq('status', 'cancelled');

      let totalRevenue = 0;
      if (tournaments) {
        totalRevenue = tournaments.reduce((sum, tournament) => {
          const prizePool = parseFloat(tournament.prize_pool) || 0;
          return sum + prizePool;
        }, 0);
      }

      setStats({
        totalUsers: userCount || 0,
        activeVenues: venueCount || 0,
        activeTournaments: tournamentCount || 0,
        totalRevenue: totalRevenue,
        pendingVerifications: verificationCount || 0,
        systemHealth: "Healthy"
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({
        ...prev,
        systemHealth: "Error"
      }));
    } finally {
      setLoading(false);
    }
  };

  const hasRoleAccess = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (roles.includes('super_admin')) return true;
    return allowedRoles.some(role => roles.includes(role));
  };

  const TOOL_ACCESS: Record<string, { permission?: string; allowedRoles?: string[] }> = {
    'user-management': {
      permission: 'user:view',
      allowedRoles: ['super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin']
    },
    'tournament-management': {
      permission: 'tournament:view',
      allowedRoles: ['super_admin', 'ops_admin', 'moderator']
    },
    'venue-management': {
      permission: 'venue:view',
      allowedRoles: ['super_admin', 'ops_admin', 'support_admin']
    },
    'financial-management': {
      permission: 'settings:view',
      allowedRoles: ['super_admin', 'finance_admin']
    },
    'verification-system': {
      permission: 'verification:view',
      allowedRoles: ['super_admin', 'ops_admin', 'support_admin']
    },
    'audit-logs': {
      permission: 'audit:view',
      allowedRoles: ['super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin']
    },
    'analytics-dashboard': {
      permission: 'audit:view',
      allowedRoles: ['super_admin', 'ops_admin', 'finance_admin']
    }
  };

  const canAccessTool = (toolId: string) => {
    const config = TOOL_ACCESS[toolId];
    if (!config) return true;
    if (config.allowedRoles && !hasRoleAccess(config.allowedRoles)) return false;
    if (config.permission && !hasPermission(config.permission)) return false;
    return true;
  };

  const adminTools = [
    {
      id: "user-management",
      title: "User Management",
      description: "Manage users, suspend accounts, view user details",
      icon: <Users className="w-8 h-8" />,
      color: "bg-blue-600",
      hoverColor: "hover:bg-blue-700",
      stats: `${loading ? "..." : stats.totalUsers} users`,
      features: ["View all users", "Suspend/ban users", "User analytics", "Account management"]
    },
    {
      id: "tournament-management",
      title: "Tournament Management",
      description: "Oversee tournaments, approve events, manage brackets",
      icon: <Trophy className="w-8 h-8" />,
      color: "bg-yellow-600",
      hoverColor: "hover:bg-yellow-700",
      stats: `${loading ? "..." : stats.activeTournaments} active`,
      features: ["Approve tournaments", "Manage brackets", "Tournament analytics", "Event oversight"]
    },
    {
      id: "venue-management",
      title: "Venue Management",
      description: "Manage gaming venues, verify locations, handle bookings",
      icon: <MapPin className="w-8 h-8" />,
      color: "bg-green-600",
      hoverColor: "hover:bg-green-700",
      stats: `${loading ? "..." : stats.activeVenues} venues`,
      features: ["Verify venues", "Manage bookings", "Venue analytics", "Location oversight"]
    },
    {
      id: "financial-management",
      title: "Financial Management",
      description: "Track revenue, manage payments, financial analytics",
      icon: <CreditCard className="w-8 h-8" />,
      color: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      stats: `$${loading ? "..." : stats.totalRevenue.toLocaleString()}`,
      features: ["Revenue tracking", "Payment management", "Financial reports", "Transaction oversight"]
    },
    {
      id: "verification-system",
      title: "Verification System",
      description: "Approve organizer and venue owner verification requests",
      icon: <Shield className="w-8 h-8" />,
      color: "bg-red-600",
      hoverColor: "hover:bg-red-700",
      stats: `${loading ? "..." : stats.pendingVerifications} pending`,
      features: ["Review requests", "Approve organizers", "Verify venues", "Manage access"]
    },
    {
      id: "audit-logs",
      title: "Audit & Compliance",
      description: "Monitor system activity, track admin actions, compliance",
      icon: <FileText className="w-8 h-8" />,
      color: "bg-indigo-600",
      hoverColor: "hover:bg-indigo-700",
      stats: "24/7 monitoring",
      features: ["Action tracking", "System logs", "Compliance reports", "Security monitoring"]
    },
    // System monitoring temporarily removed per request
    {
      id: "analytics-dashboard",
      title: "Analytics Dashboard",
      description: "Platform analytics, user insights, growth metrics",
      icon: <BarChart3 className="w-8 h-8" />,
      color: "bg-orange-600",
      hoverColor: "hover:bg-orange-700",
      stats: "Real-time data",
      features: ["User analytics", "Growth metrics", "Platform insights", "Performance data"]
    }
  ];

  const visibleTools = adminTools.filter(tool => canAccessTool(tool.id));

  const handleToolClick = (toolId: string) => {
    if (!canAccessTool(toolId)) {
      toast({
        title: "Access denied",
        description: "You don't have permission to open this tool.",
        variant: "destructive"
      });
      return;
    }
    // Map friendly ids to actual routes
    const routeMap: Record<string, string> = {
      'user-management': '/admin/tools/user-management',
      'tournament-management': '/admin/tools/tournament-management',
      'venue-management': '/admin/tools/venue-management',
      'financial-management': '/admin/tools/payments',
      'verification-system': '/admin/tools/verification-system',
      'audit-logs': '/admin/tools/audit-logs',
      // 'system-monitoring': '/admin/tools/system-status',
      'analytics-dashboard': '/admin/tools/analytics',
    };
    const target = routeMap[toolId] || `/admin/tools/${toolId}`;
    navigate(target);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Management System</h1>
              <p className="text-gray-400 mt-2">Comprehensive platform administration and management tools</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Welcome back</p>
                <p className="font-semibold text-white">{profile?.full_name || profile?.username}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : stats.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3" />
                    Platform users
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Venues</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : stats.activeVenues}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    Gaming venues
                  </p>
                </div>
                <MapPin className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Tournaments</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : stats.activeTournaments}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Trophy className="w-3 h-3" />
                    Tournament events
                  </p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Prize Pool</p>
                  <p className="text-2xl font-bold text-white">
                    {loading ? "..." : `$${stats.totalRevenue.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <CreditCard className="w-3 h-3" />
                    Prize money
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tools Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Administration Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleTools.length === 0 && (
              <div className="col-span-full text-center text-gray-400 border border-dashed border-gray-700 rounded-lg py-12">
                No administration tools available for your role.
              </div>
            )}
            {visibleTools.map((tool) => (
              <Card 
                key={tool.id}
                className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer group"
                onClick={() => handleToolClick(tool.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 ${tool.color} rounded-lg flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
                      {tool.icon}
                    </div>
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                      {tool.stats}
                    </Badge>
                  </div>
                  <CardTitle className="text-white text-lg">{tool.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-400 text-sm mb-4">{tool.description}</p>
                  <div className="space-y-2">
                    {tool.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button 
                    className={`w-full mt-4 ${tool.color} ${tool.hoverColor} text-white`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToolClick(tool.id);
                    }}
                  >
                    Access Tool
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={() => handleToolClick("verification-system")}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Review Verifications
                {!loading && stats.pendingVerifications > 0 && (
                  <Badge className="ml-2 bg-red-600 text-white text-xs">
                    {stats.pendingVerifications}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={() => handleToolClick("audit-logs")}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Audit Logs
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={() => handleToolClick("system-monitoring")}
              >
                <Activity className="w-4 h-4 mr-2" />
                System Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminManagement;
