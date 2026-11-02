import { useScrimProviderMatch } from '@/hooks/competitive/useProviderMatch';
import { MatchDataStatusBadge } from './MatchDataStatusBadge';

interface Props {
  sessionId: string;
  gameNumber: number;
  riotMatchId: string | null;
}

/** Riot verification line for one scrim map; renders nothing for maps without a Riot match. */
export function ScrimGameDataStatus({ sessionId, gameNumber, riotMatchId }: Props) {
  const { data } = useScrimProviderMatch(sessionId, gameNumber, !!riotMatchId);
  return <MatchDataStatusBadge detail={data} />;
}
