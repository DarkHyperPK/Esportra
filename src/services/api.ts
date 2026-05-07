import { apiClient } from '@/lib/apiClient';
import { Database } from '@/integrations/supabase/types';
import type {
  Season,
  SeasonList,
  CreateSeasonRequest,
  UpdateSeasonRequest,
  SeasonStanding,
  PointRule,
  AdvancementRule,
  CreatePointRuleRequest,
  CreateAdvancementRuleRequest
} from '@/types/season';

// Types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Tournament = Database['public']['Tables']['tournaments']['Row'];
export type TournamentRegistration = Database['public']['Tables']['tournament_participants']['Row'];
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
  getSeasons: async (page = 1, limit = 50, status?: string, game?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    if (status) params.append('status', status);
    if (game) params.append('game', game);
    return await apiClient.get<SeasonList[]>(`/api/seasons?${params}`);
  },

  getSeason: async (id: string) => {
    return await apiClient.get<Season>(`/api/seasons/${id}`);
  },

  createSeason: async (season: CreateSeasonRequest) => {
    return await apiClient.post<Season>('/api/seasons', season);
  },

  updateSeason: async (id: string, season: UpdateSeasonRequest) => {
    return await apiClient.put<Season>(`/api/seasons/${id}`, season);
  },

  deleteSeason: async (id: string) => {
    return await apiClient.delete(`/api/seasons/${id}`);
  },

  publishSeason: async (id: string) => {
    return await apiClient.post<Season>(`/api/seasons/${id}/publish`);
  },

  cancelSeason: async (id: string) => {
    return await apiClient.post<Season>(`/api/seasons/${id}/cancel`);
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

  getAuditLog: async (id: string) => {
    return await apiClient.get(`/api/seasons/${id}/audit`);
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
  }
};
