import { useEffect, useMemo, useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { useConfirmScrimGame, useScrimGames } from '@/hooks/competitive/useScrimGames';
import { getApiErrorMessage } from '@/lib/apiClient';
import { buildGameTabs, defaultGameTab } from '@/services/scrimGameTabs';
import { ROOM_PANEL } from '../roomStyles';
import type { ScrimSession } from '@/types/competitive';
import { ScrimGameReport } from './ScrimGameReport';
import { ScrimGameRow } from './ScrimGameRow';
import { ScrimGameTabs } from './ScrimGameTabs';
import { ScrimSeriesHeader } from './ScrimSeriesHeader';

interface Props {
  session: ScrimSession;
  myTeamId: string | null;
  isStaff: boolean;
}

/** The series map by map, one tab per map: a map opens once the one before it is settled. */
export function ScrimGamesPanel({ session, myTeamId, isStaff }: Props) {
  const gamesQuery = useScrimGames(session.id);
  const confirm = useConfirmScrimGame(session.id);
  const [active, setActive] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmingGame, setConfirmingGame] = useState<number | null>(null);

  const data = gamesQuery.data;
  const team1 = { id: session.team1Id, name: session.team1Name ?? 'Team 1', logo: session.team1Logo ?? undefined };
  const team2 = { id: session.team2Id, name: session.team2Name ?? 'Team 2', logo: session.team2Logo ?? undefined };
  const live = session.status === 'in_progress';
  const decided = session.status === 'completed';

  const tabs = useMemo(
    () => (data ? buildGameTabs(data.bestOf, data.games, decided) : []),
    [data, decided],
  );
  const initialTab = data ? defaultGameTab(tabs, data.nextGameNumber) : 1;
  // Follow the series: when a map is confirmed and the next opens, move to it.
  const lastNext = data?.nextGameNumber ?? null;
  useEffect(() => { if (lastNext) setActive(lastNext); }, [lastNext]);
  const current = active ?? initialTab;

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

  // Sessions finished before maps were tracked only have the series score.
  const legacyScore = decided && data.games.length === 0 && session.team1Score != null && session.team2Score != null;
  const tab = tabs.find((t) => t.gameNumber === current);
  const game = tab?.game ?? null;
  const canReport = live && isStaff && !!myTeamId;
  const reportProps = myTeamId ? {
    sessionId: session.id, myTeamId, team1Id: team1.id, team2Id: team2.id, team1Name: team1.name, team2Name: team2.name,
    team1Logo: team1.logo, team2Logo: team2.logo, isValorant: session.gameSlug === 'valorant',
  } : null;

  return (
    <div className={ROOM_PANEL}>
      <ScrimSeriesHeader
        team1Name={team1.name} team2Name={team2.name}
        team1Wins={legacyScore ? session.team1Score ?? 0 : data.team1Wins} team2Wins={legacyScore ? session.team2Score ?? 0 : data.team2Wins}
        bestOf={data.bestOf} winsNeeded={data.winsNeeded} nextGameNumber={live ? data.nextGameNumber : null} decided={decided}
      />

      {tabs.length > 1 || data.bestOf === 1 ? <ScrimGameTabs tabs={tabs} active={current} onSelect={(n) => { setActive(n); setEditing(null); }} /> : null}

      <div role="tabpanel" id={`game-panel-${current}`} aria-labelledby={`game-tab-${current}`} className="space-y-3">
        {game && (
          <ul aria-label={`Game ${current}`}>
            <ScrimGameRow
              sessionId={session.id} game={game} myTeamId={myTeamId} isStaff={isStaff} team1={team1} team2={team2}
              confirming={confirmingGame === game.gameNumber}
              confirmError={confirmingGame === null && confirm.isError ? getApiErrorMessage(confirm.error, 'Could not confirm. Try again.') : null}
              onConfirm={() => void confirmGame(game.gameNumber)}
              onEdit={() => setEditing(game.gameNumber)}
            />
          </ul>
        )}
        {game && editing === current && reportProps && (
          <ScrimGameReport {...reportProps} gameNumber={current} closable onDone={() => setEditing(null)} />
        )}
        {!game && tab?.unlocked && canReport && reportProps && (
          <ScrimGameReport {...reportProps} gameNumber={current} onDone={() => undefined} />
        )}
        {!game && tab?.unlocked && !canReport && (
          <p className="text-[13px] text-zinc-500">
            {live ? 'Your captain or manager reports and confirms the maps.' : 'This map was not played.'}
          </p>
        )}
        {tab && !tab.unlocked && (
          <p className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-zinc-500">{tab.lockedReason}</p>
        )}
      </div>
    </div>
  );
}
