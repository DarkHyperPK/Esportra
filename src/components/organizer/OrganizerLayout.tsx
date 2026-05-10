import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-[#0a0a0a] border-r border-[#2a2a2a] flex flex-col">
        {/* Logo / Brand */}
        <div className="h-14 flex items-center px-6 border-b border-[#2a2a2a]">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white">ORGANIZER</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/organizer/dashboard'}
                className={`flex items-center gap-3 h-11 px-3 text-xs font-semibold uppercase tracking-widest transition-none ${
                  isActive
                    ? 'bg-white text-black'
                    : 'text-[#a0a0a0] hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-[#2a2a2a]">
          <NavLink
            to="/organizer/setup-organization"
            className={`flex items-center gap-3 h-11 px-3 text-xs font-semibold uppercase tracking-widest transition-none ${
              location.pathname === '/organizer/setup-organization'
                ? 'bg-white text-black'
                : 'text-[#a0a0a0] hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            ORGANIZATION
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default OrganizerLayout;
