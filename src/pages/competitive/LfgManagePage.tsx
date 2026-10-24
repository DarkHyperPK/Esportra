import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageIntro, ActionBar, InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLfgListing, useLfgInterests, useUpdateLfgStatus, useAcceptInterest, useDeclineInterest } from '@/hooks/competitive/useLfg';
import { LfgInterestCard } from '@/components/competitive/LfgInterestCard';
import { RoleChip } from '@/components/competitive/RoleChip';
import { RegionLabel } from '@/components/competitive/RegionLabel';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import type { LfgStatus } from '@/types/competitive';

const STATUS_TONE: Record<LfgStatus, 'neutral' | 'accent' | 'success' | 'warning' | 'critical'> = {
  draft: 'neutral',
  published: 'accent',
  paused: 'warning',
  expired: 'neutral',
  closed: 'neutral',
  removed: 'critical',
};

function formatDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ExpiryLine({ listing }: { listing: { status: LfgStatus; expiresAt: string | null; publishedAt: string | null; closedAt: string | null } }) {
  const { status, expiresAt, closedAt } = listing;
  if (status === 'draft') return <p className="text-[14px] text-white/55">Not yet published.</p>;
  if (status === 'paused') return <p className="text-[14px] text-white/55">Paused. Listing is not visible to others.</p>;
  if (status === 'expired') return <p className="text-[14px] text-white/55">Expired on {formatDate(expiresAt)}.</p>;
  if (status === 'closed') return <p className="text-[14px] text-white/55">Closed on {formatDate(closedAt)}.</p>;
  if (status === 'removed') return null;
  if (status === 'published' && expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    const isToday = ms > 0 && ms < 86_400_000;
    const colorClass = isToday ? 'text-amber-400' : 'text-white/55';
    return <p className={`text-[14px] ${colorClass}`}>{isToday ? 'Expires today.' : `Expires in ${days} days.`}</p>;
  }
  return null;
}

export default function LfgManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [activeInterestId, setActiveInterestId] = useState<string | null>(null);
  const [interestAction, setInterestAction] = useState<'accept' | 'decline' | null>(null);

  const listingQuery = useLfgListing(id!);
  const interestsQuery = useLfgInterests(id!);
  const updateStatus = useUpdateLfgStatus(id!);
  const acceptInterest = useAcceptInterest(id!);
  const declineInterest = useDeclineInterest(id!);

  if (listingQuery.isLoading) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-white/[0.06]" />
          <div className="h-6 w-64 bg-white/[0.04]" />
          <div className="h-4 w-80 bg-white/[0.04]" />
        </div>
      </CompetitivePageShell>
    );
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8 space-y-4">
          <p className="text-[14px] text-white/55">Could not load this listing. Check your connection and try again.</p>
          <Button variant="outline" onClick={() => listingQuery.refetch()}
            className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]">
            Retry
          </Button>
        </div>
      </CompetitivePageShell>
    );
  }

  const listing = listingQuery.data;
  const interests = (interestsQuery.data ?? []).filter((i) => i.status !== 'declined');
  const pendingInterests = interests.filter((i) => i.status === 'expressed');
  const acceptedInterests = interests.filter((i) => i.status === 'accepted');
  const isReadonly = listing.status === 'expired' || listing.status === 'closed' || listing.status === 'removed';

  async function handleAccept(interestId: string) {
    setActiveInterestId(interestId);
    setInterestAction('accept');
    try { await acceptInterest.mutateAsync(interestId); } finally {
      setActiveInterestId(null); setInterestAction(null);
    }
  }

  async function handleDecline(interestId: string) {
    setActiveInterestId(interestId);
    setInterestAction('decline');
    try { await declineInterest.mutateAsync(interestId); } finally {
      setActiveInterestId(null); setInterestAction(null);
    }
  }

  return (
    <CompetitivePageShell>
      <div className="px-4 py-8 max-w-2xl mx-auto lg:mx-0 lg:px-8">
        <Link to="/competitive/lfg" className="text-[13px] text-white/55 hover:text-white mb-6 inline-block">
          ‹ My listings
        </Link>

        <PageIntro eyebrow="YOUR LFG LISTING — VALORANT" title="LFG Listing" className="mb-6" />

        {/* Status hero */}
        <div className="space-y-1 mb-6">
          <div className="flex items-center gap-3">
            <span
              className="font-rajdhani text-[24px] font-bold text-white uppercase"
              aria-label={`Listing status: ${listing.status}`}
            >
              {listing.status.toUpperCase()}
            </span>
            <StatusPill label={listing.status.toUpperCase()} tone={STATUS_TONE[listing.status]} />
          </div>
          <ExpiryLine listing={listing} />
        </div>

        <div className="border-b border-white/[0.08] mb-6" />

        {/* Listing details */}
        <div className="space-y-3 mb-6">
          <p className="text-[13px] text-white/55">
            Valorant · {listing.intent.charAt(0).toUpperCase() + listing.intent.slice(1)}
          </p>
          {(listing.minRankDisplayName || listing.maxRankDisplayName) && (
            <p className="font-rajdhani text-[13px] font-semibold text-white">
              {[listing.minRankDisplayName, listing.maxRankDisplayName].filter(Boolean).join(' — ')}
            </p>
          )}
          {listing.roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {listing.roles.map((r) => (
                <RoleChip key={r} role={r} displayName={r.toUpperCase()} mode="display" />
              ))}
            </div>
          )}
          <RegionLabel region={listing.regionDisplayName} server={listing.servers?.[0] ?? null} />
          {listing.description && (
            <p className="text-[13px] text-white/55">&ldquo;{listing.description}&rdquo;</p>
          )}
        </div>

        {/* Removed notice */}
        {listing.status === 'removed' && (
          <InlineNotice tone="critical" className="mb-6">
            This listing was removed. Contact support if you believe this is wrong.
          </InlineNotice>
        )}

        {/* Interests */}
        {!['draft', 'removed'].includes(listing.status) && (
          <div className="mb-6 space-y-3">
            <div className="border-b border-white/[0.08]" />
            {pendingInterests.length > 0 || acceptedInterests.length > 0 ? (
              <>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
                  INTERESTS ({interests.length})
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
              </>
            ) : (
              listing.status === 'published' || listing.status === 'paused' ? (
                <InlineNotice tone="neutral">No interests yet. Listing is active.</InlineNotice>
              ) : null
            )}
          </div>
        )}

        {/* Actions */}
        {listing.status !== 'removed' && (
          <ActionBar
            start={
              !isReadonly ? (
                <Button variant="ghost" onClick={() => setShowCloseDialog(true)}
                  disabled={updateStatus.isPending}
                  className="text-[13px] text-red-300 hover:text-red-200 rounded-none">
                  Close listing
                </Button>
              ) : undefined
            }
            end={
              <div className="flex gap-2">
                {listing.status === 'published' && (
                  <Button variant="outline" onClick={() => updateStatus.mutate('paused')}
                    disabled={updateStatus.isPending}
                    className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] text-[13px]">
                    {updateStatus.isPending ? '…' : 'Pause'}
                  </Button>
                )}
                {listing.status === 'paused' && (
                  <Button onClick={() => updateStatus.mutate('published')}
                    disabled={updateStatus.isPending}
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px]">
                    {updateStatus.isPending ? '…' : 'Resume'}
                  </Button>
                )}
                {listing.status === 'draft' && (
                  <Button onClick={() => updateStatus.mutate('published')}
                    disabled={updateStatus.isPending}
                    className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px]">
                    {updateStatus.isPending ? '…' : 'Publish'}
                  </Button>
                )}
                {isReadonly && (
                  <Button variant="outline" onClick={() => navigate('/competitive/lfg/new')}
                    className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] text-[13px]">
                    Create new listing
                  </Button>
                )}
                {!isReadonly && (
                  <Button variant="outline" onClick={() => navigate(`/competitive/lfg/${id}/edit`)}
                    disabled={updateStatus.isPending}
                    className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] text-[13px]">
                    Edit listing
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* Close confirm dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent className="rounded-none bg-[#1a1a1a] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white normal-case tracking-normal">
              Close this listing?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              It will no longer be visible to players.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { updateStatus.mutate('closed'); setShowCloseDialog(false); }}
              className="rounded-none bg-transparent text-red-300 hover:bg-red-500/10 border border-red-500/30"
            >
              Close listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompetitivePageShell>
  );
}
