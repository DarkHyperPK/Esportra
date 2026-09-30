import { Check } from 'lucide-react';
import type { Proposal } from '@/schemas/proposal';
import { DocSection } from './DocSection';
import { CAPTION, NUMBER } from './docStyles';

const STAGGER = ['md:mt-0', 'md:mt-16', 'md:mt-32'];
const PRINT_STAGGER = ['print:mt-0', 'print:mt-12', 'print:mt-24'];

/** Tale of the tape: one paragraph, three numbers that have already happened, the credentials. */
export function AboutSection({ doc, number, title }: { doc: Proposal; number: string; title: string }) {
  const stats = doc.stats.filter((s) => s.value.trim()).slice(0, 3);
  const recognition = doc.recognition.filter((r) => r.trim());
  return (
    <DocSection doc={doc} number={number} anchor="about" segment="Tale of the tape" title={title} intro={doc.about}>
      <div className="pd-avoid grid grid-cols-3 gap-3 md:gap-4 print:gap-3">
        {stats.map((stat, i) => (
          <div key={`${stat.label}-${i}`} className={`pd-drop ${STAGGER[i]} ${PRINT_STAGGER[i]}`}>
            <div className="pd-cut border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-panel)] p-5 md:p-7">
              <p className={`${CAPTION} tabular-nums`}>{String(i + 1).padStart(2, '0')}</p>
              <p className={`${NUMBER} mt-10 text-6xl leading-none md:text-8xl print:mt-8 print:text-7xl`}>{stat.value}</p>
              <p className="mt-4 max-w-[16ch] text-[13px] leading-snug text-[color:var(--pd-muted)]">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
      {recognition.length > 0 && (
        <ul className="pd-avoid mt-auto space-y-3 pt-14">
          {recognition.map((line, i) => (
            <li key={`${i}-${line}`} className="flex items-start gap-3 text-[13px] leading-snug text-[color:var(--pd-label)]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--pd-hint)]" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      )}
    </DocSection>
  );
}
