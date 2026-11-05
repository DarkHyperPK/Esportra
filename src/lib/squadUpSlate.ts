import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import { parsePopularAgents, resolveAgent } from '@/lib/valorantAgents';
import type { SquadUpCard } from '@/schemas/squadUp';
import type { SlatePlayer } from '@/components/squad-up/shared/slate';

/** Maps a live Squad Up card from the API onto the shared player slate. */
export function toSlatePlayer(card: SquadUpCard): SlatePlayer {
  return {
    id: card.userId,
    name: card.username,
    riotId: card.riotGameName ? `${card.riotGameName}#${card.riotTagLine ?? ''}` : null,
    avatarUrl: resolveLfgAvatar(card.avatarUrl, card.avatarSeed, card.avatarStyle),
    countryCode: card.countryCode ?? null,
    mode: card.mode ?? 'competitive',
    tier: card.competitiveTier ?? null,
    tierName: card.competitiveTierName ?? null,
    winRate: card.winRate ?? null,
    kd: card.kdRatio ?? null,
    hs: card.hsPct ?? null,
    agents: parsePopularAgents(card.popularAgents).slice(0, 3).map((agent) => {
      const known = resolveAgent(agent.agentId);
      return { id: agent.agentId, name: known?.displayName || agent.displayName, iconUrl: known?.iconUrl || agent.iconUrl || null };
    }),
    mic: card.micOn,
    needs: card.slotsNeeded,
    likedYou: card.likedYou,
    synergy: card.synergyLabel,
  };
}
