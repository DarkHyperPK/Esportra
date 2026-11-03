import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { cn } from '@/lib/utils';
import { RESULT_LABEL, gameDate, scoreLine } from '@/services/scrimData/format';
import type { RecentMap } from '@/types/scrimData';

const TimelineTab = lazy(() => import('@/components/competitive/scrims/report/timeline/TimelineTab'));

const keyOf = (m: RecentMap) => `${m.sessionId}:${m.gameNumber}`;

/** Pick one of your recent Riot-verified maps and read it event by event. The chosen map is in the address (?map=session:n) so it can be shared. */
export default function TimelineHome({ maps, teamId }: { maps: RecentMap[]; teamId: string }) {
  const [params, setParams] = useSearchParams();
  const playable = maps.filter((m) => m.tier === 'full');
  if (playable.length === 0) return <PanelMessage>No verified Riot maps yet. A timeline needs a map whose data was fetched from Riot.</PanelMessage>;
  const chosen = playable.find((m) => keyOf(m) === params.get('map')) ?? playable[0];
  const choose = (m: RecentMap) => setParams((p) => { const next = new URLSearchParams(p); next.set('map', keyOf(m)); return next; }, { replace: true });
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Choose a map" className="flex flex-wrap gap-2">
        {playable.map((m) => (
          <button key={keyOf(m)} type="button" aria-pressed={m === chosen} onClick={() => choose(m)}
            className={cn('flex min-h-9 items-center gap-2 border px-3 text-left text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              m === chosen ? 'border-white/60 bg-white/10 text-white' : 'border-white/[0.12] text-zinc-400 hover:text-white')}>
            <span className="font-semibold">{m.map ?? 'Map'}</span>
            <span className="tabular-nums text-zinc-400">{`${RESULT_LABEL[m.result]} ${scoreLine(m.roundsWon, m.roundsLost)}`}</span>
            <span className="text-zinc-500">{`${m.opponent ?? ''} · ${gameDate(m.playedAt)}`}</span>
          </button>
        ))}
      </div>
      <Suspense fallback={<PanelSkeleton />}><TimelineTab key={keyOf(chosen)} sessionId={chosen.sessionId} gameNumber={chosen.gameNumber} teamId={teamId} /></Suspense>
    </div>
  );
}
