/**
 * LFP listing creation — team seeking players.
 * Team-centric: pick your team, describe what you need.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Loader2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogRankTiers, useCatalogGameRoles, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useCreateLfgListing, useTeamDetailedMembers } from '@/hooks/competitive/useLfg';
import { apiClient } from '@/lib/apiClient';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { RankSelector } from '@/components/competitive/RankSelector';
import type { CaptainTeamRow } from '@/hooks/useEligibleCaptainTeams';

const GAME = 'valorant';
const DESC_MAX = 280;

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">
      {children}
    </p>
  );
}

function ChipToggle({
  active, onClick, children,
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

export default function LookingForPlayerCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const ranksQuery = useCatalogRankTiers(GAME);
  const rolesQuery = useCatalogGameRoles(GAME);
  const regionsQuery = useCatalogRegions(GAME);

  const teamsQuery = useQuery({
    queryKey: ['captain-teams', GAME, user?.id],
    queryFn: async () => {
      const all = await apiClient.get<CaptainTeamRow[]>(`/api/teams/my-captain-teams?game=${GAME}&limit=50`);
      return (all ?? []).filter((t) =>
        (t.team_kind === 'team' || (!t.team_kind && !t.is_solo)),
      );
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const ranks = ranksQuery.data ?? [];
  const gameRoles = rolesQuery.data ?? [];
  const regions = regionsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  const [teamId, setTeamId] = useState<string | null>(null);
  const [minRank, setMinRank] = useState<number | null>(null);
  const [maxRank, setMaxRank] = useState<number | null>(null);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [regionKey, setRegionKey] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<1 | 3 | 7>(7);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  // Auto-select first team
  if (!teamId && teams.length > 0) {
    setTeamId(teams[0].id);
  }

  const createMutation = useCreateLfgListing();
  const membersQuery = useTeamDetailedMembers(teamId, !!teamId);
  const members = membersQuery.data ?? [];
  const charsLeft = DESC_MAX - description.length;

  function toggleRole(roleKey: string) {
    setPreferredRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey],
    );
  }

  async function handlePost() {
    if (!teamId) return;
    setPhase('saving');
    try {
      const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      const result = await createMutation.mutateAsync({
        gameSlug: GAME,
        intent: 'looking_for_player',
        teamId,
        minRankSortOrder: minRank ?? undefined,
        maxRankSortOrder: maxRank ?? undefined,
        regionKey: regionKey ?? undefined,
        preferredRoles,
        preferredAgents: [],
        languages: [],
        description: description || undefined,
        expiresAt,
      });
      await apiClient.post(`/api/competitive/lfg/${result.id}/publish`);
      setPhase('done');
      setTimeout(() => navigate('/competitive/looking-for-player'), 1200);
    } catch {
      setPhase('error');
    }
  }

  const isLoadingData = teamsQuery.isLoading || ranksQuery.isLoading;

  return (
    <CompetitivePageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        {/* Back nav */}
        <Link
          to="/competitive/looking-for-player"
          className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Find Players
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
        <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight mb-2">
          Post a team listing
        </h1>
        <p className="text-[14px] text-white/50 mb-8">
          Tell players what your team needs.
        </p>

        {isLoadingData ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 rounded bg-white/[0.06]" style={{ width: `${60 + i * 12}%` }} />
            ))}
          </div>
        ) : teams.length === 0 ? (
          /* No captain teams */
          <div className="border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col items-center gap-4 text-center">
            <Users className="h-10 w-10 text-white/20" />
            <div>
              <p className="text-[16px] font-semibold text-white mb-1">No teams found</p>
              <p className="text-[14px] text-white/50">
                You need to be the captain of a Valorant team to post a team listing.
              </p>
            </div>
            <Link
              to="/teams/create"
              className="mt-2 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-6 py-2.5 transition-colors"
            >
              Create a team
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Team picker */}
            <div>
              <Caption>Your team</Caption>
              {teams.length === 1 ? (
                <div className="flex items-center gap-3 px-3 py-2.5 border border-white/[0.08] bg-white/[0.03] w-full text-left">
                  <span className="text-[14px] text-white font-medium">{teams[0].name}</span>
                  {teams[0].tag && <span className="text-[12px] text-white/40 font-mono">{teams[0].tag}</span>}
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={teamId ?? ''}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] text-white text-[13px] px-3 py-2.5 pr-8 focus:outline-none focus:border-white/20"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} style={{ background: '#111' }}>
                        {t.name}{t.tag ? ` [${t.tag}]` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Team roster stats */}
            {teamId && members.length > 0 && (
              <div>
                <Caption>Current roster</Caption>
                <div className="border border-white/[0.06] divide-y divide-white/[0.04]">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13px] text-white/80 truncate">{m.username}</span>
                        {m.role && (
                          <span className="text-[10px] font-mono text-white/30 border border-white/[0.06] px-1.5 py-0.5 uppercase">
                            {m.role}
                          </span>
                        )}
                      </div>
                      {m.riotGameName ? (
                        <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-white/40">
                          {m.kd != null && <span>{m.kd.toFixed(2)} K/D</span>}
                          {m.winRate != null && <span>{Math.round(m.winRate * 100)}% WR</span>}
                          {m.tournamentCount > 0 && <span>{m.tournamentCount}T</span>}
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/25">No Riot account</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rank range */}
            <div>
              <Caption>Rank range you're looking for (optional)</Caption>
              <RankSelector
                ranks={ranks}
                minValue={minRank ?? undefined}
                maxValue={maxRank ?? undefined}
                onMinChange={(v) => setMinRank(v ?? null)}
                onMaxChange={(v) => setMaxRank(v ?? null)}
                stacked
              />
            </div>

            {/* Roles needed */}
            {gameRoles.length > 0 && (
              <div>
                <Caption>Roles needed (optional)</Caption>
                <div className="flex flex-wrap gap-2">
                  {gameRoles.map((r) => (
                    <ChipToggle
                      key={r.roleKey}
                      active={preferredRoles.includes(r.roleKey)}
                      onClick={() => toggleRole(r.roleKey)}
                    >
                      <span className="flex items-center gap-1.5">
                        {r.iconUrl && <img src={r.iconUrl} alt={r.displayName} width={14} height={14} />}
                        {r.displayName}
                      </span>
                    </ChipToggle>
                  ))}
                </div>
              </div>
            )}

            {/* Region */}
            {regions.length > 0 && (
              <div>
                <Caption>Region (optional)</Caption>
                <div className="flex flex-wrap gap-2">
                  {regions.map((rg) => (
                    <ChipToggle
                      key={rg.regionKey}
                      active={regionKey === rg.regionKey}
                      onClick={() => setRegionKey((prev) => (prev === rg.regionKey ? null : rg.regionKey))}
                    >
                      {rg.displayName}
                    </ChipToggle>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <Caption>What you're looking for (optional)</Caption>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                  placeholder="Describe your team's playstyle, schedule, what you need from applicants..."
                  rows={4}
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

            {/* Error */}
            {phase === 'error' && (
              <p className="text-[13px] text-red-400">Something went wrong. Check your connection and try again.</p>
            )}

            {/* CTA */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <Link
                to="/competitive/looking-for-player"
                className="text-[13px] text-white/40 hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={() => void handlePost()}
                disabled={!teamId || phase === 'saving' || phase === 'done'}
                className="flex items-center gap-2 rounded-md bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-[13px] px-6 h-10 transition-colors"
              >
                {phase === 'saving' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /><span>Posting...</span></>
                ) : phase === 'done' ? (
                  'Posted!'
                ) : (
                  'Post Listing'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </CompetitivePageShell>
  );
}
