/**
 * LfgDiscoveryCard — PROJ-075 rebuild.
 * Uses canonical LfgListing fields: avatarSeed, preferredRoles, regionDisplayName,
 * minRankIconUrl/maxRankIconUrl, minRankDisplayName/maxRankDisplayName.
 * Express Interest button with pending / success / error states.
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { getLfgIntentLabel } from '@/lib/lfgIntentOptions';
import { ApiError } from '@/lib/apiClient';
import type { LfgListing, LfgIntent, CatalogGameRole } from '@/types/competitive';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function intentChipClass(intent: LfgIntent): string {
  switch (intent) {
    case 'looking_for_team': return 'border border-sky-400/20 bg-sky-500/[0.08] text-sky-300/80';
    case 'casual': return 'border border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300/80';
    case 'looking_for_player':
    case 'competitive_roster': return 'border border-amber-400/20 bg-amber-500/[0.08] text-amber-300/80';
    default: return 'border border-white/10 bg-white/[0.05] text-white/60';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeedAvatar({ seed }: { seed: string | null }) {
  const initials = seed ? seed.slice(0, 2).toUpperCase() : '??';
  return (
    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center bg-white/[0.07] font-mono text-[12px] font-semibold text-white/70">
      {initials}
    </span>
  );
}

function RankImg({ iconUrl, displayName, className }: { iconUrl: string | null; displayName: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return <img src={iconUrl} alt={displayName ?? 'Rank'} className={`shrink-0 object-contain ${className}`} onError={() => setFailed(true)} />;
  }
  return (
    <div className={`shrink-0 flex items-center justify-center bg-white/[0.06] font-mono text-[11px] text-white/35 ${className}`}>
      {(displayName ?? '?').slice(0, 2)}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LfgDiscoveryCardProps {
  listing: LfgListing;
  gameRoles?: CatalogGameRole[];
  currentUserId?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LfgDiscoveryCard({ listing, gameRoles = [], currentUserId }: LfgDiscoveryCardProps) {
  const expressInterest = useExpressInterest(listing.id);
  const [sent, setSent] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const isOwn = currentUserId === listing.userId;

  function handleExpress() {
    setExpressError(null);
    expressInterest.mutate({}, {
      onSuccess: () => setSent(true),
      onError: (err: unknown) => {
        if (err instanceof ApiError && err.status === 409) {
          setExpressError("You've already expressed interest in this listing.");
          setSent(true);
        } else {
          setExpressError('Could not send interest. Try again.');
        }
      },
    });
  }

  const hasRankData = listing.minRankIconUrl || listing.maxRankIconUrl || listing.minRankDisplayName || listing.maxRankDisplayName;
  const isSameRank = listing.minRankDisplayName === listing.maxRankDisplayName;
  const rankText = listing.minRankDisplayName && listing.maxRankDisplayName && !isSameRank
    ? `${listing.minRankDisplayName} — ${listing.maxRankDisplayName}`
    : listing.minRankDisplayName ?? listing.maxRankDisplayName;

  const ariaLabel = [listing.username, rankText ?? 'unranked', listing.preferredRoles.join(', '), listing.regionDisplayName ?? ''].filter(Boolean).join(', ');

  return (
    <article
      aria-label={ariaLabel}
      className="border border-white/[0.06] bg-white/[0.03] p-4 transition-colors duration-[150ms] hover:border-white/20 hover:bg-white/[0.05]"
    >
      {/* Row 1: identity */}
      <div className="flex items-center gap-2 mb-2">
        <SeedAvatar seed={listing.avatarSeed} />
        <span className="flex-1 min-w-0 text-[14px] font-medium text-white truncate">{listing.username}</span>
        <span className={`shrink-0 text-[11px] px-2 py-0.5 ${intentChipClass(listing.intent)}`}>
          {getLfgIntentLabel(listing.intent)}
        </span>
        <span className="shrink-0 text-[11px] text-white/35">{relativeTime(listing.createdAt)}</span>
      </div>

      {/* Row 2: rank icons */}
      {hasRankData && (
        <div className="flex items-center gap-3 mb-2">
          <RankImg iconUrl={listing.minRankIconUrl} displayName={listing.minRankDisplayName} className="h-12 w-12" />
          {listing.maxRankIconUrl && !isSameRank && (
            <>
              <span className="text-white/30 text-[12px]" aria-hidden>→</span>
              <RankImg iconUrl={listing.maxRankIconUrl} displayName={listing.maxRankDisplayName} className="h-12 w-12" />
            </>
          )}
          {rankText ? (
            <span className="text-[16px] font-semibold text-white [font-family:var(--font-heading)]">{rankText}</span>
          ) : (
            <span className="text-[13px] italic text-white/35">Any rank</span>
          )}
        </div>
      )}

      {/* Row 3: roles + region + language */}
      {(listing.preferredRoles.length > 0 || listing.regionDisplayName) && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {listing.preferredRoles.map((rk) => {
            const role = gameRoles.find(r => r.roleKey === rk);
            return (
              <span key={rk} className="flex items-center gap-1">
                {role?.iconUrl && <img src={role.iconUrl} alt={role.displayName ?? rk} width={16} height={16} className="shrink-0" />}
                <span className="text-[12px] text-white/55">{role?.displayName ?? rk}</span>
              </span>
            );
          })}
          {listing.regionDisplayName && (
            <span className="text-[12px] text-white/40">
              {listing.preferredRoles.length > 0 && <span aria-hidden className="mr-1 text-white/25">·</span>}
              {listing.regionDisplayName}
            </span>
          )}
          {listing.languages[0] && (
            <span className="text-[12px] text-white/40">
              <span aria-hidden className="mr-1 text-white/25">·</span>
              {listing.languages[0]}
            </span>
          )}
        </div>
      )}

      {/* Row 4: description */}
      {listing.description && (
        <p className="text-[13px] text-white/55 line-clamp-2 mb-3">{listing.description}</p>
      )}

      {/* Row 5: action */}
      {!isOwn && (
        <div className="flex flex-col items-end gap-1 mt-2 sm:flex-row sm:items-center sm:justify-end">
          {expressError && <p role="alert" className="text-[12px] text-red-300">{expressError}</p>}
          {sent ? (
            <span className="text-[13px] text-white/40 px-4 py-2">Interest Sent</span>
          ) : (
            <button
              type="button"
              onClick={handleExpress}
              disabled={expressInterest.isPending}
              className="w-full sm:w-auto min-h-[44px] border border-white/[0.08] bg-transparent text-white/70 hover:bg-white/[0.07] hover:text-white text-[13px] px-4 py-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {expressInterest.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Express Interest
            </button>
          )}
        </div>
      )}
    </article>
  );
}
