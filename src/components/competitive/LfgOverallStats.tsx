import type { LfgListing } from '@/types/competitive';

/** These are the listing owner's competitive match stats, not coaching results. */
export function LfgOverallStats({ listing }: { listing: LfgListing }) {
  const metrics = [
    ['Matches', listing.matchesAnalyzed == null ? '—' : String(listing.matchesAnalyzed)],
    ['Win rate', listing.winRate == null ? '—' : `${Math.round(Number(listing.winRate))}%`],
    ['K/D', listing.kdRatio == null ? '—' : Number(listing.kdRatio).toFixed(2)],
    ['Record', listing.winCount == null || listing.lossCount == null ? '—' : `${listing.winCount}W / ${listing.lossCount}L`],
  ];
  return <section aria-label="Overall competitive stats">
    <h3>Overall competitive stats</h3>
    <div className="lfg-overall-stats">{metrics.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
    {listing.statsSyncStatus === 'error' && <p className="lfg-sub">Stats could not be refreshed.</p>}
    {(listing.statsSyncStatus === 'pending' || listing.statsSyncStatus === 'syncing') && <p className="lfg-sub">Stats are syncing.</p>}
  </section>;
}
