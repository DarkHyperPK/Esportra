import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Trophy, Workflow, Settings, Building2 } from 'lucide-react';

interface OrganizerLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: '/organizer/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { path: '/organizer/tournaments', label: 'TOURNAMENTS', icon: Trophy },
  { path: '/organizer/seasons', label: 'SEASONS', icon: Workflow },
  { path: '/organizer/disputes', label: 'DISPUTES', icon: Settings },
];

const OrganizerLayout: React.FC<OrganizerLayoutProps> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/organizer/dashboard') {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Left Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col">
        {/* Logo / Brand */}
        <div className="h-16 flex items-center px-6 border-b border-[#2a2a2a]">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-white">ORGANIZER</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 h-12 px-4 text-xs font-semibold uppercase tracking-[0.15em] transition-none relative ${
                  active
                    ? 'text-white'
                    : 'text-[#808080] hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white" />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-4 py-4 border-t border-[#2a2a2a]">
          <Link
            to="/organizer/setup-organization"
            className={`flex items-center gap-4 h-12 px-4 text-xs font-semibold uppercase tracking-[0.15em] transition-none relative ${
              isActive('/organizer/setup-organization')
                ? 'text-white'
                : 'text-[#808080] hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            {isActive('/organizer/setup-organization') && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white" />
            )}
            <Building2 className="w-5 h-5 flex-shrink-0" />
            <span>ORGANIZATION</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#050505]">
        {children}
      </main>
    </div>
  );
};

export default OrganizerLayout;
