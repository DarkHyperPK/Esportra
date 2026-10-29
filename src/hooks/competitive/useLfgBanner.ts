import { useState } from 'react';
import type { LfgListing } from '@/types/competitive';

/** One image fallback chain for discovery, owner previews and details. */
export function useLfgBanner(listing: LfgListing) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const individual = listing.intent === 'looking_for_team';
  const card = (individual ? listing.playerCardId : listing.teamCaptainPlayerCardId)?.trim();
  const riot = listing.gameSlug === 'valorant' && card && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(card)
    ? `https://media.valorant-api.com/playercards/${card.toLowerCase()}/wideart.png` : null;
  const source = [riot, individual ? listing.profileBannerUrl?.trim() : null]
    .find((url): url is string => !!url && !failed.has(url));
  return { source, onError: () => { if (source) setFailed(previous => new Set(previous).add(source)); } };
}
