import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { ApiError } from '@/lib/apiClient';
import { resolveAgent, getAgentPortraitUrl, parsePopularAgents } from '@/lib/valorantAgents';
import { getRankIconUrl } from '@/lib/valorantRanks';
import type { LfgListing, CatalogGameRole, CatalogRankTier, PopularAgent } from '@/types/competitive';

function rankColorFromName(name: string | null): string {
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

function relativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 60_000) return 'now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

interface PlayerLfgCardGridProps {
  listing: LfgListing;
  gameRoles?: CatalogGameRole[];
  ranks?: CatalogRankTier[];
  currentUserId?: string | null;
}

export function PlayerLfgCardGrid({ listing, gameRoles = [], ranks = [], currentUserId }: PlayerLfgCardGridProps) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const expressInterest = useExpressInterest(listing.id);
  const isOwn = currentUserId === listing.userId;

  const popularAgents = parsePopularAgents(listing.popularAgents);

  const primaryAgent = popularAgents[0]
    ?? (listing.preferredAgents?.[0] ? { agentId: listing.preferredAgents[0] } as PopularAgent : null);
  const portraitUrl = primaryAgent ? getAgentPortraitUrl(primaryAgent.agentId) : null;

  const rankName = listing.competitiveTierName ?? listing.minRankDisplayName;
  const rankTier = listing.competitiveTier ?? null;
  const rankIconUrl = (() => {
    if (rankTier != null) {
      const found = ranks.find((r) => r.sortOrder === rankTier - 3);
      if (found?.iconUrl) return found.iconUrl;
      return getRankIconUrl(rankTier - 3);
    }
    return listing.minRankIconUrl ?? null;
  })();
  const rankColor = rankColorFromName(rankName);

  // Role icons for bottom row
  const roleIcons = (listing.preferredRoles ?? [])
    .slice(0, 5)
    .map((rk) => gameRoles.find((r) => r.roleKey === rk))
    .filter((r): r is CatalogGameRole => !!r?.iconUrl);

  // Agent thumbs for bottom row (when no roles, show agents instead)
  const agentThumbs = roleIcons.length === 0
    ? popularAgents.slice(0, 5).map((a) => resolveAgent(a.agentId)).filter(Boolean)
    : [];

  const hasStats = listing.winRate != null || listing.kdRatio != null || listing.matchesAnalyzed != null;

  function handleExpress() {
    setError(null);
    expressInterest.mutate({ message: message.trim() || undefined }, {
      onSuccess: () => setSent(true),
      onError: (err: unknown) => {
        if (err instanceof ApiError && err.status === 409) { setError('Already sent.'); setSent(true); }
        else { setError('Failed. Try again.'); }
      },
    });
  }

  return (
    <div
      className="relative overflow-hidden cursor-pointer select-none bg-[#060608]"
      style={{ aspectRatio: '9 / 14' }}
      onClick={() => !expanded && setExpanded(true)}
    >
      {/* Agent portrait — right-biased so face shows */}
      {portraitUrl && (
        <img
          src={portraitUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: '65% top' }}
        />
      )}

      {/* Dark vignette sides */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)' }} />

      {/* Bottom gradient — strong, covers stats area */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: '65%', background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.92) 40%, rgba(0,0,0,0.6) 65%, transparent 100%)' }} />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2.5 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <img
            src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(listing.avatarSeed ?? listing.username)}&size=28`}
            alt=""
            aria-hidden
            className="h-7 w-7 rounded drop-shadow-lg"
          />
          {rankIconUrl && (
            <img src={rankIconUrl} alt={rankName ?? 'Rank'} title={rankName ?? undefined}
              className="h-5 w-5 object-contain drop-shadow-lg" />
          )}
        </div>
        <span className="text-[9px] font-mono text-white/35 mt-0.5">{relativeTime(listing.createdAt)}</span>
      </div>

      {/* ── Bottom info ──────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">

        {/* Username */}
        <p className="text-[14px] font-bold text-white leading-tight truncate mb-2">{listing.username}</p>

        {/* Stat columns — KDA-style */}
        {hasStats && (
          <div className="flex items-start gap-4 mb-2">
            {listing.winRate != null && (
              <div>
                <p className="text-[7px] font-mono uppercase tracking-[0.15em] text-white/35 mb-0.5">WR</p>
                <p className="text-[15px] font-black text-white leading-none tabular-nums">
                  {Math.round(Number(listing.winRate))}
                  <span className="text-[9px] font-semibold text-white/60">%</span>
                </p>
              </div>
            )}
            {listing.kdRatio != null && (
              <div>
                <p className="text-[7px] font-mono uppercase tracking-[0.15em] text-white/35 mb-0.5">K/D</p>
                <p className="text-[15px] font-black text-white leading-none tabular-nums">
                  {Number(listing.kdRatio).toFixed(2)}
                </p>
              </div>
            )}
            {listing.matchesAnalyzed != null && listing.matchesAnalyzed > 0 && (
              <div>
                <p className="text-[7px] font-mono uppercase tracking-[0.15em] text-white/35 mb-0.5">M</p>
                <p className="text-[15px] font-black text-white leading-none tabular-nums">
                  {listing.matchesAnalyzed}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rank name in rank color — hero label */}
        {rankName && (
          <p className="text-[10px] font-semibold mb-1 leading-none" style={{ color: rankColor }}>
            {rankName}
          </p>
        )}

        {/* Description snippet */}
        {listing.description && !expanded && (
          <p className="text-[9px] text-white/30 leading-snug line-clamp-2 mb-2">{listing.description}</p>
        )}

        {/* Bottom icon row: role icons or agent thumbs */}
        {(roleIcons.length > 0 || agentThumbs.length > 0) && (
          <div className="flex items-center gap-1.5 mb-1">
            {roleIcons.map((role) => (
              <img key={role.roleKey} src={role.iconUrl!} alt={role.displayName ?? role.roleKey}
                title={role.displayName ?? role.roleKey}
                className="h-4 w-4 object-contain opacity-60" />
            ))}
            {agentThumbs.map((a, i) => a ? (
              <img key={i} src={a.iconUrl} alt={a.displayName} title={a.displayName}
                className="h-4 w-4 rounded object-contain opacity-60" />
            ) : null)}
          </div>
        )}

        {/* Express interest button */}
        {!isOwn && !expanded && !sent && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="mt-1.5 w-full text-center text-[10px] font-semibold uppercase tracking-wider text-white/60 border border-white/[0.10] hover:border-white/25 hover:text-white py-1.5 transition-colors bg-black/20 backdrop-blur-sm"
          >
            Express Interest
          </button>
        )}
        {sent && <p className="text-[10px] text-white/40 mt-1.5 text-center">Sent ✓</p>}
      </div>

      {/* ── Expanded overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="absolute inset-0 flex flex-col justify-end bg-black/85 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => setExpanded(false)}
              className="absolute top-2 right-2.5 text-[11px] text-white/35 hover:text-white leading-none">
              ✕
            </button>

            <div className="space-y-2">
              <p className="text-[12px] font-bold text-white truncate">{listing.username}</p>
              {listing.description && (
                <p className="text-[10px] text-white/50 leading-relaxed line-clamp-3">{listing.description}</p>
              )}
              {!sent ? (
                <>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                    placeholder="Message (optional)…"
                    rows={2}
                    className="w-full bg-black/50 border border-white/[0.08] text-white text-[11px] px-2 py-1.5 placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {error && <p className="text-[10px] text-red-400">{error}</p>}
                  <button
                    type="button"
                    onClick={handleExpress}
                    disabled={expressInterest.isPending}
                    className="w-full flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[12px] py-2 transition-colors disabled:opacity-50"
                  >
                    {expressInterest.isPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                    Send
                  </button>
                </>
              ) : (
                <p className="text-[12px] text-white/50 text-center py-2">Interest sent ✓</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
