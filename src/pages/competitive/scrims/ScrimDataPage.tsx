import { Link, useSearchParams } from 'react-router-dom';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PanelMessage } from '@/components/competitive/scrims/data/PanelStates';
import { ScrimDataPanel } from '@/components/competitive/scrims/data/ScrimDataPanel';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { cn } from '@/lib/utils';

interface TeamSummary {
  id: string;
  name: string;
}

/** "Scrim Insights": a team's own scrim record and what it can learn from it. For the team's members only. */
export default function ScrimDataPage() {
  const [params] = useSearchParams();
  const { data, isLoading } = useMyTeamsSummary();
  const teams = (data ?? []) as TeamSummary[];
  const team = teams.find((t) => t.id === params.get('team_id')) ?? teams[0];

  return (
    <CompetitivePageShell>
      <div className="space-y-6 px-4 pb-16 pt-6 lg:px-8 lg:pt-8">
        <header className="space-y-3 border-b border-white/[0.08] pb-6">
          <div>
            <h1 className="font-heading text-[24px] font-bold leading-tight text-white">Scrim Insights</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-400">
              Your team’s scrims, one category at a time. Built from maps both teams confirmed. Only your team can see this.
            </p>
          </div>
          {teams.length > 1 && (
            <nav aria-label="Choose a team" className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <Link key={t.id} to={`/competitive/scrims/data?team_id=${t.id}`} aria-current={t.id === team?.id ? 'page' : undefined}
                  className={cn('inline-flex h-9 items-center rounded-lg border px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                    t.id === team?.id ? 'border-white/40 text-white' : 'border-white/[0.14] text-white/60 hover:text-white')}>
                  {t.name}
                </Link>
              ))}
            </nav>
          )}
        </header>

        {isLoading ? null : team ? (
          <>
            {teams.length > 1 && <p className="text-[13px] text-zinc-400">Showing <span className="text-white">{team.name}</span></p>}
            <ScrimDataPanel teamId={team.id} />
          </>
        ) : (
          <PanelMessage>Join or create a team to see your scrim data.</PanelMessage>
        )}
      </div>
    </CompetitivePageShell>
  );
}
