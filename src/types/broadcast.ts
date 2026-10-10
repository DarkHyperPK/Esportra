// Broadcast domain types — mirroring the backend DTOs.
// All fields are camelCase per the frontend convention.

export type BroadcastShowStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';
export type SegmentType = 'match' | 'break' | 'pre_show' | 'post_show' | 'sponsor_slot' | 'custom';
export type SegmentStatus = 'pending' | 'active' | 'done';
export type CrewRole = 'producer' | 'operator' | 'observer' | string;
export type SponsorDisplaySlot = 'lower_third' | 'bug' | 'full_screen' | 'custom' | string;

export interface BroadcastShow {
  id: string;
  orgId: string;
  title: string;
  status: BroadcastShowStatus;
  tournamentId: string | null;
  tournamentName: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

/** Extended detail row returned by GET /api/broadcast/shows/:showId */
export interface BroadcastShowDetail extends BroadcastShow {
  nodeCount: number;
  matchSlotCount: number;
  matchSlotsWithCode: number;
  talentCount: number;
  sponsorCount: number;
  crewCount: number;
  matchSlots: ShowMatchSlot[];
}

export interface ShowSegment {
  id: string;
  showId: string;
  type: SegmentType;
  title: string;
  estimatedDuration: string | null;
  status: SegmentStatus;
  displayOrder: number;
  notes: string | null;
}

/** Node registered via the Air desktop app */
export interface BroadcastNode {
  id: string;
  orgId: string;
  name: string;
  mode: string;
  hudOnline: boolean;
  gepActive: boolean;
  /** ISO timestamp of the last heartbeat received by the backend */
  lastSeenAt: string | null;
}

export interface ShowMatchSlot {
  id: string;
  showId: string;
  matchId: string;
  matchCode: string | null;
  displayOrder: number;
  /** Human-readable label from the bracket (e.g. "Grand Finals") */
  matchTitle: string | null;
  roundLabel: string | null;
}

export interface BroadcastCrewMember {
  id: string;
  showId: string;
  userId: string;
  role: CrewRole;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface BroadcastPendingInvite {
  id: string;
  showId: string;
  role: CrewRole;
  expiresAt: string;
  createdAt: string;
}

/** Returned once by the createInvite mutation — token is NOT cached in TanStack Query */
export interface CrewInviteResult {
  inviteId: string;
  token: string;
  expiresAt: string;
}

export interface BroadcastSponsor {
  id: string;
  showId: string;
  name: string;
  logoUrl: string | null;
  displaySlot: SponsorDisplaySlot;
  isActive: boolean;
  displayOrder: number;
}

/** One step in the T32 setup checklist */
export interface SetupStep {
  id: string;
  title: string;
  description: string;
  /** Label for the CTA link/button */
  cta: string;
  /** Route to navigate to when CTA is clicked */
  ctaHref: string;
  /** Optional in-page action (e.g. "Sync now" triggers pushConfig mutation) */
  ctaAction?: string;
  required: boolean;
}
