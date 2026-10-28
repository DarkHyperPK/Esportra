import type { LfgListing } from '@/types/competitive';

export function LfgMetrics({ listing }: { listing: Pick<LfgListing, 'winRate' | 'kdRatio' | 'hsPct'> }) {
  const metrics = [
    ['WR', listing.winRate == null ? '\u2014' : `${Math.round(Number(listing.winRate))}%`],
    ['K/D', listing.kdRatio == null ? '\u2014' : Number(listing.kdRatio).toFixed(2)],
    ['HS%', listing.hsPct == null ? '\u2014' : `${Math.round(Number(listing.hsPct))}%`],
  ];
  return <div className="lfg-metrics" aria-label="Competitive performance">{metrics.map(([name, value]) => <div key={name}><small>{name}</small><strong>{value}</strong></div>)}</div>;
}
