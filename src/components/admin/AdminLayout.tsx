import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileLoading } from '@/components/profile/ProfileLoading';
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  MapPin, 
  Shield, 
  FileText, 
  BarChart3, 
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Building2,
  Crown,
  MessageSquare
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, roles, hasPermission, loading } = useAdmin();
  const { profile, signOut } = useAuth();
  const { canAccessResource } = useAdminPermissions();

  const isSuperAdmin = roles.includes('super_admin');
  const hasRoleAccess = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (isSuperAdmin) return true;
    return allowedRoles.some(role => roles.includes(role));
  };
  
  // Debug logging
  useEffect(() => {
    console.log('AdminLayout - isSuperAdmin:', isSuperAdmin, 'roles:', roles, 'superAdminFeatures:', superAdminFeatures);
  }, [isSuperAdmin, roles]);

  // Core admin navigation
  const adminNavigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      permission: null, // Always accessible to admins
      allowedRoles: ['ops_admin', 'finance_admin', 'moderator', 'support_admin', 'super_admin']
    },
    {
      name: 'Admin Management',
      href: '/admin/tools/admin-management',
      icon: Crown,
      permission: 'admin:assign_roles',
      superAdminOnly: true // Only show for super admins
    },
    {
      name: 'User Management',
      href: '/admin/tools/user-management',
      icon: Users,
      permission: 'user:view',
      allowedRoles: ['ops_admin', 'finance_admin', 'moderator', 'support_admin']
    },
    {
      name: 'Tournament Management',
      href: '/admin/tools/tournament-management',
      icon: Trophy,
      permission: 'tournament:view',
      allowedRoles: ['ops_admin', 'moderator']
    },
    {
      name: 'Venue Management',
      href: '/admin/tools/venue-management',
      icon: MapPin,
      permission: 'venue:view',
      allowedRoles: ['ops_admin', 'support_admin']
    },
    {
      name: 'Verification System',
      href: '/admin/tools/verification-system',
      icon: Shield,
      permission: 'verification:view',
      allowedRoles: ['ops_admin', 'support_admin']
    },
    {
      name: 'Dispute Center',
      href: '/admin/disputes',
      icon: MessageSquare,
      permission: 'dispute:resolve',
      allowedRoles: ['ops_admin', 'moderator', 'super_admin']
    },
    {
      name: 'Audit Logs',
      href: '/admin/tools/audit-logs',
      icon: FileText,
      permission: 'audit:view',
      allowedRoles: ['ops_admin', 'finance_admin', 'moderator', 'support_admin']
    },
    {
      name: 'Analytics',
      href: '/admin/tools/analytics',
      icon: BarChart3,
      permission: 'audit:view', // Analytics requires audit access
      allowedRoles: ['ops_admin', 'finance_admin']
    },
    {
      name: 'System Settings',
      href: '/admin/tools/system-settings',
      icon: Settings,
      permission: 'settings:view',
      allowedRoles: ['ops_admin', 'finance_admin']
    }
  ];

  // Super admin specific features (organizer & venue owner perks)
  const superAdminFeatures = isSuperAdmin ? [
    {
      name: 'Manage Tournaments',
      href: '/organizer/tournaments',
      icon: Trophy,
      section: 'super_admin'
    },
    {
      name: 'Create Tournament',
      href: '/tournaments/create',
      icon: Trophy,
      section: 'super_admin'
    },
    {
      name: 'Manage Venues',
      href: '/venue-owner/dashboard',
      icon: Building2,
      section: 'super_admin'
    },
    {
      name: 'List New Venue',
      href: '/venues/list-venue',
      icon: MapPin,
      section: 'super_admin'
    }
  ] : [];

  // Debug: Log super admin features
  useEffect(() => {
    if (isSuperAdmin) {
      console.log('Super Admin Features:', superAdminFeatures);
    }
  }, [isSuperAdmin, superAdminFeatures]);

  const filteredAdminNav = adminNavigation.filter(item => {
    const roleAllowed = hasRoleAccess(item.allowedRoles);
    if (!roleAllowed) return false;

    const hasPermissionForNav = !item.permission
      ? true
      : hasPermission(item.permission) || canAccessResource(item.permission.split(':')[0]);

    const isSuperAdminOnly = (item as any).superAdminOnly;
    if (isSuperAdminOnly && !isSuperAdmin) return false;

    return hasPermissionForNav;
  });

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <ProfileLoading />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-gray-800">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="mt-4 px-2 space-y-4 overflow-y-auto">
            {/* Core Admin Tools */}
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin Tools
              </div>
              <div className="space-y-1">
                {filteredAdminNav.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Super Admin Features */}
            {isSuperAdmin && superAdminFeatures.length > 0 && (
              <div className="mt-4">
                <div className="px-3 py-2 text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-2 border-t border-gray-700 pt-4">
                  <Crown className="w-3 h-3" />
                  Super Admin Features
                </div>
                <div className="space-y-1 mt-2">
                  {superAdminFeatures.map((item) => {
                    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-2 transition-colors ${
                          isActive
                            ? 'bg-yellow-900/30 text-yellow-300 border-yellow-500'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white border-transparent'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gray-800 border-r border-gray-700">
          <div className="flex items-center h-16 px-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <nav className="mt-4 flex-1 px-2 space-y-4 overflow-y-auto">
            {/* Core Admin Tools */}
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin Tools
              </div>
              <div className="space-y-1">
                {filteredAdminNav.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Super Admin Features */}
            {isSuperAdmin && superAdminFeatures.length > 0 && (
              <div className="mt-4">
                <div className="px-3 py-2 text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-2 border-t border-gray-700 pt-4">
                  <Crown className="w-3 h-3" />
                  Super Admin Features
                </div>
                <div className="space-y-1 mt-2">
                  {superAdminFeatures.map((item) => {
                    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-2 transition-colors ${
                          isActive
                            ? 'bg-yellow-900/30 text-yellow-300 border-yellow-500'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white border-transparent'
                        }`}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>
          
          {/* User info */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">
                  {profile?.full_name || profile?.username}
                </p>
                <div className="text-xs text-gray-400 mt-1">
                  {roles.includes('super_admin') 
                    ? 'Super Admin' 
                    : roles.length > 0 
                      ? roles.map(r => r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
                      : 'Admin'}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full mt-3 text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-gray-800 border-b border-gray-700 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
