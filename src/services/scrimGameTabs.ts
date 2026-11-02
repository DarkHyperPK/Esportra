import type { ScrimGame } from '@/types/competitive';

export interface GameTab {
  gameNumber: number;
  /** The game exists and is shown with its result. */
  game: ScrimGame | null;
  /** Reachable now: the previous map has been settled or disputed. */
  unlocked: boolean;
  /** Why it can't be opened yet, for the tab's tooltip. */
  lockedReason: string | null;
  /** The series ended before this map was needed. */
  notNeeded: boolean;
}

/**
 * The tabs of a series: one per map of the format (plus a replay for each voided map), opened in
 * order. A map opens once the one before it is confirmed, resolved or disputed, the same rule the
 * server enforces, so a tab is never offered for a report the server would refuse.
 */
export function buildGameTabs(
  bestOf: number,
  games: ScrimGame[],
  seriesDecided: boolean,
): GameTab[] {
  const voided = games.filter((g) => g.status === 'resolved' && g.winnerSlot === null).length;
  const count = bestOf + voided;
  return Array.from({ length: count }, (_, i) => {
    const gameNumber = i + 1;
    const game = games.find((g) => g.gameNumber === gameNumber) ?? null;
    const previous = games.find((g) => g.gameNumber === gameNumber - 1) ?? null;
    const previousSettled = gameNumber === 1 || (previous !== null && previous.status !== 'reported');
    const notNeeded = seriesDecided && game === null;
    const unlocked = game !== null || (previousSettled && !notNeeded);
    const lockedReason = unlocked
      ? null
      : notNeeded
        ? 'The series is already decided.'
        : `Finish game ${gameNumber - 1} first.`;
    return { gameNumber, game, unlocked, lockedReason, notNeeded };
  });
}

/** The tab to open first: the map being played, else the last one reported. */
export function defaultGameTab(tabs: GameTab[], nextGameNumber: number | null): number {
  if (nextGameNumber && tabs.some((t) => t.gameNumber === nextGameNumber && t.unlocked)) return nextGameNumber;
  const reported = tabs.filter((t) => t.game !== null);
  return reported.length ? reported[reported.length - 1].gameNumber : 1;
}
