import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdminSponsorApplications } from '@/hooks/useAdminQueries';
import {
  FileText,
  Flag,
  LayoutDashboard,
  Megaphone,
  ScrollText,
} from 'lucide-react';

const railItems = [
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'pipeline', label: 'Pipeline', icon: FileText },
  { to: 'partners', label: 'Partners', icon: Flag },
  { to: 'placements', label: 'Placements', icon: Megaphone },
  { to: 'audit', label: 'Audit', icon: ScrollText },
] as const;

const SponsorsHub = () => {
  const location = useLocation();
  const { data: applications = [] } = useAdminSponsorApplications();
  const pendingApps = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-rose-400 mb-1">Partners</p>
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight text-white">Sponsors</h1>
        <p className="text-sm text-zinc-500 mt-1">Pipeline, partnerships, placements and performance in one place.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left rail */}
        <nav className="lg:w-52 shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0 lg:sticky lg:top-6" data-lenis-prevent>
            {railItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-rose-500/15 text-white ring-1 ring-rose-500/25'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {item.to === 'pipeline' && pendingApps > 0 && (
                  <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingApps}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Section content */}
        <div className="min-w-0 flex-1" key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SponsorsHub;
