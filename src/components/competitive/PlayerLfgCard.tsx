import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { ApiError } from '@/lib/apiClient';
import { resolveAgent } from '@/lib/valorantAgents';
import type { LfgListing, CatalogGameRole, PopularAgent } from '@/types/competitive';

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

function rankMeta(tier: number | null, name: string | null): { label: string; color: string } {
  const n = name ?? '';
  const lower = n.toLowerCase();
  const label = n ? abbrevRank(n) : '—';
  const fromName = (kw: string, color: string) => lower.includes(kw) ? { label, color } : null;

  if (tier != null) {
    if (tier >= 27) return { label: 'Rad', color: '#f59e0b' };
    if (tier >= 24) return { label, color: '#f43f5e' };
    if (tier >= 21) return { label, color: '#4ade80' };
    if (tier >= 18) return { label, color: '#818cf8' };
    if (tier >= 15) return { label, color: '#22d3ee' };
    if (tier >= 12) return { label, color: '#facc15' };
    if (tier >= 9)  return { label, color: '#94a3b8' };
    if (tier >= 6)  return { label, color: '#c08030' };
    return { label, color: '#71717a' };
  }

  return (
    fromName('radiant', '#f59e0b') ??
    fromName('immortal', '#f43f5e') ??
    fromName('ascendant', '#4ade80') ??
    fromName('diamond', '#818cf8') ??
    fromName('platinum', '#22d3ee') ??
    fromName('gold', '#facc15') ??
    fromName('silver', '#94a3b8') ??
    fromName('bronze', '#c08030') ??
    fromName('iron', '#71717a') ??
    { label, color: '#52525b' }
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeedAvatar({ seed }: { seed: string | null }) {
  return (
    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/[0.08] font-mono text-[10px] font-bold text-white/60">
      {(seed ?? '??').slice(0, 2).toUpperCase()}
    </span>
  );
}

function RankBadge({ tier, name }: { tier: number | null; name: string | null }) {
  if (!name && tier == null) return null;
  const { label, color } = rankMeta(tier, name);
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <span className="h-[7px] w-[7px] rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{label}</span>
    </span>
  );
}

function AgentThumb({ agent, size = 22 }: { agent: PopularAgent; size?: number }) {
  const resolved = resolveAgent(agent.agentId);
  const [failed, setFailed] = useState(false);
  const src = agent.iconUrl || resolved?.iconUrl;
  const name = agent.displayName || resolved?.displayName || 'Agent';
  if (!src || failed) {
    return (
      <span title={name} className="flex shrink-0 items-center justify-center rounded bg-white/[0.06] font-mono text-[8px] text-white/30"
        style={{ width: size, height: size }}>
        {name.slice(0, 2)}
      </span>
    );
  }
  return (
    <img src={src} alt={name} title={name} onError={() => setFailed(true)}
      className="shrink-0 rounded object-contain"
      style={{ width: size, height: size }} />
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded bg-white/[0.04] border border-white/[0.06] min-w-[56px]">
      <span className="text-[15px] font-bold [font-family:var(--font-heading)] text-white" style={color ? { color } : {}}>{value}</span>
      <span className="text-[9px] uppercase tracking-widest text-white/35 mt-0.5">{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PlayerLfgCardProps {
  listing: LfgListing;
  gameRoles?: CatalogGameRole[];
  currentUserId?: string | null;
}

export function PlayerLfgCard({ listing, gameRoles = [], currentUserId }: PlayerLfgCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [sent, setSent] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const reduced = useReducedMotion() ?? false;
  const expressInterest = useExpressInterest(listing.id);
  const isOwn = currentUserId === listing.userId;

  const popularAgents = (listing.popularAgents ?? []) as PopularAgent[];
  const topAgents = popularAgents.slice(0, 3);
  const preferredRoles = listing.preferredRoles ?? [];

  const rankName = listing.competitiveTierName ?? listing.minRankDisplayName;
  const rankTier = listing.competitiveTier ?? null;
  const rankRange = (() => {
    const min = listing.minRankDisplayName;
    const max = listing.maxRankDisplayName;
    if (!min && !max) return null;
    if (!min || !max || min === max) return min ?? max;
    const minAbbr = abbrevRank(min);
    const maxAbbr = abbrevRank(max);
    if (minAbbr === maxAbbr) return minAbbr;
    return `${minAbbr}–${maxAbbr}`;
  })();

  const riotTag = listing.riotGameName && listing.riotTagLine
    ? `${listing.riotGameName}#${listing.riotTagLine}`
    : null;

  const { color: rankColor } = rankMeta(rankTier, rankName);

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
        <SeedAvatar seed={listing.avatarSeed} />

        {/* Identity */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white truncate leading-none">{listing.username}</span>
          {riotTag && (
            <span className="text-[11px] text-white/30 truncate hidden sm:inline leading-none">{riotTag}</span>
          )}
        </div>

        {/* Rank badge */}
        <RankBadge tier={rankTier} name={rankName ?? rankRange} />

        {/* Agent icons */}
        {topAgents.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {topAgents.map((a) => <AgentThumb key={a.agentId} agent={a} />)}
          </div>
        )}

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

              {/* Rank + stats */}
              {(rankName || listing.winRate != null || listing.kdRatio != null) && (
                <div className="flex items-center gap-3 flex-wrap">
                  {rankName && (
                    <div className="flex items-center gap-2 mr-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: rankColor }} />
                      <span className="text-[16px] font-bold text-white [font-family:var(--font-heading)]">{rankName}</span>
                    </div>
                  )}
                  {listing.winRate != null && (
                    <StatPill label="Win Rate" value={`${listing.winRate}%`} color="#f43f5e" />
                  )}
                  {listing.kdRatio != null && (
                    <StatPill label="K/D" value={String(listing.kdRatio)} />
                  )}
                  {listing.matchesAnalyzed != null && listing.matchesAnalyzed > 0 && (
                    <StatPill
                      label="Act Games"
                      value={`${listing.winCount ?? 0}W–${listing.lossCount ?? 0}L`}
                    />
                  )}
                </div>
              )}

              {/* Agent breakdown from Riot */}
              {popularAgents.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25 mb-2">This Act</p>
                  <div className="flex flex-wrap gap-2">
                    {popularAgents.map((a) => {
                      const resolved = resolveAgent(a.agentId);
                      const agentWr = a.gamesPlayed > 0 ? Math.round((a.wins / a.gamesPlayed) * 100) : 0;
                      return (
                        <div key={a.agentId} className="flex items-center gap-2 rounded bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5">
                          <AgentThumb agent={a} size={24} />
                          <div>
                            <p className="text-[12px] font-medium text-white/80 leading-none">
                              {a.displayName || resolved?.displayName || 'Agent'}
                            </p>
                            <p className="text-[10px] text-white/35 mt-0.5">
                              {a.gamesPlayed}g · {agentWr}%WR
                              {a.kdRatio != null && <> · <span className="text-white/50">{a.kdRatio}KD</span></>}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Region + languages row */}
              {(listing.regionDisplayName || listing.languages?.[0] || listing.languages?.[1]) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/40">
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

              {/* Express Interest */}
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
                    <span className="text-[13px] text-white/40">Interest sent ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExpress}
                      disabled={expressInterest.isPending}
                      className="flex items-center justify-center gap-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 py-2 min-h-[36px] transition-colors disabled:opacity-50"
                    >
                      {expressInterest.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      Express Interest
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
