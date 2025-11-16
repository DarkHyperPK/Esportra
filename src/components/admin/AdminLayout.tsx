import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  User
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isAdmin, roles } = useAdmin();
  const { profile, signOut } = useAuth();
  const { canAccessResource } = useAdminPermissions();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      permission: null // Always accessible to admins
    },
    {
      name: 'User Management',
      href: '/admin/tools/user-management',
      icon: Users,
      permission: 'user:view'
    },
    {
      name: 'Tournament Management',
      href: '/admin/tools/tournament-management',
      icon: Trophy,
      permission: 'tournament:view'
    },
    {
      name: 'Venue Management',
      href: '/admin/tools/venue-management',
      icon: MapPin,
      permission: 'venue:view'
    },
    {
      name: 'Verification System',
      href: '/admin/tools/verification-system',
      icon: Shield,
      permission: 'verification:view'
    },
    {
      name: 'Audit Logs',
      href: '/admin/tools/audit-logs',
      icon: FileText,
      permission: 'audit:view'
    },
    {
      name: 'Analytics',
      href: '/admin/tools/analytics',
      icon: BarChart3,
      permission: 'audit:view' // Analytics requires audit access
    },
    {
      name: 'System Settings',
      href: '/admin/tools/system-settings',
      icon: Settings,
      permission: 'settings:view'
    }
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.permission || canAccessResource(item.permission.split(':')[0])
  );

  const handleSignOut = async () => {
    await signOut();
  };

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
          <nav className="mt-4 px-2">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${
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
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gray-800 border-r border-gray-700">
          <div className="flex items-center h-16 px-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          </div>
          <nav className="mt-4 flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => {
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
                <div className="flex flex-wrap gap-1 mt-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
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
