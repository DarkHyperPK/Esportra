import type { Proposal } from '@/schemas/proposal';
import { brandLabel } from '@/services/proposals/format';
import { resolveZoneSlots } from '@/services/proposals/placements';
import { DocSection } from './DocSection';
import { PlacementMatrix } from './PlacementMatrix';
import { PlacementMockup } from './PlacementMockup';
import { CAPTION } from './docStyles';

/** "Where you appear": the drawn placements first, then the detail (matrix or portal). */
export function PlacementsSection({ doc, number }: { doc: Proposal; number: string }) {
  const eventName = doc.kind === 'tournament' ? doc.event.name : 'Esportra tournament';
  const portal = doc.kind === 'platform' ? doc.portalPoints.filter((p) => p.trim()) : [];
  return (
    <DocSection
      number={number}
      anchor="placements"
      eyebrow="Where you appear"
      title={`${brandLabel(doc)}, in the frame.`}
      standfirst="Every placement is drawn where it sits. Numbers match the list below it."
    >
      <PlacementMockup slots={resolveZoneSlots(doc)} brand={brandLabel(doc)} eventName={eventName} />
      {doc.kind === 'tournament' && (
        <div className="mt-12 print:mt-6">
          <p className={`${CAPTION} mb-2`}>By package</p>
          <PlacementMatrix doc={doc} />
        </div>
      )}
      {portal.length > 0 && (
        <div className="pd-avoid mt-12 print:mt-6">
          <p className={`${CAPTION} mb-2`}>Partner portal</p>
          <ul className="grid gap-x-10 border-t border-[color:var(--pd-line)] sm:grid-cols-2 print:grid-cols-2">
            {portal.map((point, i) => (
              <li key={`${i}-${point}`} className="border-b border-[color:var(--pd-line)] py-3 text-[14px] text-[color:var(--pd-label)] print:py-2 print:text-[13px]">
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </DocSection>
  );
}
