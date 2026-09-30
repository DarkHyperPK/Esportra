import type { PlatformProposal } from '@/schemas/proposal';
import { DocSection } from './DocSection';
import { CAPTION } from './docStyles';
import { TierBand } from './TierBand';

export function PlatformAudiences({ doc, number }: { doc: PlatformProposal; number: string }) {
  const audiences = doc.audiences.filter((a) => a.who.trim());
  return (
    <DocSection doc={doc} number={number} anchor="audiences" eyebrow="The platform" title="The whole scene, [in one place.]" intro={doc.outlook}>
      <ol className="pd-avoid divide-y divide-[color:var(--pd-line)] border-y border-[color:var(--pd-line)]">
        {audiences.map((a, i) => (
          <li key={`${a.who}-${i}`} className="grid gap-2 py-6 sm:grid-cols-[3rem_1fr_1.4fr] sm:items-baseline sm:gap-6 print:grid-cols-[3rem_1fr_1.4fr] print:py-5">
            <span className={`${CAPTION} tabular-nums`}>{String(i + 1).padStart(2, '0')}</span>
            <span className="font-heading text-2xl font-bold tracking-tight text-[color:var(--pd-ink)]">{a.who}</span>
            <span className="text-[14px] leading-snug text-[color:var(--pd-muted)]">{a.body}</span>
          </li>
        ))}
      </ol>
    </DocSection>
  );
}

function TierColumn({ tier }: { tier: PlatformProposal['tiers'][number] }) {
  return (
    <article className="pd-avoid flex flex-col border-l border-[color:var(--pd-line)] pl-6 first:border-l-0 first:pl-0">
      <p className={CAPTION}>{tier.label}</p>
      <h3 className="mt-3 font-heading text-4xl font-extrabold uppercase tracking-[-0.03em] text-[color:var(--pd-ink)]">{tier.name}</h3>
      <p className="mt-3 text-[14px] leading-snug text-[color:var(--pd-muted)]">{tier.summary}</p>
      <ul className="mt-6 space-y-3 print:mt-4 print:space-y-2">
        {tier.points.filter((p) => p.trim()).map((point, i) => (
          <li key={`${i}-${point}`} className="text-[14px] leading-snug text-[color:var(--pd-label)] print:text-[13px]">{point}</li>
        ))}
      </ul>
    </article>
  );
}

const COLS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'sm:grid-cols-2 print:grid-cols-2', 3: 'sm:grid-cols-3 print:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4',
};

export function PlatformTiers({ doc, number }: { doc: PlatformProposal; number: string }) {
  if (doc.tiers.length === 0) return null;
  const standard = doc.tiers.filter((t) => !t.featured);
  const featured = doc.tiers.filter((t) => t.featured);
  return (
    <DocSection doc={doc} number={number} anchor="tiers" eyebrow="Partnership levels" title="Choose your [presence.]" intro="Quoted by value. Terms are agreed directly with each partner.">
      {standard.length > 0 && (
        <div className={`grid gap-y-10 ${COLS[standard.length] ?? 'sm:grid-cols-3 print:grid-cols-3'}`}>
          {standard.map((tier, i) => <TierColumn key={`${tier.name}-${i}`} tier={tier} />)}
        </div>
      )}
      <div className="mt-12 space-y-6 print:mt-8">
        {featured.map((tier, i) => (
          <TierBand key={`${tier.name}-${i}`} caption={tier.label} name={tier.name} summary={tier.summary} points={tier.points} />
        ))}
      </div>
    </DocSection>
  );
}
