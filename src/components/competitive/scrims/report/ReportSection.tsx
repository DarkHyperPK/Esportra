import type { ReactNode } from 'react';
import { EYEBROW_CLASS } from '@/components/ui/kit';

/** One titled block of the report, with a line saying how its figures are worked out. */
export function ReportSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <h3 className={EYEBROW_CLASS}>{title}</h3>
      {note && <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
