import { useState } from 'react';
import type { LfgListing } from '@/types/competitive';

/** One image fallback chain for discovery, owner previews and details. */
export function useLfgBanner(listing: LfgListing) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const card = listing.playerCardId?.trim();
  const riot = listing.gameSlug === 'valorant' && card && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(card)
    ? `https://media.valorant-api.com/playercards/${card.toLowerCase()}/wideart.png` : null;
  const source = listing.intent === 'looking_for_team'
    ? [riot, listing.profileBannerUrl?.trim()].find((url): url is string => !!url && !failed.has(url))
    : undefined;
  return { source, onError: () => { if (source) setFailed(previous => new Set(previous).add(source)); } };
}
