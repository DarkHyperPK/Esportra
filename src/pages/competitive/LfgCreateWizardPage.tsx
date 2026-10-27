/**
 * Unified LFG creation wizard — handles LFT and LFP flows in one page.
 * Route: /competitive/lfg/create?type=lft|lfp
 */
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, CheckCircle2, Users, Swords } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogRankTiers, useCatalogGameRoles, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useCreateLfgListing, useMyGameStats } from '@/hooks/competitive/useLfg';
import { apiClient } from '@/lib/apiClient';
import { VALORANT_AGENTS, parsePopularAgents } from '@/lib/valorantAgents';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { RankSelector } from '@/components/competitive/RankSelector';
import type { CaptainTeamRow } from '@/hooks/useEligibleCaptainTeams';

const GAME = 'valorant';
const DESC_MAX = 280;

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'EN' }, { code: 'ar', label: 'AR' }, { code: 'tr', label: 'TR' },
  { code: 'es', label: 'ES' }, { code: 'fr', label: 'FR' }, { code: 'de', label: 'DE' },
  { code: 'pt', label: 'PT' }, { code: 'ru', label: 'RU' }, { code: 'ja', label: 'JA' },
  { code: 'ko', label: 'KO' },
];

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">{children}</p>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={[
        'px-3 py-1.5 border text-[12px] transition-colors min-h-[44px]',
        active ? 'border-white/30 bg-white text-[#08080a]' : 'border-white/[0.08] text-white/55 hover:border-white/20',
      ].join(' ')}>
      {children}
    </button>
  );
}

function StepDot({ n, current }: { n: number; current: number }) {
  const done = n < current;
  const active = n === current;
  return (
    <div className={[
      'h-1.5 rounded-full transition-all duration-300',
      done ? 'w-6 bg-rose-500/60' : active ? 'w-8 bg-rose-500' : 'w-4 bg-white/15',
    ].join(' ')} />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LfgCreateWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = params.get('type') === 'lfp' ? 'lfp' : params.get('type') === 'lft' ? 'lft' : null;

  const [step, setStep] = useState<1 | 2 | 3>(initialType ? 2 : 1);
  const [type, setType] = useState<'lft' | 'lfp' | null>(initialType);

  // ── LFT-specific state
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [syncTriggered, setSyncTriggered] = useState(false);

  // ── LFP-specific state
  const [teamId, setTeamId] = useState<string | null>(null);
  const [requiredRoles, setRequiredRoles] = useState<string[]>([]);

  // ── Shared state (step 3)
  const [rankOpen, setRankOpen] = useState(true); // open to all ranks
  const [minRank, setMinRank] = useState<number | undefined>(undefined);
  const [maxRank, setMaxRank] = useState<number | undefined>(undefined);
  const [regionKey, setRegionKey] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<1 | 3 | 7>(3);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Queries
  const statsQuery = useMyGameStats(GAME);
  const ranksQuery = useCatalogRankTiers(GAME);
  const rolesQuery = useCatalogGameRoles(GAME);
  const regionsQuery = useCatalogRegions(GAME);
  const createMutation = useCreateLfgListing();

  const teamsQuery = useQuery({
    queryKey: ['captain-teams-wizard', GAME, user?.id],
    queryFn: async () => {
      const all = await apiClient.get<CaptainTeamRow[]>('/api/teams/my-captain-teams?limit=50');
      return (all ?? []).filter((t) => t.team_kind === 'team' || (!t.team_kind && !t.is_solo));
    },
    enabled: !!user?.id && type === 'lfp',
    staleTime: 60_000,
  });

  const stats = statsQuery.data;
  const ranks = ranksQuery.data ?? [];
  const gameRoles = rolesQuery.data ?? [];
  const regions = regionsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  const popularAgents = parsePopularAgents(stats?.popularAgents);
  const playedMap = new Map(popularAgents.map((pa) => [pa.agentId.toLowerCase(), pa]));

  const sortedAgents = (() => {
    const played: { uuid: string; name: string; iconUrl: string; games: number }[] = [];
    const unplayed: { uuid: string; name: string; iconUrl: string; games: number }[] = [];
    VALORANT_AGENTS.forEach((a, uuid) => {
      const p = playedMap.get(uuid.toLowerCase());
      if (p) played.push({ uuid, name: a.displayName, iconUrl: a.iconUrl, games: p.gamesPlayed });
      else unplayed.push({ uuid, name: a.displayName, iconUrl: a.iconUrl, games: 0 });
    });
    played.sort((a, b) => b.games - a.games);
    unplayed.sort((a, b) => a.name.localeCompare(b.name));
    return [...played, ...unplayed];
  })();

  const rankTierForStats = stats?.competitiveTier ?? null;
  const rankIconUrl = rankTierForStats != null ? getRankIconUrl(rankTierForStats - 3) : null;

  function toggleAgent(id: string) {
    setSelectedAgents((p) => p.includes(id) ? p.filter((a) => a !== id) : p.length < 5 ? [...p, id] : p);
  }
  function toggleRole(key: string) {
    setSelectedRoles((p) => p.includes(key) ? p.filter((r) => r !== key) : p.length < 5 ? [...p, key] : p);
  }
  function toggleRequiredRole(key: string) {
    setRequiredRoles((p) => p.includes(key) ? p.filter((r) => r !== key) : p.length < 5 ? [...p, key] : p);
  }

  async function handleSync() {
    setSyncTriggered(true);
    try { await apiClient.post('/api/competitive/game-stats/sync'); } catch { /* ignore */ }
    void statsQuery.refetch();
  }

  function canProceed() {
    if (step === 1) return type !== null;
    if (step === 2 && type === 'lfp') return teamId !== null;
    return true;
  }

  async function handlePublish() {
    setPhase('saving');
    setSaveError(null);
    try {
      const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      const result = await createMutation.mutateAsync({
        gameSlug: GAME,
        intent: type === 'lft' ? 'looking_for_team' : 'looking_for_player',
        teamId: type === 'lfp' ? (teamId ?? null) : undefined,
        preferredAgents: type === 'lft' ? selectedAgents : undefined,
        preferredRoles: type === 'lft' ? selectedRoles : requiredRoles,
        minRankSortOrder: rankOpen ? null : (minRank ?? null),
        maxRankSortOrder: rankOpen ? null : (maxRank ?? null),
        regionKey: regionKey ?? undefined,
        languages,
        description: description.trim() || undefined,
        expiresAt,
      });
      await apiClient.post(`/api/competitive/lfg/${result.id}/publish`);
      setPhase('done');
    } catch {
      setPhase('error');
      setSaveError('Could not publish. Try again.');
    }
  }

  // ── Render: Done ─────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <CompetitivePageShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
          <CheckCircle2 className="h-12 w-12 text-rose-500" aria-hidden />
          <h2 className="text-[22px] font-black [font-family:var(--font-heading)] text-white">Listing published</h2>
          <p className="text-[14px] text-white/50 max-w-[340px]">
            Your listing is live. Interested players or teams will reach out through the platform.
          </p>
          <div className="flex gap-3">
            <Link to="/competitive/lfg/mine"
              className="rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-5 py-2.5 transition-colors">
              View My Listings
            </Link>
            <Link to={type === 'lft' ? '/competitive/looking-for-team' : '/competitive/looking-for-player'}
              className="rounded-md border border-white/[0.1] text-white/60 hover:text-white text-[13px] px-5 py-2.5 transition-colors">
              Browse
            </Link>
          </div>
        </div>
      </CompetitivePageShell>
    );
  }

  // ── Render: Wizard ────────────────────────────────────────────────────────────
  return (
    <CompetitivePageShell>
      <div className="max-w-[640px] mx-auto px-5 pt-8 pb-20">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : navigate(-1)}
            className="h-8 w-8 flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/35">
              {step === 1 ? 'Create listing' : step === 2 ? (type === 'lft' ? 'Your profile' : 'Team details') : 'Preferences'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <StepDot n={1} current={step} />
            <StepDot n={2} current={step} />
            <StepDot n={3} current={step} />
          </div>
        </div>

        {/* ── Step 1: Intent ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-[26px] font-black [font-family:var(--font-heading)] text-white leading-tight mb-6">
              What are you looking for?
            </h1>
            <button type="button"
              onClick={() => setType('lft')}
              className={[
                'w-full text-left p-4 rounded-md border transition-all',
                type === 'lft'
                  ? 'border-rose-500/60 bg-rose-500/[0.06]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]',
              ].join(' ')}>
              <div className="flex items-center gap-3">
                <div className={[
                  'h-9 w-9 rounded flex items-center justify-center shrink-0 transition-colors',
                  type === 'lft' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/[0.06] text-white/40',
                ].join(' ')}>
                  <Swords className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">I'm looking for a team</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Show your stats. Let teams find you.</p>
                </div>
                {type === 'lft' && <CheckCircle2 className="h-4 w-4 text-rose-500 ml-auto shrink-0" aria-hidden />}
              </div>
            </button>

            <button type="button"
              onClick={() => setType('lfp')}
              className={[
                'w-full text-left p-4 rounded-md border transition-all',
                type === 'lfp'
                  ? 'border-rose-500/60 bg-rose-500/[0.06]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]',
              ].join(' ')}>
              <div className="flex items-center gap-3">
                <div className={[
                  'h-9 w-9 rounded flex items-center justify-center shrink-0 transition-colors',
                  type === 'lfp' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/[0.06] text-white/40',
                ].join(' ')}>
                  <Users className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white">My team is looking for players</p>
                  <p className="text-[12px] text-white/40 mt-0.5">Post a recruitment listing for your team.</p>
                </div>
                {type === 'lfp' && <CheckCircle2 className="h-4 w-4 text-rose-500 ml-auto shrink-0" aria-hidden />}
              </div>
            </button>
          </div>
        )}

        {/* ── Step 2: Profile ────────────────────────────────────────────────── */}
        {step === 2 && type === 'lft' && (
          <div className="space-y-6">
            {/* Stats banner */}
            {statsQuery.isLoading ? (
              <div className="h-20 rounded-md bg-white/[0.025] border border-white/[0.06] flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white/30" aria-hidden />
              </div>
            ) : !stats?.riotLinked ? (
              <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[13px] text-white/50 mb-3">Link your Riot account to auto-fill your stats.</p>
                <Link to="/settings/connections"
                  className="text-[12px] text-rose-400 hover:text-rose-300 transition-colors">
                  Connect Riot account →
                </Link>
              </div>
            ) : (
              <div className="rounded-md border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {rankIconUrl && (
                      <img src={rankIconUrl} alt={stats.competitiveTierName ?? 'Rank'}
                        className="h-10 w-10 object-contain" />
                    )}
                    <div>
                      <p className="text-[14px] font-bold text-white">{stats.competitiveTierName ?? 'Unranked'}</p>
                      <div className="flex items-center gap-2.5 text-[11px] text-white/40 mt-0.5">
                        {stats.winRate != null && (
                          <span className="text-rose-400 font-semibold">{Math.round(Number(stats.winRate))}% WR</span>
                        )}
                        {stats.kdRatio != null && <span>{stats.kdRatio} K/D</span>}
                        {stats.matchesAnalyzed != null && stats.matchesAnalyzed > 0 && (
                          <span>{stats.winCount ?? 0}W–{stats.lossCount ?? 0}L</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => void handleSync()} disabled={syncTriggered}
                    className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/70 transition-colors disabled:opacity-40">
                    <RefreshCw className={['h-3 w-3', syncTriggered ? 'animate-spin' : ''].join(' ')} aria-hidden />
                    Sync
                  </button>
                </div>
              </div>
            )}

            {/* Agent picker */}
            <div>
              <Caption>Preferred agents — select up to 5 · sorted by most played</Caption>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
                {sortedAgents.map(({ uuid, name, iconUrl, games }, i) => {
                  const selected = selectedAgents.includes(uuid);
                  const isTop3 = games > 0 && i < 3;
                  return (
                    <button key={uuid} type="button" onClick={() => toggleAgent(uuid)}
                      className={[
                        'relative flex flex-col items-center gap-1 py-2 px-1 rounded border text-center transition-all',
                        selected
                          ? 'border-rose-500/60 bg-rose-500/[0.08]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.18]',
                      ].join(' ')}>
                      <img src={iconUrl} alt={name}
                        className={['h-8 w-8 object-contain rounded', !selected ? 'opacity-60' : ''].join(' ')} />
                      <span className="text-[8px] text-white/50 leading-none truncate w-full text-center px-0.5">{name}</span>
                      {games > 0 && (
                        <span className={[
                          'text-[7px] px-1 py-0.5 rounded-sm font-mono font-semibold',
                          isTop3 ? 'bg-rose-500/20 text-rose-400' : 'bg-white/[0.06] text-white/35',
                        ].join(' ')}>
                          {games > 99 ? '99+' : games}g
                        </span>
                      )}
                      {selected && (
                        <div className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role picker */}
            {gameRoles.length > 0 && (
              <div>
                <Caption>Your roles (optional)</Caption>
                <div className="flex flex-wrap gap-2">
                  {gameRoles.map((r) => (
                    <Chip key={r.roleKey} active={selectedRoles.includes(r.roleKey)} onClick={() => toggleRole(r.roleKey)}>
                      {r.iconUrl && <img src={r.iconUrl} alt="" aria-hidden className="inline h-3.5 w-3.5 mr-1.5 opacity-70" />}
                      {r.displayName ?? r.roleKey}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && type === 'lfp' && (
          <div className="space-y-6">
            {/* Team selector */}
            <div>
              <Caption>Select your team</Caption>
              {teamsQuery.isLoading ? (
                <div className="h-16 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white/30" aria-hidden />
                </div>
              ) : teams.length === 0 ? (
                <p className="text-[13px] text-white/40">
                  No teams found.{' '}
                  <Link to="/player/teams/create" className="text-rose-400 hover:text-rose-300">Create a team</Link> first.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {teams.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTeamId(t.id)}
                      className={[
                        'flex items-center gap-3 p-3 rounded-md border text-left transition-all',
                        teamId === t.id
                          ? 'border-rose-500/60 bg-rose-500/[0.06]'
                          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]',
                      ].join(' ')}>
                        <div className="h-8 w-8 rounded bg-white/[0.08] flex items-center justify-center text-white/40 text-[10px] font-mono shrink-0">
                        {(t.tag ?? t.name).slice(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-white">{t.name}</p>
                        <p className="text-[11px] text-white/35">{t.tag}</p>
                      </div>
                      {teamId === t.id && <CheckCircle2 className="h-4 w-4 text-rose-500 ml-auto shrink-0" aria-hidden />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Required roles */}
            {gameRoles.length > 0 && (
              <div>
                <Caption>Roles you're looking for (optional)</Caption>
                <div className="flex flex-wrap gap-2">
                  {gameRoles.map((r) => (
                    <Chip key={r.roleKey} active={requiredRoles.includes(r.roleKey)} onClick={() => toggleRequiredRole(r.roleKey)}>
                      {r.iconUrl && <img src={r.iconUrl} alt="" aria-hidden className="inline h-3.5 w-3.5 mr-1.5 opacity-70" />}
                      {r.displayName ?? r.roleKey}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Preferences ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Rank range */}
            <div>
              <Caption>Rank requirement</Caption>
              <label className="flex items-center gap-2.5 mb-3 cursor-pointer">
                <input type="checkbox" checked={rankOpen} onChange={(e) => setRankOpen(e.target.checked)}
                  className="accent-rose-500 h-4 w-4 rounded" />
                <span className="text-[13px] text-white/60">Open to all ranks</span>
              </label>
              {!rankOpen && (
                <RankSelector ranks={ranks} minValue={minRank} maxValue={maxRank}
                  onMinChange={setMinRank} onMaxChange={setMaxRank} />
              )}
            </div>

            {/* Region */}
            {regions.length > 0 && (
              <div>
                <Caption>Region (optional)</Caption>
                <div className="flex flex-wrap gap-2">
                  <Chip active={regionKey === null} onClick={() => setRegionKey(null)}>Any</Chip>
                  {regions.map((r) => (
                    <Chip key={r.regionKey} active={regionKey === r.regionKey} onClick={() => setRegionKey(r.regionKey)}>
                      {r.displayName ?? r.regionKey}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            <div>
              <Caption>Languages (optional)</Caption>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <Chip key={l.code} active={languages.includes(l.code)}
                    onClick={() => setLanguages((p) => p.includes(l.code) ? p.filter((x) => x !== l.code) : [...p, l.code])}>
                    {l.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <Caption>About you / your team</Caption>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                placeholder="Describe your playstyle, schedule, or what you're looking for…"
                rows={3}
                className="w-full rounded-md border border-white/[0.08] bg-black/30 px-3 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
              />
              <p className="text-right text-[10px] text-white/25 mt-1">{description.length}/{DESC_MAX}</p>
            </div>

            {/* Duration */}
            <div>
              <Caption>Listing duration</Caption>
              <div className="flex gap-2">
                {([1, 3, 7] as const).map((d) => (
                  <Chip key={d} active={expiresInDays === d} onClick={() => setExpiresInDays(d)}>
                    {d === 1 ? '24h' : d === 3 ? '3 days' : '7 days'}
                  </Chip>
                ))}
              </div>
            </div>

            {saveError && <p className="text-[12px] text-red-400">{saveError}</p>}
          </div>
        )}

        {/* ── Footer nav ────────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-white/[0.06]"
          style={{ backgroundColor: '#08080a' }}>
          <span className="text-[11px] font-mono text-white/25">Step {step} of 3</span>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="h-9 px-4 rounded-md border border-white/[0.1] text-white/60 hover:text-white text-[13px] transition-colors">
                Back
              </button>
            )}
            {step < 3 ? (
              <button type="button"
                onClick={() => { if (step === 1 && type) setStep(2); else if (step === 2) setStep(3); }}
                disabled={!canProceed()}
                className="h-9 px-5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                Next
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : (
              <button type="button" onClick={() => void handlePublish()}
                disabled={phase === 'saving'}
                className="h-9 px-5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] transition-colors flex items-center gap-2 disabled:opacity-50">
                {phase === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Publish Listing
              </button>
            )}
          </div>
        </div>

      </div>
    </CompetitivePageShell>
  );
}
