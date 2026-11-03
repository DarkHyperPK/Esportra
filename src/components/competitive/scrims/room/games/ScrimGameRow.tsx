import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { InlineNotice } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { gameTurn } from '@/services/scrimGames';
import type { ScrimGame, ScrimGameStatus } from '@/types/competitive';
import { ScrimGameDataStatus } from '@/components/competitive/matches/ScrimGameDataStatus';
import { ScrimGameDispute } from './ScrimGameDispute';
import { displayMapName } from '@/services/maps/valorantMapNames';

const MatchGameStatisticsPanel = lazy(() =>
  import('@/components/tournament/MatchGameStatisticsPanel').then((m) => ({ default: m.MatchGameStatisticsPanel })));

const STATUS: Record<ScrimGameStatus, { label: string; tone: string }> = {
  reported: { label: 'Awaiting confirmation', tone: 'text-amber-300' },
  confirmed: { label: 'Confirmed', tone: 'text-emerald-400' },
  disputed: { label: 'Disputed', tone: 'text-red-300' },
  resolved: { label: 'Resolved by staff', tone: 'text-sky-300' },
};
const SOURCE = { riot: 'Riot history', ocr: 'Screenshot', manual: 'Entered manually' } as const;

/** When the unanswered map confirms itself, as a sentence for the notice. */
function autoNote(game: ScrimGame): string | null {
  if (!game.acceptBy) return null;
  const at = new Date(game.acceptBy);
  return at.getTime() <= Date.now() ? 'It confirms automatically any moment now.' : `It confirms automatically ${formatDistanceToNowStrict(at, { addSuffix: true })} if there is no answer.`;
}

interface Props {
  sessionId: string;
  game: ScrimGame;
  myTeamId: string | null;
  isStaff: boolean;
  team1: { id: string; name: string; logo?: string };
  team2: { id: string; name: string; logo?: string };
  confirming: boolean;
  confirmError: string | null;
  onConfirm: () => void;
  onEdit: () => void;
}

export function ScrimGameRow({ sessionId, game, myTeamId, isStaff, team1, team2, confirming, confirmError, onConfirm, onEdit }: Props) {
  const [showStats, setShowStats] = useState(true);
  const [disputing, setDisputing] = useState(false);
  const turn = gameTurn(game, myTeamId);
  const reporter = game.reportedByTeamId === team1.id ? team1.name : team2.name;
  const status = STATUS[game.status];
  const w1 = game.winnerSlot === 1 || (!game.winnerSlot && game.team1Score > game.team2Score);

  return (
    <li className="space-y-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-white">
          Game {game.gameNumber}{displayMapName(game.mapName) ? <span className="font-normal text-white/50"> · {displayMapName(game.mapName)}</span> : null}
        </p>
        <p className={cn('text-[12px] font-medium', status.tone)}>{status.label}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className={cn('min-w-0 flex-1 truncate text-[13px]', w1 ? 'font-semibold text-white' : 'text-white/55')}>{team1.name}</p>
        <p className="font-mono text-[22px] font-bold tabular-nums text-white">
          {game.team1Score}<span className="px-1.5 text-white/30">–</span>{game.team2Score}
        </p>
        <p className={cn('min-w-0 flex-1 truncate text-right text-[13px]', !w1 ? 'font-semibold text-white' : 'text-white/55')}>{team2.name}</p>
      </div>
      <p className="text-[11px] text-zinc-500">
        Reported by {reporter} · {SOURCE[game.source]}{game.autoConfirmed ? ' · Confirmed automatically' : ''}
      </p>
      <ScrimGameDataStatus sessionId={sessionId} gameNumber={game.gameNumber} riotMatchId={game.riotMatchId} />

      {turn === 'confirm' && isStaff && !disputing && (
        <div className="space-y-2">
          <InlineNotice tone="warning">
            {reporter} reported this map. Check the score, then confirm or dispute it.{autoNote(game) ? ` ${autoNote(game)}` : ''}
          </InlineNotice>
          {confirmError && <p role="alert" className="text-[12px] text-red-300">{confirmError}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onConfirm} disabled={confirming}
              className="min-h-[36px] rounded-lg border border-emerald-500/40 px-4 text-[13px] text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              {confirming ? 'Confirming…' : 'Confirm map'}
            </button>
            <button type="button" onClick={() => setDisputing(true)}
              className="min-h-[36px] rounded-lg border border-amber-500/25 px-4 text-[13px] text-amber-300/80 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              Dispute
            </button>
          </div>
        </div>
      )}
      {turn === 'confirm' && disputing && myTeamId && (
        <ScrimGameDispute sessionId={sessionId} gameNumber={game.gameNumber} myTeamId={myTeamId} onClose={() => setDisputing(false)} />
      )}
      {turn === 'waiting' && (
        <div className="flex flex-wrap items-center gap-3">
          <InlineNotice tone="neutral">Waiting for the other team to confirm.{autoNote(game) ? ` ${autoNote(game)}` : ''}</InlineNotice>
          {isStaff && <button type="button" onClick={onEdit} className="text-[12px] text-white/55 underline underline-offset-4 hover:text-white">Edit result</button>}
        </div>
      )}
      {game.status === 'disputed' && (
        <InlineNotice tone="warning">Staff will rule on this map. You can keep playing and reporting the other maps.</InlineNotice>
      )}

      {game.riotMatchId && (
        <Link to={`/competitive/scrims/sessions/${sessionId}/games/${game.gameNumber}/report${myTeamId ? `?team_id=${myTeamId}` : ''}`}
          className="inline-block text-[12px] font-medium text-white/60 underline underline-offset-4 hover:text-white">
          Open the full map report
        </Link>
      )}

      {game.matchData && (
        <div>
          <button type="button" onClick={() => setShowStats((v) => !v)} aria-expanded={showStats}
            className="text-[12px] font-medium text-white/60 underline underline-offset-4 hover:text-white">
            {showStats ? 'Hide scoreboard' : 'Show scoreboard'}
          </button>
          {showStats && (
            <div className="mt-3">
              <Suspense fallback={<p className="text-[12px] text-zinc-500">Loading scoreboard…</p>}>
                <MatchGameStatisticsPanel
                  riotMatchId={game.riotMatchId}
                  details={game.matchData}
                  team1Name={team1.name}
                  team2Name={team2.name}
                  team1Id={team1.id}
                  team2Id={team2.id}
                  team1Logo={team1.logo}
                  team2Logo={team2.logo}
                  team1Score={game.team1Score}
                  team2Score={game.team2Score}
                  mapName={game.mapName ?? undefined}
                  gameNumber={game.gameNumber}
                  reportedByTeamId={game.reportedByTeamId}
                  captainTeamId={myTeamId ?? undefined}
                  captainRoomMode={!!myTeamId}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
