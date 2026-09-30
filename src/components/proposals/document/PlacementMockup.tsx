import { slotFor, type ZoneSlot } from '@/services/proposals/placements';
import { Bar, MockFrame, Slot } from './MockParts';
import { CAPTION, TITLE } from './docStyles';

interface PlacementMockupProps {
  slots: ZoneSlot[];
  brand: string;
  eventName: string;
}

function TournamentPageMock({ slots, brand, eventName }: PlacementMockupProps) {
  const cards = [0, 1, 2];
  return (
    <div className="flex aspect-[4/3] flex-col gap-2 p-3 text-[color:var(--pd-hint)]">
      <div className="flex h-5 items-center gap-2">
        <span className="font-mono text-[8px] uppercase tracking-[0.2em]">esportra.com / tournaments</span>
        <span className="ml-auto flex h-full items-center gap-1.5">
          <Bar className="h-2 w-8" /><Bar className="h-2 w-8" />
          <Slot slot={slotFor(slots, 'ticker')} brand={brand} className="relative h-full w-24" size="sm" />
        </span>
      </div>
      {slotFor(slots, 'header') ? (
        <Slot slot={slotFor(slots, 'header')} brand={brand} className="relative h-[20%]" />
      ) : (
        <Bar className="h-[20%]" />
      )}
      <p className="truncate font-heading text-[11px] font-black text-[color:var(--pd-ink)] md:text-sm">{eventName}</p>
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="grid grid-cols-3 gap-1.5">
            {cards.map((i) => (
              <div key={i} className="relative aspect-[4/3] border border-[color:var(--pd-line)] p-1.5">
                <Bar className="h-1.5 w-3/4" />
                <Bar className="mt-1 h-1.5 w-1/2" />
                <Slot slot={slotFor(slots, 'badge')} brand={brand} className="absolute bottom-1 right-1 h-4 w-9" size="xs" marker={i === 0} />
              </div>
            ))}
          </div>
          <div className="flex flex-1 flex-col justify-around border border-[color:var(--pd-line)] p-2">
            <Bar className="h-1.5 w-2/3" /><Bar className="h-1.5 w-1/2" /><Bar className="h-1.5 w-3/5" />
          </div>
        </div>
        {slotFor(slots, 'sidebar') && (
          <Slot slot={slotFor(slots, 'sidebar')} brand={brand} className="relative w-[26%] [writing-mode:vertical-rl]" />
        )}
      </div>
      <div className="flex h-7 items-center gap-2 border border-[color:var(--pd-line)] pl-2">
        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[color:var(--pd-muted)] tabular-nums">Alpha 13–7 Bravo</span>
        <Slot slot={slotFor(slots, 'matchbar')} brand={brand} className="relative ml-auto h-full w-32" size="sm" />
      </div>
    </div>
  );
}

function StreamMock({ slots, brand }: Omit<PlacementMockupProps, 'eventName'>) {
  return (
    <div className="relative aspect-video overflow-hidden bg-[color:var(--pd-bg)]">
      <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0_38px,var(--pd-line)_38px_39px)] opacity-60" />
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center border border-[color:var(--pd-strong-line)] bg-[color:var(--pd-panel)] whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--pd-ink)] tabular-nums">
        <span className="px-2 py-1">Alpha 9</span>
        <span className="border-x border-[color:var(--pd-line)] px-2 py-1 text-[color:var(--pd-hint)]">Map 2</span>
        <span className="px-2 py-1">6 Bravo</span>
      </div>
      <Slot slot={slotFor(slots, 'overlay')} brand={brand} className="absolute bottom-3 right-3 h-9 w-32" />
      <span className="absolute left-3 top-3 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[color:var(--pd-hint)]">Live</span>
    </div>
  );
}

function BreakScreenMock({ slots, brand }: Omit<PlacementMockupProps, 'eventName'>) {
  return (
    <div className="flex aspect-[16/6] print:aspect-[16/4] flex-col items-center justify-center gap-3 bg-[color:var(--pd-bg)]">
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-[color:var(--pd-hint)]">Back in 5 minutes</span>
      <Slot slot={slotFor(slots, 'overlay')} brand={brand} className="relative h-9 w-40" />
    </div>
  );
}

/** Where a partner appears, drawn: the tournament page and the live stream, numbered to a legend. */
export function PlacementMockup({ slots, brand, eventName }: PlacementMockupProps) {
  if (slots.length === 0) return null;
  const onStream = slotFor(slots, 'overlay');
  return (
    <div>
      <div className="grid items-start gap-6 md:grid-cols-[1.15fr_1fr] print:grid-cols-[1.3fr_1fr] print:gap-5">
        <MockFrame label="Tournament page">
          <TournamentPageMock slots={slots} brand={brand} eventName={eventName} />
        </MockFrame>
        {onStream && (
          <div className="space-y-6 print:space-y-4">
            <MockFrame label="Live stream">
              <StreamMock slots={slots} brand={brand} />
            </MockFrame>
            <MockFrame label="Welcome and break screens">
              <BreakScreenMock slots={slots} brand={brand} />
            </MockFrame>
          </div>
        )}
      </div>
      <ol className="pd-avoid mt-8 print:mt-5 grid gap-x-8 border-t border-[color:var(--pd-line)] sm:grid-cols-2 print:grid-cols-2">
        {slots.map((slot) => (
          <li key={slot.key} className="flex items-baseline gap-4 border-b border-[color:var(--pd-line)] py-3 print:py-1.5">
            <span className={`${CAPTION} tabular-nums`}>{slot.marker}</span>
            <span className={`${TITLE} flex-1 text-[15px]`}>{slot.label}</span>
            {slot.from && <span className={CAPTION}>From {slot.from}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
