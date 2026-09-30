import type { Proposal } from '@/schemas/proposal';
import { placementGroups } from '@/services/proposals/placements';
import { DocSection } from './DocSection';
import { CAPTION } from './docStyles';
import { Monitor } from './Monitor';

/** On air: the real product on two monitors, then three lower-thirds naming where the partner shows up. */
export function PlacementsSection({ doc, number }: { doc: Proposal; number: string }) {
  const { page, stream } = doc.images;
  const groups = placementGroups(doc);
  return (
    <DocSection doc={doc} number={number} anchor="placements" segment="On air" title="Inside the [broadcast].">
      {(page || stream) && (
        <div className="pd-avoid relative grid grid-cols-[0.75fr_1.25fr] items-start print:grid-cols-[0.75fr_1.25fr]">
          {page && (
            <Monitor label="Tournament page" className="z-0 mt-4">
              <img src={page} alt="Tournament page with partner placements" className="max-h-[460px] w-full object-cover object-top print:max-h-[400px]" />
            </Monitor>
          )}
          {stream && (
            <Monitor label="Live stream" className={page ? 'z-10 -ml-8 mt-28 print:mt-24' : 'col-span-2'}>
              <img src={stream} alt="Live stream with partner overlay" className="w-full" />
            </Monitor>
          )}
        </div>
      )}
      {groups.length > 0 && (
        <ul className="pd-avoid mt-auto grid gap-6 pt-14 sm:grid-cols-3 print:grid-cols-3 print:pt-10">
          {groups.map((group) => (
            <li key={group.key} className="border-l-2 border-[color:var(--pd-ink)] pl-4">
              <p className={CAPTION}>From {group.from}</p>
              <p className="mt-1.5 font-heading text-lg font-bold tracking-tight text-[color:var(--pd-ink)]">{group.title}</p>
              <p className="mt-1.5 text-[13px] leading-snug text-[color:var(--pd-muted)]">{group.body}</p>
            </li>
          ))}
        </ul>
      )}
    </DocSection>
  );
}
