/**
 * ScrimOpponentCard
 *
 * One team looking for a scrim, built to answer "are they worth playing?" in a
 * glance: identity first, then record and reliability, then what they want
 * (rank, days, format) and who is on the roster. Prop-driven.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { cn } from '@/lib/utils';
import { bestOfLabel, parseMembersPreview } from '@/services/scrimUtils';
import { formatTimeWindow, listingAge, type ScrimListingEnriched } from '@/services/scrimDiscoveryUtils';
import type { FitLabel } from '@/services/scrimListingView';
import { TeamRecordStrip } from '../TeamRecordStrip';
import { FitBadge } from './FitBadge';
import { RankBand } from './RankBand';
import { RosterFaces } from './RosterFaces';
import { GRID_TEXTURE_STYLE } from '../room/roomStyles';
import { WeekDots } from './WeekDots';

interface ScrimOpponentCardProps {
  listing: ScrimListingEnriched;
  fit: FitLabel | null;
  isOwner: boolean;
  hasTeam: boolean;
  onOpen: () => void;
}

const CTA_BASE =
  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]';
const CTA_PRIMARY = `${CTA_BASE} bg-white text-black hover:bg-rose-500 hover:text-white`;
const CTA_QUIET = `${CTA_BASE} border border-white/[0.14] text-white/80 hover:border-white/30 hover:text-white`;

function Hero({ listing, fit, gameName, gameLogo, gameIcon }: {
  listing: ScrimListingEnriched; fit: FitLabel | null; gameName: string; gameLogo?: string | null; gameIcon?: string | null;
}) {
  const art = listing.captainCardUrl ?? listing.teamLogoUrl ?? null;
  const isCard = !!listing.captainCardUrl;
  const name = listing.teamName ?? 'Unknown team';

  return (
    <div className="relative h-[136px] overflow-hidden bg-zinc-900">
      {art && (
        <img
          src={art}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={isCard
            ? { filter: 'brightness(0.62) saturate(1.1)', opacity: 0.7 }
            : { filter: 'blur(10px) brightness(0.5)', transform: 'scale(1.2)', opacity: 0.8 }}
        />
      )}
      {!art && <div aria-hidden="true" className="absolute inset-0 opacity-70" style={GRID_TEXTURE_STYLE} />}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-card via-card/45 to-transparent" />

      <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-black/60 px-2 py-1 backdrop-blur-sm">
          {listing.gameSlug && (
            <GameLogoImage gameName={listing.gameSlug} catalogLogo={gameLogo ?? undefined} catalogIcon={gameIcon ?? undefined} className="h-4 w-4 object-contain" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">{gameName}</span>
        </span>
        <FitBadge fit={fit} soft />
      </div>

      <div className="absolute inset-x-4 bottom-3 flex items-end gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.18] bg-zinc-800 font-mono text-[15px] font-semibold text-white/70 shadow-lg">
          {listing.teamLogoUrl ? <img src={listing.teamLogoUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 pb-0.5">
          <h3 className="truncate font-heading text-[18px] font-bold leading-tight text-white">{name}</h3>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
            {[listing.teamTag, listing.regionKey?.toUpperCase()].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ScrimOpponentCard({ listing, fit, isOwner, hasTeam, onOpen }: ScrimOpponentCardProps) {
  const catalog = useGameCatalogContext();
  const game = catalog.games.find((g) => g.slug === listing.gameSlug);
  const members = useMemo(() => parseMembersPreview(listing.membersPreview as string | unknown[] | null), [listing.membersPreview]);
  const isOpen = listing.status === 'open';
  const timeLabel = listing.preferredTimeStart && listing.preferredTimeEnd
    ? formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd, listing.timezone ?? null)
    : '';
  const meta = [
    (listing.scrimsCompleted ?? 0) > 0 ? `${listing.scrimsCompleted} scrims played` : null,
    `Posted ${listingAge(listing.createdAt)}`,
  ].filter(Boolean).join(' · ');

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-card transition-colors duration-150 hover:border-white/[0.18] focus-within:border-white/[0.18]">
      <Hero listing={listing} fit={fit} gameName={game?.name ?? listing.gameSlug ?? 'Scrim'} gameLogo={game?.logo} gameIcon={game?.icon} />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <TeamRecordStrip record={listing.record} soft className="border-t-0 pt-0" />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <RankBand minName={listing.minRankDisplayName} maxName={listing.maxRankDisplayName} minIcon={listing.minRankIconUrl} maxIcon={listing.maxRankIconUrl} />
          <span className="ml-auto flex gap-1.5">
            <span className="rounded-md border border-white/[0.1] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-white/60">5V5</span>
            <span className="rounded-md border border-white/[0.1] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-white/60" aria-label={`Best of ${listing.bestOf ?? 1} series`}>
              {bestOfLabel(listing.bestOf)}
            </span>
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <WeekDots days={listing.preferredDays} soft />
            {listing.scheduleType === 'recurring' && (
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">Weekly</span>
            )}
          </div>
          {timeLabel && <p className="text-[12px] tabular-nums text-zinc-400">{timeLabel}</p>}
        </div>

        <RosterFaces members={members} total={listing.activeMemberCount} />

        {listing.notes && <p className="line-clamp-2 break-words text-[12px] italic leading-snug text-zinc-400">&ldquo;{listing.notes}&rdquo;</p>}

        <div className="mt-auto space-y-3 pt-1">
          <p className="text-[11px] text-zinc-500">{meta}</p>
          <div className="flex gap-2">
            <button type="button" onClick={onOpen} className={CTA_QUIET}>Details</button>
            {isOwner ? (
              <Link to="/competitive/scrims/workspace" className={cn(CTA_PRIMARY)}>Manage</Link>
            ) : isOpen && hasTeam ? (
              <button type="button" onClick={onOpen} className={CTA_PRIMARY}>Request</button>
            ) : isOpen ? (
              <Link to="/teams" className={CTA_PRIMARY}>Join a team</Link>
            ) : (
              <span aria-disabled="true" className={cn(CTA_QUIET, 'cursor-default opacity-40')}>Closed</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
