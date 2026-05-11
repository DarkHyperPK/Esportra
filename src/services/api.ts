import { apiClient } from '@/lib/apiClient';
import { Database } from '@/integrations/supabase/types';
import type {
  Season,
  SeasonList,
  CreateSeasonRequest,
  UpdateSeasonRequest,
  UpdateSeasonPayload,
  SeasonStanding,
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
      page: page.toString(),
      limit: limit.toString()
    });
    if (status) params.append('status', status);
    if (game) params.append('game', game);
    if (mine) params.append('mine', 'true');
    return await apiClient.get<SeasonList[]>(`/api/seasons?${params}`);
  },

  getSeason: async (id: string) => {
    return await apiClient.get<Season>(`/api/seasons/${id}`);
  },

  getSeasonDetail: async (id: string) => {
    return await apiClient.get<SeasonDetailResponse>(`/api/seasons/${id}`);
  },

  createSeason: async (season: CreateSeasonRequest) => {
    return await apiClient.post<Season>('/api/seasons', season);
  },

  updateSeason: async (id: string, season: UpdateSeasonRequest) => {
    return await apiClient.put<Season>(`/api/seasons/${id}`, season);
  },

  updateSeasonDetail: async (id: string, payload: UpdateSeasonPayload) => {
    return await apiClient.put<SeasonDetailResponse>(`/api/seasons/${id}`, payload);
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
      page: page.toString(),
      limit: limit.toString()
    });
    return await apiClient.get<SeasonStanding[]>(`/api/seasons/${id}/standings?${params}`);
  },

  recalculateStandings: async (id: string) => {
    return await apiClient.post(`/api/seasons/${id}/standings/recalculate`);
  },

  processAdvancement: async (id: string, tournamentId?: string) => {
    return await apiClient.post<{ advanced_count: number }>(`/api/seasons/${id}/advancement/process`, {
      tournament_id: tournamentId,
    });
  },

  getSeasonTournaments: async (id: string) => {
    return await apiClient.get<SeasonTournamentDetails[]>(`/api/seasons/${id}/tournaments`);
  },

  getPointRules: async (id: string) => {
    return await apiClient.get<PointRule[]>(`/api/seasons/${id}/point-rules`);
  },

  createPointRule: async (id: string, rule: CreatePointRuleRequest) => {
    return await apiClient.post(`/api/seasons/${id}/point-rules`, rule);
  },

  deletePointRule: async (id: string, ruleId: string) => {
    return await apiClient.delete(`/api/seasons/${id}/point-rules/${ruleId}`);
  },

  getAdvancementRules: async (id: string) => {
    return await apiClient.get<AdvancementRule[]>(`/api/seasons/${id}/advancement-rules`);
  },

  createAdvancementRule: async (id: string, rule: CreateAdvancementRuleRequest) => {
    return await apiClient.post(`/api/seasons/${id}/advancement-rules`, rule);
  },

  deleteAdvancementRule: async (id: string, ruleId: string) => {
    return await apiClient.delete(`/api/seasons/${id}/advancement-rules/${ruleId}`);
  },

  linkTournament: async (id: string, data: { season_id: string; season_role: string; season_stage_order: number }) => {
    return await apiClient.put(`/api/tournaments/${id}/season`, data);
  },

  unlinkTournament: async (id: string) => {
    return await apiClient.delete(`/api/tournaments/${id}/season`);
  },

  registerForSeason: async (id: string) => {
    return await apiClient.post(`/api/seasons/${id}/register`);
  },

  getSeasonParticipants: async (id: string) => {
    return await apiClient.get<SeasonParticipant[]>(`/api/seasons/${id}/participants`);
  },

  updateParticipantStatus: async (id: string, participantId: string, data: { status: string; notes?: string }) => {
    return await apiClient.put(`/api/seasons/${id}/participants/${participantId}`, data);
  },

  removeParticipant: async (id: string, participantId: string) => {
    return await apiClient.delete(`/api/seasons/${id}/participants/${participantId}`);
  },

  getSeasonQualifications: async (id: string) => {
    return await apiClient.get<SeasonQualificationRecord[]>(`/api/seasons/${id}/qualifications`);
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
    return await apiClient.get<SeasonAuditLogEntry[]>(`/api/admin/seasons/${id}/audit`);
  },
};
