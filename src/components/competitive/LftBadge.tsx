import { StatusPill } from '@/components/ui/kit';

/**
 * LftBadge — "OPEN TO TEAM" in emerald (success tone).
 * Only rendered when lftStatus = 'open' AND lftVisible = true.
 * Never shown if conditions are not met — caller must gate rendering.
 */
export function LftBadge() {
  return (
    <StatusPill
      label="OPEN TO TEAM"
      tone="success"
      aria-label="Open to team"
    />
  );
}
