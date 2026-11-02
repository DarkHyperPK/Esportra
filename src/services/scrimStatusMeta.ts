/**
 * scrimStatusMeta.ts
 *
 * Single source of truth for scrim status labels and kit tones. Replaces the
 * per-page maps (workspace STATUS_CHIP/OFFER_TONE, session STATUS_TONE).
 */

import type { Tone } from '@/components/ui/kit/tone';
import type { ScrimSessionStatus } from '@/types/competitive';

export type ScrimOfferStatusKey = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

interface Meta {
  label: string;
  tone: Tone;
}

const SESSION_META: Record<ScrimSessionStatus, Meta> = {
  scheduled: { label: 'Upcoming', tone: 'neutral' },
  in_progress: { label: 'Live', tone: 'accent' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  disputed: { label: 'Disputed', tone: 'warning' },
};

const OFFER_META: Record<ScrimOfferStatusKey, Meta> = {
  pending: { label: 'Pending', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

export const sessionStatusMeta = (status: ScrimSessionStatus): Meta => SESSION_META[status];
export const offerStatusMeta = (status: ScrimOfferStatusKey): Meta => OFFER_META[status];

/** Sessions that still need the team's attention (used by both counts and tabs). */
export const isUpcomingSession = (status: ScrimSessionStatus): boolean =>
  status === 'scheduled' || status === 'in_progress';
