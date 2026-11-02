/**
 * ScoutingSnapshot
 *
 * Everything worth knowing before you ask: record and reliability, the rank
 * they want, when they play, and what they said. The same language as the
 * discovery card, with room to breathe.
 */

import { EYEBROW_CLASS } from '@/components/ui/kit';
import { formatTimeWindow } from '@/services/scrimDiscoveryUtils';
import { bestOfLabel } from '@/services/scrimUtils';
import type { ScrimListing } from '@/types/competitive';
import { RankBand } from '../listing/RankBand';
import { WeekDots } from '../listing/WeekDots';
import { TeamRecordStrip } from '../TeamRecordStrip';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className={EYEBROW_CLASS}>{title}</h3>
      {children}
    </section>
  );
}

export function ScoutingSnapshot({ listing }: { listing: ScrimListing }) {
  const timeLabel = listing.preferredTimeStart && listing.preferredTimeEnd
    ? formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd, listing.timezone ?? null)
    : '';
  const chip = 'rounded-md border border-white/[0.1] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-white/60';

  return (
    <div className="space-y-5">
      <TeamRecordStrip record={listing.record} soft className="border-t-0 pt-0" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Block title="Looking for">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <RankBand minName={listing.minRankDisplayName} maxName={listing.maxRankDisplayName} minIcon={listing.minRankIconUrl} maxIcon={listing.maxRankIconUrl} />
          </div>
          <div className="flex gap-1.5">
            <span className={chip}>5V5</span>
            <span className={chip}>{bestOfLabel(listing.bestOf).toUpperCase()}</span>
            {listing.scheduleType === 'recurring' && <span className={chip}>WEEKLY</span>}
          </div>
        </Block>

        <Block title="Usually plays">
          <WeekDots days={listing.preferredDays} soft />
          {timeLabel && <p className="text-[12px] tabular-nums text-zinc-400">{timeLabel}</p>}
        </Block>
      </div>

      {listing.notes && (
        <Block title="Message from the team">
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-zinc-300">{listing.notes}</p>
        </Block>
      )}
    </div>
  );
}
