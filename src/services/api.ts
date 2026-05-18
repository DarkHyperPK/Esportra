import { apiClient } from '@/lib/apiClient';
import { Database } from '@/integrations/supabase/types';
import type {
  Season,
  SeasonList,
  CreateSeasonRequest,
  CreateSeasonResponse,
  UpdateSeasonRequest,
  UpdateSeasonPayload,
  SeasonStanding,
  PaginatedSeasonStandings,
  PointRule,
  AdvancementRule,
  SeasonTournamentDetails,
  CreatePointRuleRequest,
  CreateAdvancementRuleRequest,
  SeasonParticipant,
  SeasonDetailResponse,
  SeasonQualificationRecord,
  SeasonAuditLogEntry,
  SeasonAdvancementConnection,
  AddSeasonTournamentRequest,
  AddSeasonTournamentResponse,
  AdvancementPreviewResult,
} from '@/types/season';

// Types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Tournament = Database['public']['Tables']['tournaments']['Row'];
export type TournamentRegistration = {
  id: string;
  tournament_id: string;
  team_id?: string | null;
  user_id?: string | null;
  status?: string | null;
  created_at?: string;
};
export type Venue = Database['public']['Tables']['venues']['Row'];
export type VenueBooking = Database['public']['Tables']['venue_bookings']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];

type ApiObject = Record<string, any>;

const pageOffset = (page = 1, limit = 50) => Math.max(page - 1, 0) * limit;

const aliasFields = <T extends ApiObject>(row: T, pairs: Array<[string, string]>): T => {
  const result: ApiObject = { ...row };
  pairs.forEach(([snake, camel]) => {
    const value = result[snake] ?? result[camel] ?? null;
    result[snake] = value;
    result[camel] = value;
  });
  return result as T;
};

const seasonAliases: Array<[string, string]> = [
  ['banner_url', 'bannerUrl'],
  ['logo_url', 'logoUrl'],
  ['start_date', 'startDate'],
  ['end_date', 'endDate'],
  ['created_at', 'createdAt'],
  ['updated_at', 'updatedAt'],
  ['deleted_at', 'deletedAt'],
  ['organization_id', 'organizationId'],
  ['owner_user_id', 'ownerUserId'],
  ['participant_mode', 'participantMode'],
  ['tournament_count', 'tournamentCount'],
  ['participant_count', 'participantCount'],
  ['point_rules_count', 'pointRulesCount'],
  ['advancement_rules_count', 'advancementRulesCount'],
];

const tournamentAliases: Array<[string, string]> = [
  ['start_date', 'startDate'],
  ['end_date', 'endDate'],
  ['season_role', 'seasonRole'],
  ['season_stage_order', 'seasonStageOrder'],
  ['current_participants', 'currentParticipants'],
  ['tournament_id', 'tournamentId'],
  ['tournament_name', 'tournamentName'],
  ['tournament_status', 'tournamentStatus'],
];

const standingAliases: Array<[string, string]> = [
  ['season_id', 'seasonId'],
  ['team_id', 'teamId'],
  ['team_name', 'teamName'],
  ['team_logo_url', 'teamLogoUrl'],
  ['total_points', 'totalPoints'],
  ['qualification_status', 'qualificationStatus'],
  ['standing_rank', 'standingRank'],
  ['created_at', 'createdAt'],
  ['updated_at', 'updatedAt'],
];

const participantAliases: Array<[string, string]> = [
  ['season_id', 'seasonId'],
  ['team_id', 'teamId'],
  ['team_name', 'teamName'],
  ['team_logo_url', 'teamLogoUrl'],
  ['team_slug', 'teamSlug'],
  ['registered_by', 'registeredBy'],
  ['created_at', 'createdAt'],
  ['updated_at', 'updatedAt'],
];

const pointRuleAliases: Array<[string, string]> = [
  ['season_id', 'seasonId'],
  ['tournament_id', 'tournamentId'],
  ['placement_start', 'placementStart'],
  ['placement_end', 'placementEnd'],
  ['qualification_status', 'qualificationStatus'],
  ['destination_tournament_id', 'destinationTournamentId'],
  ['created_at', 'createdAt'],
];

const advancementRuleAliases: Array<[string, string]> = [
  ['season_id', 'seasonId'],
  ['source_tournament_id', 'sourceTournamentId'],
  ['target_tournament_id', 'targetTournamentId'],
  ['placement_start', 'placementStart'],
  ['placement_end', 'placementEnd'],
  ['advancement_count', 'advancementCount'],
  ['seed_mode', 'seedMode'],
  ['created_at', 'createdAt'],
];

const createSeasonPayload = (season: CreateSeasonRequest) => ({
  name: season.name,
  game: season.game,
  description: season.description,
  participantMode: season.participant_mode,
  startDate: season.start_date,
  endDate: season.end_date,
  bannerUrl: season.banner_url,
  logoUrl: season.logo_url,
  organizationId: season.organization_id,
});

const updateSeasonPayload = (season: UpdateSeasonRequest) => ({
  name: season.name,
  description: season.description,
  startDate: season.start_date,
  endDate: season.end_date,
  bannerUrl: season.banner_url,
  logoUrl: season.logo_url,
  version: season.version,
});

const pointRulePayload = (rule: CreatePointRuleRequest) => ({
  tournamentId: rule.tournament_id,
  placementStart: rule.placement_start,
  placementEnd: rule.placement_end,
  points: rule.points,
  qualificationStatus: rule.qualification_status,
  destinationTournamentId: rule.destination_tournament_id,
});

const advancementRulePayload = (rule: CreateAdvancementRuleRequest) => ({
  sourceTournamentId: rule.source_tournament_id,
  targetTournamentId: rule.target_tournament_id,
  placementStart: rule.placement_start,
  placementEnd: rule.placement_end,
  advancementCount: rule.advancement_count,
  seedMode: rule.seed_mode,
});

const normalizeSeasonDetail = (data: SeasonDetailResponse): SeasonDetailResponse => ({
  ...data,
  season: aliasFields(data.season as unknown as ApiObject, seasonAliases) as SeasonDetailResponse['season'],
});

// Profile API
export const profileApi = {
  getProfile: async (userId: string) => {
    return await apiClient.get(`/api/profiles/${userId}`);
  },

  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    return await apiClient.put(`/api/profiles/${userId}`, updates);
  }
};

// Tournament API
export const tournamentApi = {
  getTournaments: async () => {
    return await apiClient.get('/api/tournaments');
  },

  getTournament: async (id: string) => {
    const response = await apiClient.get<any>(`/api/tournaments/${id}`);
    return response?.tournament || response;
  },

  createTournament: async (tournament: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>) => {
    return await apiClient.post('/api/tournaments', tournament);
  },

  updateTournament: async (id: string, updates: Partial<Tournament>) => {
    return await apiClient.put(`/api/tournaments/${id}`, updates);
  },

  deleteTournament: async (id: string) => {
    return await apiClient.delete(`/api/tournaments/${id}`);
  }
};

// Tournament Registration API
export const registrationApi = {
  getRegistrations: async (tournamentId: string) => {
    return await apiClient.get(`/api/tournaments/${tournamentId}/participants`);
  },

  registerForTournament: async (registration: Omit<TournamentRegistration, 'id' | 'created_at'>) => {
    return await apiClient.post(`/api/tournaments/${registration.tournament_id}/participants`, registration);
  },

  updateRegistration: async (id: string, updates: Partial<TournamentRegistration>) => {
    return await apiClient.put(`/api/tournament-participants/${id}`, updates);
  },

  cancelRegistration: async (id: string) => {
    return await apiClient.delete(`/api/tournament-participants/${id}`);
  }
};

// Venue API
export const venueApi = {
  getVenues: async () => {
    return await apiClient.get('/api/venues');
  },

  getVenue: async (id: string) => {
    return await apiClient.get(`/api/venues/${id}`);
  },

  createVenue: async (venue: Omit<Venue, 'id' | 'created_at' | 'updated_at'>) => {
    return await apiClient.post('/api/venues', venue);
  },

  updateVenue: async (id: string, updates: Partial<Venue>) => {
    return await apiClient.put(`/api/venues/${id}`, updates);
  },

  deleteVenue: async (id: string) => {
    return await apiClient.delete(`/api/venues/${id}`);
  }
};

// Venue Booking API
export const bookingApi = {
  getBookings: async (venueId: string) => {
    return await apiClient.get(`/api/venues/${venueId}/bookings`);
  },

  createBooking: async (booking: Omit<VenueBooking, 'id' | 'created_at' | 'updated_at'>) => {
    return await apiClient.post(`/api/venues/${booking.venue_id}/bookings`, booking);
  },

  updateBooking: async (id: string, updates: Partial<VenueBooking>) => {
    return await apiClient.put(`/api/bookings/${id}`, updates);
  },

  cancelBooking: async (id: string) => {
    return await apiClient.delete(`/api/bookings/${id}`);
  }
};

// User Role API
export const roleApi = {
  getUserRole: async (userId: string) => {
    return await apiClient.get(`/api/users/${userId}/role`);
  },

  setUserRole: async (userId: string, role: UserRole['role']) => {
    return await apiClient.put(`/api/users/${userId}/role`, { role });
  }
};

// Season API
export const seasonApi = {
  getSeasons: async (page = 1, limit = 50, status?: string, game?: string, mine?: boolean) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: pageOffset(page, limit).toString()
    });
    if (status) params.append('status', status);
    if (game) params.append('game', game);
    if (mine) params.append('mine', 'true');
    const rows = await apiClient.get<SeasonList[]>(`/api/seasons?${params}`);
    return rows.map((row) => aliasFields(row as unknown as ApiObject, seasonAliases) as SeasonList);
  },

  getSeason: async (id: string) => {
    const response = await apiClient.get<any>(`/api/seasons/${id}`);
    return aliasFields((response?.season ?? response) as ApiObject, seasonAliases) as Season;
  },

  getSeasonDetail: async (id: string) => {
    const response = await apiClient.get<SeasonDetailResponse>(`/api/seasons/${id}`);
    return normalizeSeasonDetail(response);
  },

  createSeason: async (season: CreateSeasonRequest) => {
    return await apiClient.post<CreateSeasonResponse>('/api/seasons', createSeasonPayload(season));
  },

  updateSeason: async (id: string, season: UpdateSeasonRequest) => {
    const response = await apiClient.put<any>(`/api/seasons/${id}`, updateSeasonPayload(season));
    return aliasFields((response?.season ?? response) as ApiObject, seasonAliases) as Season;
  },

  updateSeasonDetail: async (id: string, payload: UpdateSeasonPayload) => {
    const response = await apiClient.put<SeasonDetailResponse>(`/api/seasons/${id}`, payload);
    return normalizeSeasonDetail(response);
  },

  deleteSeason: async (id: string) => {
    return await apiClient.delete(`/api/seasons/${id}`);
  },

  publishSeason: async (id: string, req?: { allowIncomplete?: boolean; activate?: boolean }) => {
    return await apiClient.post<{ tournamentsCreated: number; connectionsWired: number; id: string }>(`/api/seasons/${id}/publish`, req ?? {});
  },

  startSeason: async (id: string) => {
    return await apiClient.post<Season>(`/api/seasons/${id}/start`);
  },

  completeSeason: async (id: string) => {
    return await apiClient.post<Season>(`/api/seasons/${id}/complete`);
  },

  archiveSeason: async (id: string) => {
    return await apiClient.post<Season>(`/api/seasons/${id}/archive`);
  },

  syncSeasonStatus: async (id: string) => {
    return await apiClient.post<Season>(`/api/seasons/${id}/sync-status`);
  },

  getStandings: async (id: string, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: pageOffset(page, limit).toString()
    });
    const response = await apiClient.get<PaginatedSeasonStandings>(`/api/seasons/${id}/standings?${params}`);
    const items = (response.items ?? []).map((row) => aliasFields(row as unknown as ApiObject, standingAliases) as SeasonStanding);
    return items;
  },

  getStandingsPaginated: async (id: string, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: pageOffset(page, limit).toString()
    });
    const response = await apiClient.get<PaginatedSeasonStandings>(`/api/seasons/${id}/standings?${params}`);
    return {
      ...response,
      items: (response.items ?? []).map((row) => aliasFields(row as unknown as ApiObject, standingAliases) as SeasonStanding),
    };
  },

  recalculateStandings: async (id: string) => {
    return await apiClient.post(`/api/seasons/${id}/recalculate`);
  },

  processAdvancement: async (id: string, tournamentId?: string) => {
    return await apiClient.post<{ advanced_count: number; qualification_count: number; warnings: string[]; message: string | null }>(`/api/seasons/${id}/advancement/process`, {
      tournamentId,
    });
  },

  previewAdvancement: async (id: string, tournamentId?: string) => {
    return await apiClient.post<AdvancementPreviewResult>(`/api/seasons/${id}/advancement/preview`, {
      tournamentId,
    });
  },

  getSeasonTournaments: async (id: string) => {
    const rows = await apiClient.get<SeasonTournamentDetails[]>(`/api/seasons/${id}/tournaments`);
    return rows.map((row) => aliasFields(row as unknown as ApiObject, tournamentAliases) as SeasonTournamentDetails);
  },

  addSeasonTournament: async (id: string, tournament: AddSeasonTournamentRequest) => {
    return await apiClient.post<AddSeasonTournamentResponse>(`/api/seasons/${id}/tournaments`, tournament);
  },

  getPointRules: async (id: string) => {
    const rows = await apiClient.get<PointRule[]>(`/api/seasons/${id}/point-rules`);
    return rows.map((row) => aliasFields(row as unknown as ApiObject, pointRuleAliases) as PointRule);
  },

  createPointRule: async (id: string, rule: CreatePointRuleRequest) => {
    return await apiClient.post(`/api/seasons/${id}/point-rules`, pointRulePayload(rule));
  },

  deletePointRule: async (id: string, ruleId: string) => {
    return await apiClient.delete(`/api/seasons/${id}/point-rules/${ruleId}`);
  },

  getAdvancementRules: async (id: string) => {
    const rows = await apiClient.get<AdvancementRule[]>(`/api/seasons/${id}/advancement-rules`);
    return rows.map((row) => aliasFields(row as unknown as ApiObject, advancementRuleAliases) as AdvancementRule);
  },

  createAdvancementRule: async (id: string, rule: CreateAdvancementRuleRequest) => {
    return await apiClient.post(`/api/seasons/${id}/advancement-rules`, advancementRulePayload(rule));
  },

  deleteAdvancementRule: async (id: string, ruleId: string) => {
    return await apiClient.delete(`/api/seasons/${id}/advancement-rules/${ruleId}`);
  },

  linkTournament: async (id: string, data: { season_id: string; season_role: string; season_stage_order: number }) => {
    return await apiClient.put(`/api/tournaments/${id}/season`, {
      seasonId: data.season_id,
      seasonRole: data.season_role,
      seasonStageOrder: data.season_stage_order,
    });
  },

  unlinkTournament: async (id: string) => {
    return await apiClient.delete(`/api/tournaments/${id}/season`);
  },

  registerForSeason: async (id: string) => {
    return await apiClient.post(`/api/seasons/${id}/register`);
  },

  getSeasonParticipants: async (id: string, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: pageOffset(page, limit).toString(),
    });
    const rows = await apiClient.get<SeasonParticipant[]>(`/api/seasons/${id}/participants?${params}`);
    return rows.map((row) => aliasFields(row as unknown as ApiObject, participantAliases) as SeasonParticipant);
  },

  updateParticipantStatus: async (id: string, participantId: string, data: { status: string; notes?: string }) => {
    return await apiClient.put(`/api/seasons/${id}/participants/${participantId}`, data);
  },

  removeParticipant: async (id: string, participantId: string) => {
    return await apiClient.delete(`/api/seasons/${id}/participants/${participantId}`);
  },

  getSeasonQualifications: async (id: string, page = 1, limit = 50) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: pageOffset(page, limit).toString(),
    });
    return await apiClient.get<SeasonQualificationRecord[]>(`/api/seasons/${id}/qualifications?${params}`);
  },

  updateQualification: async (id: string, recordId: string, payload: object) => {
    return await apiClient.put(`/api/seasons/${id}/qualifications/${recordId}`, payload);
  },

  syncSeasonNodes: async (id: string, nodes: unknown[]) => {
    return await apiClient.put(`/api/seasons/${id}/nodes`, { nodes });
  },

  syncSeasonRules: async (id: string, rules: unknown[]) => {
    return await apiClient.put(`/api/seasons/${id}/points-rules`, { rules });
  },

  syncSeasonStaff: async (id: string, staff: unknown[]) => {
    return await apiClient.put(`/api/seasons/${id}/staff`, { staff });
  },

  recalculateSeason: async (id: string) => {
    return await apiClient.post(`/api/seasons/${id}/recalculate`);
  },

  cancelSeason: async (id: string, reason: string) => {
    return await apiClient.post<{ success: boolean; status: string }>(`/api/seasons/${id}/cancel`, { reason });
  },

  duplicateSeason: async (id: string, newName: string, newSlug: string) => {
    return await apiClient.post<{ success: boolean; seasonId: string }>(`/api/seasons/${id}/duplicate`, { newName, newSlug });
  },

  getSeasonAdvancement: async (id: string) => {
    return await apiClient.get<SeasonAdvancementConnection[]>(`/api/seasons/${id}/advancement`);
  },

  getSeasonAuditLog: async (id: string) => {
    return await apiClient.get<SeasonAuditLogEntry[]>(`/api/seasons/${id}/audit?limit=50&offset=0`);
  },
};
