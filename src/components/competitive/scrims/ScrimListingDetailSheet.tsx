import { useState } from 'react';
import { Users } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useScrimListingDetail } from '@/hooks/competitive/useScrims';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import { formatPreferredDays } from '@/services/scrimUtils';
import { formatTimeWindow } from '@/services/scrimDiscoveryUtils';
import type { ScrimTeamMemberDetail, ScrimSlot } from '@/types/competitive';
import '@/components/competitive/lfg-glass.css';

function MemberRow({ member }: { member: ScrimTeamMemberDetail }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = resolveLfgAvatar(null, member.avatarSeed, member.avatarStyle);
  const initials = (member.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-b-0">
      <span className="lfg-avatar" style={{ width: 36, height: 36 }}>
        {src && !imgFailed ? <img src={src} alt="" onError={() => setImgFailed(true)} /> : initials}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white truncate">{member.username ?? 'Player'}</span>
          {member.role === 'captain' && (
            <span style={{ fontSize: 9, color: '#fda4af', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Captain</span>
          )}
          {member.role === 'manager' && (
            <span style={{ fontSize: 9, color: '#a1a1aa', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Manager</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {member.rankIconUrl && (
            <img src={member.rankIconUrl} alt="" className="h-4 w-4 object-contain" />
          )}
          <span className="text-[11px] text-white/50">
            {member.rankDisplayName ?? member.competitiveTierName ?? 'Unranked'}
          </span>
        </div>
      </div>
      {/* Stats */}
      <div className="shrink-0 text-right" style={{ minWidth: 120 }}>
        <div className="flex gap-3 justify-end">
          <div className="text-center">
            <p style={{ fontSize: 9, color: '#a1a1aa' }}>WR</p>
            <p className="text-[12px] font-semibold text-white tabular-nums">
              {member.winRate != null ? `${Math.round(Number(member.winRate))}%` : '—'}
            </p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: 9, color: '#a1a1aa' }}>K/D</p>
            <p className="text-[12px] font-semibold text-white tabular-nums">
              {member.kdRatio != null ? Number(member.kdRatio).toFixed(2) : '—'}
            </p>
          </div>
          <div className="text-center">
            <p style={{ fontSize: 9, color: '#a1a1aa' }}>HS%</p>
            <p className="text-[12px] font-semibold text-white tabular-nums">
              {member.hsPct != null ? `${Math.round(Number(member.hsPct))}%` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotRow({ slot }: { slot: ScrimSlot }) {
  const start = new Date(slot.startsAt);
  const booked = slot.status === 'booked';
  return (
    <div className={`flex items-center justify-between gap-3 py-2 border-b border-white/[0.06] last:border-b-0 ${booked ? 'opacity-40' : ''}`}>
      <div>
        <p className="text-[13px] text-white/80 font-medium">
          {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p className="text-[11px] text-white/45">
          {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>
      <span className={`text-[11px] px-2 py-0.5 ${booked ? 'bg-white/[0.05] text-white/30' : 'bg-emerald-500/15 text-emerald-400'}`}>
        {booked ? 'Booked' : 'Available'}
      </span>
    </div>
  );
}

interface Props {
  listingId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  children: React.ReactNode;
}

export function ScrimListingDetailSheet({ listingId, teamName, teamLogoUrl, children }: Props) {
  const [open, setOpen] = useState(false);
  const detailQuery = useScrimListingDetail(listingId, open);
  const detail = detailQuery.data;
  const listing = detail?.listing;
  const members = detail?.members ?? [];
  const slots = detail?.slots ?? [];

  const dayAbbrevs = listing ? formatPreferredDays(listing.preferredDays) : [];
  const hasSchedule = dayAbbrevs.length > 0 || (!!listing?.preferredTimeStart && !!listing?.preferredTimeEnd);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="bg-[#15151b] border-l border-white/[0.08] w-full sm:max-w-[420px] overflow-y-auto p-0"
      >
        {/* Banner / header */}
        <div className="relative h-28 bg-gradient-to-b from-white/[0.04] to-transparent flex items-end p-5 gap-3">
          {teamLogoUrl && (
            <img src={teamLogoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
          )}
          <span className="lfg-avatar team relative" style={{ width: 48, height: 48 }}>
            {teamLogoUrl ? <img src={teamLogoUrl} alt="" /> : teamName.slice(0, 2).toUpperCase()}
          </span>
          <div className="relative min-w-0">
            <SheetHeader className="p-0">
              <SheetTitle className="font-heading text-[18px] font-bold text-white truncate tracking-normal normal-case">
                {teamName}
              </SheetTitle>
            </SheetHeader>
            {listing && (
              <p className="text-[11px] text-white/40 mt-0.5">
                {[listing.teamTag ? `[${listing.teamTag}]` : null, listing.regionKey?.toUpperCase()].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {detailQuery.isLoading ? (
          <div className="p-5 space-y-3 animate-pulse">
            <div className="h-5 w-32 bg-white/[0.06] rounded" />
            <div className="h-16 w-full bg-white/[0.04] rounded" />
            <div className="h-16 w-full bg-white/[0.04] rounded" />
          </div>
        ) : !detail ? (
          <div className="p-5 text-[13px] text-white/40">Could not load listing details.</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Rank + game info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {listing?.minRankIconUrl && <img src={listing.minRankIconUrl} alt="" className="h-6 w-6 object-contain" />}
                <span className="text-[15px] font-semibold text-white [font-family:var(--font-heading)]">
                  {listing?.minRankDisplayName && listing?.maxRankDisplayName && listing.minRankDisplayName !== listing.maxRankDisplayName
                    ? `${listing.minRankDisplayName} – ${listing.maxRankDisplayName}`
                    : listing?.minRankDisplayName ?? listing?.maxRankDisplayName ?? 'Any rank'}
                </span>
                {listing?.maxRankIconUrl && listing.maxRankIconUrl !== listing?.minRankIconUrl && (
                  <img src={listing.maxRankIconUrl} alt="" className="h-6 w-6 object-contain" />
                )}
              </div>
              <p className="text-[12px] text-white/40">
                {[listing?.modeKey, listing?.gameSlug?.toUpperCase()].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Schedule */}
            {hasSchedule && (
              <div>
                <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Schedule</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {dayAbbrevs.map((day) => (
                    <span key={day} style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.07)', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600, borderRadius: 7 }}>
                      {day.toUpperCase()}
                    </span>
                  ))}
                  {listing?.preferredTimeStart && listing?.preferredTimeEnd && (
                    <span className="text-[12px] text-white/60 font-medium">
                      {dayAbbrevs.length > 0 ? '· ' : ''}
                      {formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd, listing.timezone ?? null)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Available slots */}
            {slots.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>
                  Available slots ({slots.filter(s => s.status === 'available').length})
                </p>
                <div className="lfg-panel" style={{ padding: 12 }}>
                  {slots.map((slot) => <SlotRow key={slot.id} slot={slot} />)}
                </div>
              </div>
            )}

            {/* Notes */}
            {listing?.notes && (
              <div>
                <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Notes</p>
                <p className="text-[12px] text-white/50 whitespace-pre-wrap">{listing.notes}</p>
              </div>
            )}

            {/* Roster */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
                <p style={{ fontSize: 11, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
                  Roster ({members.length})
                </p>
              </div>
              <div className="lfg-panel" style={{ padding: '4px 12px' }}>
                {members.map((m, i) => <MemberRow key={m.username ?? i} member={m} />)}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 text-[10px] text-white/25 pt-2 border-t border-white/[0.06]">
              {(listing?.activeMemberCount ?? 0) > 0 && <span>{listing?.activeMemberCount} players</span>}
              {(listing?.scrimsCompleted ?? 0) > 0 && <span>{listing?.scrimsCompleted} scrims played</span>}
              <span>Listed {new Date(listing?.createdAt ?? '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
