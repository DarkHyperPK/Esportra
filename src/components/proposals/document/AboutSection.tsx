import type { Proposal } from '@/schemas/proposal';
import { DocSection } from './DocSection';
import { StatsGrid } from './StatsGrid';
import { BODY, CAPTION } from './docStyles';

interface AboutSectionProps {
  doc: Proposal;
  title: string;
  eyebrow: string;
  number: string;
}

/** Who Esportra is, the numbers that have already happened, and recognition. */
export function AboutSection({ doc, title, eyebrow, number }: AboutSectionProps) {
  const recognition = doc.recognition.filter((r) => r.trim());
  return (
    <DocSection number={number} anchor="about" eyebrow={eyebrow} title={title} standfirst={doc.about || undefined}>
      <StatsGrid stats={doc.stats} />
      {recognition.length > 0 && (
        <div className="pd-avoid mt-10">
          <p className={`${CAPTION} mb-4`}>Recognition</p>
          <ul className="space-y-2">
            {recognition.map((line, i) => (
              <li key={`${i}-${line}`} className="border-l-2 border-[color:var(--pd-strong-line)] pl-4 text-[15px] text-[color:var(--pd-label)]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {doc.kind === 'platform' && doc.outlook && <p className={`${BODY} mt-10 max-w-2xl`}>{doc.outlook}</p>}
    </DocSection>
  );
}
