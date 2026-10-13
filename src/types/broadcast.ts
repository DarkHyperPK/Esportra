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
  tournamentSlug?: string | null;
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
  /** ISO timestamp of the last successful push-config call. Null = never synced. */
  lastSyncedAt: string | null;
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
  name: string;
  capabilities: string;
  isActive: boolean;
  /** ISO timestamp of the last heartbeat received by the backend */
  lastSeenAt: string | null;
}

export interface ShowMatchSlot {
  id: string;
  showId: string;
  matchId: string;
  matchCode: string | null;
  displayOrder: number;
  /** Display label for the configured match teams. */
  matchTitle: string | null;
  roundLabel?: string | null;
  teamA?: string;
  teamB?: string;
  bestOf?: number;
  status?: string;
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

// ── P4 Types: Results + Reports ───────────────────────────────────────────────

/** Pending conflict from a ResultConflict SignalR event. */
export interface ConflictData {
  correctionId: string;
  sessionId: string;
  mapNumber: number;
  submittedA: number;
  submittedB: number;
  gepA: number;
  gepB: number;
}

// ── T36: Sponsor proof ────────────────────────────────────────────────────────

export interface SponsorSlotBreakdown {
  totalSeconds: number;
  count: number;
}

export interface SponsorProofSponsor {
  sponsorId: string;
  name: string;
  totalOnAirSeconds: number;
  placementCount: number;
  bySlotType: Record<string, SponsorSlotBreakdown>;
  hasIncomplete: boolean;
  incompleteCount: number;
}

export interface SponsorProofResponse {
  showId: string;
  showTitle: string;
  generatedAt: string;
  sponsors: SponsorProofSponsor[];
}

// ── T37: VOD chapters ─────────────────────────────────────────────────────────

export interface VodChapter {
  segmentId: string;
  segmentName: string;
  segmentType: SegmentType;
  offsetSeconds: number;
  durationSeconds: number | null;
  incomplete: boolean;
}

export interface VodChaptersApiResponse {
  showId: string;
  chapters: VodChapter[];
}

export interface VodChaptersResult {
  showNotEnded: boolean;
  chapters: VodChapter[];
}

// ── T38: Post-show report ─────────────────────────────────────────────────────

export interface ReportMapScore {
  mapNumber: number;
  teamAScore: number | null;
  teamBScore: number | null;
  source: 'gep' | 'manual' | 'captain';
}

export interface ReportMatch {
  matchId: string;
  matchCode: string;
  displayOrder: number;
  status: 'pending' | 'active' | 'done' | string;
  maps: ReportMapScore[];
}

export interface ReportCrewMember {
  userId: string;
  displayName: string | null;
  role: string;
}

export interface ReportSponsor {
  sponsorId: string;
  name: string;
  totalOnAirSeconds: number;
  placementCount: number;
  bySlotType: Record<string, SponsorSlotBreakdown>;
  hasIncomplete: boolean;
  incompleteCount: number;
}

export interface ReportChapter {
  segmentId: string;
  segmentName: string;
  segmentType: SegmentType;
  offsetSeconds: number;
  durationSeconds: number | null;
  incomplete: boolean;
}

export interface ReportPlayerStat {
  matchId: string;
  matchCode: string | null;
  userId: string;
  displayName: string | null;
  kills: number;
  deaths: number;
  assists: number;
}

export interface PostShowReport {
  show: {
    id: string;
    title: string;
    scheduledAt: string | null;
    startedAt: string | null;
    endedAt: string | null;
    durationSeconds: number;
  };
  matches: ReportMatch[];
  crew: ReportCrewMember[];
  sponsors: ReportSponsor[];
  chapters: ReportChapter[];
  corrections: { count: number };
  players: ReportPlayerStat[];
}

export interface PostShowReportResult {
  showNotEnded: boolean;
  forbidden: boolean;
  report: PostShowReport | null;
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
