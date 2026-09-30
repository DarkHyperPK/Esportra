import type { TournamentProposal } from '@/schemas/proposal';
import { brandLabel, fillTokens, formatLongDate } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { BODY, CAPTION, CELL, FLEX_GRID, TITLE } from './docStyles';

function Fact({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className={`${CELL} min-w-[180px] flex-1 basis-[30%] p-5`}>
      <p className={CAPTION}>{label}</p>
      <p className={`${TITLE} mt-2 text-lg`}>{value}</p>
    </div>
  );
}

/** The event's facts (empty ones are skipped) and who the partner reaches. */
export function EventSection({ doc, number }: { doc: TournamentProposal; number: string }) {
  const { event } = doc;
  const points = doc.audiencePoints.filter((p) => p.trim());
  return (
    <DocSection number={number} anchor="event" eyebrow="The event" title={event.name || 'The event'} standfirst={event.edition || undefined}>
      <div className={`${FLEX_GRID} pd-avoid`}>
        <Fact label="Game" value={event.game} />
        <Fact label="Starts" value={formatLongDate(event.startDate)} />
        <Fact label="Streams" value={event.channels} />
        <Fact label="Format" value={event.format} />
        <Fact label="Prize pool" value={event.prizePool} />
      </div>
      {event.next && <p className={`${CAPTION} mt-4`}>{event.next}</p>}

      <div className="pd-avoid mt-14 grid gap-8 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <div>
          <h3 className={`${TITLE} text-2xl md:text-3xl`}>{fillTokens(doc.audienceHeading, doc)}</h3>
          <p className={`${BODY} mt-4`}>{fillTokens(doc.audienceBody, doc)}</p>
        </div>
        {points.length > 0 && (
          <ul className="space-y-0 border-t border-[color:var(--pd-line)]" aria-label={`Who ${brandLabel(doc)} reaches`}>
            {points.map((point, i) => (
              <li key={`${i}-${point}`} className="border-b border-[color:var(--pd-line)] py-4 text-[15px] text-[color:var(--pd-label)]">
                {fillTokens(point, doc)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DocSection>
  );
}
