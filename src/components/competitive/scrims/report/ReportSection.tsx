import type { ReactNode } from 'react';
import { EYEBROW_CLASS } from '@/components/ui/kit';

/** One titled block of the report, with a line saying how its figures are worked out. */
export function ReportSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-none border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS} title={note}>{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
