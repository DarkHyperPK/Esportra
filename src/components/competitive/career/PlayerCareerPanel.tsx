import { useCareerGames } from '@/hooks/competitive/useCareerGames';
import { usePlayerCareer } from '@/hooks/competitive/useCareer';
import { EMPTY_RECORD_TEXT, accessNotice } from '@/services/career/format';
import { ActivityBars } from './ActivityBars';
import { AgentBreakdown, MapBreakdown, TeamBreakdown } from './CareerBreakdown';
import { CareerGameList } from './CareerGameList';
import { CareerNotice } from './CareerNotice';
import { PanelError, PanelMessage, PanelSkeleton } from './PanelStates';
import { PlayerSummaryGrid } from './PlayerSummaryGrid';

interface Props {
  userId: string;
}

/** A player's competitive career: what the viewer is allowed to see, with the sample it rests on. */
export function PlayerCareerPanel({ userId }: Props) {
  const { signedIn, summary, games } = usePlayerCareer(userId);
  const list = useCareerGames(games);

  if (!signedIn) return <PanelMessage>Sign in to see competitive stats.</PanelMessage>;
  if (summary.isLoading) return <PanelSkeleton />;
  if (summary.isError || !summary.data) return <PanelError onRetry={() => void summary.refetch()} />;

  const data = summary.data;
  if (data.access === 'none') return <PanelMessage>This player keeps their performance stats private.</PanelMessage>;
  if (!data.hasData) return <PanelMessage>{EMPTY_RECORD_TEXT}</PanelMessage>;

  return (
    <div className="space-y-5">
      <CareerNotice sample={data.sample} access={accessNotice(data.access, data.scope)} truncated={data.truncated} />
      <PlayerSummaryGrid totals={data.totals} />
      <ActivityBars activity={data.activity} />
      <div className="grid gap-3 lg:grid-cols-3">
        <AgentBreakdown agents={data.agents} />
        <MapBreakdown maps={data.maps} />
        <TeamBreakdown teams={data.teams} />
      </div>
      <CareerGameList {...list} onLoadMore={list.loadMore} />
    </div>
  );
}
