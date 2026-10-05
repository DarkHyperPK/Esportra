import { cn } from '@/lib/utils';
import { EYEBROW_CLASS, InlineNotice } from '@/components/ui/kit';
import { compareWithRiot } from '@/services/scoreboardOcr';
import type { RiotLookup, ScoreboardOcrResult } from '@/types/scoreboardOcr';

const LABELS = { kills: 'K', deaths: 'D', assists: 'A', acs: 'ACS', firstBloods: 'FB' } as const;

const NOT_FOUND: Record<Exclude<RiotLookup['status'], 'found'>, string> = {
  not_found: "That Riot ID's recent custom games have no game with this map and score.",
  unavailable: 'The API key cannot read Valorant match history.',
  skipped: 'The score could not be read, so there was nothing to search by.',
};

/** Screenshot read vs Riot's record of the same game, cell by cell. Differences are read errors. */
export function OcrRiotComparison({ result, riot }: { result: ScoreboardOcrResult; riot: RiotLookup | null | undefined }) {
  if (!riot) return <InlineNotice tone="neutral">Enter the Riot ID of anyone in the game, then read the screenshot again, to compare with Riot's record.</InlineNotice>;
  if (riot.status !== 'found' || !riot.match) return <InlineNotice tone="warning" title="Game not found in Riot history">{NOT_FOUND[riot.status === 'found' ? 'not_found' : riot.status]}</InlineNotice>;

  const comparison = compareWithRiot(result, riot.match);
  const keys = comparison.rows.find((r) => r.cells.length)?.cells.map((c) => c.key) ?? [];
  const percent = comparison.comparedCells ? Math.round((comparison.sameCells / comparison.comparedCells) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={EYEBROW_CLASS}>{riot.match.map} · Riot match {riot.match.matchId.slice(0, 8)}</p>
        <p className="font-mono text-xs text-zinc-300">
          Cells matching Riot: <span className={percent === 100 ? 'text-emerald-300' : 'text-amber-300'}>{comparison.sameCells}/{comparison.comparedCells}</span> ({percent}%)
        </p>
      </div>
      <div className="overflow-x-auto border border-white/[0.07]">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-white/[0.03] text-left">
            <tr>
              <th className={cn(EYEBROW_CLASS, 'px-3 py-2')}>Read</th>
              <th className={cn(EYEBROW_CLASS, 'px-3 py-2')}>Riot ID</th>
              {keys.map((key) => <th key={key} className={cn(EYEBROW_CLASS, 'px-2 py-2 text-center')}>{LABELS[key]}</th>)}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row, index) => (
              <tr key={`${row.readName}-${index}`} className="border-t border-white/[0.05]">
                <td className="px-3 py-1.5 text-white" dir="auto">{row.readName || '—'}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-zinc-400" dir="auto">{row.riotId ?? <span className="text-amber-300">no match</span>}</td>
                {keys.map((key) => {
                  const cell = row.cells.find((c) => c.key === key);
                  if (!cell) return <td key={key} className="px-2 py-1.5 text-center text-zinc-600">—</td>;
                  return (
                    <td key={key} className={cn('px-2 py-1.5 text-center tabular-nums', cell.same ? 'text-zinc-300' : 'bg-amber-400/[0.08] text-amber-200')}>
                      {cell.same ? cell.riot : `${cell.read ?? '·'} → ${cell.riot ?? '·'}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {comparison.unmatched.length > 0 && (
        <p className="text-xs text-zinc-500">In Riot's record but not matched to a row: {comparison.unmatched.join(', ')}</p>
      )}
    </div>
  );
}
