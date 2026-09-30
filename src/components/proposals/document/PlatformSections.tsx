import type { PlatformProposal } from '@/schemas/proposal';
import { DocSection } from './DocSection';
import { BODY, CAPTION, CELL, CELL_RAISED, DISPLAY, GRID, TITLE } from './docStyles';

export function PlatformAudiences({ doc }: { doc: PlatformProposal }) {
  const audiences = doc.audiences.filter((a) => a.who.trim());
  const zones = doc.zones.filter((z) => z.name.trim());
  return (
    <DocSection number="02" eyebrow="The platform" title="One platform. Everyone in the scene.">
      {audiences.length > 0 && (
        <div className={`${GRID} pd-avoid grid-cols-1 sm:grid-cols-2 print:grid-cols-2`}>
          {audiences.map((a, i) => (
            <div key={`${a.who}-${i}`} className={`${CELL} p-6 md:p-8`}>
              <p className={CAPTION}>{a.who}</p>
              <p className={`${BODY} mt-3`}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
      {zones.length > 0 && (
        <div className="pd-avoid mt-14">
          <p className={`${CAPTION} mb-4`}>Where your brand appears</p>
          <ul className="border-t border-[color:var(--pd-line)]">
            {zones.map((z, i) => (
              <li key={`${z.name}-${i}`} className="grid gap-1 border-b border-[color:var(--pd-line)] py-4 sm:grid-cols-[1fr_1.4fr_1fr] sm:gap-6">
                <span className={`${TITLE} text-base`}>{z.name}</span>
                <span className="text-[14px] text-[color:var(--pd-muted)]">{z.desc}</span>
                <span className={CAPTION}>{z.tiers}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DocSection>
  );
}

function TierColumn({ tier }: { tier: PlatformProposal['tiers'][number] }) {
  const points = tier.points.filter((p) => p.trim());
  return (
    <article className={`${tier.featured ? CELL_RAISED : CELL} pd-avoid flex flex-col p-6 md:p-8 print:p-4`}>
      <p className={CAPTION}>{tier.label}</p>
      <h3 className={`${DISPLAY} mt-3 text-4xl print:text-3xl`}>{tier.name}</h3>
      <p className="mt-3 min-h-[3.5rem] text-[14px] leading-snug text-[color:var(--pd-muted)]">{tier.summary}</p>
      <ul className="mt-6 flex-1 space-y-3 border-t border-[color:var(--pd-line)] pt-5">
        {points.map((point, i) => (
          <li key={`${i}-${point}`} className="flex gap-3 text-[14px] leading-snug text-[color:var(--pd-label)]">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-[color:var(--pd-hint)]" />
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}

const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1 print:grid-cols-1',
  2: 'lg:grid-cols-2 print:grid-cols-2',
  3: 'lg:grid-cols-3 print:grid-cols-3',
  4: 'lg:grid-cols-4 print:grid-cols-4',
};

export function PlatformTiers({ doc }: { doc: PlatformProposal }) {
  if (doc.tiers.length === 0) return null;
  return (
    <DocSection number="03" eyebrow="Partnership levels" title="Choose the level of presence.">
      <div className={`${GRID} grid-cols-1 ${LG_COLS[Math.min(doc.tiers.length, 4)] ?? 'lg:grid-cols-3 print:grid-cols-3'}`}>
        {doc.tiers.map((tier, i) => (
          <TierColumn key={`${tier.name}-${i}`} tier={tier} />
        ))}
      </div>
      <p className={`${CAPTION} mt-4`}>Quoted by value. Terms are agreed directly with each partner.</p>
    </DocSection>
  );
}
