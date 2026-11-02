import { useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { useConfirmScrimGame, useScrimGames } from '@/hooks/competitive/useScrimGames';
import { getApiErrorMessage } from '@/lib/apiClient';
import { ROOM_PANEL } from '../roomStyles';
import type { ScrimSession } from '@/types/competitive';
import { ScrimGameReport } from './ScrimGameReport';
import { ScrimGameRow } from './ScrimGameRow';
import { ScrimSeriesHeader } from './ScrimSeriesHeader';

interface Props {
  session: ScrimSession;
  myTeamId: string | null;
  isStaff: boolean;
}

/** The series map by map: report a map, the other team confirms it, then the next one opens. */
export function ScrimGamesPanel({ session, myTeamId, isStaff }: Props) {
  const gamesQuery = useScrimGames(session.id);
  const confirm = useConfirmScrimGame(session.id);
  const [reporting, setReporting] = useState<number | null>(null);
  const [confirmingGame, setConfirmingGame] = useState<number | null>(null);

  const data = gamesQuery.data;
  const team1 = { id: session.team1Id, name: session.team1Name ?? 'Team 1', logo: session.team1Logo ?? undefined };
  const team2 = { id: session.team2Id, name: session.team2Name ?? 'Team 2', logo: session.team2Logo ?? undefined };
  const live = session.status === 'in_progress';
  const decided = session.status === 'completed';
  const next = data?.nextGameNumber ?? null;
  const nextExists = !!data?.games.some((g) => g.gameNumber === next);
  // Sessions finished before maps were tracked only have the series score.
  const legacyScore = decided && data?.games.length === 0 && session.team1Score != null && session.team2Score != null;
  const canReportNext = live && isStaff && !!myTeamId && next !== null && !nextExists;

  async function confirmGame(n: number) {
    setConfirmingGame(n);
    try { await confirm.mutateAsync(n); } catch { /* shown on the row */ } finally { setConfirmingGame(null); }
  }

  if (gamesQuery.isLoading) return <div className={ROOM_PANEL}><p className="text-[13px] text-zinc-500">Loading results…</p></div>;
  if (gamesQuery.isError || !data) {
    return (
      <div className={ROOM_PANEL}>
        <InlineNotice tone="critical" action={<button type="button" onClick={() => void gamesQuery.refetch()} className="text-[12px] underline">Retry</button>}>
          Could not load the results.
        </InlineNotice>
      </div>
    );
  }

  return (
    <div className={ROOM_PANEL}>
      <ScrimSeriesHeader
        team1Name={team1.name} team2Name={team2.name}
        team1Wins={legacyScore ? session.team1Score ?? 0 : data.team1Wins} team2Wins={legacyScore ? session.team2Score ?? 0 : data.team2Wins}
        bestOf={data.bestOf} winsNeeded={data.winsNeeded} nextGameNumber={live ? next : null} decided={decided}
      />

      {data.games.length > 0 && (
        <ul className="space-y-3" aria-label="Maps">
          {data.games.map((game) => (
            <ScrimGameRow
              key={game.gameNumber}
              sessionId={session.id}
              game={game}
              myTeamId={myTeamId}
              isStaff={isStaff}
              team1={team1}
              team2={team2}
              confirming={confirmingGame === game.gameNumber}
              confirmError={confirmingGame === null && confirm.isError ? getApiErrorMessage(confirm.error, 'Could not confirm. Try again.') : null}
              onConfirm={() => void confirmGame(game.gameNumber)}
              onEdit={() => setReporting(game.gameNumber)}
            />
          ))}
        </ul>
      )}

      {reporting !== null && myTeamId && (
        <ScrimGameReport
          sessionId={session.id} gameNumber={reporting} myTeamId={myTeamId}
          team1Id={team1.id} team2Id={team2.id} team1Name={team1.name} team2Name={team2.name}
          team1Logo={team1.logo} team2Logo={team2.logo}
          isValorant={session.gameSlug === 'valorant'} onDone={() => setReporting(null)}
        />
      )}

      {canReportNext && reporting === null && (
        <button type="button" onClick={() => setReporting(next)}
          className="min-h-[40px] rounded-lg bg-white px-5 text-[13px] font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]">
          Report game {next}
        </button>
      )}
      {live && !isStaff && <p className="text-[12px] text-zinc-500">Your captain or manager reports and confirms the maps.</p>}
    </div>
  );
}
