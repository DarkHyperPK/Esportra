import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Workflow, Settings, Building2, User } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface OrganizerLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/organizer/tournaments', label: 'Tournaments', icon: Trophy },
  { path: '/organizer/seasons', label: 'Seasons', icon: Workflow },
  { path: '/organizer/disputes', label: 'Disputes', icon: Settings },
];

const PAGE_TITLES: Record<string, string> = {
  '/organizer/dashboard': 'Dashboard',
  '/organizer/tournaments': 'Tournaments',
  '/organizer/seasons': 'Seasons',
  '/organizer/seasons/new': 'Create Season',
  '/organizer/disputes': 'Disputes',
  '/organizer/setup-organization': 'Organization',
};

const OrganizerLayout: React.FC<OrganizerLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkOrg = async () => {
      try {
        const roles = await apiClient.get<{ organization_id?: string | null }>('/api/me/roles');
        if (mounted) setHasOrganization(!!roles?.organization_id);
      } catch {
        if (mounted) setHasOrganization(false);
      }
    };
    void checkOrg();
    return () => { mounted = false; };
  }, []);

  const isActive = (path: string) => {
    if (path === '/organizer/dashboard') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const pageTitle = PAGE_TITLES[location.pathname] || 'Organizer';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col z-50">
        {/* Logo / Brand */}
        <div className="h-16 flex items-center px-5 border-b border-[#2a2a2a] flex-shrink-0">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#c0c0c0]">Organizer</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 h-10 px-3 text-[13px] font-medium tracking-wide transition-colors relative rounded-sm ${
                  active
                    ? 'text-white bg-white/5'
                    : 'text-[#a0a0a0] hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-full" />
                )}
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section — only show setup link if user has no org */}
        {hasOrganization === false && (
          <div className="px-3 py-3 border-t border-[#2a2a2a] flex-shrink-0">
            <Link
              to="/organizer/setup-organization"
              className={`flex items-center gap-3 h-10 px-3 text-[13px] font-medium tracking-wide transition-colors relative rounded-sm ${
                isActive('/organizer/setup-organization')
                  ? 'text-white bg-white/5'
                  : 'text-[#a0a0a0] hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              {isActive('/organizer/setup-organization') && (
                <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-full" />
              )}
              <Building2 className="w-[18px] h-[18px] flex-shrink-0" />
              <span>Setup Organization</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-between px-8 border-b border-[#2a2a2a] bg-[#050505] flex-shrink-0">
          <h1 className="text-sm font-semibold text-white tracking-wide">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <User className="w-4 h-4 text-[#808080]" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default OrganizerLayout;
