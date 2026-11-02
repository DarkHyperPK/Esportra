/**
 * ReceivedOfferCard
 *
 * A team asking to scrim: who they are (record, roster), when they want to
 * play, and Accept / Decline. Accepting asks for a time first. The caller
 * lists these under "Needs you".
 */

import { useCallback, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { CtaButton, OutlineButton } from '@/components/ui/button';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { useAcceptOffer, useDeclineOffer } from '@/hooks/competitive/useScrims';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { offerActionError } from '@/services/scrimOfferErrors';
import { offerStatusMeta } from '@/services/scrimStatusMeta';
import { parseMembersPreview, toLocalInputValue } from '@/services/scrimUtils';
import { formatProposedSlot } from './offerFormat';
import { AcceptTimePicker } from './AcceptTimePicker';
import { OfferRosterPreview } from './OfferRosterPreview';
import { TeamRecordStrip } from '../TeamRecordStrip';
import type { ScrimOffer } from '@/types/competitive';

export function ReceivedOfferCard({ offer }: { offer: ScrimOffer }) {
  const accept = useAcceptOffer(offer.id);
  const decline = useDeclineOffer(offer.id);
  const catalog = useGameCatalogContext();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [scheduledAt, setScheduledAt] = useState(offer.proposedAt ? toLocalInputValue(offer.proposedAt) : '');

  const busy = accept.isPending || decline.isPending;
  const meta = offerStatusMeta(offer.status);
  const gameName = catalog.games.find((g) => g.slug === offer.listingGameSlug)?.name ?? offer.listingGameSlug?.toUpperCase() ?? 'Scrim';
  const name = offer.offeringTeamName ?? offer.offeringTeamId.slice(0, 8);

  const onAccept = useCallback(async () => {
    setError('');
    try {
      await accept.mutateAsync(scheduledAt ? { scheduled_at: new Date(scheduledAt).toISOString() } : undefined);
    } catch (err) {
      setError(offerActionError(err, 'accept'));
    }
  }, [accept, scheduledAt]);

  const onDecline = useCallback(async () => {
    setError('');
    try {
      await decline.mutateAsync();
    } catch (err) {
      setError(offerActionError(err, 'decline'));
    }
  }, [decline]);

  return (
    <article className="space-y-3 border border-white/[0.12] bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-mono text-[11px] font-semibold text-white/60"
        >
          {offer.offeringTeamLogo ? <img src={offer.offeringTeamLogo} alt="" className="h-full w-full object-contain p-1" /> : name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[16px] font-bold text-white">
            {name}
            {offer.offeringTeamTag && <span className="ml-1.5 text-[12px] font-normal text-white/40">[{offer.offeringTeamTag}]</span>}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{gameName} · wants a scrim</p>
        </div>
        {offer.status !== 'pending' && <StatusPill label={meta.label} tone={meta.tone} />}
      </div>

      <TeamRecordStrip record={offer.offeringRecord} />
      <OfferRosterPreview
        members={parseMembersPreview(offer.offeringMembersPreview)}
        playerCount={offer.offeringActiveMemberCount ?? null}
        scrimsCompleted={offer.offeringScrimsCompleted ?? null}
      />

      <div className="flex items-center gap-2 border border-white/[0.06] bg-black/30 px-3 py-2 text-[13px] font-medium tabular-nums text-white/75">
        <CalendarClock className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
        {formatProposedSlot(offer.proposedAt)}
      </div>
      {offer.notes && <p className="line-clamp-2 text-[12px] italic text-white/45">&ldquo;{offer.notes}&rdquo;</p>}

      {accepting && <AcceptTimePicker offer={offer} value={scheduledAt} onChange={setScheduledAt} />}
      {error && <InlineNotice tone="critical">{error}</InlineNotice>}

      {offer.status === 'pending' && (
        <div className="flex gap-2">
          {accepting ? (
            <>
              <CtaButton size="sm" onClick={onAccept} disabled={busy} className="h-9 px-4 text-[12px] font-semibold">
                {accept.isPending ? 'Confirming…' : 'Confirm scrim'}
              </CtaButton>
              <OutlineButton size="sm" onClick={() => { setAccepting(false); setError(''); }} disabled={busy} className="h-9 px-3 text-[12px]">
                Back
              </OutlineButton>
            </>
          ) : (
            <>
              <CtaButton size="sm" onClick={() => setAccepting(true)} disabled={busy} className="h-9 px-4 text-[12px] font-semibold">
                Accept
              </CtaButton>
              <OutlineButton size="sm" onClick={onDecline} disabled={busy} className="h-9 px-3 text-[12px]">
                {decline.isPending ? 'Declining…' : 'Decline'}
              </OutlineButton>
            </>
          )}
        </div>
      )}
    </article>
  );
}
