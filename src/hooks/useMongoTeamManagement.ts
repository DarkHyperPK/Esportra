import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface TeamMember {
  _id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  role: 'captain' | 'member' | 'substitute';
  verified: boolean;
  joinedAt: string;
  isActive: boolean;
}

export interface Team {
  _id: string;
  name: string;
  tag: string;
  game: string;
  games?: string[]; // Array of games the team plays
  gameFormat: string;
  logoUrl?: string;
  description?: string;
  websiteUrl?: string;
  socialMedia?: any;
  achievements?: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  members?: TeamMember[];
}

export interface TeamInvite {
  _id: string;
  teamId: string;
  userId: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: string;
  respondedAt?: string;
  team?: Team;
  inviter?: {
    username: string;
    avatar?: string;
  };
}

export const useMongoTeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's teams
  const fetchTeams = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/teams');
      if (response.success) {
        setTeams(response.data.teams || []);
      } else {
        setError(response.message || 'Failed to fetch teams');
      }
    } catch (err: any) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch team invites
  const fetchTeamInvites = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/teams/invites');
      if (response.success) {
        setTeamInvites(response.data.invites || []);
      } else {
        setError(response.message || 'Failed to fetch team invites');
      }
    } catch (err: any) {
      console.error('Error fetching team invites:', err);
      setError(err.message || 'Failed to fetch team invites');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create a new team
  const createTeam = async (teamData: Partial<Team>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/teams', teamData);
      if (response.success) {
        setTeams(prev => [...prev, response.data.team]);
        toast({
          title: "Team Created",
          description: "Your team has been created successfully.",
        });
        return response.data.team;
      } else {
        throw new Error(response.message || 'Failed to create team');
      }
    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team');
      toast({
        title: "Error",
        description: err.message || 'Failed to create team',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update team
  const updateTeam = async (teamId: string, teamData: Partial<Team>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.put(`/teams/${teamId}`, teamData);
      if (response.success) {
        setTeams(prev => prev.map(team => 
          team._id === teamId ? { ...team, ...response.data.team } : team
        ));
        toast({
          title: "Team Updated",
          description: "Your team has been updated successfully.",
        });
        return response.data.team;
      } else {
        throw new Error(response.message || 'Failed to update team');
      }
    } catch (err: any) {
      console.error('Error updating team:', err);
      setError(err.message || 'Failed to update team');
      toast({
        title: "Error",
        description: err.message || 'Failed to update team',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete team
  const deleteTeam = async (teamId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.delete(`/teams/${teamId}`);
      if (response.success) {
        setTeams(prev => prev.filter(team => team._id !== teamId));
        toast({
          title: "Team Deleted",
          description: "Your team has been deleted successfully.",
        });
      } else {
        throw new Error(response.message || 'Failed to delete team');
      }
    } catch (err: any) {
      console.error('Error deleting team:', err);
      setError(err.message || 'Failed to delete team');
      toast({
        title: "Error",
        description: err.message || 'Failed to delete team',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Invite user to team
  const inviteUser = async (teamId: string, userId: string, message?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post(`/teams/${teamId}/invite`, {
        userId,
        message
      });
      if (response.success) {
        toast({
          title: "Invitation Sent",
          description: "Team invitation has been sent successfully.",
        });
        return response.data.invite;
      } else {
        throw new Error(response.message || 'Failed to send invitation');
      }
    } catch (err: any) {
      console.error('Error inviting user:', err);
      setError(err.message || 'Failed to send invitation');
      toast({
        title: "Error",
        description: err.message || 'Failed to send invitation',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Respond to team invite
  const respondToInvite = async (inviteId: string, status: 'accepted' | 'declined') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.put(`/teams/invites/${inviteId}`, { status });
      if (response.success) {
        setTeamInvites(prev => prev.filter(invite => invite._id !== inviteId));
        if (status === 'accepted') {
          await fetchTeams(); // Refresh teams list
        }
        toast({
          title: status === 'accepted' ? "Invitation Accepted" : "Invitation Declined",
          description: `Team invitation has been ${status}.`,
        });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to respond to invitation');
      }
    } catch (err: any) {
      console.error('Error responding to invite:', err);
      setError(err.message || 'Failed to respond to invitation');
      toast({
        title: "Error",
        description: err.message || 'Failed to respond to invitation',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove team member
  const removeMember = async (teamId: string, memberId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
      if (response.success) {
        await fetchTeams(); // Refresh teams list
        toast({
          title: "Member Removed",
          description: "Team member has been removed successfully.",
        });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to remove member');
      }
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message || 'Failed to remove member');
      toast({
        title: "Error",
        description: err.message || 'Failed to remove member',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Leave team
  const leaveTeam = async (teamId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post(`/teams/${teamId}/leave`);
      if (response.success) {
        await fetchTeams(); // Refresh teams list
        toast({
          title: "Left Team",
          description: "You have left the team successfully.",
        });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to leave team');
      }
    } catch (err: any) {
      console.error('Error leaving team:', err);
      setError(err.message || 'Failed to leave team');
      toast({
        title: "Error",
        description: err.message || 'Failed to leave team',
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchTeams();
      fetchTeamInvites();
    }
  }, [user, fetchTeams, fetchTeamInvites]);

  return {
    teams,
    teamInvites,
    loading,
    error,
    fetchTeams,
    fetchTeamInvites,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteUser,
    respondToInvite,
    removeMember,
    leaveTeam,
  };
};
