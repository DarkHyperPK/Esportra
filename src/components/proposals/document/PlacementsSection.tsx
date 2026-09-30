import type { Proposal } from '@/schemas/proposal';
import { placementGroups } from '@/services/proposals/placements';
import { DocSection } from './DocSection';
import { CAPTION } from './docStyles';

/** The real product, lifted off the page: tournament page and live stream, then three short points. */
export function PlacementsSection({ doc, number }: { doc: Proposal; number: string }) {
  const { page, stream } = doc.images;
  const groups = placementGroups(doc);
  return (
    <DocSection doc={doc} number={number} anchor="placements" eyebrow="Where you appear" title="Built into the [experience.]">
      {(page || stream) && (
        <div className="pd-avoid relative grid grid-cols-[0.8fr_1.2fr] items-start gap-0 print:grid-cols-[0.8fr_1.2fr]">
          {page && <img src={page} alt="Tournament page with partner placements" className="pd-lift relative z-0 max-h-[520px] w-full object-cover object-top print:max-h-[430px]" />}
          {stream && (
            <img
              src={stream}
              alt="Live stream with partner overlay"
              className={`pd-lift relative z-10 w-full ${page ? '-ml-10 mt-24 w-[calc(100%+2.5rem)] print:mt-20' : 'col-span-2'}`}
            />
          )}
        </div>
      )}
      {groups.length > 0 && (
        <ul className="pd-avoid mt-14 grid gap-8 sm:grid-cols-3 print:mt-10 print:grid-cols-3">
          {groups.map((group) => (
            <li key={group.key}>
              <p className={CAPTION}>From {group.from}</p>
              <h3 className="mt-2 font-heading text-lg font-bold tracking-tight text-[color:var(--pd-ink)]">{group.title}</h3>
              <p className="mt-2 text-[13px] leading-snug text-[color:var(--pd-muted)]">{group.body}</p>
            </li>
          ))}
        </ul>
      )}
    </DocSection>
  );
}
