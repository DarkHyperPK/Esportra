interface Props {
  teamId: string;
  gameSlug: string;
  playerCount: number;
  expectedCount: number;
}

/**
 * Compact indicator showing how many players on a team have competitive profiles.
 * Caller supplies counts; this component renders only.
 */
export function RosterReadinessIndicator({
  playerCount,
  expectedCount,
}: Props) {
  const allReady = playerCount >= expectedCount;
  const label = allReady
    ? 'All players have competitive profiles'
    : `${playerCount}/${expectedCount} players have competitive profiles`;
  const labelClass = allReady ? 'text-emerald-400' : 'text-white/50';

  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: expectedCount }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-3 ${i < playerCount ? 'bg-rose-500' : 'bg-white/[0.12]'}`}
          />
        ))}
      </div>
      <span className={`text-[12px] font-mono ${labelClass}`}>{label}</span>
    </div>
  );
}
