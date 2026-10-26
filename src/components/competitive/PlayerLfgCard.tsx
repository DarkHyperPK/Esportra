import { useState } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useExpressInterest } from '@/hooks/competitive/useLfg';
import { ApiError } from '@/lib/apiClient';
import { resolveAgent } from '@/lib/valorantAgents';
import type { LfgListing, CatalogGameRole, PopularAgent } from '@/types/competitive';

function relativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function SeedAvatar({ seed }: { seed: string | null }) {
  const initials = seed ? seed.slice(0, 2).toUpperCase() : '??';
  return (
    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/[0.07] font-mono text-[12px] font-semibold text-white/70">
      {initials}
    </span>
  );
}

function AgentIcon({ agent }: { agent: PopularAgent }) {
  const resolved = resolveAgent(agent.agentId);
  const [failed, setFailed] = useState(false);
  const iconUrl = agent.iconUrl || resolved?.iconUrl;
  const name = agent.displayName || resolved?.displayName || 'Agent';
  if (!iconUrl || failed) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.06] text-[9px] font-mono text-white/35">
        {name.slice(0, 2)}
      </span>
    );
  }
  return <img src={iconUrl} alt={name} className="h-7 w-7 rounded-md object-contain" onError={() => setFailed(true)} />;
}

function RankIcon({ iconUrl, displayName, size = 'h-10 w-10' }: { iconUrl: string | null; displayName: string | null; size?: string }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return <img src={iconUrl} alt={displayName ?? 'Rank'} className={`shrink-0 object-contain ${size}`} onError={() => setFailed(true)} />;
  }
  return (
    <div className={`shrink-0 flex items-center justify-center rounded-md bg-white/[0.06] font-mono text-[10px] text-white/35 ${size}`}>
      {(displayName ?? '?').slice(0, 3)}
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-[18px] font-bold [font-family:var(--font-heading)] ${accent ? 'text-rose-400' : 'text-white'}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
    </div>
  );
}

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

  const agents = (listing.popularAgents ?? []) as PopularAgent[];
  const topAgents = agents.slice(0, 2);
  const riotTag = listing.riotGameName && listing.riotTagLine
    ? `${listing.riotGameName}#${listing.riotTagLine}`
    : null;

  const rankIcon = listing.minRankIconUrl;
  const rankName = listing.competitiveTierName ?? listing.minRankDisplayName;

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
        <SeedAvatar seed={listing.avatarSeed} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-white truncate">{listing.username}</span>
            {riotTag && <span className="text-[12px] text-white/35 truncate hidden sm:inline">{riotTag}</span>}
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-white/35">{relativeTime(listing.createdAt)}</span>
        <ChevronDown className={`h-4 w-4 text-white/30 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        {rankIcon && <RankIcon iconUrl={rankIcon} displayName={rankName} />}
        {rankName && <span className="text-[14px] font-semibold text-white [font-family:var(--font-heading)]">{rankName}</span>}
        {topAgents.length > 0 && (
          <div className="flex items-center gap-1 ml-auto sm:ml-2">
            {topAgents.map((a) => <AgentIcon key={a.agentId} agent={a} />)}
          </div>
        )}
        {(listing.preferredRoles ?? []).length > 0 && (
          <div className="flex items-center gap-1">
            {(listing.preferredRoles ?? []).slice(0, 3).map((rk) => {
              const role = gameRoles.find((r) => r.roleKey === rk);
              return role?.iconUrl
                ? <img key={rk} src={role.iconUrl} alt={role.displayName ?? rk} className="h-5 w-5 opacity-60" />
                : <span key={rk} className="text-[11px] text-white/40">{role?.displayName ?? rk}</span>;
            })}
          </div>
        )}
      </div>

      {(listing.regionDisplayName || listing.languages?.[0]) && (
        <div className="flex items-center gap-2 mb-2 text-[12px] text-white/40">
          {listing.regionDisplayName && <span>{listing.regionDisplayName}</span>}
          {listing.regionDisplayName && listing.languages?.[0] && <span className="text-white/20">·</span>}
          {listing.languages?.[0] && <span>{listing.languages[0]}</span>}
        </div>
      )}

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
            <div className="border-t border-white/[0.06] mt-3 pt-3 space-y-4">
              {/* Ranked overview */}
              {(listing.competitiveTierName || listing.winRate != null) && (
                <div className="flex items-center gap-6 flex-wrap">
                  {listing.competitiveTierName && (
                    <div className="flex items-center gap-2">
                      <RankIcon iconUrl={rankIcon} displayName={listing.competitiveTierName} size="h-14 w-14" />
                      <div>
                        <p className="text-[16px] font-bold text-white [font-family:var(--font-heading)]">{listing.competitiveTierName}</p>
                        <p className="text-[11px] text-white/35">Current Rank</p>
                      </div>
                    </div>
                  )}
                  {listing.winRate != null && (
                    <StatBlock label="Win Rate" value={`${listing.winRate}%`} accent />
                  )}
                  {listing.kdRatio != null && (
                    <StatBlock label="K/D" value={String(listing.kdRatio)} />
                  )}
                  {listing.matchesAnalyzed != null && listing.matchesAnalyzed > 0 && (
                    <StatBlock label={`${listing.matchesAnalyzed} Act Games`} value={`${listing.winCount ?? 0}W ${listing.lossCount ?? 0}L`} />
                  )}
                </div>
              )}

              {/* Agent stats from Riot data */}
              {agents.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">This Act</p>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((a) => {
                      const resolved = resolveAgent(a.agentId);
                      const agentWr = a.gamesPlayed > 0 ? Math.round((a.wins / a.gamesPlayed) * 100) : 0;
                      return (
                        <div key={a.agentId} className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1.5 min-w-[140px]">
                          <AgentIcon agent={a} />
                          <div>
                            <p className="text-[12px] font-medium text-white/80">{a.displayName || resolved?.displayName || 'Agent'}</p>
                            <p className="text-[10px] text-white/40">
                              {a.gamesPlayed}g · {agentWr}% WR
                              {a.kdRatio != null && <> · <span className="text-white/55">{a.kdRatio} K/D</span></>}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* User-declared preferred agents */}
              {(listing.preferredAgents ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">Mains</p>
                  <div className="flex flex-wrap gap-2">
                    {(listing.preferredAgents ?? []).map((agentId) => {
                      const resolved = resolveAgent(agentId);
                      const name = resolved?.displayName ?? agentId.slice(0, 6);
                      const initials = name.slice(0, 2);
                      return (
                        <div key={agentId} className="flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-1">
                          {resolved?.iconUrl
                            ? <img src={resolved.iconUrl} alt={name} className="h-5 w-5 rounded object-contain" />
                            : <span className="flex h-5 w-5 items-center justify-center text-[8px] font-mono text-white/35">{initials}</span>
                          }
                          <span className="text-[11px] text-white/55">{name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
