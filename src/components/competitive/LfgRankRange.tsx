import { getRankIconUrl } from '@/lib/valorantRanks';
import type { LfgListing } from '@/types/competitive';

function Rank({ listing, end }: { listing: LfgListing; end: 'min' | 'max' }) {
  const order = end === 'min' ? listing.minRankSortOrder : listing.maxRankSortOrder;
  const name = (end === 'min' ? listing.minRankDisplayName : listing.maxRankDisplayName) || (end === 'min' ? 'No minimum' : 'No maximum');
  const icon = (end === 'min' ? listing.minRankIconUrl : listing.maxRankIconUrl) || (listing.gameSlug === 'valorant' && order != null ? getRankIconUrl(order) : null);
  return <span className="lfg-rank-bound">{icon && <img src={icon} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}{name}</span>;
}

export function LfgRankRange({ listing }: { listing: LfgListing }) {
  if (listing.minRankSortOrder == null && listing.maxRankSortOrder == null) return <span>Any rank</span>;
  return <span className="lfg-rank-range" aria-label="Required rank range"><Rank listing={listing} end="min" /><span aria-hidden="true">–</span><Rank listing={listing} end="max" /></span>;
}
