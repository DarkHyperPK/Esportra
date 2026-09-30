import type { TournamentProposal } from '@/schemas/proposal';
import { CAPTION } from './docStyles';

const NONE = new Set(['', '—', '-', '–']);

/** Where the brand appears, per tier. Cells are padded with a dash if a row is short. */
export function PlacementMatrix({ doc }: { doc: TournamentProposal }) {
  if (doc.zoneRows.length === 0 || doc.tiers.length === 0) return null;
  return (
    <div className="pd-avoid overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr>
            <th scope="col" className={`${CAPTION} border-b border-[color:var(--pd-strong-line)] py-3 pr-4 font-semibold`}>Placement</th>
            {doc.tiers.map((tier) => (
              <th key={tier.name} scope="col" className={`${CAPTION} border-b border-[color:var(--pd-strong-line)] px-3 py-3 font-semibold`}>
                {tier.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.zoneRows.map((row, r) => (
            <tr key={`${row.zone}-${r}`}>
              <th scope="row" className="border-b border-[color:var(--pd-line)] py-3.5 pr-4 text-[14px] font-medium print:py-1.5 print:text-[13px] text-[color:var(--pd-ink)]">
                {row.zone}
              </th>
              {doc.tiers.map((tier, c) => {
                const cell = (row.cells[c] ?? '—').trim();
                const none = NONE.has(cell);
                return (
                  <td key={tier.name} className={`border-b border-[color:var(--pd-line)] px-3 py-3.5 text-[13px] print:py-1.5 print:text-[12px] ${none ? 'text-[color:var(--pd-hint)]' : 'text-[color:var(--pd-label)]'}`}>
                    {none ? <span aria-label="Not included">—</span> : cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
