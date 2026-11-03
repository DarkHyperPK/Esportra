import { StatusPill } from '@/components/ui/kit';
import { UNKNOWN_MAP } from '@/services/maps/valorantMapNames';
import { gameDate } from '@/services/scrimData/format';
import { roundClock } from '@/services/scrimInsights/present';
import type { ScrimGameInsights } from '@/types/scrimInsights';

const RESULT: Record<ScrimGameInsights['result'], { label: string; tone: 'success' | 'critical' | 'neutral' }> = {
  win: { label: 'Win', tone: 'success' }, loss: { label: 'Loss', tone: 'critical' }, draw: { label: 'Draw', tone: 'neutral' },
};

function vetoLine(veto: NonNullable<ScrimGameInsights['veto']>): string {
  const who = veto.isDecider ? 'the decider' : veto.pickedBy === 'you' ? 'picked by your team' : 'picked by the opponent';
  return veto.playedOnVetoMap ? `Map veto: ${veto.expectedMap}, ${who}.` : `Map veto assigned ${veto.expectedMap} (${who}), but this game was played on a different map.`;
}

/** Map, score and the context Esportra adds to Riot's record: who the opponent was, what the veto decided. */
export function ReportHeader({ data }: { data: ScrimGameInsights }) {
  const result = RESULT[data.result];
  const queue = data.match && data.match.isCustom === false ? 'Played in a matchmade queue, not a custom game.' : null;
  return (
    <header className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-heading text-[22px] font-bold leading-tight text-white">{data.map ?? UNKNOWN_MAP}</h1>
        <span className="text-[22px] font-bold tabular-nums text-white">{data.score.mine}–{data.score.theirs}</span>
        <StatusPill label={result.label} tone={result.tone} />
      </div>
      <p className="text-[13px] text-zinc-400">
        {data.myTeam.name} vs {data.opponent.name} · Game {data.gameNumber}
        {data.match?.startedAt ? ` · ${gameDate(data.match.startedAt)}` : ''}
        {data.match?.lengthMs ? ` · ${roundClock(data.match.lengthMs)} long` : ''}
      </p>
      {data.veto && <p className="text-[13px] text-zinc-300">{vetoLine(data.veto)}</p>}
      {queue && <p className="text-[12px] text-zinc-500">{queue} Only your side and the score were checked.</p>}
    </header>
  );
}
