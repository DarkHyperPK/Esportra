/**
 * scrimDiscoveryUtils.ts
 *
 * Pure utilities for the Scrim Discovery page (PROJ-077 T10).
 * No React, no Supabase — safe to import in components and tests.
 */

import type { ScrimListing } from '@/types/competitive';

// ─── Extended type for new T2 backend fields ──────────────────────────────────

export type ScrimListingEnriched = ScrimListing & {
  scrimsCompleted?: number | null;
};

// ─── Game abbreviation chip ───────────────────────────────────────────────────

const GAME_ABBREV: Record<string, string> = {
  valorant: 'VAL',
  cs2: 'CS2',
  'counter-strike-2': 'CS2',
  fortnite: 'FN',
  apex: 'APX',
};

export function gameAbbrev(slug: string): string {
  return GAME_ABBREV[slug] ?? slug.slice(0, 3).toUpperCase();
}

// ─── Time window formatting ───────────────────────────────────────────────────

function getTimezoneAbbrev(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/**
 * Formats "20:00"/"23:00" + "America/New_York" → "8–11 PM EST".
 * Keeps AM/PM suffix once when both endpoints share the same period.
 */
export function formatTimeWindow(
  start: string,
  end: string,
  timezone: string | null,
): string {
  const fmt12 = (hhmm: string): { label: string; period: string } => {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h < 12 ? 'AM' : 'PM';
    const hour = h % 12 || 12;
    const label = m ? `${hour}:${String(m).padStart(2, '0')}` : `${hour}`;
    return { label, period };
  };
  const s = fmt12(start);
  const e = fmt12(end);
  const tzAbbrev = timezone ? getTimezoneAbbrev(timezone) : '';
  const timeStr =
    s.period === e.period
      ? `${s.label}–${e.label} ${e.period}`
      : `${s.label} ${s.period}–${e.label} ${e.period}`;
  return tzAbbrev ? `${timeStr} ${tzAbbrev}` : timeStr;
}

// ─── Listing age ──────────────────────────────────────────────────────────────

/**
 * Returns a human-readable age for a listing:
 * < 1h → "Just listed", < 24h → "Xh ago", < 7d → "Xd ago", else null.
 */
export function listingAge(createdAt: string): string | null {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffH = diffMs / (1_000 * 60 * 60);
  if (diffH < 1) return 'Just listed';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  const diffD = diffH / 24;
  if (diffD < 7) return `${Math.floor(diffD)}d ago`;
  return null;
}

// ─── Upcoming slot derivation ─────────────────────────────────────────────────

export interface UpcomingSlot {
  dateLabel: string;
  proposedAt: string;
  timeLabel: string;
}

/**
 * Derives upcoming practice slots from a recurring ScrimListing's preferred
 * days and time window. Returns up to 5 slots within the next 14 days and
 * before scheduleUntil.
 */
export function deriveUpcomingSlots(listing: ScrimListing): UpcomingSlot[] {
  if (!listing.preferredDays?.length) return [];
  const until = listing.scheduleUntil ? new Date(listing.scheduleUntil) : null;
  const slots: UpcomingSlot[] = [];
  const now = new Date();
  const timeLabel =
    listing.preferredTimeStart && listing.preferredTimeEnd
      ? formatTimeWindow(
          listing.preferredTimeStart,
          listing.preferredTimeEnd,
          listing.timezone ?? null,
        )
      : '';

  for (let i = 0; i < 14 && slots.length < 5; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    if (until && d > until) break;
    if (!listing.preferredDays.includes(d.getDay())) continue;
    const dateLabel = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const proposedAt = listing.preferredTimeStart
      ? `${d.toISOString().slice(0, 10)}T${listing.preferredTimeStart}`
      : d.toISOString().slice(0, 10);
    slots.push({ dateLabel, proposedAt, timeLabel });
  }
  return slots;
}
