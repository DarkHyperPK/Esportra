/**
 * ScrimOpponentCard
 *
 * One team looking for a scrim, built to answer "are they worth playing?" in a
 * glance: identity first, then record and reliability, then what they want
 * (rank, days, format) and who is on the roster. Prop-driven.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { parseMembersPreview } from '@/services/scrimUtils';
import { formatTimeWindow, listingAge, type ScrimListingEnriched } from '@/services/scrimDiscoveryUtils';
import { TeamRecordStrip } from '../TeamRecordStrip';
import { RankBand } from './RankBand';
import { RosterFaces } from './RosterFaces';
import { WeekDots } from './WeekDots';

interface ScrimOpponentCardProps {
  listing: ScrimListingEnriched;
  isOwner: boolean;
  hasTeam: boolean;
  onOpen: () => void;
}

const CTA_BASE =
  'inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]';
const CTA_PRIMARY = `${CTA_BASE} bg-white text-black hover:bg-zinc-200`;
const CTA_QUIET = `${CTA_BASE} border border-white/[0.14] text-white/80 hover:border-white/30 hover:text-white`;

function Hero({ listing }: { listing: ScrimListingEnriched }) {
  const cardArt = listing.captainCardUrl ?? null;
  const name = listing.teamName ?? 'Unknown team';

  return (
    <div className="relative h-[96px] overflow-hidden bg-white/[0.03]">
      {cardArt ? (
        <img
          src={cardArt}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.6) saturate(1.05)', opacity: 0.75 }}
        />
      ) : null}
      {cardArt && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />}

      <div className="absolute inset-x-3.5 bottom-2.5 flex items-end gap-2.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.18] bg-zinc-800 font-mono text-[13px] font-semibold text-white/70">
          {listing.teamLogoUrl ? <img src={listing.teamLogoUrl} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 pb-0.5">
          <h3 className="truncate font-heading text-[16px] font-bold leading-tight text-white">{name}</h3>
          <p className="truncate text-[11px] text-white/60">
            {[listing.teamTag, listing.regionKey?.toUpperCase()].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ScrimOpponentCard({ listing, isOwner, hasTeam, onOpen }: ScrimOpponentCardProps) {
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
      <Hero listing={listing} />

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <TeamRecordStrip record={listing.record} dense />

        <RankBand minName={listing.minRankDisplayName} maxName={listing.maxRankDisplayName} minIcon={listing.minRankIconUrl} maxIcon={listing.maxRankIconUrl} />

        <div className="flex items-center justify-between gap-3">
          <WeekDots days={listing.preferredDays} soft />
          {timeLabel && <span className="truncate text-[11px] tabular-nums text-zinc-400">{timeLabel}</span>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <RosterFaces members={members} total={listing.activeMemberCount} size="sm" />
          <p className="truncate text-[11px] text-zinc-500">{meta}</p>
        </div>

        {listing.notes && <p className="line-clamp-1 break-words text-[12px] italic text-zinc-400">&ldquo;{listing.notes}&rdquo;</p>}

        <div className="mt-auto flex gap-2 pt-0.5">
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
    </article>
  );
}
