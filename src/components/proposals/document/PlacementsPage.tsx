import { Monitor, MonitorPlay, Rows3 } from 'lucide-react';
import type { Proposal } from '@/schemas/proposal';
import { placementGroups } from '@/services/proposals/placements';
import { Page } from './Page';
import { Title } from './Title';

const ICONS = { page: Monitor, stream: MonitorPlay, ticker: Rows3 };

/** 04. The real product: tournament page and live stream in pink-framed screens, three placements below. */
export function PlacementsPage({ doc, number }: { doc: Proposal; number: string }) {
  const { page, stream } = doc.images;
  const groups = placementGroups(doc);
  const frame = 'pd-lift pd-cut-frame bg-[color:var(--pd-cue)] p-px';
  return (
    <Page anchor="placements" number={number}>
      <Title doc={doc} number="04." text="Where you [appear]" />
      {(page || stream) && (
        <div className="pd-avoid mt-10 grid grid-cols-[0.75fr_1.25fr] items-start gap-5 print:mt-8">
          {page && (
            <div className={frame}>
              <img src={page} alt="Tournament page with partner placements" className="pd-cut-frame max-h-[440px] w-full object-cover object-top print:max-h-[380px]" />
            </div>
          )}
          {stream && (
            <div className={`${frame} ${page ? 'mt-20' : 'col-span-2'}`}>
              <img src={stream} alt="Live stream with partner overlay" className="pd-cut-frame w-full" />
            </div>
          )}
        </div>
      )}
      {groups.length > 0 && (
        <ul className="pd-avoid mt-auto grid gap-5 pt-10 sm:grid-cols-3 print:grid-cols-3">
          {groups.map((group) => {
            const Icon = ICONS[group.key];
            return (
              <li key={group.key} className="border-t-2 border-[color:var(--pd-cue)] pt-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[color:var(--pd-cue)]" aria-hidden />
                  <p className="text-lg font-bold uppercase tracking-[0.05em] text-[color:var(--pd-ink)]">{group.title}</p>
                </div>
                <p className="mt-2 text-[14px] font-medium leading-snug text-[color:var(--pd-muted)]">{group.body}</p>
                <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[color:var(--pd-cue)]">From {group.from}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
