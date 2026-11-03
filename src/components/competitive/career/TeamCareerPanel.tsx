import { EYEBROW_CLASS, StatusPill, type Tone } from '@/components/ui/kit';
import { useCareerGames } from '@/hooks/competitive/useCareerGames';
import { useTeamCareer } from '@/hooks/competitive/useCareer';
import { EMPTY_RECORD_TEXT, gameDate } from '@/services/career/format';
import type { TeamAppearance } from '@/types/career';
import { ActivityBars } from './ActivityBars';
import { MapBreakdown } from './CareerBreakdown';
import { CareerGameList } from './CareerGameList';
import { CareerNotice } from './CareerNotice';
import { PanelError, PanelMessage, PanelSkeleton } from './PanelStates';
import { TeamSummaryGrid } from './TeamSummaryGrid';

const FORM_TONE: Record<'W' | 'L' | 'D', Tone> = { W: 'success', L: 'critical', D: 'neutral' };
const FORM_LABEL = { W: 'Win', L: 'Loss', D: 'Draw' } as const;

function Roster({ players }: { players: TeamAppearance[] }) {
  if (players.length === 0) return null;
  return (
    <section aria-label="Who has played" className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <h3 className={EYEBROW_CLASS}>Who has played · visible to team members</h3>
      <ul className="mt-3 divide-y divide-white/5">
        {players.map((p) => (
          <li key={p.userId} className="flex items-center justify-between gap-3 py-2 text-[13px]">
            <span className="truncate text-zinc-200">{p.username ?? 'Player'}</span>
            <span className="shrink-0 tabular-nums text-zinc-400">{p.matches} {p.matches === 1 ? 'game' : 'games'} · last {gameDate(p.lastPlayed)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Props {
  teamId: string;
  /** On a public page a signed-out visitor sees nothing here rather than a prompt. */
  quietWhenSignedOut?: boolean;
}

/** A team's competitive record from Riot-verified games. Members see everything; others only what the team makes public. */
export function TeamCareerPanel({ teamId, quietWhenSignedOut = false }: Props) {
  const { signedIn, summary, games } = useTeamCareer(teamId);
  const list = useCareerGames(games);

  if (!signedIn) return quietWhenSignedOut ? null : <PanelMessage>Sign in to see the competitive record.</PanelMessage>;
  if (summary.isLoading) return <PanelSkeleton />;
  if (summary.isError || !summary.data) return <PanelError onRetry={() => void summary.refetch()} />;

  const data = summary.data;
  if (!data.hasData) return <PanelMessage>{EMPTY_RECORD_TEXT}</PanelMessage>;
  const access = data.access === 'member'
    ? 'You are seeing every verified game, scrims included.'
    : data.includesScrims ? 'Tournament games and the scrims this team shares publicly.' : 'Tournament games only. This team keeps its scrims private.';

  return (
    <div className="space-y-5">
      <CareerNotice sample={data.sample} access={access} truncated={data.truncated} />
      {data.form.length > 0 && (
        <div className="flex items-center gap-2" aria-label={`Recent form, newest first: ${data.form.map((f) => FORM_LABEL[f]).join(', ')}`}>
          <span className={EYEBROW_CLASS}>Recent form</span>
          {data.form.map((f, i) => <StatusPill key={i} label={FORM_LABEL[f]} tone={FORM_TONE[f]} />)}
        </div>
      )}
      <TeamSummaryGrid totals={data.totals} />
      <ActivityBars activity={data.activity} />
      <div className="grid gap-3 lg:grid-cols-2">
        <MapBreakdown maps={data.maps} />
        <Roster players={data.players} />
      </div>
      <CareerGameList {...list} onLoadMore={list.loadMore} />
    </div>
  );
}
