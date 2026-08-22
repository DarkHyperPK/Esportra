import { NavLink, Outlet } from 'react-router-dom';
import { adminNavGroups } from '@/components/admin/AdminLayout';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAdminSponsorApplications } from '@/hooks/useAdminQueries';
import {
  CommandHeader,
  CommandPageGrid,
  CommandRail,
  CommandShell,
} from '@/components/management/CommandSurface';
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
  const { can } = useAdminAccess();
  const { data: applications = [] } = useAdminSponsorApplications();
  const pendingApps = applications.filter(a => a.status === 'pending').length;
  const crossLinks = adminNavGroups
    .flatMap(g => g.items)
    .filter(item => !item.href.startsWith('/admin/partners/sponsors'))
    .filter(item => !item.permission || can(item.permission))
    .slice(0, 6);

  return (
    <CommandShell>
      <CommandPageGrid
        rail={
          <CommandRail className="lg:sticky lg:top-5">
            <p className="mb-3 px-2 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-zinc-600">
              Sections
            </p>
            <nav className="space-y-0.5">
              {railItems.map((item, i) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 border-l-2 py-2 pl-3 pr-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'border-rose-500 text-white'
                        : 'border-transparent text-zinc-500 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-rose-400' : 'text-zinc-700 group-hover:text-zinc-500'}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.to === 'pipeline' && pendingApps > 0 && (
                        <span className="ml-auto font-mono text-[10px] text-rose-400">{pendingApps}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Cross-links into the wider admin tree */}
            <div className="mt-5 border-t border-white/5 pt-4">
              <p className="mb-2 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-zinc-600">
                Admin
              </p>
              {crossLinks.map(item => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-3 border-l-2 border-transparent px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:text-white"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </CommandRail>
        }
      >
        <CommandHeader
          eyebrow="Partners"
          title="Sponsors"
          description="Pipeline, partnerships, placements and performance — one command surface."
        />
        <Outlet />
      </CommandPageGrid>
    </CommandShell>
  );
};

export default SponsorsHub;
