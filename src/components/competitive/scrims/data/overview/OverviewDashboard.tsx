import { PanelError, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimTeamReport } from '@/hooks/competitive/useScrimReports';
import type { RecentMap } from '@/types/scrimData';
import { MapRatingBars } from './MapRatingBars';
import { RosterStrip } from './RosterStrip';
import { Focus, LastScrim, UpNext } from './SidePanels';
import { TeamHero } from './TeamHero';

export interface OverviewTeam { name: string; logoUrl: string | null; tag: string | null }

interface Props { teamId: string; team: OverviewTeam; recent: RecentMap[]; fallback: React.ReactNode }

/** The Scrim Insights front page: the team and its rating, the roster as cards, the rating map by map, and what is next. Teams with no Riot-verified maps see the plain record instead. */
export default function OverviewDashboard({ teamId, team, recent, fallback }: Props) {
  const q = useScrimTeamReport(teamId);
  if (q.isLoading) return <PanelSkeleton />;
  if (q.isError || !q.data) return <PanelError onRetry={() => void q.refetch()} />;
  if (!q.data.hasData) return <>{fallback}</>;
  const { report, ratings } = q.data;
  return (
    <div className="space-y-4">
      <TeamHero team={team} report={report} ratings={ratings} />
      <RosterStrip players={report.players} ratings={ratings} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <MapRatingBars series={report.series} byMap={ratings?.byMap ?? []} />
        <div className="space-y-4">
          <LastScrim map={recent[0]} />
          <UpNext teamId={teamId} />
          <Focus highlights={report.highlights} />
        </div>
      </div>
    </div>
  );
}
