import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import { parsePopularAgents } from '@/lib/valorantAgents';
import type { SquadUpCard } from '@/schemas/squadUp';
import type { SlatePlayer } from '@/components/squad-up/shared/slate';

/** Maps a live Squad Up card from the API onto the shared player model. */
export function toSlatePlayer(card: SquadUpCard): SlatePlayer {
  return {
    id: card.userId,
    name: card.username,
    riotGameName: card.riotGameName ?? null,
    riotTagLine: card.riotTagLine ?? null,
    avatarUrl: resolveLfgAvatar(card.avatarUrl, card.avatarSeed, card.avatarStyle),
    avatarSeed: card.avatarSeed ?? null,
    avatarStyle: card.avatarStyle ?? null,
    profileAvatarUrl: card.avatarUrl ?? null,
    playerCardId: card.playerCardId ?? null,
    bannerUrl: card.profileBannerUrl ?? null,
    countryCode: card.countryCode ?? null,
    area: card.area ?? null,
    mode: card.mode ?? 'competitive',
    tier: card.competitiveTier ?? null,
    tierName: card.competitiveTierName ?? null,
    winRate: card.winRate ?? null,
    kd: card.kdRatio ?? null,
    hs: card.hsPct ?? null,
    agents: parsePopularAgents(card.popularAgents),
    mic: card.micOn,
    needs: card.slotsNeeded,
    likedYou: card.likedYou,
    synergy: card.synergyLabel,
    note: card.note ?? null,
  };
}
