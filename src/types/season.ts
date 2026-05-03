export type SeasonStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived' | 'cancelled';
export type SeasonVisibility = 'private' | 'unlisted' | 'public';
export type SeasonParticipantMode = 'team' | 'solo';
export type SeasonStaffRole = 'co_organizer' | 'admin';
export type SeasonNodeType = 'root' | 'qualifier' | 'event' | 'stage' | 'final' | 'custom';
export type SeasonNodeStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'archived';
export type SeasonQualificationType = 'qualified' | 'wildcard' | 'reserve';
export type SeasonQualificationWorkflowStatus =
  | 'earned'
  | 'confirmed'
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'overridden'
  | 'pending';

export type SeasonTournamentRole =
  | 'qualifier'
  | 'event'
  | 'regional_final'
  | 'last_chance_qualifier'
  | 'playoff'
  | 'grand_final'
  | 'custom';

export type SeasonTournamentStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';

export type AdvancementRecordStatus =
  | 'pending'
  | 'advanced'
  | 'blocked'
  | 'removed'
  | 'manual_override';

export type SeasonStandingStatus =
  | 'registered'
  | 'active'
  | 'qualified'
  | 'eliminated'
  | 'champion'
  | 'disqualified';

export type CreatedVia = 'standalone' | 'season' | 'admin';

export interface SeasonListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  game: string;
  participantMode: SeasonParticipantMode;
  status: SeasonStatus;
  isPublic?: boolean;
  ownerUserId?: string;
  organizationId?: string | null;
  ownerUsername?: string | null;
  ownerFullName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  nodeCount?: number;
  isSeasonStaff?: boolean;
}

export interface Season {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  game: string;
  participantMode: SeasonParticipantMode;
  status: SeasonStatus;
  visibility: SeasonVisibility;
  ownerUserId: string;
  organizationId: string | null;
  isPublic: boolean;
  allowManualOverrides: boolean;
  startDate: string | null;
  endDate: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
  ownerUsername?: string | null;
  ownerFullName?: string | null;
  publishedAt?: string | null;
  completedAt?: string | null;
  archivedAt?: string | null;
  cancelledAt?: string | null;
  deletedAt?: string | null;
  version?: number;
  createdBy?: string | null;
}

export interface SeasonNode {
  id: string;
  seasonId: string;
  parentNodeId: string | null;
  name: string;
  slug: string | null;
  nodeType: SeasonNodeType;
  displayOrder: number;
  region: string | null;
  city: string | null;
  country: string | null;
  linkedTournamentId: string | null;
  linkedStageId: string | null;
  status: SeasonNodeStatus;
  registrationDeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  linkedTournamentName?: string | null;
  linkedStageName?: string | null;
  // Inline tournament config (first-class columns from backend)
  tournamentFormat: SeasonStageTournamentFormat | null;
  teamSize: number | null;
  maxTeams: number | null;
  minTeams: number | null;
  bestOf: number | null;
  registrationType: SeasonStageRegistrationType | null;
  entryFee: number | null;
  prizePool: number | null;
  checkInMinutesBefore: number | null;
  registrationOpensAt: string | null;
  publishedTournamentId: string | null;
  // Outgoing advancement connections (from season_advancement_connections table)
  outgoingAdvancementConnections: AdvancementConnection[];
}

export interface SeasonTreeNode {
  id: string;
  parentNodeId: string | null;
  seasonId: string;
  name: string;
  slug: string | null;
  nodeType: SeasonNodeType;
  displayOrder: number;
  region: string | null;
  city: string | null;
  country: string | null;
  linkedTournamentId: string | null;
  linkedStageId: string | null;
  status: SeasonNodeStatus;
  registrationDeadline: string | null;
  startsAt: string | null;
  endsAt: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  linkedTournamentName?: string | null;
  linkedStageName?: string | null;
  children: SeasonTreeNode[];
  // Inline tournament config (first-class columns from backend)
  tournamentFormat: SeasonStageTournamentFormat | null;
  teamSize: number | null;
  maxTeams: number | null;
  minTeams: number | null;
  bestOf: number | null;
  registrationType: SeasonStageRegistrationType | null;
  entryFee: number | null;
  prizePool: number | null;
  checkInMinutesBefore: number | null;
  registrationOpensAt: string | null;
  publishedTournamentId: string | null;
  // Outgoing advancement connections (from season_advancement_connections table)
  outgoingAdvancementConnections: AdvancementConnection[];
}

export interface SeasonRule {
  id: string;
  seasonId?: string;
  sourceNodeId: string;
  sourceStageId: string | null;
  destinationNodeId: string | null;
  placementFrom: number;
  placementTo: number;
  pointsAwarded: number;
  qualificationStatus: SeasonQualificationType | null;
  autoCreateQualification: boolean;
  regionKey: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeasonStaffMember {
  id?: string;
  seasonId?: string;
  userId: string;
  role: SeasonStaffRole;
  createdAt?: string;
  updatedAt?: string;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface SeasonPermissions {
  canManage: boolean;
  isPublic: boolean;
}

export interface SeasonDetailResponse {
  season: Season;
  nodes: SeasonNode[];
  tree: SeasonTreeNode[];
  rules: SeasonRule[];
  staff: SeasonStaffMember[] | null;
  permissions: SeasonPermissions;
}

export interface SeasonStanding {
  entityId: string;
  displayName: string;
  totalPoints: number;
  ledgerEntries: number;
  rank: number;
  logoUrl?: string | null;
  avatarUrl?: string | null;
}

export interface SeasonQualificationRecord {
  id: string;
  sourceNodeId: string | null;
  sourceNodeName: string | null;
  destinationNodeId: string | null;
  destinationNodeName: string | null;
  sourceTournamentId: string | null;
  sourceTournamentName: string | null;
  entityId: string | null;
  displayName: string | null;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  placement: number | null;
  pointsSnapshot: number | null;
  qualificationType: SeasonQualificationType | null;
  status: SeasonQualificationWorkflowStatus;
  isManualOverride: boolean | null;
  notes: string | null;
  participantResponseNote: string | null;
  respondedAt: string | null;
  respondedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSeasonPayload {
  name: string;
  game: string;
  participantMode: SeasonParticipantMode;
  status?: SeasonStatus;
  slug?: string | null;
  description?: string | null;
  organizationId?: string | null;
  isPublic?: boolean;
  allowManualOverrides?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  rootNodeName?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface SeasonBuilderNode extends SeasonNodeDraft {
  id: string;
}

export interface CreateSeasonResponse {
  id: string;
  slug: string;
  rootNodeId: string;
}

export interface CreateSeasonWorkspacePayload {
  season: CreateSeasonPayload;
  nodes: SeasonBuilderNode[];
}

export interface UpdateSeasonPayload {
  name?: string;
  game?: string;
  participantMode?: SeasonParticipantMode;
  status?: SeasonStatus;
  slug?: string;
  description?: string | null;
  organizationId?: string | null;
  isPublic?: boolean;
  allowManualOverrides?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface SeasonNodeDraft {
  id?: string;
  parentNodeId: string | null;
  name: string;
  nodeType: SeasonNodeType;
  displayOrder: number;
  status: SeasonNodeStatus;
  slug?: string | null;
  region?: string | null;
  city?: string | null;
  country?: string | null;
  linkedTournamentId?: string | null;
  linkedStageId?: string | null;
  registrationDeadline?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Record<string, unknown> | null;
  // Inline tournament config (first-class columns to backend)
  tournamentFormat?: SeasonStageTournamentFormat | null;
  teamSize?: number | null;
  maxTeams?: number | null;
  minTeams?: number | null;
  bestOf?: number | null;
  registrationType?: SeasonStageRegistrationType | null;
  entryFee?: number | null;
  prizePool?: number | null;
  checkInMinutesBefore?: number | null;
  registrationOpensAt?: string | null;
  publishedTournamentId?: string | null;
  // Outgoing advancement connections (to be sent to season_advancement_connections table)
  outgoing_advancement_connections?: AdvancementConnection[];
}

export interface SeasonRuleDraft {
  id?: string;
  sourceNodeId: string;
  placementFrom: number;
  placementTo: number;
  pointsAwarded: number;
  sourceStageId?: string | null;
  destinationNodeId?: string | null;
  qualificationStatus?: SeasonQualificationType | null;
  autoCreateQualification: boolean;
  regionKey?: string | null;
}

export interface OrganizerTournamentOption {
  id: string;
  name: string;
  slug?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline tournament config & advancement — stored in SeasonNode.metadata
// until a dedicated backend table is added (see migration spec).
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonStageTournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'groups_playoffs';

export type SeasonStageRegistrationType = 'open' | 'invite' | 'qualifier_feed';

export interface SeasonStageTournamentConfig {
  configured: boolean;
  format: SeasonStageTournamentFormat | null;
  teamSize: number | null;
  maxTeams: number | null;
  minTeams: number | null;
  entryFee: number | null;
  prizePool: number | null;
  currency: string | null;
  registrationType: SeasonStageRegistrationType | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  checkInMinutes: number | null;
  bestOf: number | null;
  mapPool: string[] | null;
  rulesUrl: string | null;
  provisionedTournamentId: string | null;
}

export type AdvancementRuleType = 'top_n' | 'top_percentage' | 'points_threshold' | 'manual_selection';
export type AdvancementSeedMode = 'preserve_seed' | 'reseed_by_points' | 'randomize' | 'manual';

export interface AdvancementConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  ruleType: AdvancementRuleType;
  ruleValue: number;
  seedMode: AdvancementSeedMode;
  label: string | null;
}

export interface SeasonNodeMetadata {
  tournamentConfig?: SeasonStageTournamentConfig;
  advancement?: {
    outgoing: AdvancementConnection[];
  };
}

export const DEFAULT_TOURNAMENT_CONFIG: SeasonStageTournamentConfig = {
  configured: false,
  format: null,
  teamSize: null,
  maxTeams: null,
  minTeams: null,
  entryFee: 0,
  prizePool: 0,
  currency: 'USD',
  registrationType: 'open',
  registrationOpensAt: null,
  registrationClosesAt: null,
  checkInMinutes: 15,
  bestOf: 1,
  mapPool: null,
  rulesUrl: null,
  provisionedTournamentId: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Enterprise Season Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SeasonTournament {
  id: string;
  seasonId: string;
  tournamentId: string;
  role: SeasonTournamentRole;
  region: string | null;
  displayName: string | null;
  sortOrder: number;
  status: SeasonTournamentStatus;
  createdAt: string;
  updatedAt: string;
  tournamentName?: string | null;
  tournamentSlug?: string | null;
  tournamentStatus?: string | null;
}

export interface SeasonAdvancementRecord {
  id: string;
  seasonId: string;
  connectionId: string;
  fromTournamentId: string;
  toTournamentId: string;
  teamId: string;
  sourceRank: number | null;
  targetSeed: number | null;
  status: AdvancementRecordStatus;
  advancedAt: string | null;
  advancedBy: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonStanding {
  id: string;
  seasonId: string;
  teamId: string;
  totalPoints: number;
  tournamentsPlayed: number;
  bestFinish: number | null;
  currentStatus: SeasonStandingStatus;
  lastTournamentId: string | null;
  createdAt: string;
  updatedAt: string;
  teamName?: string | null;
  teamSlug?: string | null;
}

export interface SeasonAuditLog {
  id: string;
  seasonId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actorUsername?: string | null;
}

export interface PublishSeasonRequest {
  allowIncomplete: boolean;
  activate: boolean;
}

export interface PublishSeasonResponse {
  success: boolean;
  seasonId: string;
  seasonStatus: string;
  tournamentsCreated: number;
  tournamentsLinked: number;
  connectionsWired: number;
  tournaments: PublishedTournamentDto[];
  warnings: string[];
}

export interface PublishedTournamentDto {
  nodeId: string;
  nodeName: string;
  tournamentId: string;
  slug: string;
  created: boolean;
}
