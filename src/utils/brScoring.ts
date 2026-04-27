import type { BRScoringPreset } from '@/types/battleRoyale';

/**
 * Calculate placement and kill points for a single BR result.
 * Single source of truth — used by both the organizer results panel
 * and the leaderboard computation hook.
 */
export function calculateBRPoints(
  placement: number,
  kills: number,
  preset: Pick<BRScoringPreset, 'placements' | 'killPoints'>,
  killCap: number | null
): { placementPoints: number; killPoints: number; totalPoints: number } {
  const placementPoints =
    placement >= 1 && placement <= preset.placements.length
      ? preset.placements[placement - 1]
      : 0;
  const effectiveKills = killCap !== null && killCap > 0 ? Math.min(kills, killCap) : kills;
  const kp = effectiveKills * preset.killPoints;
  return { placementPoints, killPoints: kp, totalPoints: placementPoints + kp };
}
