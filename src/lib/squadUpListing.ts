import { areaLabel, countryName } from '@/lib/countryAreas';
import type { LfgListing } from '@/types/competitive';
import type { SlatePlayer } from '@/components/squad-up/shared/slate';

/**
 * Presents a Squad Up player as a Find Teammates listing, so Squad Up shows the exact card players already know
 * from Find Teammates (banner art, rank, stats, agents with win rate and K/D, their own line).
 */
export function toListing(player: SlatePlayer): LfgListing {
  const place = [player.area ? areaLabel(player.area) : null, player.countryCode ? countryName(player.countryCode) : null].filter(Boolean).join(' · ');
  return {
    id: `squad-up-${player.id}`, userId: player.id, teamId: null, gameSlug: 'valorant', intent: 'looking_for_team', status: 'published',
    createdAt: '', updatedAt: '', username: player.name,
    avatarSeed: player.avatarSeed ?? player.id, profileAvatarUrl: player.profileAvatarUrl ?? player.avatarUrl ?? null,
    profileBannerUrl: player.bannerUrl ?? null, avatarStyle: player.avatarStyle ?? null, playerCardId: player.playerCardId ?? null,
    modeKey: player.mode, regionKey: player.area ?? null, regionDisplayName: place || null, preferredServers: [],
    minRankSortOrder: null, maxRankSortOrder: null, minRankDisplayName: null, maxRankDisplayName: null, minRankIconUrl: null, maxRankIconUrl: null,
    preferredRoles: [], preferredAgents: [], languages: [], description: player.note ?? null, expiresAt: null,
    mode: player.mode, minRankSlug: null, maxRankSlug: null, regionSlug: null, servers: [], roles: [], publishedAt: null, closedAt: null, avatarUrl: null,
    competitiveTier: player.tier ?? null, competitiveTierName: player.tierName ?? (player.mode === 'unrated' ? 'Unranked' : null),
    winCount: null, lossCount: null, winRate: player.winRate ?? null, kdRatio: player.kd ?? null, hsPct: player.hs ?? null,
    popularAgents: player.agents, statsSyncStatus: player.agents.length ? 'complete' : null, matchesAnalyzed: null, riotSyncedAt: null,
    riotGameName: player.riotGameName ?? null, riotTagLine: player.riotTagLine ?? null,
    teamName: null, teamLogoUrl: null, teamTag: null, teamMemberCount: null, teamVerifiedCount: null,
  };
}
