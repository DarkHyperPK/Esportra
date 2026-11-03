import { useEffect, useState } from 'react';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import { RiotMatchCandidateList } from '@/components/tournament/RiotMatchCandidateList';
import { useScrimRecentMatches } from '@/hooks/competitive/useScrims';
import { useReportScrimGameFromRiot } from '@/hooks/competitive/useScrimGames';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';
import { ROOM_GHOST } from '../roomStyles';

interface Props {
  sessionId: string;
  gameNumber: number;
  myTeamId: string;
  team1Id: string;
  team2Id: string;
  onDone: () => void;
}

/** Finds the map in Riot's match history and reports it with the full scoreboard, as the match room does. */
export function ScrimAutoFetch({ sessionId, gameNumber, myTeamId, team1Id, team2Id, onDone }: Props) {
  const [showAll, setShowAll] = useState(false);
  const recent = useScrimRecentMatches(sessionId, myTeamId, gameNumber, showAll);
  const { refetch } = recent;
  const reportRiot = useReportScrimGameFromRiot(sessionId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const matches = recent.data?.matches ?? null;
  const expectedMap = recent.data?.expectedMap ?? null;
  const hidden = recent.data?.hiddenByVeto ?? 0;

  useEffect(() => {
    if (showAll) void refetch();
  }, [showAll, refetch]);

  async function pick(candidate: RiotMatchCandidate) {
    setSubmitError(null);
    try {
      await reportRiot.mutateAsync({ candidate, ctx: { gameNumber, userTeamId: myTeamId, team1Id, team2Id } });
      onDone();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Could not report that game. Try again.'));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-zinc-400">
        Play game {gameNumber} as a custom game, then fetch it from your Riot history. The other team confirms the result.
      </p>
      {expectedMap && (
        <p className="text-[13px] text-zinc-300">
          {showAll ? `Showing every map. The veto assigned ${expectedMap} to game ${gameNumber}.` : `The veto assigned ${expectedMap} to game ${gameNumber}, so only ${expectedMap} games are listed.`}
        </p>
      )}
      <button
        type="button"
        onClick={() => void recent.refetch()}
        disabled={recent.isFetching || reportRiot.isPending}
        className={`${ROOM_GHOST} inline-flex items-center gap-2`}
        aria-busy={recent.isFetching}
      >
        {recent.isFetching
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          : matches ? <RefreshCcw className="h-3.5 w-3.5" aria-hidden /> : <Search className="h-3.5 w-3.5" aria-hidden />}
        {recent.isFetching ? 'Scanning Riot history…' : matches ? 'Fetch again' : `Auto-fetch game ${gameNumber}`}
      </button>

      {recent.isError && (
        <InlineNotice tone="critical">{getApiErrorMessage(recent.error, 'Could not reach Riot match history.')}</InlineNotice>
      )}
      {matches && matches.length === 0 && (
        <InlineNotice tone="neutral">
          {recent.data?.reason ?? (expectedMap && !showAll ? `No recent ${expectedMap} games found. Make sure the game has finished.` : 'No recent custom games found. Make sure the game has finished.')}
        </InlineNotice>
      )}
      {matches && expectedMap && !showAll && hidden > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className={ROOM_GHOST}>
          Show all maps ({hidden} on other maps)
        </button>
      )}
      {matches && matches.length > 0 && (
        <RiotMatchCandidateList candidates={matches} submitting={reportRiot.isPending} onSelect={(c) => void pick(c)} tone="neutral" compact />
      )}
      {reportRiot.isPending && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending the result…
        </p>
      )}
      {submitError && <InlineNotice tone="critical">{submitError}</InlineNotice>}
    </div>
  );
}
