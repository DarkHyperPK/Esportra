/**
 * competitive.ts — Esportra competitive domain types
 *
 * PROJ-075 overhaul (2026-10-25):
 * - LfgIntent aligned to DB 7-value enum
 * - New canonical catalog types: CatalogRankTier, CatalogGameRole, CatalogRegion
 * - New request/response types: UpdateLfgListingRequest, LfgInterestStatus, ExpressInterestRequest
 * - Enriched fields added to LfgListing, LfgInterest, PlayerSearchResult, CompetitiveProfile
 * - Old field names kept as optional deprecated properties for backward compat
 *   until legacy components are rewritten in T11-T13
 *
 * Source of truth: .claude/company/projects/PROJ-075/shared-contracts/types.md
 */

// ── Shared enums ──────────────────────────────────────────────────────────────

export type CompetitiveProvenance = 'self_reported' | 'provider_linked' | 'provider_verified';

export type LfgStatus = 'draft' | 'published' | 'paused' | 'expired' | 'closed' | 'removed';

/**
 * LFG intent — aligned to DB lfg_intent enum (PROJ-075 BREAK-1 fix).
 * @see shared-contracts/types.md §1
 */
export type LfgIntent =
  | 'looking_for_team'
  | 'looking_for_player'
  | 'competitive_roster'
  // Legacy values — DB enum retains these; not accepted by new listings
  | 'duo'
  | 'group'
  | 'teammates'
  | 'casual';

export type ExperienceLevel = 'casual' | 'amateur' | 'semi_pro' | 'pro';

export type PreferredEnvironment = 'casual' | 'competitive' | 'pro';

/** @deprecated — backend uses `looking_for_team: boolean`. Kept for component backward compat. */
export type LftStatus = 'open' | 'not_looking' | 'closed';

// ── Catalog types (canonical — PROJ-075) ──────────────────────────────────────

/**
 * Canonical rank tier from GET /api/catalog/rank-tiers?game={slug}.
 * @see shared-contracts/types.md §2
 */
export interface CatalogRankTier {
  id: string;
  gameSlug: string;
  tierKey: string;
  displayName: string;
  sortOrder: number;
  divisionCount: number;
  iconUrl: string | null;
}

/**
 * Canonical game role from GET /api/catalog/game-roles?game={slug}.
 * @see shared-contracts/types.md §2
 */
export interface CatalogGameRole {
  id: string;
  gameSlug: string;
  roleKey: string;
  displayName: string;
  sortOrder: number;
  iconUrl: string | null;
}

/**
 * Canonical region from GET /api/catalog/regions?game={slug}.
 * @see shared-contracts/types.md §2
 */
export interface CatalogRegion {
  id: string;
  gameSlug: string;
  regionKey: string;
  displayName: string;
  serverIds: string[];
}

/**
 * @deprecated Use CatalogRankTier. Legacy shape kept for component backward compat.
 * Components using this type will be updated in T11-T13.
 */
export interface RankTier {
  id: string;
  gameSlug: string;
  /** @deprecated Use CatalogRankTier.tierKey */
  slug: string;
  displayName: string;
  /** @deprecated Use CatalogRankTier.sortOrder */
  tier: number;
  /** @deprecated Use CatalogRankTier.divisionCount */
  division: number | null;
}

/**
 * @deprecated Use CatalogGameRole. Legacy shape kept for component backward compat.
 */
export interface GameRole {
  id: string;
  gameSlug: string;
  /** @deprecated Use CatalogGameRole.roleKey */
  slug: string;
  displayName: string;
}

/**
 * @deprecated Use CatalogRegion. Legacy shape kept for component backward compat.
 */
export interface GameRegion {
  id: string;
  gameSlug: string;
  /** @deprecated Use CatalogRegion.regionKey */
  slug: string;
  displayName: string;
}

// ── Competitive profile ───────────────────────────────────────────────────────

/**
 * GET /api/competitive/profiles/{userId}?game={slug}
 * @see shared-contracts/types.md §4
 */
export interface CompetitiveProfile {
  id: string;
  userId: string;
  gameSlug: string;

  // Canonical fields (PROJ-075)
  rankTierKey: string | null;
  rankSource: CompetitiveProvenance;
  preferredRoles: string[];
  mainRole: string | null;
  regionKey: string | null;
  preferredServers: string[];
  lookingForTeam: boolean;
  recruitmentVisible: boolean;
  profileVisible: boolean;
  availabilityVisible: boolean;
  riotIdVisible: boolean;
  competitiveExperience: ExperienceLevel | null;
  preferredTeamEnvironment: PreferredEnvironment | null;
  languages: string[];
  notes: string | null;
  updatedAt: string;
  // Enriched via JOIN (added in T5)
  rankDisplayName: string | null;
  rankIconUrl: string | null;
  rankSortOrder: number | null;
  regionDisplayName: string | null;

  // Deprecated fields — required for legacy component compat until T11-T13
  /** @deprecated Use rankTierKey */
  rankTierSlug: string | null;
  /** @deprecated Use rankSource */
  rankProvenance: CompetitiveProvenance;
  /** @deprecated Use preferredRoles */
  roles: string[];
  /** @deprecated Use regionKey */
  regionSlug: string | null;
  /** @deprecated Use preferredServers */
  servers: string[];
  /** @deprecated Use lookingForTeam */
  lftStatus: LftStatus;
  /** @deprecated Use competitiveExperience */
  experienceLevel: ExperienceLevel | null;
  /** @deprecated Use preferredTeamEnvironment */
  preferredEnvironment: PreferredEnvironment | null;
  /** @deprecated No such column — use recruitmentVisible */
  lftVisible: boolean;
  /** @deprecated Use rankDisplayName */
  rankTierDisplayName: string | null;
}

export interface UpsertCompetitiveProfileRequest {
  gameSlug: string;

  // Canonical fields (PROJ-075)
  rankTierKey?: string | null;
  rankSource?: CompetitiveProvenance;
  preferredRoles?: string[];
  mainRole?: string | null;
  regionKey?: string | null;
  preferredServers?: string[];
  lookingForTeam?: boolean;
  recruitmentVisible?: boolean;
  profileVisible?: boolean;
  availabilityVisible?: boolean;
  riotIdVisible?: boolean;
  competitiveExperience?: ExperienceLevel | null;
  preferredTeamEnvironment?: PreferredEnvironment | null;
  languages?: string[];
  notes?: string | null;

  // Deprecated — kept for legacy component compat
  /** @deprecated Use rankTierKey */
  rankTierSlug?: string | null;
  /** @deprecated Use rankSource */
  rankProvenance?: CompetitiveProvenance;
  /** @deprecated Use preferredRoles */
  roles?: string[];
  /** @deprecated Use regionKey */
  regionSlug?: string | null;
  /** @deprecated Use preferredServers */
  servers?: string[];
  /** @deprecated Use lookingForTeam */
  lftStatus?: LftStatus;
  /** @deprecated Use competitiveExperience */
  experienceLevel?: ExperienceLevel | null;
  /** @deprecated Use preferredTeamEnvironment */
  preferredEnvironment?: PreferredEnvironment | null;
  /** @deprecated No such column */
  lftVisible?: boolean;
}

// ── LFG types ─────────────────────────────────────────────────────────────────

/**
 * LFG listing response shape (discovery, mine, detail).
 * @see shared-contracts/types.md §3
 */
export interface PopularAgent {
  agentId: string;
  displayName: string;
  iconUrl: string;
  gamesPlayed: number;
  wins: number;
  kills?: number;
  deaths?: number;
  kdRatio?: number | null;
}

export interface LfgListing {
  isSaved?: boolean;
  viewerInterestId?: string | null;
  viewerInterestStatus?: LfgInterestStatus | null;
  viewerConversationId?: string | null;
  id: string;
  userId: string;
  teamId: string | null;
  gameSlug: string;
  intent: LfgIntent;
  status: LfgStatus;
  createdAt: string;
  updatedAt: string;
  /** Spec: string | null. Kept as string for legacy Avatar component compat (T11-T13 fix). */
  username: string;
  avatarSeed: string | null;
  profileAvatarUrl?: string | null;
  profileBannerUrl?: string | null;
  avatarStyle?: string | null;

  // Canonical fields (PROJ-075)
  modeKey: string | null;
  regionKey: string | null;
  regionDisplayName: string | null;
  preferredServers: string[];
  minRankSortOrder: number | null;
  maxRankSortOrder: number | null;
  minRankDisplayName: string | null;
  maxRankDisplayName: string | null;
  minRankIconUrl: string | null;
  maxRankIconUrl: string | null;
  preferredRoles: string[];
  preferredAgents: string[];
  languages: string[];
  description: string | null;
  expiresAt: string | null;

  // Deprecated fields — required (not optional) for legacy component compat until T11-T13.
  // Runtime note: API returns preferred_roles → preferredRoles; "roles" will be undefined
  // at runtime despite being typed string[]. This is the pre-existing broken state.
  /** @deprecated Use modeKey */
  mode: string | null;
  /** @deprecated Use minRankSortOrder */
  minRankSlug: string | null;
  /** @deprecated Use maxRankSortOrder */
  maxRankSlug: string | null;
  /** @deprecated Use regionKey */
  regionSlug: string | null;
  /** @deprecated Use preferredServers */
  servers: string[];
  /** @deprecated Use preferredRoles */
  roles: string[];
  /** @deprecated Not in DB schema */
  publishedAt: string | null;
  /** @deprecated Not in DB schema */
  closedAt: string | null;
  /** @deprecated Use avatarSeed */
  avatarUrl: string | null;

  // Riot stats enrichment (from riot_player_stats JOIN)
  playerCardId?: string | null;
  competitiveTier: number | null;
  competitiveTierName: string | null;
  winCount: number | null;
  lossCount: number | null;
  winRate: number | null;
  kdRatio: number | null;
  hsPct?: number | null;
  popularAgents: PopularAgent[] | null;
  statsSyncStatus?: 'pending' | 'syncing' | 'complete' | 'partial' | 'error' | null;
  matchesAnalyzed: number | null;
  riotSyncedAt: string | null;
  // Riot identity
  riotGameName: string | null;
  riotTagLine: string | null;
  // Team enrichment (for LFP listings)
  teamName: string | null;
  teamLogoUrl: string | null;
  teamCaptainPlayerCardId?: string | null;
  teamTag: string | null;
  teamMemberCount: number | null;
  teamVerifiedCount: number | null;
}

/**
 * POST /api/competitive/lfg
 * Frontend sends camelCase; apiClient transform layer converts to snake_case.
 * @see shared-contracts/types.md §3
 */
export interface CreateLfgListingRequest {
  gameSlug: string;
  intent: LfgIntent;
  teamId?: string | null;

  // Canonical fields (PROJ-075)
  modeKey?: string | null;
  regionKey?: string | null;
  preferredServers?: string[];
  minRankSortOrder?: number | null;
  maxRankSortOrder?: number | null;
  preferredRoles?: string[];
  preferredAgents?: string[];
  languages?: string[];
  description?: string | null;
  /** ISO 8601 absolute datetime; required for non-casual intents */
  expiresAt?: string | null;

  // Deprecated — kept for legacy component compat
  /** @deprecated Backend always creates as draft; field is ignored */
  status?: 'draft' | 'published';
  /** @deprecated Use modeKey */
  mode?: string | null;
  /** @deprecated Use minRankSortOrder */
  minRankSlug?: string | null;
  /** @deprecated Use maxRankSortOrder */
  maxRankSlug?: string | null;
  /** @deprecated Use regionKey */
  regionSlug?: string | null;
  /** @deprecated Use preferredServers */
  servers?: string[];
  /** @deprecated Use preferredRoles */
  roles?: string[];
  /** @deprecated Use expiresAt (ISO 8601 absolute datetime) */
  expiryHours?: number;
}

/**
 * PUT /api/competitive/lfg/{id}
 * gameSlug omitted — cannot change game on an existing listing.
 * @see shared-contracts/types.md §3
 */
export interface UpdateLfgListingRequest {
  clearMode?: boolean;
  clearRegion?: boolean;
  clearMinRank?: boolean;
  clearMaxRank?: boolean;
  clearDescription?: boolean;
  modeKey?: string | null;
  regionKey?: string | null;
  preferredServers?: string[];
  minRankSortOrder?: number | null;
  maxRankSortOrder?: number | null;
  preferredRoles?: string[];
  preferredAgents?: string[];
  languages?: string[];
  description?: string | null;
  expiresAt?: string | null;
}

// ── LFG interest types ────────────────────────────────────────────────────────

/**
 * @see shared-contracts/types.md §3
 */
export type LfgInterestStatus = 'expressed' | 'accepted' | 'declined' | 'withdrawn' | 'blocked';

/**
 * Response from GET /api/competitive/lfg/{id}/interests
 * @see shared-contracts/types.md §3
 */
export interface LfgInterest {
  id: string;
  listingId: string;
  fromUserId: string;
  /** Spec: string | null. Kept as string for legacy Avatar component compat (T11-T13 fix). */
  username: string;
  avatarSeed: string | null;
  profileAvatarUrl?: string | null;
  avatarStyle?: string | null;
  rankTierKey: string | null;
  rankTierDisplayName: string | null;
  rankTierIconUrl: string | null;
  rankSource: CompetitiveProvenance | null;
  preferredRoles: string[];
  regionKey: string | null;
  regionDisplayName: string | null;
  message: string | null;
  status: LfgInterestStatus;
  createdAt: string;

  // Deprecated — required for legacy component compat until T11-T13
  /** @deprecated Use fromUserId */
  userId: string;
  /** @deprecated Use avatarSeed */
  avatarUrl: string | null;
  /** @deprecated Use rankTierKey */
  rankTierSlug: string | null;
  /** @deprecated Use rankSource */
  rankProvenance: CompetitiveProvenance;
  /** @deprecated Use preferredRoles */
  roles: string[];
  /** @deprecated Use regionKey */
  regionSlug: string | null;
  /** @deprecated Not in DB schema for interests */
  servers: string[];
}

/**
 * POST /api/competitive/lfg/{id}/interest
 */
export interface ExpressInterestRequest {
  message?: string | null;
}

// ── Team members (detailed) ───────────────────────────────────────────────────

export interface TeamDetailedMember {
  userId: string;
  username: string;
  role: string;
  riotGameName: string | null;
  riotTagLine: string | null;
  kd: number | null;
  winRate: number | null;
  tournamentCount: number;
}

export interface LfgRosterMember {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  avatarSeed: string | null;
  avatarStyle: string | null;
  rosterRole: string | null;
  isStarter: boolean;
  competitiveTier: number | null;
  competitiveTierName: string | null;
  kdRatio: number | null;
  winRate: number | null;
  matchesAnalyzed: number | null;
}

export interface LfgRoster {
  status: 'available' | 'missing' | 'ambiguous';
  members: LfgRosterMember[];
}

// ── My game stats (LFT create flow) ──────────────────────────────────────────

export interface ValorantActStats {
  actId: string;
  isCurrent: boolean;
  startsAt: string;
  syncStatus: 'pending' | 'partial' | 'available';
  matches: number;
  competitiveMatches: number;
  popularAgents: PopularAgent[];
}

export interface MyGameStats {
  actStats?: ValorantActStats[];
  riotLinked: boolean;
  riotGameName: string | null;
  riotTagLine: string | null;
  syncStatus: 'pending' | 'syncing' | 'complete' | 'partial' | 'error' | null;
  syncedAt: string | null;
  playerCardId?: string | null;
  competitiveTier: number | null;
  competitiveTierName: string | null;
  winCount: number | null;
  lossCount: number | null;
  winRate: number | null;
  kdRatio: number | null;
  hsPct?: number | null;
  matchesAnalyzed: number | null;
  popularAgents: PopularAgent[] | null;
}

// ── Player search ─────────────────────────────────────────────────────────────

/**
 * Response from GET /api/competitive/profiles/search
 * @see shared-contracts/types.md §5
 */
export interface PlayerSearchResult {
  userId: string;
  /** Spec: string | null. Kept as string for legacy Avatar component compat (T11-T13 fix). */
  username: string;
  avatarSeed: string | null;
  riotId: string | null;
  riotIdVisible: boolean;

  // Canonical fields (PROJ-075)
  rankTierKey: string | null;
  rankDisplayName: string | null;
  rankIconUrl: string | null;
  rankSource: CompetitiveProvenance;
  preferredRoles: string[];
  mainRole: string | null;
  regionKey: string | null;
  regionDisplayName: string | null;
  preferredServers: string[];
  lookingForTeam: boolean;
  languages: string[];

  // Deprecated — required for legacy component compat until T11-T13
  /** @deprecated Use avatarSeed */
  avatarUrl: string | null;
  /** @deprecated Use rankTierKey */
  rankTierSlug: string | null;
  /** @deprecated Use rankDisplayName */
  rankTierDisplayName: string | null;
  /** @deprecated Use rankSource */
  rankProvenance: CompetitiveProvenance;
  /** @deprecated Use preferredRoles */
  roles: string[];
  /** @deprecated Use regionKey */
  regionSlug: string | null;
  /** @deprecated Use preferredServers */
  servers: string[];
  /** @deprecated Use lookingForTeam */
  lftStatus: LftStatus;
}

/**
 * Query params for GET /api/competitive/profiles/search
 * @see shared-contracts/types.md §5
 */
export interface PlayerSearchFilters {
  game: string;
  roles?: string[];
  /** sort_order integer (from catalog) — not a rank slug */
  minRank?: number;
  /** sort_order integer (from catalog) — not a rank slug */
  maxRank?: number;
  /** region_key from catalog */
  regionKey?: string;
  lookingForTeam?: boolean;
  limit?: number;
  offset?: number;

  // Deprecated — kept for legacy component compat until T11-T13
  /** @deprecated Use regionKey */
  region?: string;
  /** @deprecated Use lookingForTeam */
  lftOnly?: boolean;
  /** @deprecated Use offset */
  page?: number;
}

/**
 * Query params for GET /api/competitive/lfg
 * @see shared-contracts/types.md §5
 */
export interface LfgSearchFilters {
  game: string;
  roles?: string[];
  query?: string;
  language?: string;
  server?: string;
  savedOnly?: boolean;
  intent?: LfgIntent[];
  /** sort_order integer */
  minRank?: number;
  /** sort_order integer */
  maxRank?: number;
  regionKey?: string;
  limit?: number;
  offset?: number;

  // Deprecated — kept for legacy component compat until T11-T13
  /** @deprecated Use regionKey */
  region?: string;
  /** @deprecated Use offset */
  page?: number;
}

export interface LfgInboxEntry {
  intent: LfgIntent;
  id: string;
  listingId: string;
  fromUserId: string;
  toUserId: string;
  status: LfgInterestStatus;
  message: string | null;
  createdAt: string;
  gameSlug: string;
  listingName: string | null;
  listingStatus: LfgStatus;
  counterpartUsername: string | null;
  counterpartAvatarSeed?: string | null;
  counterpartAvatarUrl?: string | null;
  counterpartAvatarStyle?: string | null;
  conversationId: string | null;
}

// ── Availability ──────────────────────────────────────────────────────────────

export interface AvailabilityRule {
  id: string;
  userId: string;
  timezone: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

// ── Recruitment ───────────────────────────────────────────────────────────────

export type RecruitmentOpeningStatus =
  | 'draft'
  | 'open'
  | 'paused'
  | 'filled'
  | 'closed'
  | 'expired'
  | 'moderated';

export type RecruitmentApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'trial_invited'
  | 'offer_extended'
  | 'accepted'
  | 'withdrawn'
  | 'rejected'
  | 'expired'
  | 'archived'
  | 'removed';

export type RecruitmentMode = 'quick' | 'structured';

export interface RecruitmentOpening {
  id: string;
  teamId: string;
  gameSlug: string;
  title: string;
  description: string | null;
  requirements: string | null;
  positionsAvailable: number | null;
  positionsFilled: number;
  mode: RecruitmentMode;
  tournamentId: string | null;
  status: RecruitmentOpeningStatus;
  createdBy: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  teamName: string | null;
  teamLogoUrl: string | null;
  teamTag: string | null;
}

export interface RecruitmentApplication {
  id: string;
  openingId: string;
  applicantUserId: string;
  status: RecruitmentApplicationStatus;
  coverLetter: string | null;
  createdAt: string;
  updatedAt: string;
  applicantUsername?: string;
  applicantAvatarSeed?: string;
  openingTitle?: string;
  gameSlug?: string;
  teamName?: string;
  teamLogoUrl?: string;
}

export interface CreateRecruitmentOpeningRequest {
  teamId: string;
  gameSlug: string;
  title: string;
  description?: string;
  requirements?: string;
  positionsAvailable?: number;
  mode?: RecruitmentMode;
  tournamentId?: string;
  expiresAt?: string;
}

// ── Tryouts ───────────────────────────────────────────────────────────────────

export type TryoutSessionStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type TryoutParticipantStatus = 'invited' | 'confirmed' | 'declined' | 'attended' | 'no_show' | 'removed';
export type TryoutRecommendation = 'offer' | 'pass' | 'undecided';

export interface TryoutSession {
  id: string;
  teamId: string;
  gameSlug: string | null;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  maxParticipants: number | null;
  minRankKey: string | null;
  maxRankKey: string | null;
  status: TryoutSessionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  teamName?: string;
  teamLogoUrl?: string;
  participantCount?: number;
}

export interface TryoutParticipant {
  id: string;
  sessionId: string;
  userId: string;
  invitedBy: string;
  status: TryoutParticipantStatus;
  invitedAt: string;
  respondedAt: string | null;
  username?: string;
  avatarSeed?: string;
}

export interface TryoutEvaluation {
  id: string;
  sessionId: string;
  evaluateeUserId: string;
  evaluatorUserId: string;
  overallScore: number;
  communication: number;
  mechanics: number;
  gameSense: number;
  attitude: number;
  teamwork: number;
  peakPlay: number;
  consistency: number;
  notes: string | null;
  recommendation: TryoutRecommendation;
  createdAt: string;
  updatedAt: string;
  evaluateeUsername?: string;
  evaluatorUsername?: string;
}

export interface CreateTryoutSessionRequest {
  teamId: string;
  title: string;
  gameSlug?: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  maxParticipants?: number;
  minRankKey?: string;
  maxRankKey?: string;
}

export interface SubmitEvaluationRequest {
  evaluateeUserId: string;
  overallScore: number;
  communication: number;
  mechanics: number;
  gameSense: number;
  attitude: number;
  teamwork: number;
  peakPlay: number;
  consistency: number;
  notes?: string;
  recommendation?: TryoutRecommendation;
}

export interface TryoutInviteView {
  sessionId: string;
  participantId: string;
  participantStatus: TryoutParticipantStatus;
  title: string;
  gameSlug: string | null;
  scheduledAt: string | null;
  teamName: string | null;
  teamLogoUrl: string | null;
  sessionStatus: TryoutSessionStatus;
}

// ── Scrims & Practice ─────────────────────────────────────────────────────────

export type ScrimListingStatus = 'open' | 'paused' | 'closed';
export type ScrimOfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
export type ScrimSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
export type PracticeSessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type PracticeAttendanceStatus = 'invited' | 'confirmed' | 'attended' | 'absent' | 'excused';

export interface ScrimListing {
  id: string;
  teamId: string;
  gameSlug: string | null;
  modeKey: string | null;
  regionKey: string | null;
  minRankKey: string | null;
  maxRankKey: string | null;
  preferredDays: number[] | null;
  preferredTimeStart: string | null;
  preferredTimeEnd: string | null;
  timezone: string | null;
  notes: string | null;
  status: ScrimListingStatus;
  // T9 — recurring schedule fields
  scheduleType: 'one_off' | 'recurring';
  scheduleUntil: string | null;
  slotDurationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  teamName?: string | null;
  teamLogoUrl?: string | null;
  teamTag?: string | null;
}

export interface ScrimOffer {
  id: string;
  listingId: string;
  offeringTeamId: string;
  proposedAt: string | null;
  proposedDurationMinutes: number | null;
  notes: string | null;
  status: ScrimOfferStatus;
  createdAt: string;
  updatedAt: string;
  offeringTeamName?: string | null;
  listingTeamName?: string | null;
}

export interface ScrimSession {
  id: string;
  team1Id: string;
  team2Id: string;
  gameSlug: string | null;
  modeKey: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  serverInfo: string | null;
  lobbyCode: string | null;
  status: ScrimSessionStatus;
  resultReportedByTeam1: boolean;
  resultReportedByTeam2: boolean;
  team1Score: number | null;
  team2Score: number | null;
  // T2 check-in timestamps (added PROJ-077 T13)
  team1CheckedInAt?: string | null;
  team2CheckedInAt?: string | null;
  // PROJ-078 check-in window + veto fields
  checkinWindowOpenedAt?: string | null;
  vetoSessionId?: string | null;
  vetoMyToken?: string | null;
  // PROJ-078 embedded dispute (null when no dispute)
  dispute?: ScrimDispute | null;
  // myRole: caller's team_members.role — set by GET /api/scrims/sessions/{id} only.
  // 'captain' | 'manager' | null. Used to gate the check-in button.
  myRole?: string | null;
  createdAt: string;
  updatedAt: string;
  team1Name?: string | null;
  team1Logo?: string | null;
  team2Name?: string | null;
  team2Logo?: string | null;
}

// ── PROJ-078 — Dispute + Slot types ──────────────────────────────────────────

export type ScrimDisputeStatus = 'open' | 'escalated' | 'resolved';
export type ScrimDisputeOutcome = 'team1_wins' | 'team2_wins' | 'no_contest';

export interface ScrimDispute {
  id: string;
  sessionId: string;
  raisedByTeamId: string;
  reason: string;
  status: ScrimDisputeStatus;
  createdAt: string;
  updatedAt: string;
  evidenceUrls: string[] | null;
  responderEvidenceUrls: string[] | null;
  responderNotes: string | null;
  resolvedBy: string | null;
  outcome: ScrimDisputeOutcome | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
}

export type ScrimSlotStatus = 'available' | 'booked' | 'cancelled';

export interface ScrimSlot {
  id: string;
  listingId: string;
  startsAt: string;
  endsAt: string;
  status: ScrimSlotStatus;
  createdAt: string;
  bookedByTeamId?: string | null;
  sessionId?: string | null;
}

export interface AdminScrimDisputeRow {
  id: string;
  sessionId: string;
  team1Name: string | null;
  team2Name: string | null;
  gameSlug: string | null;
  scheduledAt: string | null;
  raisedByTeamId: string;
  raisedByTeamName: string | null;
  status: ScrimDisputeStatus;
  reason: string;
  evidenceUrls: string[] | null;
  responderEvidenceUrls: string[] | null;
  outcome: ScrimDisputeOutcome | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ScrimResultReport {
  id: string;
  sessionId: string;
  reportingTeamId: string;
  reportingTeamName?: string | null;
  team1Score: number;
  team2Score: number;
  notes?: string | null;
  // T9 — result confirmation fields
  confirmedByTeamId: string | null;
  confirmedAt: string | null;
}

export interface PracticeSession {
  id: string;
  teamId: string;
  gameSlug: string | null;
  title: string;
  scheduledAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  status: PracticeSessionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  teamName?: string | null;
}

export interface PracticeAttendance {
  id: string;
  sessionId: string;
  userId: string;
  status: PracticeAttendanceStatus;
  username?: string | null;
  avatarSeed?: string | null;
}

// ── Tournament-Competitive integration ────────────────────────────────────────

export interface TeamEligibilityStatus {
  participantId: string;
  teamId: string;
  teamName: string;
  eligible: boolean | null;
  rosterSize: number;
  playersWithRank: number;
  gaps: string[];
  gapCount: number;
}

export interface CompetitiveRecord {
  userId: string;
  memberships: Array<{
    teamId: string;
    teamName: string;
    teamGame: string;
    teamLogoUrl?: string;
    role: string;
    joinedAt: string;
    leftAt?: string;
    leftReason?: string;
  }>;
  placements: Array<{
    tournamentId: string;
    tournamentName: string;
    tournamentGame: string;
    teamName?: string;
    placement: number;
    status: string;
  }>;
  scrims: Array<{
    id: string;
    gameSlug: string;
    scheduledAt: string;
    status: string;
    team1Score?: number;
    team2Score?: number;
    team1Name: string;
    team2Name: string;
    userTeamSide: 1 | 2;
  }>;
  tryoutOutcomes: Array<{
    sessionId: string;
    recommendation: string;
    createdAt: string;
    gameSlug: string;
    sessionTitle: string;
    teamName: string;
  }>;
}

// ── Scouting ──────────────────────────────────────────────────────────────────

export interface ScoutingShortlist {
  id: string;
  ownerUserId: string;
  name: string;
  description?: string;
  gameSlug?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  entries?: ShortlistEntry[];
}

export interface ShortlistEntry {
  id: string;
  shortlistId: string;
  playerUserId: string;
  note?: string;
  addedAt: string;
}

export interface ScoutingNote {
  id: string;
  scoutUserId: string;
  subjectUserId: string;
  gameSlug?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShortlistRequest {
  name: string;
  description?: string;
  gameSlug?: string;
}

export interface UpsertScoutingNoteRequest {
  gameSlug?: string;
  content: string;
}
