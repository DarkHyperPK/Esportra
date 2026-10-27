import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { ApiError } from '@/lib/apiClient';
import type { LfgListing, CatalogGameRole } from '@/types/competitive';

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

interface TeamLfgCardGridProps {
  listing: LfgListing;
  gameRoles?: CatalogGameRole[];
  currentUserId?: string | null;
}

export function TeamLfgCardGrid({ listing, gameRoles = [], currentUserId }: TeamLfgCardGridProps) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const expressInterest = useExpressInterest(listing.id);
  const isOwn = currentUserId === listing.userId;

  const minColor = rankColorFromName(listing.minRankDisplayName);
  const maxColor = rankColorFromName(listing.maxRankDisplayName);
  const accentColor = minColor !== '#52525b' ? minColor : maxColor !== '#52525b' ? maxColor : '#f43f5e';

  const neededRoles = (listing.preferredRoles ?? [])
    .slice(0, 4)
    .map((rk) => gameRoles.find((r) => r.roleKey === rk))
    .filter(Boolean);

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

  return (
    <div
      className="relative overflow-hidden cursor-pointer select-none bg-[#0a0a0c]"
      style={{ aspectRatio: '9 / 14' }}
      onClick={() => !expanded && setExpanded(true)}
    >
      {/* Background: subtle rank-color glow from bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 110%, ${accentColor}22 0%, transparent 65%)` }}
      />

      {/* Team logo — large, centered, slightly faded */}
      {listing.teamLogoUrl && !logoFailed ? (
        <img
          src={listing.teamLogoUrl}
          alt={listing.teamName ?? ''}
          onError={() => setLogoFailed(true)}
          aria-hidden
          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-20"
          style={{ padding: '24px' }}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <span
            className="font-mono font-black text-[72px] leading-none select-none"
            style={{ color: `${accentColor}18` }}
          >
            {(listing.teamTag ?? listing.teamName ?? '?').slice(0, 3).toUpperCase()}
          </span>
        </div>
      )}

      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: '75%', background: 'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.4) 70%, transparent 100%)' }}
      />

      {/* Top: team tag badge */}
      {listing.teamTag && (
        <div className="absolute top-2.5 left-3">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40 border border-white/[0.06] px-1.5 py-0.5">
            {listing.teamTag}
          </span>
        </div>
      )}

      {/* Role icons top-right */}
      {neededRoles.length > 0 && (
        <div className="absolute top-2.5 right-2.5 flex gap-1 pointer-events-none">
          {neededRoles.map((role) => role?.iconUrl ? (
            <img key={role.roleKey} src={role.iconUrl} alt={role.displayName ?? role.roleKey}
              title={role.displayName ?? role.roleKey}
              className="h-4 w-4 object-contain opacity-50" />
          ) : null)}
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
        <p className="text-[13px] font-bold text-white leading-none truncate">{listing.teamName ?? listing.username}</p>

        {(listing.minRankDisplayName || listing.maxRankDisplayName) && (
          <div className="flex items-center gap-1">
            {listing.minRankIconUrl && (
              <img src={listing.minRankIconUrl} alt={listing.minRankDisplayName ?? ''} className="h-4 w-4 object-contain shrink-0" />
            )}
            <span className="text-[10px] font-semibold" style={{ color: minColor }}>
              {listing.minRankDisplayName ?? ''}
            </span>
            {listing.maxRankDisplayName && listing.maxRankDisplayName !== listing.minRankDisplayName && (
              <>
                <span className="text-[9px] text-white/25 mx-0.5">–</span>
                <span className="text-[10px] font-semibold" style={{ color: maxColor }}>
                  {listing.maxRankDisplayName}
                </span>
              </>
            )}
          </div>
        )}

        {listing.regionDisplayName && (
          <span className="text-[10px] text-white/40">{listing.regionDisplayName}</span>
        )}

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
              <p className="text-[12px] font-bold text-white truncate">{listing.teamName ?? listing.username}</p>

              {listing.description && (
                <p className="text-[11px] text-white/55 leading-relaxed line-clamp-3">{listing.description}</p>
              )}

              {!sent ? (
                <>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                    placeholder="Introduce yourself (optional)…"
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
                    Apply
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
