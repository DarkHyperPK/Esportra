import { StatTile } from './StatTile';

interface KpiStripProps {
  participantNoun: 'players' | 'teams';
  registered: number;
  capacity: number;
  checkIn: { checkedIn: number; eligible: number } | null;
  stageCount: number;
  prizePool: string;
  entryFee: string;
}

/**
 * One row of numbers. Registration gets the large tile because it is the
 * number organizers check most; the rest stay secondary.
 */
export function KpiStrip({ participantNoun, registered, capacity, checkIn, stageCount, prizePool, entryFee }: KpiStripProps) {
  const fill = capacity > 0 ? Math.round((registered / capacity) * 100) : null;
  const checkInRate = checkIn && checkIn.eligible > 0 ? Math.round((checkIn.checkedIn / checkIn.eligible) * 100) : null;
  const openSlots = capacity > 0 ? Math.max(capacity - registered, 0) : null;

  return (
    <section
      aria-label="Key numbers"
      className="grid grid-cols-2 gap-px border border-white/[0.07] bg-white/[0.07] lg:grid-cols-[1.6fr_1fr_1fr_1fr] [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1"
    >
      <StatTile
        emphasis
        className="col-span-2 bg-card lg:col-span-1"
        label={`Registered ${participantNoun}`}
        value={registered}
        suffix={capacity > 0 ? `/ ${capacity}` : undefined}
        progress={fill}
        hint={openSlots === null ? 'No cap set' : openSlots === 0 ? 'Registration is full' : `${openSlots} slots open`}
      />
      {checkIn ? (
        <StatTile
          className="bg-card"
          label="Checked in"
          value={checkInRate === null ? '—' : `${checkInRate}%`}
          hint={`${checkIn.checkedIn} of ${checkIn.eligible}`}
        />
      ) : (
        <StatTile className="bg-card" label="Stages" value={stageCount} hint={stageCount === 0 ? 'None yet' : 'Configured'} />
      )}
      <StatTile className="bg-card" label="Prize pool" value={prizePool} />
      <StatTile className="bg-card" label="Entry fee" value={entryFee} />
    </section>
  );
}
