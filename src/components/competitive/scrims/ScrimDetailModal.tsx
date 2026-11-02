/**
 * ScrimDetailModal.tsx
 *
 * One modal for the whole request flow: listing details → pick a time → send the
 * offer. Replaces the right-side drawer, which forced a scroll past the roster and
 * flipped every slot button to "Available" as soon as the offer form opened.
 */

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, Clock3, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { useScrimListingDetail } from '@/hooks/competitive/useScrims';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import {
  bestOfLabel,
  formatPreferredDays,
  winsNeeded,
} from '@/services/scrimUtils';
import { formatTimeWindow } from '@/services/scrimDiscoveryUtils';
import { ScrimOfferForm } from './ScrimOfferForm';
import { TeamRecordStrip } from './TeamRecordStrip';
import type { ScrimSlot, ScrimTeamMemberDetail } from '@/types/competitive';

interface Props {
  /** Listing to show; null closes the modal. */
  listingId: string | null;
  /** Fallbacks while the detail request is in flight. */
  teamName?: string | null;
  teamLogoUrl?: string | null;
  gameSlug?: string | null;
  /** Owner sees details only — their own listing is managed from the workspace. */
  isOwner?: boolean;
  onClose: () => void;
}

const EYEBROW =
  'font-mono text-[10px] uppercase tracking-[0.22em] text-white/30';

function formatSlotDate(slot: ScrimSlot | { startsAt: string }): string {
  const d = new Date(slot.startsAt);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatSlotTime(slot: ScrimSlot | { startsAt: string }): string {
  const d = new Date(slot.startsAt);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function MemberRow({ member }: { member: ScrimTeamMemberDetail }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = resolveLfgAvatar(null, member.avatarSeed, member.avatarStyle);
  const initials = (member.username ?? '?').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.06] last:border-b-0">
      <span className="lfg-avatar shrink-0" style={{ width: 32, height: 32 }}>
        {src && !imgFailed ? (
          <img src={src} alt="" onError={() => setImgFailed(true)} />
        ) : (
          initials
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-white">
            {member.username ?? 'Player'}
          </span>
          {member.role === 'captain' && (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-rose-300/80">
              Captain
            </span>
          )}
          {member.role === 'manager' && (
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/35">
              Manager
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {member.rankIconUrl && (
            <img src={member.rankIconUrl} alt="" className="h-4 w-4 object-contain" />
          )}
          <span className="text-[11px] text-white/55">
            {member.rankDisplayName ?? member.competitiveTierName ?? 'Unranked'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-3 text-center">
        {[
          ['WR', member.winRate != null ? `${Math.round(Number(member.winRate))}%` : '—'],
          ['K/D', member.kdRatio != null ? Number(member.kdRatio).toFixed(2) : '—'],
          ['HS', member.hsPct != null ? `${Math.round(Number(member.hsPct))}%` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="w-9">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/25">
              {label}
            </p>
            <p className="text-[11px] font-semibold tabular-nums text-white/75">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScrimDetailModal({
  listingId,
  teamName,
  teamLogoUrl,
  gameSlug,
  isOwner = false,
  onClose,
}: Props) {
  const open = !!listingId;
  const [step, setStep] = useState<'details' | 'offer'>('details');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showRoster, setShowRoster] = useState(false);

  const detailQuery = useScrimListingDetail(listingId ?? '', open);
  const detail = detailQuery.data;
  const listing = detail?.listing;
  const members = detail?.members ?? [];
  const slots = useMemo(() => detail?.slots ?? [], [detail]);

  const catalog = useGameCatalogContext();
  const activeGameSlug = listing?.gameSlug ?? gameSlug ?? null;
  const catalogGame = catalog.games.find((g) => g.slug === activeGameSlug);

  // Reset the flow whenever the modal closes or switches listings.
  useEffect(() => {
    if (!open) {
      setStep('details');
      setSelectedSlotId(null);
      setShowRoster(false);
    }
  }, [open]);

  useEffect(() => {
    setStep('details');
    setSelectedSlotId(null);
    setShowRoster(false);
  }, [listingId]);

  const resolvedTeamName = listing?.teamName ?? teamName ?? 'Team';
  const resolvedTeamLogo = listing?.teamLogoUrl ?? teamLogoUrl ?? null;
  const initials = resolvedTeamName.slice(0, 2).toUpperCase();

  const captain = members.find((m) => m.role === 'captain');
  const captainCardUrl =
    captain?.playerCardId && activeGameSlug === 'valorant'
      ? `https://media.valorant-api.com/playercards/${captain.playerCardId}/wideart.png`
      : null;
  const bannerUrl = captainCardUrl ?? resolvedTeamLogo;

  const dayAbbrevs = listing ? formatPreferredDays(listing.preferredDays) : [];
  const hasSchedule =
    dayAbbrevs.length > 0 ||
    (!!listing?.preferredTimeStart && !!listing?.preferredTimeEnd);

  const availableSlots = slots.filter((s) => s.status === 'available');
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  const slotGroups = useMemo(() => {
    const groups = new Map<string, { label: string; slots: ScrimSlot[] }>();
    for (const slot of slots) {
      const key = new Date(slot.startsAt).toDateString();
      if (!groups.has(key)) {
        groups.set(key, { label: formatSlotDate(slot), slots: [] });
      }
      groups.get(key)!.slots.push(slot);
    }
    for (const group of groups.values()) {
      group.slots.sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    }
    return [...groups.values()];
  }, [slots]);

  const rankRange =
    listing?.minRankDisplayName &&
    listing.maxRankDisplayName &&
    listing.minRankDisplayName !== listing.maxRankDisplayName
      ? `${listing.minRankDisplayName} – ${listing.maxRankDisplayName}`
      : listing?.minRankDisplayName ?? listing?.maxRankDisplayName ?? 'Any rank';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[640px] flex-col gap-0 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0b0e] p-0 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative h-[132px] shrink-0 overflow-hidden">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                filter: captainCardUrl
                  ? 'brightness(0.55) saturate(1.15)'
                  : 'blur(6px) brightness(0.5)',
                transform: captainCardUrl ? undefined : 'scale(1.12)',
                opacity: captainCardUrl ? 0.55 : 0.8,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0e] via-[#0b0b0e]/60 to-transparent" />

          {/* Game crest, top-left */}
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-white/[0.12] bg-black/55 px-2 py-1.5 backdrop-blur-md">
            {activeGameSlug ? (
              <GameLogoImage
                gameName={activeGameSlug}
                catalogLogo={catalogGame?.logo}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <span className="h-6 w-6" />
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
              {catalogGame?.name ?? activeGameSlug ?? 'Scrim'}
            </span>
          </div>

          {/* Team identity */}
          <div className="absolute inset-x-5 bottom-3 flex items-end gap-3">
            <span
              className="lfg-avatar team shrink-0 border border-white/[0.14] bg-white/[0.06] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.9)]"
              style={{ width: 56, height: 56, borderRadius: 14 }}
            >
              {resolvedTeamLogo ? (
                <img src={resolvedTeamLogo} alt="" />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0 pb-0.5">
              <DialogTitle className="truncate font-heading text-[19px] font-bold tracking-normal text-white">
                {resolvedTeamName}
              </DialogTitle>
              <p className="mt-0.5 truncate text-[11px] text-white/45">
                {[
                  listing?.teamTag ? `[${listing.teamTag}]` : null,
                  listing?.regionKey?.toUpperCase(),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {listing && (
              <span className="ml-auto mb-1 shrink-0 rounded-full bg-white/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-white/70">
                {bestOfLabel(listing.bestOf)}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listing && (
            <div className="px-5 pt-4">
              <TeamRecordStrip record={listing.record} />
            </div>
          )}
          {detailQuery.isLoading ? (
            <div className="space-y-3 p-5 animate-pulse">
              <div className="h-5 w-40 rounded bg-white/[0.06]" />
              <div className="h-14 w-full rounded-xl bg-white/[0.04]" />
              <div className="h-24 w-full rounded-xl bg-white/[0.04]" />
            </div>
          ) : !listing ? (
            <div className="p-5 text-[13px] text-white/45">
              Could not load listing details.
            </div>
          ) : step === 'offer' ? (
            <div className="p-5">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="mb-3 inline-flex items-center gap-1 text-[12px] text-white/45 transition-colors hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Back to details
              </button>
              {selectedSlot && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-3 py-2">
                  <Clock3 className="h-3.5 w-3.5 text-rose-400" aria-hidden />
                  <span className="text-[12px] font-medium text-white/85">
                    {formatSlotDate(selectedSlot)} · {formatSlotTime(selectedSlot)}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-rose-300/70">
                    {bestOfLabel(listing.bestOf)} · first to {winsNeeded(listing.bestOf)}
                  </span>
                </div>
              )}
              <ScrimOfferForm
                listingId={listing.id}
                gameSlug={listing.gameSlug ?? gameSlug ?? null}
                bestOf={listing.bestOf}
                prefilledProposedAt={selectedSlot?.startsAt}
                slotId={selectedSlot?.id}
                onClose={() => setStep('details')}
              />
            </div>
          ) : (
            <div className="space-y-5 p-5">
              {/* Format summary */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1">
                  {listing.minRankIconUrl && (
                    <img
                      src={listing.minRankIconUrl}
                      alt=""
                      className="h-4 w-4 object-contain"
                    />
                  )}
                  <span className="text-[12px] font-medium text-white/80">{rankRange}</span>
                  {listing.maxRankIconUrl &&
                    listing.maxRankIconUrl !== listing.minRankIconUrl && (
                      <img
                        src={listing.maxRankIconUrl}
                        alt=""
                        className="h-4 w-4 object-contain"
                      />
                    )}
                </span>
                <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-white/60">
                  5v5
                </span>
                <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.12em] text-white/60">
                  {bestOfLabel(listing.bestOf).toUpperCase()}
                </span>
                {listing.scheduleType === 'recurring' && (
                  <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                    Recurring
                  </span>
                )}
              </div>

              {/* Availability */}
              {hasSchedule && (
                <section>
                  <p className={EYEBROW}>Available</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {dayAbbrevs.map((day) => (
                      <span
                        key={day}
                        className="rounded-md border border-white/[0.07] bg-black/40 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        {day}
                      </span>
                    ))}
                    {listing.preferredTimeStart && listing.preferredTimeEnd && (
                      <span className="ml-1 text-[12px] font-medium tabular-nums text-white/60">
                        {formatTimeWindow(
                          listing.preferredTimeStart,
                          listing.preferredTimeEnd,
                          listing.timezone ?? null,
                        )}
                      </span>
                    )}
                  </div>
                </section>
              )}

              {/* Slots */}
              {slots.length > 0 && (
                <section>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={EYEBROW}>Pick a time</p>
                    <span className="text-[11px] text-white/30">
                      {availableSlots.length} of {slots.length} open
                    </span>
                  </div>
                  <div className="mt-2 space-y-3">
                    {slotGroups.map((group) => (
                      <div
                        key={group.label}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
                      >
                        <p className="mb-2 px-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                          {group.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.slots.map((slot) => {
                            const booked = slot.status !== 'available';
                            const selected = slot.id === selectedSlotId;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={booked}
                                aria-pressed={selected}
                                onClick={() =>
                                  setSelectedSlotId(selected ? null : slot.id)
                                }
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium tabular-nums transition-colors ${
                                  booked
                                    ? 'cursor-not-allowed border-white/[0.04] text-white/20 line-through'
                                    : selected
                                      ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                                      : 'border-white/[0.08] text-white/70 hover:border-white/25 hover:text-white'
                                }`}
                              >
                                {selected && <Check className="h-3 w-3" aria-hidden />}
                                {formatSlotTime(slot)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Notes */}
              {listing.notes && (
                <section>
                  <p className={EYEBROW}>Message</p>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/55">
                    {listing.notes}
                  </p>
                </section>
              )}

              {/* Roster (collapsed by default — details stay above the fold) */}
              <section className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setShowRoster((v) => !v)}
                  aria-expanded={showRoster}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                >
                  <Users className="h-3.5 w-3.5 text-white/35" aria-hidden />
                  <span className={EYEBROW}>Roster</span>
                  <span className="text-[11px] tabular-nums text-white/30">
                    {members.length}
                  </span>
                  <ChevronDown
                    className={`ml-auto h-3.5 w-3.5 text-white/30 transition-transform ${
                      showRoster ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                {showRoster && (
                  <div className="border-t border-white/[0.06] px-3">
                    {members.length > 0 ? (
                      members.map((m, i) => (
                        <MemberRow key={m.username ?? i} member={m} />
                      ))
                    ) : (
                      <p className="py-3 text-[12px] text-white/30">No roster listed.</p>
                    )}
                  </div>
                )}
              </section>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-3 text-[10px] text-white/25">
                {(listing.activeMemberCount ?? 0) > 0 && (
                  <span>{listing.activeMemberCount} players</span>
                )}
                {(listing.scrimsCompleted ?? 0) > 0 && (
                  <span>{listing.scrimsCompleted} scrims played</span>
                )}
                <span>
                  Listed{' '}
                  {new Date(listing.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        {detail && step === 'details' && (
          <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.07] bg-black/30 px-4 py-3">
            <p className="min-w-0 flex-1 truncate text-[12px] text-white/40">
              {isOwner
                ? 'Your listing — manage availability and offers from the workspace.'
                : selectedSlot
                  ? `${formatSlotDate(selectedSlot)} · ${formatSlotTime(selectedSlot)}`
                  : listing?.scheduleType === 'recurring'
                    ? 'Pick a time above, or request without one'
                    : 'Request with a time that suits both teams'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/[0.08] px-3.5 py-2 text-[12px] font-medium text-white/55 transition-colors hover:border-white/20 hover:text-white"
            >
              Close
            </button>
            {!isOwner && (
              <button
                type="button"
                onClick={() => setStep('offer')}
                className="rounded-xl bg-rose-500 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_0_18px_-4px_rgba(255,45,85,0.6)] transition-colors hover:bg-rose-600"
              >
                Request scrim
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
