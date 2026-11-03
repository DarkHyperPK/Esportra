import type { ReactNode } from 'react';
import { EYEBROW_CLASS } from '@/components/ui/kit';

export interface ChartTable { columns: string[]; rows: Array<Array<string | number | null>> }

/** A titled chart with a text summary for screen readers and a hidden data table, so the figures are never only in the picture. */
export function ChartCard({ title, note, summary, table, children }: { title: string; note?: string; summary: string; table?: ChartTable; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <h3 className={EYEBROW_CLASS}>{title}</h3>
      {note && <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{note}</p>}
      <div className="mt-3" role="img" aria-label={summary}>{children}</div>
      {table && (
        <table className="sr-only">
          <caption>{title}</caption>
          <thead><tr>{table.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c ?? 'no value'}</td>)}</tr>)}</tbody>
        </table>
      )}
    </section>
  );
}
