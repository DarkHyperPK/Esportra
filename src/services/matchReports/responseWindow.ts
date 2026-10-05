/** Why the system, not a captain, accepted a result. */
export type AutoAcceptReason = 'timeout' | 'riot_confirmed';

/** Whole seconds until the opponent's response window closes (0 once it has). */
export function secondsLeft(acceptBy: string, now: number): number {
  return Math.max(0, Math.ceil((new Date(acceptBy).getTime() - now) / 1000));
}

/** "12:04" */
export function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The countdown line on a pending report, for the reporting side or the side that has to answer. */
export function responseWindowText(seconds: number, ownSide: boolean, opponentName: string): string {
  if (seconds <= 0) return 'Time is up. The result is being accepted automatically.';
  const left = formatCountdown(seconds);
  return ownSide
    ? `${opponentName} has ${left} to accept or dispute. After that it's accepted automatically.`
    : `Accept or dispute within ${left}. After that it's accepted automatically.`;
}

/** How an accepted result was settled, for the result card. */
export function acceptedLabel(reason: AutoAcceptReason | null | undefined): string {
  switch (reason) {
    case 'timeout':
      return 'Accepted automatically: no response in time';
    case 'riot_confirmed':
      return "Confirmed by Riot's match record";
    default:
      return 'Verified';
  }
}
