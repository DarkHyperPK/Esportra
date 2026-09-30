import type { PlatformProposal } from '@/schemas/proposal';
import { DocSection } from './DocSection';
import { BODY, CAPTION, CELL, DISPLAY, GRID } from './docStyles';
import { TierBand } from './TierBand';

export function PlatformAudiences({ doc, number }: { doc: PlatformProposal; number: string }) {
  const audiences = doc.audiences.filter((a) => a.who.trim());
  return (
    <DocSection
      number={number}
      anchor="audiences"
      eyebrow="The platform"
      title="One platform. Everyone in the scene."
      standfirst="Your brand sits where each of them already spends time on Esportra."
    >
      {audiences.length > 0 && (
        <div className={`${GRID} pd-avoid grid-cols-1 sm:grid-cols-2 print:grid-cols-2`}>
          {audiences.map((a, i) => (
            <div key={`${a.who}-${i}`} className={`${CELL} p-6 md:p-8`}>
              <p className={`${CAPTION} tabular-nums`}>{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-6 font-heading text-2xl font-bold tracking-tight text-[color:var(--pd-ink)]">{a.who}</h3>
              <p className={`${BODY} mt-3`}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </DocSection>
  );
}

function TierColumn({ tier }: { tier: PlatformProposal['tiers'][number] }) {
  return (
    <article className={`${CELL} pd-avoid flex flex-col p-6 md:p-8 print:p-6`}>
      <p className={CAPTION}>{tier.label}</p>
      <h3 className={`${DISPLAY} mt-3 text-4xl print:text-3xl`}>{tier.name}</h3>
      <p className="mt-3 text-[14px] leading-snug text-[color:var(--pd-muted)]">{tier.summary}</p>
      <ul className="mt-6 flex-1 space-y-3 print:space-y-2 print:mt-4 border-t border-[color:var(--pd-line)] pt-5">
        {tier.points.filter((p) => p.trim()).map((point, i) => (
          <li key={`${i}-${point}`} className="flex gap-3 text-[14px] leading-snug text-[color:var(--pd-label)] print:text-[12.5px]">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-[color:var(--pd-hint)]" />
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}

const COLS: Record<number, string> = {
  1: 'md:grid-cols-1', 2: 'md:grid-cols-2 print:grid-cols-2',
  3: 'md:grid-cols-3 print:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4',
};

export function PlatformTiers({ doc, number }: { doc: PlatformProposal; number: string }) {
  if (doc.tiers.length === 0) return null;
  const standard = doc.tiers.filter((t) => !t.featured);
  const featured = doc.tiers.filter((t) => t.featured);
  return (
    <DocSection
      number={number}
      anchor="tiers"
      eyebrow="Partnership levels"
      title="Choose the level of presence."
      standfirst="Each level adds reach and insight. Terms are agreed directly with each partner."
    >
      {standard.length > 0 && (
        <div className={`${GRID} grid-cols-1 ${COLS[standard.length] ?? 'md:grid-cols-3 print:grid-cols-3'}`}>
          {standard.map((tier, i) => <TierColumn key={`${tier.name}-${i}`} tier={tier} />)}
        </div>
      )}
      <div className="mt-6 space-y-6 print:mt-4">
        {featured.map((tier, i) => (
          <TierBand
            key={`${tier.name}-${i}`}
            caption={tier.label}
            name={tier.name}
            summary={tier.summary}
            points={tier.points}
          />
        ))}
      </div>
    </DocSection>
  );
}
