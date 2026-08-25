import { NavLink, Outlet } from 'react-router-dom';
import { useAdminSponsorApplications } from '@/hooks/useAdminQueries';
import {
  CommandHeader,
  CommandShell,
} from '@/components/management/CommandSurface';
import {
  FileText,
  Flag,
  LayoutDashboard,
  Megaphone,
  ScrollText,
} from 'lucide-react';

const sections = [
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'pipeline', label: 'Pipeline', icon: FileText },
  { to: 'partners', label: 'Partners', icon: Flag },
  { to: 'placements', label: 'Placements', icon: Megaphone },
  { to: 'audit', label: 'Audit', icon: ScrollText },
] as const;

const SponsorsHub = () => {
  const { data: applications = [] } = useAdminSponsorApplications();
  const pendingApps = applications.filter(a => a.status === 'pending').length;

  return (
    <CommandShell>
      <div className="esportra-ambient-content mx-auto w-full max-w-[1800px] space-y-5 p-4 md:p-6">
        <CommandHeader
          eyebrow="Partners"
          title="Sponsors"
          description="Pipeline, partnerships, placements and performance — one command surface."
        />

        {/* Section tabs — the admin sidebar owns global navigation; these switch within Sponsors */}
        <nav className="flex gap-2 overflow-x-auto border border-white/10 bg-[#0a0a0c]/92 p-2" data-lenis-prevent>
          {sections.map((section, i) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                `group relative flex shrink-0 items-center gap-2.5 overflow-hidden border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'border-transparent bg-rose-500 text-white'
                    : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-white/80' : 'text-zinc-600 group-hover:text-zinc-400'}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <section.icon className="h-4 w-4 shrink-0" />
                  <span>{section.label}</span>
                  {section.to === 'pipeline' && pendingApps > 0 && (
                    <span className={`ml-1 ${isActive ? 'text-white' : 'text-rose-400'}`}>{pendingApps}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </CommandShell>
  );
};

export default SponsorsHub;
