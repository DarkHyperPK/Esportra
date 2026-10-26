import { useState } from 'react';
import { Loader2, ChevronDown, Users, Shield } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { ApiError } from '@/lib/apiClient';
import type { LfgListing, CatalogGameRole } from '@/types/competitive';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function abbrevRank(name: string): string {
  const [first, num] = name.trim().split(' ');
  const short = first.length <= 4 ? first : first.slice(0, 3);
  return num ? `${short} ${num}` : short;
}

function rankColor(name: string | null): string {
  const lower = (name ?? '').toLowerCase();
  if (lower.includes('radiant'))   return '#f59e0b';
  if (lower.includes('immortal'))  return '#f43f5e';
  if (lower.includes('ascendant')) return '#4ade80';
  if (lower.includes('diamond'))   return '#818cf8';
  if (lower.includes('platinum'))  return '#22d3ee';
  if (lower.includes('gold'))      return '#facc15';
  if (lower.includes('silver'))    return '#94a3b8';
  if (lower.includes('bronze'))    return '#c08030';
  if (lower.includes('iron'))      return '#71717a';
  return '#52525b';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamLogo({ url, name, size = 32 }: { url: string | null; name: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = (name ?? '??').slice(0, 2).toUpperCase();
  if (url && !failed) {
    return (
      <img src={url} alt={name ?? 'Team'} onError={() => setFailed(true)}
        className="shrink-0 rounded object-cover" style={{ width: size, height: size }} />
    );
  }
  return (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded bg-white/[0.08] font-mono text-[10px] font-bold text-white/60"
      style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

function RankRangeBadge({ min, max }: { min: string | null; max: string | null }) {
  if (!min && !max) return null;
  const color = rankColor(min);
  const minA = min ? abbrevRank(min) : null;
  const maxA = max ? abbrevRank(max) : null;
  const label = minA && maxA && minA !== maxA ? `${minA}–${maxA}` : (minA ?? maxA);
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <span className="h-[7px] w-[7px] rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{label}</span>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  const preferredRoles = listing.preferredRoles ?? [];

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
      className={`rounded-md border cursor-pointer transition-all duration-150 ${
        expanded
          ? 'border-white/[0.12] bg-white/[0.04]'
          : 'border-white/[0.06] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]'
      }`}
    >
      {/* ── Collapsed row ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-3 py-3.5">
        <TeamLogo url={listing.teamLogoUrl} name={listing.teamName} />

        {/* Identity */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white truncate leading-none">
            {listing.teamName ?? listing.username}
          </span>
          {listing.teamTag && (
            <span className="text-[11px] text-white/30 leading-none shrink-0 hidden sm:inline">
              [{listing.teamTag}]
            </span>
          )}
        </div>

        {/* Rank range */}
        <RankRangeBadge min={listing.minRankDisplayName} max={listing.maxRankDisplayName} />

        {/* Role icons */}
        {preferredRoles.length > 0 && (
          <div className="flex items-center gap-0.5 shrink-0">
            {preferredRoles.slice(0, 3).map((rk) => {
              const role = gameRoles.find((r) => r.roleKey === rk);
              return role?.iconUrl
                ? <img key={rk} src={role.iconUrl} alt={role.displayName ?? rk} title={role.displayName ?? rk}
                    className="h-4 w-4 opacity-50" />
                : null;
            })}
          </div>
        )}

        {/* Member count */}
        {listing.teamMemberCount != null && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-white/30 shrink-0">
            <Users className="h-3 w-3" aria-hidden />
            {listing.teamMemberCount}
          </span>
        )}

        {/* Region */}
        {listing.regionDisplayName && (
          <span className="text-[11px] text-white/30 shrink-0 hidden md:inline">{listing.regionDisplayName}</span>
        )}

        {/* Time */}
        <span className="text-[11px] text-white/25 shrink-0 tabular-nums">{relativeTime(listing.createdAt)}</span>

        <ChevronDown
          className={`h-3.5 w-3.5 text-white/25 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </div>

      {/* ── Expanded drawer ───────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-t border-white/[0.06] mx-3 pt-3 pb-4 space-y-4">

              {/* Rank requirements */}
              {(listing.minRankDisplayName || listing.maxRankDisplayName) && (
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25 mb-1.5">Rank Needed</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {listing.minRankIconUrl && (
                      <img src={listing.minRankIconUrl} alt={listing.minRankDisplayName ?? 'Min rank'}
                        className="h-8 w-8 object-contain shrink-0" />
                    )}
                    {listing.maxRankIconUrl && listing.maxRankDisplayName !== listing.minRankDisplayName && (
                      <>
                        <span className="text-[11px] text-white/25">→</span>
                        <img src={listing.maxRankIconUrl} alt={listing.maxRankDisplayName ?? 'Max rank'}
                          className="h-8 w-8 object-contain shrink-0" />
                      </>
                    )}
                    <span className="text-[15px] font-bold text-white [font-family:var(--font-heading)]">
                      {listing.minRankDisplayName && listing.maxRankDisplayName && listing.minRankDisplayName !== listing.maxRankDisplayName
                        ? `${listing.minRankDisplayName} – ${listing.maxRankDisplayName}`
                        : listing.minRankDisplayName ?? listing.maxRankDisplayName}
                    </span>
                  </div>
                </div>
              )}

              {/* Team stats row */}
              {(listing.teamMemberCount != null || listing.teamVerifiedCount != null || listing.regionDisplayName || listing.languages?.[0]) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/40">
                  {listing.teamMemberCount != null && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {listing.teamMemberCount} member{listing.teamMemberCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {listing.teamVerifiedCount != null && listing.teamVerifiedCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-400/70">
                      <Shield className="h-3.5 w-3.5" aria-hidden />
                      {listing.teamVerifiedCount} verified
                    </span>
                  )}
                  {listing.regionDisplayName && <span>{listing.regionDisplayName}</span>}
                  {(listing.languages ?? []).slice(0, 2).map((l) => (
                    <span key={l} className="before:content-['·'] before:mr-1.5 before:text-white/20">{l}</span>
                  ))}
                </div>
              )}

              {/* Description */}
              {listing.description && (
                <p className="text-[13px] text-white/55 leading-relaxed">{listing.description}</p>
              )}

              {/* Express Interest / Apply */}
              {!isOwn && (
                <div className="space-y-2 pt-1">
                  {!sent && (
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                      placeholder="Add a message (optional)…"
                      rows={2}
                      className="w-full rounded-md border border-white/[0.08] bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                    />
                  )}
                  {expressError && <p role="alert" className="text-[12px] text-red-400">{expressError}</p>}
                  {sent ? (
                    <span className="text-[13px] text-white/40">Application sent ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExpress}
                      disabled={expressInterest.isPending}
                      className="flex items-center justify-center gap-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 py-2 min-h-[36px] transition-colors disabled:opacity-50"
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
