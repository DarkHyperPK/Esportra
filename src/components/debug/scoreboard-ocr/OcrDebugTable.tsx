import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import type { OcrField, OcrStatKey, ScoreboardOcrResult } from '@/types/scoreboardOcr';

const LOW = 0.6;
/** Display order follows the in-game scoreboard. */
const STAT_COLUMNS: Array<[OcrStatKey, string]> = [
  ['acs', 'ACS'], ['kills', 'K'], ['deaths', 'D'], ['assists', 'A'], ['econ', 'ECON'],
  ['firstBloods', 'FK'], ['plants', 'PL'], ['defuses', 'DF'], ['hsPct', 'HS%'], ['adr', 'ADR'],
];

function Cell({ field, text }: { field: OcrField<unknown> | undefined; text?: string }) {
  const value = text ?? (field?.value == null ? '—' : String(field.value));
  const low = !field || field.value == null || field.confidence < LOW;
  return (
    <td className={cn('px-2 py-1.5 align-top', low && 'bg-amber-400/[0.08] text-amber-100')} title={field ? `confidence ${field.confidence.toFixed(2)}` : 'not read'}>
      <span className="block tabular-nums">{value}</span>
      {field && <span className="block font-mono text-[10px] text-zinc-500">{field.confidence.toFixed(2)}</span>}
    </td>
  );
}

/** Every value the reader returned, with confidence. Amber = below 0.6 or missing. */
export function OcrDebugTable({ result }: { result: ScoreboardOcrResult }) {
  const columns = STAT_COLUMNS.filter(([key]) => result.columns.includes(key));
  return (
    <div className="overflow-x-auto overscroll-x-contain border border-white/[0.07]" data-lenis-prevent>
      <table className="w-full min-w-[720px] border-collapse text-left text-[13px] text-zinc-200">
        <thead className="bg-black/40">
          <tr>
            {['#', 'Side', 'Name', 'Roster match', 'Agent', ...columns.map(([, label]) => label)].map((h) => (
              <th key={h} scope="col" className={cn(EYEBROW_CLASS, 'px-2 py-2 font-semibold')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.players.map((row, i) => (
            <tr key={i} className={cn('border-t border-white/[0.06]', row.side === 'ally' ? 'bg-teal-500/[0.04]' : row.side === 'enemy' ? 'bg-fuchsia-500/[0.04]' : '')}>
              <td className="px-2 py-1.5 align-top font-mono text-zinc-500">{i + 1}</td>
              <Cell field={{ value: row.side, confidence: row.sideConfidence }} />
              <Cell field={row.name} />
              <td className="px-2 py-1.5 align-top text-zinc-400">
                {row.rosterMatch ? `${row.rosterMatch.matchedName} · ${row.rosterMatch.team} · ${row.rosterMatch.score.toFixed(2)}` : '—'}
              </td>
              <Cell field={row.agent} text={row.agent.value?.name ?? '—'} />
              {columns.map(([key]) => <Cell key={key} field={row.stats[key]} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
