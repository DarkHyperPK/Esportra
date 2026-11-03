import { Link } from 'react-router-dom';
import { EYEBROW_CLASS, StatusPill, type Tone } from '@/components/ui/kit';
import { resolveAgent } from '@/lib/valorantAgents';
import { RESULT_LABEL, gameDate, playerLine, scoreLine } from '@/services/career/format';
import type { CareerGame, GameResult } from '@/types/career';

const TONE: Record<GameResult, Tone> = { win: 'success', loss: 'critical', draw: 'neutral' };

interface Props {
  games: CareerGame[];
  hasMore: boolean;
  loadingMore: boolean;
  failed: boolean;
  onLoadMore: () => void;
}

function Row({ game }: { game: CareerGame }) {
  const agent = resolveAgent(game.characterId);
  const detail = [game.context === 'tournament' ? 'Tournament' : 'Scrim', game.teamName, playerLine(game)].filter(Boolean).join(' · ');
  const body = (
    <div className="flex items-center gap-3 py-3">
      {agent ? <img src={agent.iconUrl} alt={agent.displayName} className="h-8 w-8 shrink-0 rounded-sm" loading="lazy" /> : <span aria-hidden className="h-8 w-8 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-white">
          {game.map ?? 'Map not recorded'}{game.opponentName ? <span className="text-zinc-500"> vs {game.opponentName}</span> : null}
        </p>
        <p className="truncate text-[11px] text-zinc-500">{gameDate(game.startedAt)} · {detail}</p>
      </div>
      <p className="shrink-0 font-mono text-sm tabular-nums text-zinc-200">{scoreLine(game)}</p>
      <StatusPill label={RESULT_LABEL[game.result]} tone={TONE[game.result]} className="shrink-0" />
    </div>
  );
  return game.scrimSessionId
    ? <Link to={`/competitive/scrims/sessions/${game.scrimSessionId}`} className="block hover:bg-white/[0.03]">{body}</Link>
    : body;
}

export function CareerGameList({ games, hasMore, loadingMore, failed, onLoadMore }: Props) {
  if (games.length === 0) return null;
  return (
    <section aria-label="Game history" className="rounded-xl border border-white/5 bg-white/[0.02] px-4 pb-2 pt-4">
      <h3 className={EYEBROW_CLASS}>Game history</h3>
      <ul className="mt-2 divide-y divide-white/5">
        {games.map((g, i) => <li key={`${g.startedAt}-${g.scrimSessionId ?? g.tournamentMatchId}-${g.gameNumber}-${i}`}><Row game={g} /></li>)}
      </ul>
      {failed && <p role="alert" className="py-2 text-[12px] text-red-300">Could not load more games. Try again.</p>}
      {hasMore && (
        <div className="py-3">
          <button type="button" onClick={onLoadMore} disabled={loadingMore}
            className="min-h-[36px] rounded-lg border border-white/15 px-4 text-[13px] text-zinc-200 hover:bg-white/[0.05] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            {loadingMore ? 'Loading…' : 'Show older games'}
          </button>
        </div>
      )}
    </section>
  );
}
