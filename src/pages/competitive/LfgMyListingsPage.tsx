import { Link } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { useMyLfgListings } from '@/hooks/competitive/useLfg';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PlayerLfgCard } from '@/components/competitive/PlayerLfgCard';
import { TeamLfgCard } from '@/components/competitive/TeamLfgCard';
import type { LfgListing, LfgStatus } from '@/types/competitive';

function StatusBadge({ status }: { status: LfgStatus }) {
  const map: Record<LfgStatus, { label: string; className: string }> = {
    draft:     { label: 'Draft',   className: 'bg-white/[0.06] text-white/50' },
    published: { label: 'Live',    className: 'bg-emerald-500/20 text-emerald-400' },
    paused:    { label: 'Paused',  className: 'bg-amber-500/20 text-amber-400' },
    expired:   { label: 'Expired', className: 'bg-white/[0.06] text-white/40' },
    closed:    { label: 'Closed',  className: 'bg-white/[0.06] text-white/40' },
    removed:   { label: 'Removed', className: 'bg-red-500/20 text-red-400' },
  };
  const { label, className } = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function isTeamListing(listing: LfgListing) {
  return ['looking_for_player', 'competitive_roster'].includes(listing.intent ?? '');
}

export default function LfgMyListingsPage() {
  const { data: listings, isLoading, isError, refetch } = useMyLfgListings();

  return (
    <CompetitivePageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
            <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight">
              My Listings
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/competitive/looking-for-team/create"
              className="inline-flex items-center gap-1.5 text-[13px] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 px-3 py-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              LFT
            </Link>
            <Link
              to="/competitive/looking-for-player/create"
              className="inline-flex items-center gap-1.5 text-[13px] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 px-3 py-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              LFP
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        )}

        {isError && (
          <div className="space-y-3">
            <p className="text-[14px] text-white/50">Couldn't load your listings.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[13px] text-rose-400 hover:text-rose-300 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {listings && listings.length > 0 ? (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="relative">
                    <div className="pointer-events-none opacity-90">
                      {isTeamListing(listing) ? (
                        <TeamLfgCard listing={listing} gameRoles={[]} />
                      ) : (
                        <PlayerLfgCard listing={listing} />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <StatusBadge status={listing.status} />
                      <Link
                        to={`/competitive/lfg/${listing.id}`}
                        className="text-[12px] text-white/40 hover:text-white transition-colors"
                      >
                        Manage →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-white/[0.08] bg-white/[0.02] p-10 flex flex-col items-center gap-4 text-center">
                <p className="text-[16px] font-semibold text-white">No listings yet</p>
                <p className="text-[14px] text-white/50">
                  Create a listing to find a team or recruit players.
                </p>
                <Link
                  to="/competitive/looking-for-team/create"
                  className="mt-2 bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-6 py-2.5 transition-colors"
                >
                  Create LFT listing
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </CompetitivePageShell>
  );
}
