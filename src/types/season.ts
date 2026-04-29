export type SeasonStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived';
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
  ownerUserId: string;
  organizationId: string | null;
  isPublic: boolean;
  allowManualOverrides: boolean;
  startDate: string | null;
  endDate: string | null;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
  ownerUsername?: string | null;
  ownerFullName?: string | null;
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

export interface CreateSeasonResponse {
  id: string;
  slug: string;
  rootNodeId: string;
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

