import { RefreshCw } from 'lucide-react';
import { useLfgStatsSync } from '@/hooks/competitive/useLfgStatsSync';

export function LfgStatsSync({ listingId, syncedAt }: { listingId?: string; syncedAt?: string | null }) {
  const { sync, busy, seconds, feedback } = useLfgStatsSync(listingId);
  return <div className="lfg-sync-control">
    <button type="button" className="lfg-button lfg-sync-button" disabled={busy} onClick={() => void sync()}>
      <RefreshCw size={14} aria-hidden /><span>{busy ? 'Syncing…' : listingId ? 'Refresh stats' : 'Refresh my stats'}</span>
    </button>
    <span className="lfg-sub" role="status" aria-live="polite">{feedback || (busy ? 'Refreshing Riot stats. You can keep browsing.' : syncedAt && !Number.isNaN(Date.parse(syncedAt)) ? `Updated ${new Date(syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '')}</span>
    {!busy && seconds > 0 && <small className="lfg-sub">Next sync in {Math.ceil(seconds / 60)}m</small>}
  </div>;
}
