import { useCallback, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { DangerButton } from '@/components/ui/button';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { useWithdrawOffer } from '@/hooks/competitive/useScrims';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { offerActionError } from '@/services/scrimOfferErrors';
import { offerStatusMeta } from '@/services/scrimStatusMeta';
import { formatProposedSlot } from './offerFormat';
import type { ScrimOffer } from '@/types/competitive';

/** A request my team sent, waiting on the other team. */
export function OutgoingOfferCard({ offer }: { offer: ScrimOffer }) {
  const withdraw = useWithdrawOffer(offer.id);
  const catalog = useGameCatalogContext();
  const game = catalog.games.find((g) => g.slug === offer.listingGameSlug);
  const meta = offerStatusMeta(offer.status);
  const [error, setError] = useState('');

  const onWithdraw = useCallback(async () => {
    setError('');
    try {
      await withdraw.mutateAsync();
    } catch (err) {
      setError(offerActionError(err, 'withdraw'));
    }
  }, [withdraw]);

  return (
    <article className="space-y-3 border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-black/40">
          {offer.listingGameSlug ? (
            <GameLogoImage gameName={offer.listingGameSlug} catalogLogo={game?.logo} catalogIcon={game?.icon} className="h-6 w-6 object-contain" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[15px] font-bold text-white">{offer.listingTeamName ?? offer.listingId.slice(0, 8)}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {offer.status === 'pending' ? 'Your request · waiting on them' : 'Your request'}
          </p>
        </div>
        <StatusPill label={meta.label} tone={meta.tone} />
      </div>
      <div className="flex items-center gap-2 border border-white/[0.06] bg-black/30 px-3 py-2 text-[13px] font-medium tabular-nums text-white/75">
        <CalendarClock className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
        {formatProposedSlot(offer.proposedAt)}
      </div>
      {error && <InlineNotice tone="critical">{error}</InlineNotice>}
      {offer.status === 'pending' && (
        <div className="flex justify-end">
          <DangerButton size="sm" onClick={onWithdraw} disabled={withdraw.isPending} className="h-9 px-3 text-[12px]">
            {withdraw.isPending ? 'Withdrawing…' : 'Withdraw'}
          </DangerButton>
        </div>
      )}
    </article>
  );
}
