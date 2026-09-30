import type { TournamentProposal } from '@/schemas/proposal';
import { daysUntil, fillTokens } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { CAPTION, NUMBER, TITLE } from './docStyles';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stubDate(iso: string): { day: string; month: string; year: string } | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return { day: m[3], month: MONTHS[Number(m[2]) - 1] ?? '', year: m[1] };
}

/** A perforation between ticket and stub: dashed line with half-circle bites. */
function Perforation() {
  return (
    <div aria-hidden className="relative w-px self-stretch border-l border-dashed border-[color:var(--pd-strong-line)]">
      <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[color:var(--pd-bg)]" />
      <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full bg-[color:var(--pd-bg)]" />
    </div>
  );
}

/** Match card: the event drawn as a ticket. Name and details on the ticket, the date and countdown on the stub. */
export function EventSection({ doc, number }: { doc: TournamentProposal; number: string }) {
  const { event } = doc;
  const date = stubDate(event.startDate);
  const days = daysUntil(doc.preparedOn, event.startDate);
  const details = [
    { label: 'Game', value: event.game },
    { label: 'Streams', value: event.channels },
    { label: 'Format', value: event.format },
    { label: 'Prize pool', value: event.prizePool },
  ].filter((d) => d.value.trim());
  return (
    <DocSection doc={doc} number={number} anchor="event" segment="Match card" title="The [event].">
      <div className="pd-drop pd-avoid">
        <div className="flex border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-panel)]">
          <div className="flex-1 p-7 md:p-10 print:p-8">
            <p className={CAPTION}>{event.edition || 'Esportra tournament'}</p>
            <p className="mt-4 font-heading text-4xl font-extrabold leading-[0.98] tracking-[-0.035em] text-[color:var(--pd-ink)] md:text-5xl">
              {event.name}
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 print:mt-8">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className={CAPTION}>{d.label}</dt>
                  <dd className={`${TITLE} mt-1 text-lg`}>{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Perforation />
          {date && (
            <div className="flex w-[34%] flex-col items-center justify-center p-6 text-center">
              <p className={CAPTION}>Starts</p>
              <p className={`${NUMBER} mt-3 text-7xl leading-none md:text-8xl`}>{date.day}</p>
              <p className="mt-1 font-heading text-2xl font-bold uppercase tracking-tight text-[color:var(--pd-ink)]">{date.month}</p>
              <p className={`${CAPTION} mt-1`}>{date.year}</p>
              {days !== undefined && (
                <p className="mt-6 border-t border-[color:var(--pd-line)] pt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--pd-label)] tabular-nums">
                  {days === 0 ? 'Today' : `${days} days to go`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {doc.audienceBody && (
        <p className="mt-12 max-w-xl text-pretty text-lg leading-relaxed text-[color:var(--pd-label)]">{fillTokens(doc.audienceBody, doc)}</p>
      )}
      {event.next && <p className={`${CAPTION} mt-auto pt-10`}>{event.next}</p>}
    </DocSection>
  );
}
