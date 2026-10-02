import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import Footer from '@/components/Footer';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS, StatusPill, type Tone } from '@/components/ui/kit';
import { BracketCanvasSkeleton } from '@/components/bracket/BracketCanvasSkeleton';
import { useTournamentBracketSource } from '@/hooks/useTournamentBracketSource';
import { isBattleRoyale } from '@/utils/gameFeatures';
import { PublicBracketView } from './brackets/PublicBracketView';

const STATUS: Record<string, { label: string; tone: Tone }> = {
  live: { label: 'Live', tone: 'accent' },
  in_progress: { label: 'Live', tone: 'accent' },
  ongoing: { label: 'Live', tone: 'accent' },
  completed: { label: 'Completed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'critical' },
};

const PageFrame = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-transparent text-white">
    <main className="mx-auto w-full max-w-[1680px] px-4 pb-12 pt-6 sm:px-6">{children}</main>
    <Footer />
  </div>
);

const TournamentBrackets = () => {
  const { slug } = useParams<{ slug: string }>();
  const source = useTournamentBracketSource(slug);
  const { tournament } = source;

  if (source.loading) {
    return (
      <PageFrame>
        <div className="mb-6 space-y-3">
          <div className="h-3 w-40 animate-pulse bg-white/[0.05]" />
          <div className="h-9 w-80 max-w-full animate-pulse bg-white/[0.06]" />
        </div>
        <div className="border border-white/[0.07] bg-background"><BracketCanvasSkeleton /></div>
      </PageFrame>
    );
  }

  if (!tournament) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-md py-24 text-center">
          <p className="font-heading text-xl font-bold">Tournament not found</p>
          <p className="mt-2 text-sm text-zinc-500">The link may be wrong, or the tournament was removed.</p>
          <CommandButton asChild variant="secondary" className="mt-6"><Link to="/tournaments">Browse tournaments</Link></CommandButton>
        </div>
      </PageFrame>
    );
  }

  const header = (
    <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <Link
          to={`/tournaments/${slug}`}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> Tournament
        </Link>
        <p className={`${EYEBROW_CLASS} mt-4`}>{[tournament.game, 'Bracket'].filter(Boolean).join(' · ')}</p>
        <h1 className="mt-1.5 truncate font-heading text-[30px] font-black leading-none tracking-tight sm:text-[40px]">{tournament.name}</h1>
      </div>
      {tournament.status && STATUS[tournament.status] ? <StatusPill {...STATUS[tournament.status]} className="self-start md:self-auto" /> : null}
    </header>
  );

  // Battle royale events are scored on a points table, not a bracket.
  if (isBattleRoyale(tournament.game ?? '')) {
    return (
      <PageFrame>
        {header}
        <div className="flex flex-col items-center border border-white/[0.07] bg-background px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center bg-white/[0.04]"><Trophy className="h-5 w-5 text-zinc-400" /></span>
          <p className="mt-4 font-heading text-lg font-bold">Points leaderboard, not a bracket</p>
          <p className="mt-1 max-w-md text-sm text-zinc-500">Battle royale standings come from points across every game. They live on the tournament page.</p>
          <CommandButton asChild variant="secondary" className="mt-6"><Link to={`/tournaments/${slug}`}>View standings</Link></CommandButton>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      {header}
      <div className="border border-white/[0.07] bg-background">
        <PublicBracketView
          versionId={source.activeVersionId}
          tournamentId={tournament.id}
          stages={source.stages}
          selectedStageId={source.selectedStageId}
          onStageSelect={source.selectStage}
          versionsMap={source.versionsMap}
          onFullscreen={() => window.open(`/tournaments/${slug}/brackets/fullscreen`, '_blank', 'noopener')}
          mode="page"
        />
      </div>
    </PageFrame>
  );
};

export default TournamentBrackets;
