import { BarChart3, Landmark } from 'lucide-react';
import type { Proposal } from '@/schemas/proposal';
import { Page } from './Page';
import { Panel } from './Panel';
import { Title } from './Title';
import { BODY, NUMBER } from './docStyles';

/** 02. Track record: recognition beside the numbers that have already happened. Nothing projected. */
export function RecordPage({ doc, number }: { doc: Proposal; number: string }) {
  const stats = doc.stats.filter((s) => s.value.trim()).slice(0, 3);
  const recognition = doc.recognition.filter((r) => r.trim());
  return (
    <Page anchor="about" number={number}>
      <Title doc={doc} number="02." text="Track record [& milestones]" />
      <div className="mt-12 grid gap-6 md:grid-cols-[1fr_1.15fr] print:mt-10 print:grid-cols-[1fr_1.15fr]">
        <Panel title="Recognition" icon={<Landmark className="h-7 w-7" aria-hidden />}>
          <ul className="space-y-4">
            {recognition.map((line, i) => (
              <li key={`${i}-${line}`} className={`${BODY} border-t border-[color:var(--pd-soft-line)] pt-4 first:border-t-0 first:pt-0`}>{line}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Platform so far" icon={<BarChart3 className="h-7 w-7" aria-hidden />} lit>
          <dl className="space-y-5">
            {stats.map((stat, i) => (
              <div key={`${stat.label}-${i}`} className="flex items-baseline gap-5 border-t border-[color:var(--pd-soft-line)] pt-5 first:border-t-0 first:pt-0">
                <dd className={`${NUMBER} w-28 shrink-0 text-6xl print:text-5xl`}>{stat.value}</dd>
                <dt className="text-lg font-semibold uppercase leading-tight tracking-[0.04em] text-[color:var(--pd-label)]">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </Page>
  );
}
