export type CompetitiveProvenance = 'self_reported' | 'provider_linked' | 'provider_verified';

export type LfgStatus = 'draft' | 'published' | 'paused' | 'expired' | 'closed' | 'removed';

export type LfgIntent = 'ranked' | 'scrims' | 'casual' | 'coaching';

export type ExperienceLevel = 'casual' | 'amateur' | 'semi_pro' | 'pro';

export type PreferredEnvironment = 'casual' | 'competitive' | 'pro';

export type LftStatus = 'open' | 'not_looking' | 'closed';

export interface RankTier {
  id: string;
  gameSlug: string;
  slug: string;
  displayName: string;
  tier: number;
  division: number | null;
}

export interface GameRole {
  id: string;
  gameSlug: string;
  slug: string;
  displayName: string;
}

export interface GameRegion {
  id: string;
  gameSlug: string;
  slug: string;
  displayName: string;
}

export interface CompetitiveProfile {
  id: string;
  userId: string;
  gameSlug: string;
  rankTierSlug: string | null;
  rankTierDisplayName: string | null;
  rankProvenance: CompetitiveProvenance;
  roles: string[];
  mainRole: string | null;
  regionSlug: string | null;
  regionDisplayName: string | null;
  servers: string[];
  lftStatus: LftStatus;
  experienceLevel: ExperienceLevel | null;
  preferredEnvironment: PreferredEnvironment | null;
  languages: string[];
  notes: string | null;
  profileVisible: boolean;
  lftVisible: boolean;
  riotIdVisible: boolean;
  recruitmentVisible: boolean;
  availabilityVisible: boolean;
}

export interface UpsertCompetitiveProfileRequest {
  gameSlug: string;
  rankTierSlug?: string | null;
  rankProvenance?: CompetitiveProvenance;
  roles?: string[];
  mainRole?: string | null;
  regionSlug?: string | null;
  servers?: string[];
  lftStatus?: LftStatus;
  experienceLevel?: ExperienceLevel | null;
  preferredEnvironment?: PreferredEnvironment | null;
  languages?: string[];
  notes?: string | null;
  profileVisible?: boolean;
  lftVisible?: boolean;
  riotIdVisible?: boolean;
  recruitmentVisible?: boolean;
  availabilityVisible?: boolean;
}

export interface LfgListing {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  gameSlug: string;
  intent: LfgIntent;
  mode: string | null;
  minRankSlug: string | null;
  maxRankSlug: string | null;
  minRankDisplayName: string | null;
  maxRankDisplayName: string | null;
  regionSlug: string | null;
  regionDisplayName: string | null;
  servers: string[];
  roles: string[];
  languages: string[];
  description: string | null;
  expiresAt: string | null;
  status: LfgStatus;
  createdAt: string;
  publishedAt: string | null;
  closedAt: string | null;
}

export interface CreateLfgListingRequest {
  gameSlug: string;
  intent: LfgIntent;
  status: 'draft' | 'published';
  mode?: string | null;
  minRankSlug?: string | null;
  maxRankSlug?: string | null;
  regionSlug?: string | null;
  servers?: string[];
  roles?: string[];
  languages?: string[];
  description?: string | null;
  expiryHours?: number;
}

export interface LfgInterest {
  id: string;
  listingId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  rankTierSlug: string | null;
  rankTierDisplayName: string | null;
  rankProvenance: CompetitiveProvenance;
  roles: string[];
  regionSlug: string | null;
  regionDisplayName: string | null;
  servers: string[];
  message: string | null;
  status: 'expressed' | 'accepted' | 'declined' | 'withdrawn' | 'blocked';
  createdAt: string;
}

export interface PlayerSearchResult {
  userId: string;
  username: string;
  avatarUrl: string | null;
  riotId: string | null;
  riotIdVisible: boolean;
  rankTierSlug: string | null;
  rankTierDisplayName: string | null;
  rankProvenance: CompetitiveProvenance;
  roles: string[];
  mainRole: string | null;
  regionSlug: string | null;
  regionDisplayName: string | null;
  servers: string[];
  lftStatus: LftStatus;
  languages: string[];
}

export interface PlayerSearchFilters {
  game: string;
  roles?: string[];
  minRank?: string;
  maxRank?: string;
  region?: string;
  lftOnly?: boolean;
  page?: number;
}

export interface LfgSearchFilters {
  game: string;
  intent?: string[];
  minRank?: string;
  maxRank?: string;
  region?: string;
  page?: number;
}

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

// --- Recruitment ---

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

// --- Tryouts ---

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

// --- Scrims & Practice ---

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
  preferredDays: string[] | null;
  preferredTimeStart: string | null;
  preferredTimeEnd: string | null;
  timezone: string | null;
  notes: string | null;
  status: ScrimListingStatus;
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
  createdAt: string;
  updatedAt: string;
  team1Name?: string | null;
  team1Logo?: string | null;
  team2Name?: string | null;
  team2Logo?: string | null;
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
