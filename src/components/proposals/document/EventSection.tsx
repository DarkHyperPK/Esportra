import type { TournamentProposal } from '@/schemas/proposal';
import { fillTokens, formatLongDate } from '@/services/proposals/format';
import { DocSection } from './DocSection';
import { CAPTION } from './docStyles';

/** "Esportra Genesis Stage 2" → "Esportra Genesis [Stage 2]": the last two words carry the accent. */
function accentTail(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return name.trim();
  return `${words.slice(0, -2).join(' ')} [${words.slice(-2).join(' ')}]`;
}

/** The event as three facts, set large. Empty facts are left out. */
export function EventSection({ doc, number }: { doc: TournamentProposal; number: string }) {
  const { event } = doc;
  const facts = [
    { label: 'Game', value: event.game },
    { label: 'Starts', value: formatLongDate(event.startDate) },
    { label: 'Streams', value: event.channels },
    { label: 'Format', value: event.format },
    { label: 'Prize pool', value: event.prizePool },
  ].filter((f) => f.value.trim());
  return (
    <DocSection
      doc={doc}
      number={number}
      anchor="event"
      eyebrow="The event"
      title={accentTail(event.name) || 'The event'}
      intro={fillTokens(doc.audienceBody, doc)}
    >
      <dl className="pd-avoid divide-y divide-[color:var(--pd-line)] border-y border-[color:var(--pd-line)]">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-baseline justify-between gap-6 py-6 print:py-5">
            <dt className={CAPTION}>{fact.label}</dt>
            <dd className="text-right font-heading text-2xl font-bold tracking-tight text-[color:var(--pd-ink)] md:text-4xl">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {event.next && <p className={`${CAPTION} mt-6`}>{event.next}</p>}
    </DocSection>
  );
}
