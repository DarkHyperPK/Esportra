import { apiClient } from '@/lib/apiClient';
import { Database } from '@/integrations/supabase/types';

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
    return await apiClient.get(`/api/tournaments/${id}`);
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
