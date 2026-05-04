import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  OrganizerTournamentOption,
  Season,
  SeasonDetailResponse,
  SeasonLeaderboardEntry,
  SeasonNode,
  SeasonQualificationRecord,
  SeasonRule,
  SeasonStaffMember,
  SeasonTreeNode,
  SeasonNodeDraft,
  SeasonRuleDraft,
} from '@/types/season';

type SnakeCaseSeason = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  game: string;
  participant_mode: 'team' | 'solo';
  status: 'draft' | 'published' | 'active' | 'completed' | 'archived' | 'cancelled';
  visibility?: Season['visibility'];
  owner_user_id: string;
  organization_id?: string | null;
  is_public: boolean;
  allow_manual_overrides: boolean;
  start_date?: string | null;
  end_date?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  settings?: unknown;
  created_at: string;
  updated_at: string;
  owner_username?: string | null;
  owner_full_name?: string | null;
  published_at?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
  cancelled_at?: string | null;
  deleted_at?: string | null;
  version?: number;
  created_by?: string | null;
};

type SnakeCaseNode = {
  id: string;
  season_id: string;
  parent_node_id?: string | null;
  name: string;
  slug?: string | null;
  node_type: SeasonNode['nodeType'];
  display_order: number;
  region?: string | null;
  city?: string | null;
  country?: string | null;
  linked_tournament_id?: string | null;
  linked_stage_id?: string | null;
  status: SeasonNode['status'];
  registration_deadline?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
  linked_tournament_name?: string | null;
  linked_stage_name?: string | null;
  tournament_format?: SeasonNode['tournamentFormat'];
  team_size?: SeasonNode['teamSize'];
  max_teams?: SeasonNode['maxTeams'];
  min_teams?: SeasonNode['minTeams'];
  best_of?: SeasonNode['bestOf'];
  registration_type?: SeasonNode['registrationType'];
  entry_fee?: SeasonNode['entryFee'];
  prize_pool?: SeasonNode['prizePool'];
  check_in_minutes_before?: SeasonNode['checkInMinutesBefore'];
  registration_opens_at?: string | null;
  published_tournament_id?: string | null;
  outgoing_advancement_connections?: SeasonNode['outgoingAdvancementConnections'];
};

type SnakeCaseRule = {
  id: string;
  season_id?: string;
  source_node_id: string;
  source_stage_id?: string | null;
  destination_node_id?: string | null;
  placement_from: number;
  placement_to: number;
  points_awarded: number;
  qualification_status?: SeasonRule['qualificationStatus'];
  auto_create_qualification: boolean;
  region_key?: string | null;
  created_at?: string;
  updated_at?: string;
};

type SnakeCaseStaff = {
  id?: string;
  season_id?: string;
  user_id: string;
  role: SeasonStaffMember['role'];
  created_at?: string;
  updated_at?: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

type SnakeCaseTreeNode = SnakeCaseNode & {
  children?: SnakeCaseTreeNode[];
};

type SnakeCaseStanding = {
  entity_id: string;
  display_name: string;
  total_points: number;
  ledger_entries: number;
  rank: number;
  logo_url?: string | null;
  avatar_url?: string | null;
};

type SnakeCaseQualification = {
  id: string;
  source_node_id?: string | null;
  source_node_name?: string | null;
  destination_node_id?: string | null;
  destination_node_name?: string | null;
  source_tournament_id?: string | null;
  source_tournament_name?: string | null;
  entity_id?: string | null;
  display_name?: string | null;
  logo_url?: string | null;
  avatar_url?: string | null;
  placement?: number | null;
  points_snapshot?: number | null;
  qualification_type?: SeasonQualificationRecord['qualificationType'];
  status: SeasonQualificationRecord['status'];
  is_manual_override?: boolean | null;
  notes?: string | null;
  participant_response_note?: string | null;
  responded_at?: string | null;
  responded_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
};

type SeasonDetailApiResponse = {
  season: SnakeCaseSeason;
  nodes: SnakeCaseNode[];
  tree: SnakeCaseTreeNode[];
  rules: SnakeCaseRule[];
  staff: SnakeCaseStaff[] | null;
  permissions: {
    can_manage: boolean;
    is_public: boolean;
  };
};

const mapSeason = (row: SnakeCaseSeason): Season => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? null,
  game: row.game,
  participantMode: row.participant_mode,
  status: row.status,
  visibility: row.visibility ?? (row.is_public ? 'public' : 'private'),
  ownerUserId: row.owner_user_id,
  organizationId: row.organization_id ?? null,
  isPublic: row.is_public,
  allowManualOverrides: row.allow_manual_overrides,
  startDate: row.start_date ?? null,
  endDate: row.end_date ?? null,
  bannerUrl: row.banner_url ?? null,
  logoUrl: row.logo_url ?? null,
  settings: row.settings ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ownerUsername: row.owner_username ?? null,
  ownerFullName: row.owner_full_name ?? null,
  publishedAt: row.published_at ?? null,
  completedAt: row.completed_at ?? null,
  archivedAt: row.archived_at ?? null,
  cancelledAt: row.cancelled_at ?? null,
  deletedAt: row.deleted_at ?? null,
  version: row.version,
  createdBy: row.created_by ?? null,
});

const mapNode = (row: SnakeCaseNode): SeasonNode => ({
  id: row.id,
  seasonId: row.season_id,
  parentNodeId: row.parent_node_id ?? null,
  name: row.name,
  slug: row.slug ?? null,
  nodeType: row.node_type,
  displayOrder: row.display_order,
  region: row.region ?? null,
  city: row.city ?? null,
  country: row.country ?? null,
  linkedTournamentId: row.linked_tournament_id ?? null,
  linkedStageId: row.linked_stage_id ?? null,
  status: row.status,
  registrationDeadline: row.registration_deadline ?? null,
  startsAt: row.starts_at ?? null,
  endsAt: row.ends_at ?? null,
  metadata: row.metadata ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  linkedTournamentName: row.linked_tournament_name ?? null,
  linkedStageName: row.linked_stage_name ?? null,
  tournamentFormat: row.tournament_format ?? null,
  teamSize: row.team_size ?? null,
  maxTeams: row.max_teams ?? null,
  minTeams: row.min_teams ?? null,
  bestOf: row.best_of ?? null,
  registrationType: row.registration_type ?? null,
  entryFee: row.entry_fee ?? null,
  prizePool: row.prize_pool ?? null,
  checkInMinutesBefore: row.check_in_minutes_before ?? null,
  registrationOpensAt: row.registration_opens_at ?? null,
  publishedTournamentId: row.published_tournament_id ?? null,
  outgoingAdvancementConnections: row.outgoing_advancement_connections ?? [],
});

const mapTreeNode = (row: SnakeCaseTreeNode): SeasonTreeNode => ({
  ...mapNode(row),
  children: (row.children ?? []).map(mapTreeNode),
});

const mapRule = (row: SnakeCaseRule): SeasonRule => ({
  id: row.id,
  seasonId: row.season_id,
  sourceNodeId: row.source_node_id,
  sourceStageId: row.source_stage_id ?? null,
  destinationNodeId: row.destination_node_id ?? null,
  placementFrom: row.placement_from,
  placementTo: row.placement_to,
  pointsAwarded: row.points_awarded,
  qualificationStatus: row.qualification_status ?? null,
  autoCreateQualification: row.auto_create_qualification,
  regionKey: row.region_key ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapStaff = (row: SnakeCaseStaff): SeasonStaffMember => ({
  id: row.id,
  seasonId: row.season_id,
  userId: row.user_id,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  username: row.username ?? null,
  fullName: row.full_name ?? null,
  avatarUrl: row.avatar_url ?? null,
});

const mapStanding = (row: SnakeCaseStanding): SeasonLeaderboardEntry => ({
  entityId: row.entity_id,
  displayName: row.display_name,
  totalPoints: row.total_points,
  ledgerEntries: row.ledger_entries,
  rank: row.rank,
  logoUrl: row.logo_url ?? null,
  avatarUrl: row.avatar_url ?? null,
});

const mapQualification = (row: SnakeCaseQualification): SeasonQualificationRecord => ({
  id: row.id,
  sourceNodeId: row.source_node_id ?? null,
  sourceNodeName: row.source_node_name ?? null,
  destinationNodeId: row.destination_node_id ?? null,
  destinationNodeName: row.destination_node_name ?? null,
  sourceTournamentId: row.source_tournament_id ?? null,
  sourceTournamentName: row.source_tournament_name ?? null,
  entityId: row.entity_id ?? null,
  displayName: row.display_name ?? null,
  logoUrl: row.logo_url ?? null,
  avatarUrl: row.avatar_url ?? null,
  placement: row.placement ?? null,
  pointsSnapshot: row.points_snapshot ?? null,
  qualificationType: row.qualification_type ?? null,
  status: row.status,
  isManualOverride: row.is_manual_override ?? null,
  notes: row.notes ?? null,
  participantResponseNote: row.participant_response_note ?? null,
  respondedAt: row.responded_at ?? null,
  respondedByUserId: row.responded_by_user_id ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const useSeason = (seasonId?: string) =>
  useQuery<SeasonDetailResponse>({
    queryKey: ['season', seasonId],
    queryFn: async () => {
      const data = await apiClient.get<SeasonDetailApiResponse>(`/api/seasons/${seasonId}`);
      return {
        season: mapSeason(data.season),
        nodes: data.nodes.map(mapNode),
        tree: data.tree.map(mapTreeNode),
        rules: data.rules.map(mapRule),
        staff: data.staff ? data.staff.map(mapStaff) : null,
        permissions: {
          canManage: data.permissions.can_manage,
          isPublic: data.permissions.is_public,
        },
      };
    },
    enabled: !!seasonId,
    staleTime: 30_000,
  });

export const useSeasonStandings = (seasonId?: string) =>
  useQuery<SeasonLeaderboardEntry[]>({
    queryKey: ['season', seasonId, 'standings'],
    queryFn: async () => {
      const rows = await apiClient.get<SnakeCaseStanding[]>(`/api/seasons/${seasonId}/standings`);
      return rows.map(mapStanding);
    },
    enabled: !!seasonId,
    staleTime: 30_000,
  });

export const useSeasonQualifications = (seasonId?: string) =>
  useQuery<SeasonQualificationRecord[]>({
    queryKey: ['season', seasonId, 'qualifications'],
    queryFn: async () => {
      const rows = await apiClient.get<SnakeCaseQualification[]>(`/api/seasons/${seasonId}/qualifications`);
      return rows.map(mapQualification);
    },
    enabled: !!seasonId,
    staleTime: 15_000,
  });

export const useSyncSeasonStaff = (seasonId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (staff: SeasonStaffMember[]) =>
      apiClient.put<{ success: boolean; count: number }>(`/api/seasons/${seasonId}/staff`, {
        staff: staff.map((member) => ({
          userId: member.userId,
          role: member.role,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
    },
  });
};

export const useSyncSeasonNodes = (seasonId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nodes: SeasonNodeDraft[]) =>
      apiClient.put<{ success: boolean; count: number }>(`/api/seasons/${seasonId}/nodes`, {
        nodes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'standings'] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'qualifications'] });
    },
  });
};

export const useSyncSeasonRules = (seasonId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rules: SeasonRuleDraft[]) =>
      apiClient.put<{ success: boolean; count: number }>(`/api/seasons/${seasonId}/points-rules`, {
        rules,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'standings'] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'qualifications'] });
    },
  });
};

export const useRecalculateSeason = (seasonId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post(`/api/seasons/${seasonId}/recalculate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'standings'] });
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'qualifications'] });
    },
  });
};

export const useRespondSeasonQualification = (seasonId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recordId, status, notes }: { recordId: string; status: 'accepted' | 'declined'; notes?: string }) =>
      apiClient.post(`/api/seasons/${seasonId}/qualifications/${recordId}/respond`, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'qualifications'] });
    },
  });
};

export const useUpdateSeasonQualification = (seasonId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordId,
      status,
      qualificationType,
      destinationNodeId,
      notes,
    }: {
      recordId: string;
      status?: string;
      qualificationType?: string;
      destinationNodeId?: string;
      notes?: string;
    }) =>
      apiClient.put(`/api/seasons/${seasonId}/qualifications/${recordId}`, {
        status,
        qualificationType,
        destinationNodeId,
        notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season', seasonId, 'qualifications'] });
    },
  });
};

export const useOrganizerTournamentOptions = () =>
  useQuery<OrganizerTournamentOption[]>({
    queryKey: ['organizer-season-tournament-options'],
    queryFn: async () => {
      const organization = await apiClient.get<{ id: string }>('/api/organizations/me');
      const rows = await apiClient.get<Array<{
        id: string;
        name: string;
        slug?: string | null;
        status?: string | null;
        start_date?: string | null;
        end_date?: string | null;
      }>>(`/api/organizations/${organization.id}/tournaments`);

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug ?? null,
        status: row.status ?? null,
        startDate: row.start_date ?? null,
        endDate: row.end_date ?? null,
      }));
    },
    staleTime: 60_000,
  });

