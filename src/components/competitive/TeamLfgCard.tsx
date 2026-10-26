import { useState } from 'react';
import { Loader2, ChevronDown, Shield, Users } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { ApiError } from '@/lib/apiClient';
import type { LfgListing, CatalogGameRole } from '@/types/competitive';

function relativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function TeamLogo({ url, name }: { url: string | null; name: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = (name ?? '??').slice(0, 2).toUpperCase();
  if (url && !failed) {
    return <img src={url} alt={name ?? 'Team'} className="h-10 w-10 rounded-md object-cover" onError={() => setFailed(true)} />;
  }
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.07] font-mono text-[12px] font-semibold text-white/70">
      {initials}
    </span>
  );
}

function RankImg({ iconUrl, displayName }: { iconUrl: string | null; displayName: string | null }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) return <img src={iconUrl} alt={displayName ?? 'Rank'} className="h-8 w-8 shrink-0 object-contain" onError={() => setFailed(true)} />;
  return null;
}

interface TeamLfgCardProps {
  listing: LfgListing;
  gameRoles?: CatalogGameRole[];
  currentUserId?: string | null;
}

export function TeamLfgCard({ listing, gameRoles = [], currentUserId }: TeamLfgCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const reduced = useReducedMotion() ?? false;
  const expressInterest = useExpressInterest(listing.id);
  const isOwn = currentUserId === listing.userId;

  const isSameRank = listing.minRankDisplayName === listing.maxRankDisplayName;
  const rankText = listing.minRankDisplayName && listing.maxRankDisplayName && !isSameRank
    ? `${listing.minRankDisplayName} — ${listing.maxRankDisplayName}`
    : listing.minRankDisplayName ?? listing.maxRankDisplayName;

  function handleExpress() {
    setExpressError(null);
    expressInterest.mutate({ message: message.trim() || undefined }, {
      onSuccess: () => setSent(true),
      onError: (err: unknown) => {
        if (err instanceof ApiError && err.status === 409) {
          setExpressError("You've already expressed interest.");
          setSent(true);
        } else {
          setExpressError('Could not send interest. Try again.');
        }
      },
    });
  }

  return (
    <motion.article
      layout={!reduced}
      onClick={() => setExpanded((v) => !v)}
      className={`rounded-md border p-4 cursor-pointer transition-colors duration-150 ${
        expanded
          ? 'border-white/15 bg-white/[0.04]'
          : 'border-white/[0.06] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
      }`}
    >
      {/* ── Collapsed ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-2">
        <TeamLogo url={listing.teamLogoUrl} name={listing.teamName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-white truncate">{listing.teamName ?? listing.username}</span>
            {listing.teamTag && <span className="text-[12px] text-white/35">[{listing.teamTag}]</span>}
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-white/35">{relativeTime(listing.createdAt)}</span>
        <ChevronDown className={`h-4 w-4 text-white/30 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        {listing.minRankIconUrl && <RankImg iconUrl={listing.minRankIconUrl} displayName={listing.minRankDisplayName} />}
        {listing.maxRankIconUrl && !isSameRank && (
          <>
            <span className="text-white/25 text-[11px]">→</span>
            <RankImg iconUrl={listing.maxRankIconUrl} displayName={listing.maxRankDisplayName} />
          </>
        )}
        {rankText && <span className="text-[13px] font-semibold text-white [font-family:var(--font-heading)]">{rankText}</span>}
        {listing.preferredRoles.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            {listing.preferredRoles.slice(0, 4).map((rk) => {
              const role = gameRoles.find((r) => r.roleKey === rk);
              return role?.iconUrl
                ? <img key={rk} src={role.iconUrl} alt={role.displayName ?? rk} className="h-5 w-5 opacity-60" />
                : <span key={rk} className="text-[11px] text-white/40">{role?.displayName ?? rk}</span>;
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-2 text-[12px] text-white/40">
        {listing.teamMemberCount != null && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {listing.teamMemberCount} member{listing.teamMemberCount !== 1 ? 's' : ''}
          </span>
        )}
        {listing.teamVerifiedCount != null && listing.teamVerifiedCount > 0 && (
          <span className="flex items-center gap-1 text-emerald-400/70">
            <Shield className="h-3.5 w-3.5" />
            {listing.teamVerifiedCount} verified
          </span>
        )}
        {listing.regionDisplayName && (
          <>
            <span className="text-white/20">·</span>
            <span>{listing.regionDisplayName}</span>
          </>
        )}
        {listing.languages[0] && (
          <>
            <span className="text-white/20">·</span>
            <span>{listing.languages[0]}</span>
          </>
        )}
      </div>

      {listing.description && (
        <p className={`text-[13px] text-white/55 ${expanded ? '' : 'line-clamp-2'}`}>
          {listing.description}
        </p>
      )}

      {/* ── Expanded ──────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-t border-white/[0.06] mt-3 pt-3 space-y-3">
              {!isOwn && (
                <div className="space-y-2 pt-1">
                  {!sent && (
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                      placeholder="Add a message (optional)…"
                      rows={2}
                      className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
                    />
                  )}
                  {expressError && <p role="alert" className="text-[12px] text-red-300">{expressError}</p>}
                  {sent ? (
                    <span className="text-[13px] text-white/40">Interest Sent</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExpress}
                      disabled={expressInterest.isPending}
                      className="w-full sm:w-auto min-h-[40px] rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-5 py-2 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {expressInterest.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      Apply
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
