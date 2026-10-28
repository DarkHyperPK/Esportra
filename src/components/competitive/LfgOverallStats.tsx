import type { LfgListing } from '@/types/competitive';
import { LfgMetrics } from './LfgMetrics';

/** These are the listing owner's competitive match stats, not coaching results. */
export function LfgOverallStats({ listing }: { listing: LfgListing }) {
  return <section aria-label="Overall competitive stats">
    <h3>Overall competitive stats</h3>
    <LfgMetrics listing={listing} />
    {listing.statsSyncStatus === 'error' && <p className="lfg-sub">Stats could not be refreshed.</p>}
    {(listing.statsSyncStatus === 'pending' || listing.statsSyncStatus === 'syncing') && <p className="lfg-sub">Stats are syncing.</p>}
  </section>;
}
