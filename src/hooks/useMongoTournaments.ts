import { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { useToast } from './use-toast';

export interface Tournament {
  _id: string;
  name: string;
  game: string;
  format: string;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  rules?: string;
  requirements?: string;
  createdBy: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string;
  imageUrl?: string;
  currentParticipants?: number;
}

type TournamentStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export const useMongoTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTournaments = async (filters?: {
    status?: TournamentStatus;
    game?: string;
    featured?: boolean;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.game) params.append('game', filters.game);
      if (filters?.featured !== undefined) params.append('featured', filters.featured.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await apiClient.get(`/tournaments?${params.toString()}`);
      
      if (response.success) {
        setTournaments(response.data.tournaments || []);
      } else {
        setError(response.message || 'Failed to fetch tournaments');
      }
    } catch (err: any) {
      console.error('Error fetching tournaments:', err);
      setError(err.message || 'Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const fetchTournament = async (tournamentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/tournaments/${tournamentId}`);
      
      if (response.success) {
        return response.data.tournament;
      } else {
        setError(response.message || 'Failed to fetch tournament');
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching tournament:', err);
      setError(err.message || 'Failed to fetch tournament');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async (tournamentData: Partial<Tournament>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/tournaments', tournamentData);
      
      if (response.success) {
        setTournaments(prev => [response.data.tournament, ...prev]);
        toast({
          title: "Tournament Created",
          description: "Your tournament has been created successfully.",
        });
        return response.data.tournament;
      } else {
        throw new Error(response.message || 'Failed to create tournament');
      }
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament');
      toast({
        title: "Error",
        description: err.message || 'Failed to create tournament',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTournament = async (tournamentId: string, tournamentData: Partial<Tournament>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.put(`/tournaments/${tournamentId}`, tournamentData);
      
      if (response.success) {
        setTournaments(prev => prev.map(tournament => 
          tournament._id === tournamentId ? { ...tournament, ...response.data.tournament } : tournament
        ));
        toast({
          title: "Tournament Updated",
          description: "Your tournament has been updated successfully.",
        });
        return response.data.tournament;
      } else {
        throw new Error(response.message || 'Failed to update tournament');
      }
    } catch (err: any) {
      console.error('Error updating tournament:', err);
      setError(err.message || 'Failed to update tournament');
      toast({
        title: "Error",
        description: err.message || 'Failed to update tournament',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.delete(`/tournaments/${tournamentId}`);
      
      if (response.success) {
        setTournaments(prev => prev.filter(tournament => tournament._id !== tournamentId));
        toast({
          title: "Tournament Deleted",
          description: "Your tournament has been deleted successfully.",
        });
      } else {
        throw new Error(response.message || 'Failed to delete tournament');
      }
    } catch (err: any) {
      console.error('Error deleting tournament:', err);
      setError(err.message || 'Failed to delete tournament');
      toast({
        title: "Error",
        description: err.message || 'Failed to delete tournament',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerForTournament = async (tournamentId: string, teamId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post(`/tournaments/${tournamentId}/register`, {
        teamId
      });
      
      if (response.success) {
        toast({
          title: "Registration Successful",
          description: "You have been registered for the tournament.",
        });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to register for tournament');
      }
    } catch (err: any) {
      console.error('Error registering for tournament:', err);
      setError(err.message || 'Failed to register for tournament');
      toast({
        title: "Error",
        description: err.message || 'Failed to register for tournament',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const unregisterFromTournament = async (tournamentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.delete(`/tournaments/${tournamentId}/register`);
      
      if (response.success) {
        toast({
          title: "Unregistered",
          description: "You have been unregistered from the tournament.",
        });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to unregister from tournament');
      }
    } catch (err: any) {
      console.error('Error unregistering from tournament:', err);
      setError(err.message || 'Failed to unregister from tournament');
      toast({
        title: "Error",
        description: err.message || 'Failed to unregister from tournament',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTournamentParticipants = async (tournamentId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/tournaments/${tournamentId}/participants`);
      
      if (response.success) {
        return response.data.participants || [];
      } else {
        setError(response.message || 'Failed to fetch participants');
        return [];
      }
    } catch (err: any) {
      console.error('Error fetching participants:', err);
      setError(err.message || 'Failed to fetch participants');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load tournaments on mount
  useEffect(() => {
    fetchTournaments();
  }, []);

  return {
    tournaments,
    loading,
    error,
    fetchTournaments,
    fetchTournament,
    createTournament,
    updateTournament,
    deleteTournament,
    registerForTournament,
    unregisterFromTournament,
    getTournamentParticipants,
  };
};
