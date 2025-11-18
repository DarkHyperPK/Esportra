import { supabase } from '@/lib/supabase';
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Tournament API
export const tournamentApi = {
  getTournaments: async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  getTournament: async (id: string) => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  createTournament: async (tournament: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('tournaments')
      .insert(tournament)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateTournament: async (id: string, updates: Partial<Tournament>) => {
    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteTournament: async (id: string) => {
    try {
      console.log('Starting tournament deletion process for tournament:', id);

      // Start a Supabase transaction
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User must be authenticated to delete tournament');

      // First verify if the tournament exists and you have permission
      const { data: tournament, error: tournamentCheckError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentCheckError) {
        console.error('Error checking tournament:', tournamentCheckError);
        throw tournamentCheckError;
      }

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // 1. First delete all tournament participants
      console.log('Step 1: Deleting tournament participants...');
      const { error: participantsError } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', id);

      if (participantsError) {
        console.error('Error deleting tournament participants:', participantsError);
        throw participantsError;
      }

      // Verify participants are deleted
      const { data: remainingParticipants } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', id);

      if (remainingParticipants && remainingParticipants.length > 0) {
        console.error(`Failed to delete ${remainingParticipants.length} participants`);
        throw new Error('Failed to delete all tournament participants');
      }

      // 2. Then delete all tournament registrations
      console.log('Step 2: Deleting tournament registrations...');
      const { error: registrationsError } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', id);

      if (registrationsError) {
        console.error('Error deleting tournament registrations:', registrationsError);
        throw registrationsError;
      }

      // Verify registrations are deleted
      const { data: remainingRegistrations } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', id);

      if (remainingRegistrations && remainingRegistrations.length > 0) {
        console.error(`Failed to delete ${remainingRegistrations.length} registrations`);
        throw new Error('Failed to delete all tournament registrations');
      }

      // 3. Finally delete the tournament itself
      console.log('Step 3: Deleting tournament...');
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id);

      if (tournamentError) {
        console.error('Error deleting tournament:', tournamentError);
        throw tournamentError;
      }

      console.log('Successfully deleted tournament and all related data');
      return true;

    } catch (error: unknown) {
      const e = error as { message?: string; code?: string; details?: unknown };
      console.error('Tournament deletion error:', {
        error: e,
        message: e.message,
        code: e.code,
        details: e.details
      });
      throw error;
    }
  }
};

// Tournament Registration API
export const registrationApi = {
  getRegistrations: async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('tournament_participants')
      .select('*')
      .eq('tournament_id', tournamentId);
    
    if (error) throw error;
    return data;
  },

  registerForTournament: async (registration: Omit<TournamentRegistration, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
      .from('tournament_participants')
      .insert(registration)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateRegistration: async (id: string, updates: Partial<TournamentRegistration>) => {
    const { data, error } = await supabase
      .from('tournament_participants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  cancelRegistration: async (id: string) => {
    const { error } = await supabase
      .from('tournament_participants')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Venue API
export const venueApi = {
  getVenues: async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  getVenue: async (id: string) => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  createVenue: async (venue: Omit<Venue, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('venues')
      .insert(venue)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateVenue: async (id: string, updates: Partial<Venue>) => {
    const { data, error } = await supabase
      .from('venues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteVenue: async (id: string) => {
    const { error } = await supabase
      .from('venues')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Venue Booking API
export const bookingApi = {
  getBookings: async (venueId: string) => {
    const { data, error } = await supabase
      .from('venue_bookings')
      .select('*')
      .eq('venue_id', venueId)
      .order('booking_date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  createBooking: async (booking: Omit<VenueBooking, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('venue_bookings')
      .insert(booking)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  updateBooking: async (id: string, updates: Partial<VenueBooking>) => {
    const { data, error } = await supabase
      .from('venue_bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  cancelBooking: async (id: string) => {
    const { error } = await supabase
      .from('venue_bookings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// User Role API
export const roleApi = {
  getUserRole: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  setUserRole: async (userId: string, role: UserRole['role']) => {
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}; 