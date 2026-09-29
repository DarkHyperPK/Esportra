import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import type { StandingsRow } from '@/types/standings';
import { buildColumns } from './standingsColumns';

interface StandingsTableProps {
  rows: StandingsRow[];
  columns: string[];
  isFinal: boolean;
  showPrize: boolean;
  currency: string;
}

/**
 * Dense, scannable placings. Rank and team stay pinned while the stat columns
 * scroll on narrow screens. When the event is final, the champion row carries
 * the one rose cue and the podium ranks step up in size.
 */
export function StandingsTable({ rows, columns, isFinal, showPrize, currency }: StandingsTableProps) {
  const defs = buildColumns(isFinal);
  const visible = columns.filter((c) => defs[c]);

  return (
    <div className="overflow-x-auto border border-white/[0.07]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{isFinal ? 'Final standings' : 'Current standings'}</caption>
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.02]">
            {visible.map((key) => (
              <th
                key={key}
                scope="col"
                title={defs[key].title}
                className={cn(
                  'h-10 whitespace-nowrap px-3 text-xs font-medium text-zinc-400 first:pl-5',
                  defs[key].align === 'left' ? 'text-left' : 'text-center',
                  key === 'rank' && 'sticky left-0 z-10 w-14 bg-[#101013] lg:static lg:bg-transparent',
                  key === 'team' && 'sticky left-14 z-10 bg-[#101013] lg:static lg:bg-transparent',
                )}
              >
                <abbr title={defs[key].title} className="no-underline">{defs[key].label}</abbr>
              </th>
            ))}
            {showPrize && <th scope="col" className="h-10 px-5 text-right text-xs font-medium text-zinc-400">Prize</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const champion = isFinal && row.rank === 1;
            return (
              <tr
                key={row.team_id}
                className={cn(
                  'border-b border-white/[0.05] transition-colors last:border-b-0 hover:bg-white/[0.02]',
                  champion && 'bg-rose-500/[0.04] shadow-[inset_2px_0_0_rgb(244,63,94)]',
                )}
              >
                {visible.map((key) => (
                  <td
                    key={key}
                    className={cn(
                      'h-12 whitespace-nowrap px-3 tabular-nums text-zinc-300 first:pl-5',
                      defs[key].align === 'left' ? 'text-left' : 'text-center font-mono text-[13px]',
                      key === 'rank' && 'sticky left-0 z-10 bg-background lg:static lg:bg-transparent',
                      key === 'team' && 'sticky left-14 z-10 max-w-[260px] bg-background lg:static lg:bg-transparent',
                    )}
                  >
                    {defs[key].render(row)}
                  </td>
                ))}
                {showPrize && (
                  <td className="h-12 whitespace-nowrap px-5 text-right font-mono text-[13px] tabular-nums">
                    {row.prize_amount > 0
                      ? <span className="text-white">{formatCurrency(row.prize_amount, currency)}</span>
                      : <span className="text-zinc-600">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
