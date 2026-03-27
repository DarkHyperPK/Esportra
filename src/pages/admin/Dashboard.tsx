import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from '@/lib/apiClient';
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin, Trophy, BarChart3, CreditCard, Shield, FileText, Settings, CheckCircle, Megaphone, Gavel, Award } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
// Consolidated: use full UserManagement tool instead of AdminUsersList
import AdminVenuesList from "@/components/admin/AdminVenuesList";
import AdminTournamentsList from "@/components/admin/AdminTournamentsList";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminPayments from "@/components/admin/AdminPayments";
import VerificationPanel from "@/components/admin/VerificationPanel";
import AuditLogs from "@/components/admin/AuditLogs";
import UserManagement from "@/components/admin/UserManagement";
import TournamentManagement from "@/components/admin/TournamentManagement";
import LicenseManagement from "@/components/admin/LicenseManagement";

import { Badge } from "@/components/ui/badge";

const AdminDashboard = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const admin = useAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeVenues: 0,
    activeTournaments: 0,
    totalRevenue: 0,
  });

  // sync tab with query param (?tab=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  // push query param when tab changes (keeps URL shareable)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      navigate({ search: params.toString() }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // fetch real stats for overview
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        setLoading(true);

        const response = await apiClient.get<{
          totalUsers: number;
          activeVenues: number;
          activeTournaments: number;
          totalRevenue: number;
        }>('/api/admin/stats');
        
        setStats({
          totalUsers: response.totalUsers || 0,
          activeVenues: response.activeVenues || 0,
          activeTournaments: response.activeTournaments || 0,
          totalRevenue: response.totalRevenue || 0,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load admin overview stats', e);
      } finally {
        setLoading(false);
      }
    };

    fetchRealStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-400">Welcome back, {profile?.full_name || profile?.username}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Platform Management
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-850 border-r border-gray-700 min-h-screen flex flex-col">
          <div className="p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Admin Tools</h2>
          </div>
        </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider">Navigation</div>
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3, permission: null },
              { id: 'user-management', label: 'Users', icon: Users, permission: 'user:suspend' as const },
              { id: 'tournaments', label: 'Tournaments', icon: Trophy, permission: 'tournament:approve' as const },
              { id: 'tournament-management', label: 'Tournament Tools', icon: Megaphone, permission: 'tournament:approve' as const },
              { id: 'venues', label: 'Venues', icon: MapPin, permission: 'venue:verify' as const },
              { id: 'payments', label: 'Payments', icon: CreditCard, permission: 'payment:process' as const },
              { id: 'verification', label: 'Verification', icon: CheckCircle, permission: 'verification:review' as const },
              { id: 'licenses', label: 'Licenses', icon: Award, permission: 'verification:review' as const },
              { id: 'audit-logs', label: 'Audit Logs', icon: FileText, permission: 'audit:view' as const },
              { id: 'system', label: 'System', icon: Settings, permission: null },
            ].filter(item => !item.permission || admin.hasPermission(item.permission)).map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  activeTab === item.id ? "bg-blue-600 text-white" : "text-gray-200 bg-gray-700/20 border border-gray-700/60 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.id === 'verification' && pendingVerifications > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">{pendingVerifications}</Badge>
                )}
              </button>
            ))}
          </div>
          </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === "overview" && (
            <div>
              {/* Welcome Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Platform Overview</h2>
                <p className="text-gray-400">Monitor your esports platform performance and key metrics</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gray-800 border-gray-700 hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Users</p>
                        <p className="text-2xl font-bold text-white">{loading ? '...' : stats.totalUsers.toLocaleString()}</p>
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <BarChart3 className="w-3 h-3" />
                          +12% from last month
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800 border-gray-700 hover:border-green-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Active Venues</p>
                        <p className="text-2xl font-bold text-white">{loading ? '...' : stats.activeVenues.toLocaleString()}</p>
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <BarChart3 className="w-3 h-3" />
                          +5% from last month
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                  
                <Card className="bg-gray-800 border-gray-700 hover:border-yellow-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Active Tournaments</p>
                        <p className="text-2xl font-bold text-white">{loading ? '...' : stats.activeTournaments.toLocaleString()}</p>
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <BarChart3 className="w-3 h-3" />
                          +18% from last month
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                  
                <Card className="bg-gray-800 border-gray-700 hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-white">{loading ? '...' : `$${stats.totalRevenue.toLocaleString()}`}</p>
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                          <BarChart3 className="w-3 h-3" />
                          +22% from last month
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                </div>
                
              {/* Analytics (trimmed) */}
              <div className="grid grid-cols-1 gap-6">
                  <AdminAnalytics />
                </div>
            </div>
          )}

          {activeTab === "user-management" && admin.hasPermission('user:suspend') && <UserManagement />}
          {activeTab === "tournaments" && admin.hasPermission('tournament:approve') && <AdminTournamentsList />}
          {activeTab === "tournament-management" && admin.hasPermission('tournament:approve') && <TournamentManagement />}
          {/* Ad Placement removed */}
          {activeTab === "venues" && admin.hasPermission('venue:verify') && <AdminVenuesList />}
          {activeTab === "venue-management" && admin.hasPermission('venue:verify') && <AdminVenuesList />}
          {activeTab === "payments" && admin.hasPermission('payment:process') && <AdminPayments displayType="full" />}
          {activeTab === "verification" && admin.hasPermission('verification:review') && <VerificationPanel onPendingCountChange={setPendingVerifications} />}
          {activeTab === "licenses" && admin.hasPermission('verification:review') && <LicenseManagement />}
          {activeTab === "audit-logs" && admin.hasPermission('audit:view') && <AuditLogs />}
          
          {activeTab === "system" && (
            <div className="space-y-6">
              <div className="text-center py-12">
                <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">System Management</h3>
                <p className="text-gray-400">System configuration and maintenance tools coming soon...</p>
              </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
