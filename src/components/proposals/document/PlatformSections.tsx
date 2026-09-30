import type { PlatformProposal } from '@/schemas/proposal';
import { DocSection } from './DocSection';
import { CAPTION } from './docStyles';
import { Staircase } from './Staircase';

/** The platform's audiences as a roster: number, who, what they do here. */
export function PlatformAudiences({ doc, number }: { doc: PlatformProposal; number: string }) {
  const audiences = doc.audiences.filter((a) => a.who.trim());
  return (
    <DocSection doc={doc} number={number} anchor="audiences" segment="The roster" title="The whole scene, in [one place]." intro={doc.outlook}>
      <ol className="pd-avoid grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        {audiences.map((a, i) => (
          <li key={`${a.who}-${i}`} className="pd-drop">
            <div className="pd-cut h-full border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-panel)] p-6 md:p-7">
              <p className={`${CAPTION} tabular-nums`}>{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-8 font-heading text-2xl font-extrabold tracking-[-0.03em] text-[color:var(--pd-ink)]">{a.who}</p>
              <p className="mt-2 text-[14px] leading-snug text-[color:var(--pd-muted)]">{a.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </DocSection>
  );
}

export function PlatformTiers({ doc, number }: { doc: PlatformProposal; number: string }) {
  if (doc.tiers.length === 0) return null;
  const steps = doc.tiers.map((tier, i) => ({
    key: `${tier.name}-${i}`,
    caption: tier.label,
    name: tier.name,
    summary: tier.summary,
    points: tier.points,
    top: tier.featured,
  }));
  return (
    <DocSection doc={doc} number={number} anchor="tiers" segment="Loadouts" title="Pick your [level]." intro="Quoted by value. Terms are agreed with each partner.">
      <Staircase steps={steps} />
    </DocSection>
  );
}
