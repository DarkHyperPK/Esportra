import type { MatchDetailsPayload } from '@/types/matchDetails';

/** Human-readable queue label from Riot matchInfo / stored payload. */
export function formatMatchQueueLabel(details?: MatchDetailsPayload | null): string | null {
  const queueId = details?.matchInfo?.queueId ?? details?.queueId;
  const isRanked = details?.matchInfo?.isRanked;

  if (queueId) {
    const normalized = queueId.toLowerCase();
    if (normalized.includes('competitive')) return 'Competitive';
    if (normalized.includes('unrated')) return 'Unrated';
    if (normalized.includes('swift')) return 'Swiftplay';
    if (normalized.includes('spike')) return 'Spike Rush';
    if (normalized.includes('deathmatch')) return 'Deathmatch';
    if (normalized.includes('premier')) return 'Premier';
    if (normalized.includes('custom')) return 'Custom';
    if (normalized.includes('ranked')) return 'Ranked';
  }

  if (isRanked) return 'Ranked';
  if (queueId) return 'Custom';
  return null;
}

/** Never surface raw Unreal asset paths as UI labels. */
export function formatRiotGameMode(_gameMode?: string | null): string | null {
  return null;
}
