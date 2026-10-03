import { useMemo } from 'react';
import MatchHistoryCard from '@/components/debug/MatchHistoryCard';
import { pickEnrichedTargetPuuid } from '@/hooks/useRiotGameDetails';
import type { EnrichedRiotMatchData } from '@/types/enrichedRiotMatch';
import type { RiotTeamSide } from '@/types/scoreboardPlayer';

type Props = {
    enriched: EnrichedRiotMatchData;
    t1Side: RiotTeamSide;
    team1Name: string;
    team2Name: string;
};

/**
 * The full Riot record for one map: scoreboard, timeline, economy, rounds and
 * weapons. Reads the stored snapshot only; spectators never trigger a Riot fetch.
 */
export const MatchRiotStats = ({ enriched, t1Side, team1Name, team2Name }: Props) => {
    const targetPuuid = useMemo(() => pickEnrichedTargetPuuid(enriched, t1Side), [enriched, t1Side]);
    if (!targetPuuid) return null;

    return (
        <section aria-label="Riot match stats">
            <MatchHistoryCard
                matchData={enriched}
                targetPuuid={targetPuuid}
                team1Name={team1Name}
                team2Name={team2Name}
                t1Side={t1Side}
                directView
                hideSummary
            />
        </section>
    );
};

export default MatchRiotStats;
