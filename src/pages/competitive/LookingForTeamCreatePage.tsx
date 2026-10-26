/**
 * LFT listing creation — player seeking a team.
 * Profile IS the listing. User tweaks description + duration, then goes live.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitiveProfile } from '@/hooks/competitive/useCompetitiveProfile';
import { useCatalogGameRoles } from '@/hooks/competitive/useCatalog';
import { useCreateLfgListing } from '@/hooks/competitive/useLfg';
import { apiClient } from '@/lib/apiClient';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PlayerLfgCard } from '@/components/competitive/PlayerLfgCard';
import type { LfgListing } from '@/types/competitive';

const GAME = 'valorant';
const DESC_MAX = 280;

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">
      {children}
    </p>
  );
}

export default function LookingForTeamCreatePage() {
  const { user, profile: userProfile } = useAuth();
  const navigate = useNavigate();

  const profileQuery = useCompetitiveProfile(user?.id ?? '', GAME);
  const rolesQuery = useCatalogGameRoles(GAME);
  const profile = profileQuery.data ?? null;
  const gameRoles = rolesQuery.data ?? [];

  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<1 | 3 | 7>(3);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [descSeeded, setDescSeeded] = useState(false);

  // Seed description from bio once profile loads
  if (profile && !descSeeded) {
    setDescription(profile.notes ?? '');
    setDescSeeded(true);
  }

  const createMutation = useCreateLfgListing();

  const previewListing: LfgListing | null = profile && user
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
        regionKey: profile.regionKey,
        regionDisplayName: profile.regionDisplayName,
        preferredServers: [],
        minRankSortOrder: profile.rankSortOrder,
        maxRankSortOrder: profile.rankSortOrder,
        minRankDisplayName: profile.rankDisplayName,
        maxRankDisplayName: profile.rankDisplayName,
        minRankIconUrl: profile.rankIconUrl,
        maxRankIconUrl: null,
        preferredRoles: profile.preferredRoles ?? [],
        preferredAgents: [],
        languages: profile.languages ?? [],
        description: description || null,
        expiresAt: new Date(Date.now() + expiresInDays * 86_400_000).toISOString(),
        // deprecated compat
        mode: null, minRankSlug: null, maxRankSlug: null, regionSlug: null,
        servers: [], roles: [], publishedAt: null, closedAt: null, avatarUrl: null,
        // enrichment
        competitiveTier: null, competitiveTierName: null,
        winCount: null, lossCount: null, winRate: null, kdRatio: null,
        popularAgents: null, matchesAnalyzed: null, riotSyncedAt: null,
        riotGameName: null, riotTagLine: null,
        teamName: null, teamLogoUrl: null, teamTag: null,
        teamMemberCount: null, teamVerifiedCount: null,
      }
    : null;

  async function handleGoLive() {
    if (!profile) return;
    setPhase('saving');
    try {
      const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
      const result = await createMutation.mutateAsync({
        gameSlug: GAME,
        intent: 'looking_for_team',
        minRankSortOrder: profile.rankSortOrder ?? undefined,
        maxRankSortOrder: profile.rankSortOrder ?? undefined,
        regionKey: profile.regionKey ?? undefined,
        preferredRoles: profile.preferredRoles ?? [],
        preferredAgents: [],
        languages: profile.languages ?? [],
        description: description || undefined,
        expiresAt,
      });
      await apiClient.post(`/api/competitive/lfg/${result.id}/publish`);
      setPhase('done');
      setTimeout(() => navigate('/competitive/looking-for-team'), 1200);
    } catch {
      setPhase('error');
    }
  }

  const isLoading = profileQuery.isLoading;
  const charsLeft = DESC_MAX - description.length;

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
          Your competitive profile is your listing. Confirm the details and go live.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 rounded bg-white/[0.06]" style={{ width: `${60 + i * 12}%` }} />
            ))}
          </div>
        ) : !profile ? (
          /* No profile — gated */
          <div className="border border-white/[0.08] bg-white/[0.02] p-8 flex flex-col items-center gap-4 text-center">
            <UserRound className="h-10 w-10 text-white/20" />
            <div>
              <p className="text-[16px] font-semibold text-white mb-1">No competitive profile yet</p>
              <p className="text-[14px] text-white/50">
                Your listing is built from your profile — rank, roles, region, and playstyle.
                Set it up once and list instantly.
              </p>
            </div>
            <Link
              to="/competitive/profile/edit"
              className="mt-2 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-6 py-2.5 transition-colors"
            >
              Create competitive profile
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Preview */}
            <div>
              <Caption>How you'll appear</Caption>
              <div className="pointer-events-none select-none opacity-90">
                <PlayerLfgCard listing={previewListing!} gameRoles={gameRoles} />
              </div>
              <p className="mt-2 text-[11px] text-white/30">
                To update rank, roles, or region —{' '}
                <Link to="/competitive/profile/edit" className="underline hover:text-white/60 transition-colors">
                  edit your profile
                </Link>
              </p>
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

            {/* Error */}
            {phase === 'error' && (
              <p className="text-[13px] text-red-400">Something went wrong. Check your connection and try again.</p>
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
                className="flex items-center gap-2 rounded-md bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-[13px] px-6 h-10 transition-colors"
              >
                {phase === 'saving' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /><span>Going live...</span></>
                ) : phase === 'done' ? (
                  'You\'re live!'
                ) : (
                  'Go Live'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </CompetitivePageShell>
  );
}
