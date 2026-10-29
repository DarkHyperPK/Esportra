import { getValorantRankIcon } from './valorantUiAssets';

/**
 * Derive a stable Valorant rank icon URL from sort_order.
 * sort_order 0 = Iron I (tier 3), sort_order 24 = Radiant (tier 27).
 */
export function getRankIconUrl(sortOrder: number): string {
  return getValorantRankIcon(sortOrder + 3) || `https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/${sortOrder + 3}.png`;
}
