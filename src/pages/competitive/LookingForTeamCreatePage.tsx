/**
 * LFT listing creation — player seeking a team.
 * Riot account required. Fetches real player stats and lets the user
 * select preferred agents, roles, rank range, region, and languages.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogRankTiers, useCatalogGameRoles, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useCreateLfgListing, useMyGameStats } from '@/hooks/competitive/useLfg';
import { apiClient } from '@/lib/apiClient';
import { VALORANT_AGENTS, parsePopularAgents } from '@/lib/valorantAgents';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PlayerLfgCard } from '@/components/competitive/PlayerLfgCard';
import { RankSelector } from '@/components/competitive/RankSelector';
import type { LfgListing } from '@/types/competitive';

const GAME = 'valorant';
const DESC_MAX = 280;

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
  { code: 'tr', label: 'TR' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
  { code: 'pt', label: 'PT' },
  { code: 'ru', label: 'RU' },
  { code: 'ja', label: 'JA' },
  { code: 'ko', label: 'KO' },
];

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">
      {children}
    </p>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1.5 border text-[12px] transition-colors min-h-[44px]',
        active
          ? 'border-white/30 bg-white text-[#08080a]'
          : 'border-white/[0.08] text-white/55 hover:border-white/20',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function LookingForTeamCreatePage() {
  const { user, profile: userProfile } = useAuth();
  const navigate = useNavigate();

  const statsQuery = useMyGameStats(GAME);
  const ranksQuery = useCatalogRankTiers(GAME);
  const rolesQuery = useCatalogGameRoles(GAME);
  const regionsQuery = useCatalogRegions(GAME);
  const createMutation = useCreateLfgListing();

  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [minRank, setMinRank] = useState<number | undefined>(undefined);
  const [maxRank, setMaxRank] = useState<number | undefined>(undefined);
  const [regionKey, setRegionKey] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<1 | 3 | 7>(3);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const stats = statsQuery.data;
  const ranks = ranksQuery.data ?? [];
  const gameRoles = rolesQuery.data ?? [];
  const regions = regionsQuery.data ?? [];

  const popularAgents = parsePopularAgents(stats?.popularAgents);

  function toggleAgent(agentId: string) {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((a) => a !== agentId) : [...prev, agentId],
    );
  }

  function toggleRole(roleKey: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey],
    );
  }

  function toggleLanguage(code: string) {
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  }

  async function handleGoLive() {
    setPhase('saving');
    setSaveError(null);
    try {
      const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      const result = await createMutation.mutateAsync({
        gameSlug: GAME,
        intent: 'looking_for_team',
        preferredAgents: selectedAgents,
        preferredRoles: selectedRoles,
        minRankSortOrder: minRank ?? null,
        maxRankSortOrder: maxRank ?? null,
        regionKey: regionKey ?? undefined,
        languages,
        description: description || undefined,
        expiresAt,
      });
      await apiClient.post(`/api/competitive/lfg/${result.id}/publish`);
      setPhase('done');
      setTimeout(() => navigate('/competitive/looking-for-team'), 1200);
    } catch (err: unknown) {
      setPhase('error');
      if (err && typeof err === 'object' && 'body' in err) {
        const body = (err as { body: { error?: string; max?: number } }).body;
        if (body?.error === 'LISTING_LIMIT_REACHED') {
          setSaveError(`You already have ${body.max ?? 3} active listings. Close or pause one first.`);
          return;
        }
      }
      setSaveError('Something went wrong. Check your connection and try again.');
    }
  }

  // Build preview listing from current form state
  const minRankData = ranks.find((r) => r.sortOrder === minRank);
  const maxRankData = ranks.find((r) => r.sortOrder === maxRank);

  const previewListing: LfgListing | null = user
    ? {
        id: 'preview',
        userId: user.id,
        teamId: null,
        gameSlug: GAME,
        intent: 'looking_for_team',
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        username: userProfile?.username ?? user.email?.split('@')[0] ?? 'You',
        avatarSeed: userProfile?.avatar_seed ?? user.id,
        modeKey: null,
        regionKey,
        regionDisplayName: regions.find((r) => r.regionKey === regionKey)?.displayName ?? null,
        preferredServers: [],
        minRankSortOrder: minRank ?? null,
        maxRankSortOrder: maxRank ?? null,
        minRankDisplayName: minRankData?.displayName ?? null,
        maxRankDisplayName: maxRankData?.displayName ?? null,
        minRankIconUrl: minRankData?.iconUrl ?? null,
        maxRankIconUrl: maxRankData?.iconUrl ?? null,
        preferredRoles: selectedRoles,
        preferredAgents: selectedAgents,
        languages,
        description: description || null,
        expiresAt: new Date(Date.now() + expiresInDays * 86_400_000).toISOString(),
        mode: null, minRankSlug: null, maxRankSlug: null, regionSlug: null,
        servers: [], roles: [], publishedAt: null, closedAt: null, avatarUrl: null,
        competitiveTier: stats?.competitiveTier ?? null,
        competitiveTierName: stats?.competitiveTierName ?? null,
        winCount: stats?.winCount ?? null,
        lossCount: stats?.lossCount ?? null,
        winRate: stats?.winRate ?? null,
        kdRatio: stats?.kdRatio ?? null,
        popularAgents: popularAgents.length > 0 ? popularAgents : null,
        matchesAnalyzed: stats?.matchesAnalyzed ?? null,
        riotSyncedAt: stats?.syncedAt ?? null,
        riotGameName: stats?.riotGameName ?? null,
        riotTagLine: stats?.riotTagLine ?? null,
        teamName: null, teamLogoUrl: null, teamTag: null,
        teamMemberCount: null, teamVerifiedCount: null,
      }
    : null;

  const charsLeft = DESC_MAX - description.length;

  // ── Gate: loading ────────────────────────────────────────────────────────────
  if (statsQuery.isLoading) {
    return (
      <CompetitivePageShell>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      </CompetitivePageShell>
    );
  }

  // ── Gate: stats fetch error ──────────────────────────────────────────────────
  if (statsQuery.isError) {
    return (
      <CompetitivePageShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
          <Link
            to="/competitive/looking-for-team"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Find a Team
          </Link>
          <p className="text-[14px] text-white/50 mb-4">
            Couldn't load your stats. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => void statsQuery.refetch()}
            className="text-[13px] text-rose-400 hover:text-rose-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </CompetitivePageShell>
    );
  }

  // ── Gate: Riot account not linked ────────────────────────────────────────────
  if (!stats?.riotLinked) {
    return (
      <CompetitivePageShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
          <Link
            to="/competitive/looking-for-team"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Find a Team
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
          <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight mb-2">
            Link your Riot account
          </h1>
          <p className="text-[14px] text-white/50 mb-6">
            To post an LFT listing, link your Riot account so we can pull your stats and rank.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-6 h-10 transition-colors"
          >
            Go to Account Settings
          </Link>
        </div>
      </CompetitivePageShell>
    );
  }

  // ── Gate: stats syncing or pending ──────────────────────────────────────────
  const isSyncing = stats.syncStatus === 'syncing' || stats.syncStatus === 'pending';
  const noStats = !stats.popularAgents && stats.syncStatus !== 'complete';

  if (isSyncing || (noStats && !stats.syncStatus)) {
    return (
      <CompetitivePageShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
          <Link
            to="/competitive/looking-for-team"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Find a Team
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
          <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight mb-2">
            Fetching your stats
          </h1>
          <p className="text-[14px] text-white/50 mb-6">
            We're pulling your Valorant match history. This usually takes under a minute.
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-[13px] text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing…
            </span>
            <button
              type="button"
              onClick={() => void statsQuery.refetch()}
              className="text-[12px] text-white/35 hover:text-white/60 transition-colors"
            >
              Check again
            </button>
          </div>
        </div>
      </CompetitivePageShell>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────

  // Look up rank from stats for the stats banner
  const tierBadge = stats.competitiveTier != null
    ? ranks.find((r) => r.sortOrder === stats.competitiveTier! - 2)
    : null;

  return (
    <CompetitivePageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* Back nav */}
        <Link
          to="/competitive/looking-for-team"
          className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Find a Team
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
        <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight mb-2">
          List yourself
        </h1>
        <p className="text-[14px] text-white/50 mb-8">
          Your stats are pulled from your linked Riot account. Choose your preferences and go live.
        </p>

        <div className="space-y-8">

          {/* Stats banner */}
          {(stats.riotGameName || stats.competitiveTierName) && (
            <div className="border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" fill="currentColor" aria-hidden="true">
                  <path d="M12.534 21.77L.545 4.921l.013-.008A11.98 11.98 0 0 1 12 0c4.56 0 8.539 2.547 10.632 6.307L12.534 21.77z" />
                </svg>
                <span className="text-[13px] text-white/80 font-medium">
                  {stats.riotGameName}
                  {stats.riotTagLine ? <span className="text-white/35">#{stats.riotTagLine}</span> : null}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {tierBadge && (
                  <span className="flex items-center gap-1.5">
                    <img src={tierBadge.iconUrl ?? getRankIconUrl(tierBadge.sortOrder)} alt={tierBadge.displayName} className="h-5 w-5 object-contain" />
                    <span className="text-[12px] text-white/70">{stats.competitiveTierName}</span>
                  </span>
                )}
                {stats.winRate != null && (
                  <span title="Win Rate" className="text-[11px] font-mono text-white/45 border border-white/[0.06] px-2 py-0.5">
                    {Math.round(Number(stats.winRate))}% WR
                  </span>
                )}
                {stats.kdRatio != null && (
                  <span title="K/D Ratio" className="text-[11px] font-mono text-white/45 border border-white/[0.06] px-2 py-0.5">
                    {Number(stats.kdRatio).toFixed(2)} K/D
                  </span>
                )}
                {stats.winCount != null && stats.lossCount != null && (
                  <span title="Win / Loss record" className="text-[11px] font-mono text-white/45 border border-white/[0.06] px-2 py-0.5">
                    {stats.winCount}W – {stats.lossCount}L
                  </span>
                )}
                {stats.matchesAnalyzed != null && (
                  <span title="Matches analyzed" className="text-[11px] text-white/25">
                    {stats.matchesAnalyzed} matches
                  </span>
                )}
              </div>
            </div>
          )}

          {/* sync error notice */}
          {stats.syncStatus === 'error' && (
            <p className="text-[12px] text-amber-400/80 border border-amber-400/20 px-3 py-2">
              Couldn't fetch your full stats. You can still post a listing.
            </p>
          )}

          {/* Agent picker */}
          <div>
            <Caption>Preferred agents (select up to 5)</Caption>
            {popularAgents.length > 0 && (
              <p className="text-[11px] text-white/30 mb-2">
                Sorted by most played · select up to 5
              </p>
            )}
            <div className="flex flex-wrap gap-2 mb-3">
              {(() => {
                // Sort: played agents first (by games_played desc), then unplayed alphabetically
                const played = popularAgents.slice().sort((a, b) => b.gamesPlayed - a.gamesPlayed);
                const playedIds = new Set(played.map((a) => a.agentId));
                const unplayed = [...VALORANT_AGENTS.entries()]
                  .filter(([id]) => !playedIds.has(id))
                  .sort(([, a], [, b]) => a.displayName.localeCompare(b.displayName));
                const sorted: Array<{ agentId: string; gamesPlayed: number; rank: number | null }> = [
                  ...played.map((a, i) => ({ agentId: a.agentId, gamesPlayed: a.gamesPlayed, rank: i + 1 })),
                  ...unplayed.map(([id]) => ({ agentId: id, gamesPlayed: 0, rank: null })),
                ];
                return sorted.map(({ agentId, gamesPlayed, rank }) => {
                  const resolved = VALORANT_AGENTS.get(agentId);
                  if (!resolved) return null;
                  const isSelected = selectedAgents.includes(agentId);
                  const hasStats = gamesPlayed > 0;
                  const isTop3 = rank != null && rank <= 3;
                  return (
                    <button
                      key={agentId}
                      type="button"
                      disabled={!isSelected && selectedAgents.length >= 5}
                      onClick={() => toggleAgent(agentId)}
                      title={resolved.displayName}
                      className={[
                        'relative flex flex-col items-center gap-1 p-1.5 border transition-colors',
                        isSelected
                          ? 'border-rose-500/50 bg-rose-500/10'
                          : 'border-white/[0.06] hover:border-white/20 disabled:opacity-30',
                      ].join(' ')}
                    >
                      <img
                        src={resolved.iconUrl}
                        alt={resolved.displayName}
                        className="h-10 w-10 object-contain"
                      />
                      <span className="text-[9px] text-white/50 leading-none">{resolved.displayName}</span>
                      {/* Games played count badge */}
                      {hasStats && (
                        <span
                          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[8px] font-bold leading-none px-1"
                          style={{
                            backgroundColor: isTop3 ? '#f43f5e' : 'rgba(255,255,255,0.12)',
                            color: isTop3 ? '#fff' : 'rgba(255,255,255,0.7)',
                          }}
                          aria-hidden="true"
                        >
                          {gamesPlayed > 99 ? '99+' : gamesPlayed}
                        </span>
                      )}
                      {/* TOP label for top 3 */}
                      {isTop3 && !isSelected && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black uppercase tracking-wider text-rose-400 leading-none">
                          TOP
                        </span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
            {/* Selected agent breakdown */}
            {selectedAgents.length > 0 && (
              <div className="space-y-1.5">
                {selectedAgents.map((agentId) => {
                  const resolved = VALORANT_AGENTS.get(agentId);
                  const agent = popularAgents.find((a) => a.agentId === agentId);
                  if (!resolved) return null;
                  const agentWr = agent && agent.gamesPlayed > 0
                    ? Math.round((agent.wins / agent.gamesPlayed) * 100)
                    : null;
                  return (
                    <div key={agentId} className="flex items-center gap-3 text-[12px] text-white/50 pl-1">
                      <span className="text-white/70 w-20 truncate">{resolved.displayName}</span>
                      {agent ? (
                        <>
                          <span className="font-mono">{agent.gamesPlayed}g</span>
                          {agent.kdRatio != null && (
                            <span className="font-mono">{Number(agent.kdRatio).toFixed(2)} K/D</span>
                          )}
                          {agentWr != null && (
                            <span className="font-mono">{agentWr}% WR</span>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role picker */}
          {gameRoles.length > 0 && (
            <div>
              <Caption>Preferred roles</Caption>
              <div className="flex flex-wrap gap-2">
                {gameRoles.map((role) => (
                  <ChipToggle
                    key={role.roleKey}
                    active={selectedRoles.includes(role.roleKey)}
                    onClick={() => toggleRole(role.roleKey)}
                  >
                    {role.displayName}
                  </ChipToggle>
                ))}
              </div>
            </div>
          )}

          {/* Rank range */}
          <div>
            <Caption>Rank range (team ranks you're comfortable with)</Caption>
            <RankSelector
              ranks={ranks}
              minValue={minRank}
              maxValue={maxRank}
              onMinChange={setMinRank}
              onMaxChange={setMaxRank}
            />
          </div>

          {/* Region */}
          {regions.length > 0 && (
            <div>
              <Caption>Region</Caption>
              <div className="flex flex-wrap gap-2">
                {regions.map((r) => (
                  <ChipToggle
                    key={r.regionKey}
                    active={regionKey === r.regionKey}
                    onClick={() => setRegionKey(regionKey === r.regionKey ? null : r.regionKey)}
                  >
                    {r.displayName}
                  </ChipToggle>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          <div>
            <Caption>Languages</Caption>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <ChipToggle
                  key={l.code}
                  active={languages.includes(l.code)}
                  onClick={() => toggleLanguage(l.code)}
                >
                  {l.label}
                </ChipToggle>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Caption>Add a note (optional)</Caption>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                placeholder="Describe your playstyle, availability, what you're looking for..."
                rows={3}
                className="w-full bg-white/[0.03] border border-white/[0.08] text-white text-[13px] px-3 py-2.5 placeholder-white/25 focus:outline-none focus:border-white/20 resize-none"
              />
              <p className={`text-right text-[11px] mt-1 ${charsLeft <= 20 ? 'text-amber-400' : 'text-white/35'}`}>
                {description.length} / {DESC_MAX}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div>
            <Caption>Listing duration</Caption>
            <div className="flex gap-2">
              {([1, 3, 7] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setExpiresInDays(days)}
                  className={[
                    'px-4 py-2 border text-[13px] transition-colors min-h-[44px]',
                    expiresInDays === days
                      ? 'border-white/30 bg-white text-[#08080a]'
                      : 'border-white/[0.08] text-white/55 hover:border-white/20',
                  ].join(' ')}
                >
                  {days === 1 ? '1 day' : `${days} days`}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <Caption>How you'll appear</Caption>
            <div className="pointer-events-none select-none opacity-90">
              <PlayerLfgCard listing={previewListing!} gameRoles={gameRoles} />
            </div>
          </div>

          {/* Error */}
          {phase === 'error' && saveError && (
            <p className="text-[13px] text-red-400">{saveError}</p>
          )}

          {/* CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <Link
              to="/competitive/looking-for-team"
              className="text-[13px] text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void handleGoLive()}
              disabled={phase === 'saving' || phase === 'done'}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-[13px] px-6 h-10 transition-colors"
            >
              {phase === 'saving' ? (
                <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /><span>Going live…</span></>
              ) : phase === 'done' ? (
                'You\'re live!'
              ) : (
                'Go Live'
              )}
            </button>
          </div>

        </div>
      </div>
    </CompetitivePageShell>
  );
}
