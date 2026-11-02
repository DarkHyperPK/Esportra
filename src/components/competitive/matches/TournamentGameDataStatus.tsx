import { useTournamentProviderMatch } from '@/hooks/competitive/useProviderMatch';
import { MatchDataStatusBadge } from './MatchDataStatusBadge';

interface Props {
  matchId: string;
  gameNumber: number;
  hasRiotMatch: boolean;
}

/** Riot verification for one tournament map; renders nothing for maps without a Riot match. */
export function TournamentGameDataStatus({ matchId, gameNumber, hasRiotMatch }: Props) {
  const { data } = useTournamentProviderMatch(matchId, gameNumber, hasRiotMatch);
  return <MatchDataStatusBadge detail={data} compact />;
}
