import type { Proposal } from '@/schemas/proposal';
import { DocSection } from './DocSection';
import { CAPTION, NUMBER } from './docStyles';

/** Who we are, in one paragraph, and the numbers that have already happened. */
export function AboutSection({ doc, number, title }: { doc: Proposal; number: string; title: string }) {
  const stats = doc.stats.filter((s) => s.value.trim()).slice(0, 3);
  const recognition = doc.recognition.filter((r) => r.trim());
  return (
    <DocSection doc={doc} number={number} anchor="about" eyebrow="Who we are" title={title} intro={doc.about}>
      {stats.length > 0 && (
        <dl className="pd-avoid grid grid-cols-3 gap-6 border-t border-[color:var(--pd-line)] pt-10">
          {stats.map((stat, i) => (
            <div key={`${stat.label}-${i}`}>
              <dt className="sr-only">{stat.label}</dt>
              <dd className={`${NUMBER} text-6xl leading-none md:text-8xl print:text-7xl`}>{stat.value}</dd>
              <dd className="mt-3 max-w-[16ch] text-[13px] leading-snug text-[color:var(--pd-muted)]">{stat.label}</dd>
            </div>
          ))}
        </dl>
      )}
      {recognition.length > 0 && (
        <ul className="pd-avoid mt-14 space-y-2">
          {recognition.map((line, i) => (
            <li key={`${i}-${line}`} className={`${CAPTION} leading-relaxed`}>{line}</li>
          ))}
        </ul>
      )}
    </DocSection>
  );
}
