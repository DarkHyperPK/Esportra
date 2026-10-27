import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { ApiError } from '@/lib/apiClient';
import { resolveAgent, getAgentPortraitUrl } from '@/lib/valorantAgents';
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

  const popularAgents: PopularAgent[] = (() => {
    const raw = listing.popularAgents;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as PopularAgent[];
    if (typeof raw === 'string') { try { return JSON.parse(raw) as PopularAgent[]; } catch { return []; } }
    return [];
  })();

  // Primary agent for background art
  const primaryAgent = popularAgents[0]
    ?? (listing.preferredAgents?.[0] ? { agentId: listing.preferredAgents[0] } as PopularAgent : null);
  const portraitUrl = primaryAgent ? getAgentPortraitUrl(primaryAgent.agentId) : null;

  const rankName = listing.competitiveTierName ?? listing.minRankDisplayName;
  const rankTier = listing.competitiveTier ?? null;
  const rankIconUrl = (() => {
    if (rankTier != null) {
      const found = ranks.find((r) => r.sortOrder === rankTier - 2);
      if (found?.iconUrl) return found.iconUrl;
      return getRankIconUrl(rankTier - 2);
    }
    return listing.minRankIconUrl ?? null;
  })();
  const rankColor = rankColorFromName(rankName);

  function handleExpress() {
    setError(null);
    expressInterest.mutate({ message: message.trim() || undefined }, {
      onSuccess: () => setSent(true),
      onError: (err: unknown) => {
        if (err instanceof ApiError && err.status === 409) {
          setError("Already sent.");
          setSent(true);
        } else {
          setError('Failed. Try again.');
        }
      },
    });
  }

  const agentThumbs = popularAgents.slice(0, 4);

  return (
    <div
      className="relative overflow-hidden cursor-pointer select-none bg-[#0a0a0c]"
      style={{ aspectRatio: '9 / 14' }}
      onClick={() => !expanded && setExpanded(true)}
    >
      {/* Agent portrait */}
      {portraitUrl && (
        <img
          src={portraitUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
          style={{ objectPosition: '60% top' }}
        />
      )}

      {/* Base tint so unlit areas don't look blown out */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: '72%', background: 'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.5) 60%, transparent 100%)' }}
      />

      {/* Top-right: extra agent thumbs */}
      {agentThumbs.length > 1 && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 pointer-events-none">
          {agentThumbs.slice(1).map((a) => {
            const r = resolveAgent(a.agentId);
            return r ? (
              <img key={a.agentId} src={r.iconUrl} alt={r.displayName} title={r.displayName}
                className="h-5 w-5 rounded object-contain opacity-70" />
            ) : null;
          })}
        </div>
      )}

      {/* Bottom content — always visible */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
        <p className="text-[13px] font-bold text-white leading-none truncate">{listing.username}</p>

        {rankName && (
          <div className="flex items-center gap-1.5">
            {rankIconUrl && (
              <img src={rankIconUrl} alt={rankName} className="h-4 w-4 object-contain shrink-0" />
            )}
            <span className="text-[11px] font-semibold leading-none" style={{ color: rankColor }}>{rankName}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {listing.winRate != null && (
            <span className="text-[10px] font-mono text-white/60">{Math.round(Number(listing.winRate))}% WR</span>
          )}
          {listing.kdRatio != null && (
            <span className="text-[10px] font-mono text-white/60">{Number(listing.kdRatio).toFixed(2)} K/D</span>
          )}
          {listing.regionDisplayName && (
            <span className="text-[10px] text-white/40">{listing.regionDisplayName}</span>
          )}
        </div>

        {!isOwn && !expanded && !sent && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="mt-1 w-full text-center text-[11px] font-medium text-white/70 border border-white/[0.12] hover:border-white/30 hover:text-white py-1.5 transition-colors bg-black/30"
          >
            Express Interest
          </button>
        )}

        {sent && (
          <p className="text-[11px] text-white/40 mt-1">Interest sent ✓</p>
        )}
      </div>

      {/* Expanded overlay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="absolute inset-0 flex flex-col justify-end bg-black/80 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute top-2 right-2 text-[10px] text-white/40 hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-2">
              <p className="text-[12px] font-bold text-white truncate">{listing.username}</p>

              {listing.description && (
                <p className="text-[11px] text-white/55 leading-relaxed line-clamp-3">{listing.description}</p>
              )}

              {!sent ? (
                <>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                    placeholder="Add a message (optional)…"
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
