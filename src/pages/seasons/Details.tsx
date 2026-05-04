import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Footer from '@/components/Footer';
import SeasonQualificationsPanel from '@/components/season/SeasonQualificationsPanel';
import SeasonStandingsTable from '@/components/season/SeasonStandingsTable';
import SeasonTreePreview from '@/components/season/SeasonTreePreview';
import { getPhaseMetaForType } from '@/components/season/builder/seasonBuilderUtils';
import { Button } from '@/components/ui/button';
import {
  useSeason,
  useSeasonQualifications,
  useSeasonStandings,
  useRespondSeasonQualification,
} from '@/hooks/useSeason';
import { useToast } from '@/hooks/use-toast';
import { useRawgGame } from '@/hooks/useRawgGame';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { SeasonNode, SeasonNodeStatus, SeasonStatus } from '@/types/season';
import {
  Activity,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitBranch,
  Layers3,
  MapPin,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

// --- Types -------------------------------------------------------------------

type TabId = 'overview' | 'circuit' | 'standings' | 'qualifications';

// --- Constants ----------------------------------------------------------------

const TABS: Array<{ id: TabId; label: string; Icon: LucideIcon }> = [
  { id: 'overview', label: 'Overview', Icon: Layers3 },
  { id: 'circuit', label: 'Circuit', Icon: GitBranch },
  { id: 'standings', label: 'Standings', Icon: TrendingUp },
  { id: 'qualifications', label: 'Qualifications', Icon: Award },
];

const SEASON_STATUS_CFG: Record<SeasonStatus, { label: string; cls: string; dot: string }> = {
  draft: {
    label: 'Draft',
    cls: 'border-zinc-600/40 bg-zinc-500/10 text-zinc-400',
    dot: 'bg-zinc-500',
  },
  published: {
    label: 'Published',
    cls: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    dot: 'bg-blue-400',
  },
  active: {
    label: 'Live',
    cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  completed: {
    label: 'Completed',
    cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  archived: {
    label: 'Archived',
    cls: 'border-zinc-600/40 bg-zinc-500/10 text-zinc-500',
    dot: 'bg-zinc-600',
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'border-red-500/30 bg-red-500/10 text-red-300',
    dot: 'bg-red-400',
  },
};

const NODE_STATUS_CLS: Record<SeasonNodeStatus, string> = {
  draft: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  scheduled: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  live: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  completed: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  archived: 'bg-zinc-500/10 text-zinc-500 border-zinc-600/20',
};

const TAB_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18 },
};

// --- Helpers -----------------------------------------------------------------

const formatDate = (date: string | null | undefined): string => {
  if (!date) return 'TBA';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date;
  }
};

const formatTournamentFormat = (format: string | null): string | null => {
  if (!format) return null;
  return format
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// --- Sub-components ----------------------------------------------------------

const HeroSkeleton = () => (
  <div className="relative overflow-hidden bg-[#0a0a0c]" style={{ minHeight: '420px' }}>
    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-900/60 via-zinc-900/30 to-transparent" />
    <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-6 lg:px-8">
      <div className="mb-5 h-3 w-24 animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mb-3 h-14 max-w-lg animate-pulse rounded-3xl bg-white/[0.06]" />
      <div className="mb-8 h-4 w-80 animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="flex flex-wrap gap-2">
        {[88, 100, 120, 144].map((w) => (
          <div key={w} className="h-8 animate-pulse rounded-2xl bg-white/[0.04]" style={{ width: w }} />
        ))}
      </div>
    </div>
  </div>
);

const ContentSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-24 rounded-3xl border border-white/[0.04] bg-white/[0.02]" />
    ))}
  </div>
);

const NodeCard = ({ node }: { node: SeasonNode }) => {
  const meta = node.nodeType !== 'root' ? getPhaseMetaForType(node.nodeType) : null;
  const statusCls = NODE_STATUS_CLS[node.status] ?? NODE_STATUS_CLS.draft;
  const location = [node.city, node.region, node.country].filter(Boolean).join(', ');
  const format = formatTournamentFormat(node.tournamentFormat);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:shadow-xl hover:shadow-black/40">
      {/* Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {meta && (
            <span
              className={cn(
                'inline-flex items-center rounded-xl border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                meta.accentBg,
                meta.accent,
                meta.accentBorder,
              )}
            >
              {node.nodeType}
            </span>
          )}
          <span
            className={cn(
              'inline-flex items-center rounded-xl border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
              statusCls,
            )}
          >
            {node.status}
          </span>
        </div>
        {node.status === 'live' && (
          <span className="mt-0.5 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
        )}
      </div>

      {/* Name + location */}
      <div>
        <h3 className="font-heading font-semibold leading-snug text-white">{node.name}</h3>
        {location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {location}
          </p>
        )}
      </div>

      {/* Detail pills */}
      <div className="flex flex-wrap gap-1.5 text-xs text-zinc-400">
        {format && (
          <span className="rounded-lg bg-white/[0.04] px-2 py-1 font-medium">{format}</span>
        )}
        {node.maxTeams && (
          <span className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1">
            <Users className="h-3 w-3 text-zinc-500" aria-hidden="true" />
            {node.maxTeams} max
          </span>
        )}
        {node.bestOf && (
          <span className="rounded-lg bg-white/[0.04] px-2 py-1">BO{node.bestOf}</span>
        )}
        {node.startsAt && (
          <span className="flex items-center gap-1 rounded-lg bg-white/[0.04] px-2 py-1">
            <Calendar className="h-3 w-3 text-zinc-500" aria-hidden="true" />
            {formatDate(node.startsAt)}
          </span>
        )}
      </div>

      {/* Live ribbon */}
      {node.status === 'live' && (
        <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          In progress
        </div>
      )}
    </div>
  );
};

// --- Main page ----------------------------------------------------------------

const SeasonsDetails = () => {
  const { id: seasonId } = useParams<{ id: string }>();
  const { toast } = useToast();

  // All hooks before any early returns (React rules)
  const { data, isLoading, error, refetch } = useSeason(seasonId);
  const standingsQuery = useSeasonStandings(seasonId);
  const qualificationsQuery = useSeasonQualifications(seasonId);
  const respondQualification = useRespondSeasonQualification(seasonId ?? '');

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const [showFullStandings, setShowFullStandings] = useState(false);

  const myTeamsQuery = useQuery({
    queryKey: ['season', seasonId, 'my-teams'],
    queryFn: () => apiClient.get<Array<{ id: string }>>('/api/teams/me'),
    enabled: !!seasonId,
    retry: false,
  });

  // Game art hook must be called before early returns
  const gameData = useRawgGame(data?.season.game ?? '', {
    enabled: !!(data?.season.game),
    skipRawg: false,
  });

  const myEntityIds = useMemo(
    () => new Set((myTeamsQuery.data ?? []).map((t) => t.id)),
    [myTeamsQuery.data],
  );
  const myQualifications = useMemo(
    () =>
      (qualificationsQuery.data ?? []).filter(
        (record) => record.entityId && myEntityIds.has(record.entityId),
      ),
    [myEntityIds, qualificationsQuery.data],
  );
  const nonRootNodes = useMemo(
    () => (data?.nodes ?? []).filter((n) => n.nodeType !== 'root'),
    [data?.nodes],
  );

  const handleRespond = async (
    recordId: string,
    status: 'accepted' | 'declined',
    notes?: string,
  ) => {
    if (!seasonId) return;
    setBusyRecordId(recordId);
    try {
      await respondQualification.mutateAsync({ recordId, status, notes });
      toast({
        title: status === 'accepted' ? 'Qualification accepted' : 'Qualification declined',
        description: 'Your qualification response has been saved.',
      });
    } catch (responseError) {
      toast({
        title: 'Qualification response failed',
        description:
          responseError instanceof Error ? responseError.message : 'Could not update your response.',
        variant: 'destructive',
      });
    } finally {
      setBusyRecordId(null);
    }
  };

  // Early exits
  if (!seasonId) {
    return <div className="min-h-screen bg-[#050505]" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <HeroSkeleton />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap gap-2">
            {TABS.map(({ id }) => (
              <div key={id} className="h-9 w-28 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
          <ContentSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.05] p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <Activity className="h-6 w-6 text-red-400" aria-hidden="true" />
            </div>
            <h2 className="font-heading text-xl font-bold text-white">Season unavailable</h2>
            <p className="mt-2 text-sm text-red-200/60">
              {error instanceof Error ? error.message : 'This season could not be loaded.'}
            </p>
            <Button
              onClick={() => void refetch()}
              className="mt-6 bg-white/[0.08] text-white hover:bg-white/[0.14]"
            >
              Try again
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Derived
  const statusCfg = SEASON_STATUS_CFG[data.season.status] ?? SEASON_STATUS_CFG.draft;
  const heroBanner = data.season.bannerUrl ?? gameData.gameBanner;
  const standings = standingsQuery.data ?? [];
  const displayedStandings = showFullStandings ? standings : standings.slice(0, 10);
  const gameArt = gameData.cover ?? gameData.gameLogo;

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ minHeight: '420px' }} aria-label="Season hero">
        {heroBanner ? (
          <img
            src={heroBanner}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm brightness-50 saturate-150"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/25 via-zinc-900/80 to-[#050505]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-[#050505]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/85 via-[#050505]/30 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-400">Season</span>
                {data.season.game && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-zinc-700" aria-hidden="true" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {data.season.game}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-heading text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                {data.season.name}
              </h1>

              {data.season.description && (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                  {data.season.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2" role="list" aria-label="Season statistics">
                <span
                  role="listitem"
                  className={cn('inline-flex items-center gap-1.5 rounded-2xl border px-3.5 py-1.5 text-xs font-semibold', statusCfg.cls)}
                >
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot, data.season.status === 'active' && 'animate-pulse')}
                    aria-hidden="true"
                  />
                  {statusCfg.label}
                </span>

                <span
                  role="listitem"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-300"
                >
                  <Users className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                  {data.season.participantMode === 'team' ? 'Teams' : 'Solo'}
                </span>

                <span
                  role="listitem"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-300"
                >
                  <Trophy className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                  {nonRootNodes.length} tournament{nonRootNodes.length !== 1 ? 's' : ''}
                </span>

                {(data.season.startDate ?? data.season.endDate) && (
                  <span
                    role="listitem"
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-zinc-300"
                  >
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
                    {formatDate(data.season.startDate)} – {formatDate(data.season.endDate)}
                  </span>
                )}
              </div>
            </div>

            {data.permissions.canManage && (
              <div className="flex-shrink-0">
                <Button
                  asChild
                  variant="outline"
                  className="border-rose-500/40 bg-rose-500/[0.06] text-rose-300 transition-all duration-200 hover:border-rose-400/60 hover:bg-rose-500/15 hover:text-white"
                >
                  <Link to={`/organizer/seasons/${seasonId}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Manage Season
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TAB BAR */}
      <div
        className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#050505]/95 backdrop-blur-xl"
        role="navigation"
        aria-label="Season tabs"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="flex gap-1 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
          >
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`tab-panel-${id}`}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500',
                  activeTab === id
                    ? 'border-rose-500/30 bg-rose-500/10 text-white'
                    : 'border-white/[0.06] bg-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div key="overview" id="tab-panel-overview" role="tabpanel" aria-label="Season overview" {...TAB_MOTION}>
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

                {/* Left — game identity */}
                <div className="space-y-6">
                  <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                    <div className="flex gap-4">
                      {gameArt ? (
                        <img
                          src={gameArt}
                          alt={data.season.game}
                          className="h-28 w-20 flex-shrink-0 rounded-2xl border border-white/[0.08] object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                          <Layers3 className="h-7 w-7 text-zinc-700" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Game</p>
                        <h2 className="font-heading text-xl font-bold text-white">{data.season.game || '—'}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                          {data.season.description || 'No public description is available for this season.'}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {(
                        [
                          ['Status', statusCfg.label],
                          ['Mode', data.season.participantMode === 'team' ? 'Teams' : 'Solo'],
                          ['Tournaments', String(nonRootNodes.length)],
                          ['Start date', formatDate(data.season.startDate)],
                          ['End date', formatDate(data.season.endDate)],
                          ...(data.season.ownerUsername
                            ? [['Organizer', data.season.ownerFullName ?? data.season.ownerUsername ?? '—']]
                            : []),
                        ] as [string, string][]
                      ).map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/[0.04] bg-white/[0.02] px-3.5 py-3">
                          <dt className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{label}</dt>
                          <dd className="mt-1 truncate text-sm font-semibold text-white">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                {/* Right — stats + standings snapshot */}
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                    <h3 className="font-heading mb-4 flex items-center gap-2 font-semibold text-white">
                      <TrendingUp className="h-4 w-4 text-rose-400" aria-hidden="true" />
                      Season stats
                    </h3>
                    <div className="space-y-2.5">
                      {(
                        [
                          ['Tournaments', nonRootNodes.length],
                          ['Qualifications issued', qualificationsQuery.data?.length ?? '—'],
                          ['Standings entries', standings.length || '—'],
                        ] as [string, string | number][]
                      ).map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                          <span className="text-sm text-zinc-400">{label}</span>
                          <span className="font-semibold text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {standings.length > 0 && (
                    <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                      <h3 className="font-heading mb-4 flex items-center gap-2 font-semibold text-white">
                        <Trophy className="h-4 w-4 text-amber-400" aria-hidden="true" />
                        Top standings
                      </h3>
                      <SeasonStandingsTable standings={standings.slice(0, 5)} />
                    </div>
                  )}
                </div>
              </div>

              {/* My qualification status */}
              <div className="mt-6 rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <h3 className="font-heading mb-4 flex items-center gap-2 font-semibold text-white">
                  <Award className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  My Qualification Status
                </h3>
                {myQualifications.length > 0 ? (
                  <SeasonQualificationsPanel
                    qualifications={myQualifications}
                    canRespond
                    pendingRecordId={busyRecordId}
                    onRespond={handleRespond}
                  />
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.02] px-6 py-5 text-center text-sm text-zinc-500">
                    Sign in with the team account registered in this season to see your qualification response controls.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* CIRCUIT */}
          {activeTab === 'circuit' && (
            <motion.div key="circuit" id="tab-panel-circuit" role="tabpanel" aria-label="Season circuit" {...TAB_MOTION}>
              <div className="mb-6 rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="mb-1 flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-rose-400" aria-hidden="true" />
                  <h2 className="font-heading text-xl font-bold text-white">Season Circuit</h2>
                </div>
                <p className="mb-6 text-sm text-zinc-500">Tournament flow and structure for this season</p>
                <SeasonTreePreview tree={data.tree} />
              </div>

              {nonRootNodes.length > 0 ? (
                <>
                  <h3 className="font-heading mb-4 text-lg font-semibold text-white">
                    Tournaments ({nonRootNodes.length})
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {nonRootNodes.map((node) => (
                      <NodeCard key={node.id} node={node} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-4 text-center text-sm text-zinc-500">
                  No tournaments have been configured in this season circuit yet.
                </p>
              )}
            </motion.div>
          )}

          {/* STANDINGS */}
          {activeTab === 'standings' && (
            <motion.div key="standings" id="tab-panel-standings" role="tabpanel" aria-label="Season standings" {...TAB_MOTION}>
              <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="h-5 w-5 text-amber-400" aria-hidden="true" />
                    <h2 className="font-heading text-xl font-bold text-white">Standings</h2>
                    {standings.length > 0 && (
                      <span className="rounded-xl bg-white/[0.05] px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                        {standings.length}
                      </span>
                    )}
                  </div>

                  {standings.length > 10 && (
                    <button
                      type="button"
                      onClick={() => setShowFullStandings((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-rose-500"
                      aria-label={
                        showFullStandings ? 'Show top 10 standings' : `Show all ${standings.length} standings`
                      }
                    >
                      {showFullStandings ? (
                        <>
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          Top 10
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          Full table
                        </>
                      )}
                    </button>
                  )}
                </div>

                {standingsQuery.isLoading ? <ContentSkeleton /> : <SeasonStandingsTable standings={displayedStandings} />}
              </div>
            </motion.div>
          )}

          {/* QUALIFICATIONS */}
          {activeTab === 'qualifications' && (
            <motion.div key="qualifications" id="tab-panel-qualifications" role="tabpanel" aria-label="Season qualifications" {...TAB_MOTION}>
              <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
                <div className="mb-6 flex items-center gap-2.5">
                  <Award className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <h2 className="font-heading text-xl font-bold text-white">Qualifications</h2>
                  {qualificationsQuery.data && qualificationsQuery.data.length > 0 && (
                    <span className="rounded-xl bg-white/[0.05] px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                      {qualificationsQuery.data.length}
                    </span>
                  )}
                </div>

                {qualificationsQuery.isLoading ? (
                  <ContentSkeleton />
                ) : (
                  <SeasonQualificationsPanel qualifications={qualificationsQuery.data ?? []} />
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
};

export default SeasonsDetails;