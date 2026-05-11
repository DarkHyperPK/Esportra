export type SeasonStatus = 'draft' | 'published' | 'active' | 'completed' | 'archived' | 'cancelled';
export type SeasonParticipantMode = 'team' | 'solo';
export type SeasonNodeType = 'root' | 'qualifier' | 'event' | 'stage' | 'final' | 'custom';
export type SeasonNodeStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'archived';
export type SeasonQualificationType = 'qualified' | 'wildcard' | 'reserve';
export type TournamentRole = 'qualifier' | 'event' | 'finals' | 'custom';
export type QualificationStatus = 'qualified' | 'eliminated' | 'pending';
export type SeedMode = 'random' | 'manual' | 'top_seeded';

export interface Season {
  id: string;
  name: string;
  slug: string;
  game: string;
  description: string | null;
  banner_url: string | null;
  logo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  status: SeasonStatus;
  organizer_id: string;
  organization_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tournament_count: number;
  point_rules_count: number;
  advancement_rules_count: number;
  participant_count: number;
}

export interface SeasonList {
  id: string;
  name: string;
  slug: string;
  game: string;
  status: SeasonStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  tournament_count: number;
  participant_count: number;
}

export interface SeasonStanding {
  id: string;
  season_id: string;
  team_id: string;
  team_name: string | null;
  team_logo_url: string | null;
  total_points: number;
  qualification_status: QualificationStatus | null;
  version: number;
  created_at: string;
  updated_at: string;
  // camelCase fields (from apiClient snake_case conversion + new endpoint shape)
  entityId?: string;
  seasonId?: string;
  teamId?: string;
  teamName?: string | null;
  teamLogoUrl?: string | null;
  totalPoints?: number;
  qualificationStatus?: QualificationStatus | string | null;
  rank?: number;
  displayName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PointRule {
  id: string;
  season_id: string;
  tournament_id: string | null;
  placement_start: number;
  placement_end: number;
  points: number;
  qualification_status: QualificationStatus | null;
  destination_tournament_id: string | null;
  version: number;
  created_at: string;
}

export interface AdvancementRule {
  id: string;
  season_id: string;
  source_tournament_id: string;
  target_tournament_id: string | null;
  placement_start: number;
  placement_end: number;
  advancement_count: number;
  seed_mode: SeedMode | null;
  version: number;
  created_at: string;
}

export interface CreateSeasonRequest {
  name: string;
  game: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  logo_url?: string;
  organization_id?: string;
}

export interface UpdateSeasonRequest {
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  logo_url?: string;
  version: number;
}

export interface CreatePointRuleRequest {
  tournament_id?: string;
  placement_start: number;
  placement_end: number;
  points: number;
  qualification_status?: QualificationStatus;
  destination_tournament_id?: string;
}

export interface UpdatePointRuleRequest {
  placement_start: number;
  placement_end: number;
  points: number;
  qualification_status?: QualificationStatus;
  destination_tournament_id?: string;
  version: number;
}

export interface CreateAdvancementRuleRequest {
  source_tournament_id: string;
  target_tournament_id?: string;
  placement_start: number;
  placement_end: number;
  advancement_count: number;
  seed_mode?: SeedMode;
}

export interface UpdateAdvancementRuleRequest {
  source_tournament_id: string;
  target_tournament_id?: string;
  placement_start: number;
  placement_end: number;
  advancement_count: number;
  seed_mode?: SeedMode;
  version: number;
}

export interface SeasonWizardData {
  name: string;
  game: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  logo_url?: string;
  organization_id?: string;
  tournaments?: SeasonTournament[];
  point_rules?: CreatePointRuleRequest[];
  advancement_rules?: CreateAdvancementRuleRequest[];
}

export interface SeasonTournament {
  tournament_id: string;
  season_role: TournamentRole;
  season_stage_order: number;
}

export interface SeasonTournamentDetails {
  id: string;
  name: string;
  slug: string;
  game: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  season_role: TournamentRole | null;
  season_stage_order: number | null;
  current_participants: number;
  // camelCase fields (from apiClient + new endpoint shape)
  tournamentId?: string | null;
  tournamentName?: string | null;
  tournamentStatus?: string | null;
  displayName?: string | null;
  role: string;
  region?: string | null;
}

export interface SeasonParticipant {
  id: string;
  season_id: string;
  team_id: string;
  team_name: string;
  team_logo_url: string | null;
  team_slug: string | null;
  status: 'pending' | 'approved' | 'rejected';
  registered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointRuleTemplate {
  name: string;
  rules: CreatePointRuleRequest[];
}

// ── Staff ──────────────────────────────────────────────────────────────────
export interface SeasonStaffMember {
  userId: string;
  role: 'co_organizer' | 'admin';
  username?: string | null;
  fullName?: string | null;
}

// ── Node data (from GET /api/seasons/{id}) ──────────────────────────────────
export interface SeasonNodeData {
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
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  linkedTournamentName: string | null;
  linkedStageName: string | null;
}

// ── Builder node (extends SeasonNodeData with UI-only fields) ───────────────
export type SeasonBuilderNode = SeasonNodeData & {
  publishedTournamentId?: string | null;
};

// ── Draft payload (sent to the backend on sync) ─────────────────────────────
export interface SeasonNodeDraft {
  id?: string;
  seasonId?: string;
  parentNodeId?: string | null;
  name: string;
  slug?: string | null;
  nodeType: SeasonNodeType;
  displayOrder: number;
  region?: string | null;
  city?: string | null;
  country?: string | null;
  linkedTournamentId?: string | null;
  linkedStageId?: string | null;
  status?: SeasonNodeStatus;
  registrationDeadline?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ── Rule data (from GET /api/seasons/{id}) ──────────────────────────────────
export interface SeasonRuleData {
  id: string;
  sourceNodeId: string;
  sourceStageId: string | null;
  destinationNodeId: string | null;
  placementFrom: number;
  placementTo: number;
  pointsAwarded: number;
  qualificationStatus: string | null;
  autoCreateQualification: boolean;
  regionKey: string | null;
}

// ── Rule draft (builder state) ──────────────────────────────────────────────
export interface SeasonRuleDraft {
  id?: string;
  sourceNodeId: string;
  sourceStageId: string | null;
  destinationNodeId: string | null;
  placementFrom: number;
  placementTo: number;
  pointsAwarded: number;
  qualificationStatus: SeasonQualificationType | string | null;
  autoCreateQualification: boolean;
  regionKey: string | null;
}

// ── Tree node (for preview) ─────────────────────────────────────────────────
export interface SeasonTreeNode {
  id: string;
  name: string;
  type: string;
  status: string;
  children?: SeasonTreeNode[];
}

// ── Advancement connection ──────────────────────────────────────────────────
export interface AdvancementConnection {
  sourceNodeId: string;
  targetNodeId: string;
  placementStart: number;
  placementEnd: number;
  advancementCount: number;
}

// ── Qualification record ────────────────────────────────────────────────────
export interface SeasonQualificationRecord {
  id: string;
  seasonId: string;
  destinationNodeId: string | null;
  status: string;
  qualificationType: string | null;
  displayName: string | null;
  sourceNodeName?: string | null;
  teamId: string | null;
  userId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Audit log entry ─────────────────────────────────────────────────────────
export interface SeasonAuditLogEntry {
  id: string;
  seasonId: string;
  actorId: string;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: string;
}

// ── Advancement connection (season-level) ────────────────────────────────────
export interface SeasonAdvancementConnection {
  id: string;
  seasonId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  targetNodeId: string;
  targetNodeName: string;
  placementStart: number;
  placementEnd: number;
  advancementCount: number;
}

// ── Update payload (PUT /api/seasons/{id}) ─────────────────────────────────
export interface UpdateSeasonPayload {
  name: string;
  game: string;
  participantMode?: string;
  status?: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  allowManualOverrides?: boolean;
  startDate: string | null;
  endDate: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  settings?: Record<string, unknown>;
}

// ── Season detail (camelCase from apiClient) ───────────────────────────────
export interface SeasonDetail {
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
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  ownerUsername: string;
  ownerFullName: string | null;
}

// ── Detail response (GET /api/seasons/{id}) ────────────────────────────────
export interface SeasonDetailResponse {
  season: SeasonDetail;
  nodes: SeasonNodeData[];
  tree: SeasonTreeNode[];
  rules: SeasonRuleData[];
  staff: SeasonStaffMember[];
  permissions: { canManage: boolean; isPublic: boolean };
}
