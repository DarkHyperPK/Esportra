import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Pencil, Pause, Play, X } from 'lucide-react';
import {
  useLfgListing, useLfgInterests,
  usePublishLfgListing, usePauseLfgListing, useCloseLfgListing,
  useAcceptInterest, useDeclineInterest,
} from '@/hooks/competitive/useLfg';
import { useCatalogGameRoles } from '@/hooks/competitive/useCatalog';
import { useAuth } from '@/hooks/useAuth';
import { LfgInterestCard } from '@/components/competitive/LfgInterestCard';
import { PlayerLfgCard } from '@/components/competitive/PlayerLfgCard';
import { TeamLfgCard } from '@/components/competitive/TeamLfgCard';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import type { LfgStatus } from '@/types/competitive';

const GAME = 'valorant';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: LfgStatus }) {
  const config: Record<LfgStatus, { label: string; className: string }> = {
    draft:     { label: 'Draft',    className: 'bg-white/[0.06] text-white/50' },
    published: { label: 'Live',     className: 'bg-emerald-500/20 text-emerald-400' },
    paused:    { label: 'Paused',   className: 'bg-amber-500/20 text-amber-400' },
    expired:   { label: 'Expired',  className: 'bg-white/[0.06] text-white/40' },
    closed:    { label: 'Closed',   className: 'bg-white/[0.06] text-white/40' },
    removed:   { label: 'Removed',  className: 'bg-red-500/20 text-red-400' },
  };
  const { label, className } = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LfgManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [activeInterestId, setActiveInterestId] = useState<string | null>(null);
  const [interestAction, setInterestAction] = useState<'accept' | 'decline' | null>(null);

  const listingQuery = useLfgListing(id!);
  const interestsQuery = useLfgInterests(id!);
  const rolesQuery = useCatalogGameRoles(GAME);
  const publishMutation = usePublishLfgListing(id!);
  const pauseMutation = usePauseLfgListing(id!);
  const closeMutation = useCloseLfgListing(id!);
  const acceptInterest = useAcceptInterest(id!);
  const declineInterest = useDeclineInterest(id!);

  const gameRoles = rolesQuery.data ?? [];
  const isStatusPending = publishMutation.isPending || pauseMutation.isPending || closeMutation.isPending;

  if (listingQuery.isLoading) {
    return (
      <CompetitivePageShell>
        <div className="max-w-xl mx-auto px-4 py-8 space-y-3 animate-pulse">
          {[32, 24, 48, 48].map((h, i) => (
            <div key={i} className="rounded bg-white/[0.06]" style={{ height: h }} />
          ))}
        </div>
      </CompetitivePageShell>
    );
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <CompetitivePageShell>
        <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
          <p className="text-[14px] text-white/55">Could not load this listing.</p>
          <button type="button" onClick={() => void listingQuery.refetch()}
            className="rounded-md border border-white/[0.08] text-white text-[13px] px-4 py-2 hover:bg-white/[0.07]">
            Retry
          </button>
        </div>
      </CompetitivePageShell>
    );
  }

  const listing = listingQuery.data;
  const interests = (interestsQuery.data ?? []).filter((i) => i.status !== 'declined');
  const pendingInterests = interests.filter((i) => i.status === 'expressed');
  const acceptedInterests = interests.filter((i) => i.status === 'accepted');
  const isReadonly = ['expired', 'closed', 'removed'].includes(listing.status);
  const isTeamListing = ['looking_for_player', 'competitive_roster'].includes(listing.intent ?? '');

  async function handleAccept(interestId: string) {
    setActiveInterestId(interestId); setInterestAction('accept');
    try {
      const result = await acceptInterest.mutateAsync(interestId);
      if (result.conversationId) navigate(`/inbox/${result.conversationId}`);
    } finally { setActiveInterestId(null); setInterestAction(null); }
  }

  async function handleDecline(interestId: string) {
    setActiveInterestId(interestId); setInterestAction('decline');
    try { await declineInterest.mutateAsync(interestId); }
    finally { setActiveInterestId(null); setInterestAction(null); }
  }

  return (
    <CompetitivePageShell>
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-16">

        {/* Back nav */}
        <Link to="/competitive/lfg/mine"
          className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          My Listings
        </Link>

        {/* Status row */}
        <div className="flex items-center gap-3 mb-2">
          <StatusBadge status={listing.status as LfgStatus} />
          {listing.status === 'published' && listing.expiresAt && (() => {
            const ms = new Date(listing.expiresAt).getTime() - Date.now();
            const days = Math.ceil(ms / 86_400_000);
            const isToday = ms > 0 && ms < 86_400_000;
            return (
              <span className={`text-[12px] ${isToday ? 'text-amber-400' : 'text-white/40'}`}>
                {isToday ? 'Expires today' : `Expires in ${days}d`}
              </span>
            );
          })()}
          {listing.status === 'paused' && (
            <span className="text-[12px] text-white/40">Not visible to others</span>
          )}
          {['expired', 'closed'].includes(listing.status) && listing.expiresAt && (
            <span className="text-[12px] text-white/40">{relativeDate(listing.expiresAt)}</span>
          )}
        </div>

        {/* Card preview */}
        <div className="mb-6 pointer-events-none select-none">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25 mb-2">Preview</p>
          {isTeamListing
            ? <TeamLfgCard listing={listing} gameRoles={gameRoles} currentUserId={user?.id} />
            : <PlayerLfgCard listing={listing} gameRoles={gameRoles} currentUserId={user?.id} />}
        </div>

        {/* Interests */}
        {!['draft', 'removed'].includes(listing.status) && interests.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25 mb-3">
                Interests ({interests.length})
              </p>
              {[...pendingInterests, ...acceptedInterests].map((interest) => (
                <LfgInterestCard
                  key={interest.id}
                  interest={interest}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  isAccepting={activeInterestId === interest.id && interestAction === 'accept'}
                  isDeclining={activeInterestId === interest.id && interestAction === 'decline'}
                  readonly={isReadonly}
                />
              ))}
            </div>
          </div>
        )}

        {listing.status === 'published' && interests.length === 0 && (
          <p className="text-[13px] text-white/35 mb-6">No interests yet. Your listing is live.</p>
        )}

        {listing.status === 'removed' && (
          <div className="mb-6 rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-[13px] text-red-400">This listing was removed. Contact support if you believe this is wrong.</p>
          </div>
        )}

        {/* Actions */}
        {listing.status !== 'removed' && (
          <div className="border-t border-white/[0.06] pt-6">
            {!showCloseConfirm ? (
              <div className="flex flex-wrap items-center gap-3">
                {/* Edit */}
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => navigate(`/competitive/lfg/${id}/edit`)}
                    className="flex items-center gap-1.5 rounded-md border border-white/[0.1] text-white/70 hover:text-white text-[13px] px-4 h-9 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </button>
                )}

                {/* Pause/Resume */}
                {listing.status === 'published' && (
                  <button
                    type="button"
                    onClick={() => pauseMutation.mutate()}
                    disabled={isStatusPending}
                    className="flex items-center gap-1.5 rounded-md border border-white/[0.1] text-white/70 hover:text-white text-[13px] px-4 h-9 transition-colors disabled:opacity-50"
                  >
                    {pauseMutation.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Pause className="h-3.5 w-3.5" aria-hidden />}
                    Pause
                  </button>
                )}
                {listing.status === 'paused' && (
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate()}
                    disabled={isStatusPending}
                    className="flex items-center gap-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[13px] px-4 h-9 transition-colors disabled:opacity-50"
                  >
                    {publishMutation.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Play className="h-3.5 w-3.5" aria-hidden />}
                    Resume
                  </button>
                )}
                {listing.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate()}
                    disabled={isStatusPending}
                    className="flex items-center gap-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 h-9 transition-colors disabled:opacity-50"
                  >
                    {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Publish
                  </button>
                )}
                {(isReadonly) && (
                  <button
                    type="button"
                    onClick={() => navigate('/competitive/find-teammates')}
                    className="rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 h-9 transition-colors"
                  >
                    Create new listing
                  </button>
                )}

                {/* Close */}
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(true)}
                    className="ml-auto text-[13px] text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Close listing
                  </button>
                )}
              </div>
            ) : (
              /* Close confirm inline */
              <div className="rounded-md border border-red-500/20 bg-red-500/[0.06] p-4 space-y-3">
                <p className="text-[14px] text-white font-medium">Close this listing?</p>
                <p className="text-[13px] text-white/55">It will no longer be visible to other players.</p>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { closeMutation.mutate(); setShowCloseConfirm(false); }}
                    disabled={closeMutation.isPending}
                    className="flex items-center gap-2 rounded-md bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-[13px] px-4 h-9 transition-colors disabled:opacity-50"
                  >
                    {closeMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Close listing
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(false)}
                    className="flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {(publishMutation.isError || pauseMutation.isError || closeMutation.isError) && (
              <p className="mt-3 text-[12px] text-red-400">Action failed. Try again.</p>
            )}
          </div>
        )}
      </div>
    </CompetitivePageShell>
  );
}
