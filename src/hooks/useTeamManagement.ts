/**
 * useTeamManagement — Domain 3: Teams & Roster Management
 *
 * Migrated from Supabase direct to .NET API via apiClient.
 * Replaced manual useState/useEffect pattern with TanStack Query.
 * Eliminated N+1: backend now returns teams with members in one aggregated query.
 * Replaced Supabase Realtime channel with query invalidation on mutations.
 *
 * Public API is backward-compatible with existing callers.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// ── Types (unchanged public surface) ─────────────────────────────────────────

export interface TeamMember {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: 'captain' | 'member' | 'substitute' | 'coach';
  verified: boolean;
  joined_at: string;
  is_active: boolean;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  game: string;
  games?: string[];
  game_format: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  website_url?: string;
  social_media?: any;
  achievements?: any;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  members: TeamMember[];
  country_code?: string;
  tournament_wins: number;
  total_matches: number;
}

export interface CreateTeamData {
  name: string;
  tag: string;
  game: string;
  game_format: string;
  logo_url?: string;
  description?: string;
  members: Array<{ user_id: string; role: 'captain' | 'member' | 'substitute' | 'coach' }>;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  user_id: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  created_at: string;
  responded_at?: string;
  team: { name: string; game: string; logo_url?: string };
  inviter: { username: string; avatar_url?: string };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useTeamManagement = () => {
  const { user }    = useAuth();
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const invalidateTeams   = useCallback(() =>
    queryClient.invalidateQueries({ queryKey: ['my-teams'] }), [queryClient]);
  const invalidateInvites = useCallback(() =>
    queryClient.invalidateQueries({ queryKey: ['my-team-invites'] }), [queryClient]);
  const invalidateAll = useCallback(() => {
    invalidateTeams(); invalidateInvites();
  }, [invalidateTeams, invalidateInvites]);

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: userTeams = [], isLoading: loading } = useQuery<Team[]>({
    queryKey: ['my-teams'],
    queryFn:  () => apiClient.get<Team[]>('/api/teams/me'),
    enabled:  !!user,
    staleTime: 2 * 60_000,
  });

  const { data: teamInvites = [], isLoading: invitesLoading } = useQuery<TeamInvite[]>({
    queryKey: ['my-team-invites'],
    queryFn:  () => apiClient.get<TeamInvite[]>('/api/teams/me/invites'),
    enabled:  !!user,
    staleTime: 2 * 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createTeamMutation = useMutation({
    mutationFn: (data: CreateTeamData) =>
      apiClient.post<Team>('/api/teams', {
        name:       data.name,
        tag:        data.tag,
        game:       data.game,
        gameFormat: data.game_format,
        logoUrl:    data.logo_url,
        description: data.description,
        members:    data.members.map((m) => ({ userId: m.user_id, role: m.role })),
      }),
    onSuccess: () => { invalidateTeams(); },
    onError: (e: Error) => toast({ title: 'Failed to create team', description: e.message, variant: 'destructive' }),
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) =>
      apiClient.put<Team>(`/api/teams/${teamId}`, updates),
    onSuccess: () => { invalidateTeams(); },
    onError: (e: Error) => toast({ title: 'Failed to update team', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: string) => apiClient.delete(`/api/teams/${teamId}`),
    onSuccess: () => {
      invalidateTeams();
      toast({ title: 'Team Disbanded', description: 'Team has been permanently deleted.' });
    },
    onError: (e: Error) => toast({ title: 'Failed to disband', description: e.message, variant: 'destructive' }),
  });

  const leaveMutation = useMutation({
    mutationFn: (teamId: string) => apiClient.post(`/api/teams/${teamId}/leave`),
    onSuccess: () => {
      invalidateTeams();
      toast({ title: 'Left Team', description: 'You have left the team successfully.' });
    },
    onError: (e: Error) => toast({ title: 'Failed to leave', description: e.message, variant: 'destructive' }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiClient.delete(`/api/teams/${teamId}/members/${userId}`),
    onSuccess: () => { invalidateTeams(); },
    onError: (e: Error) => toast({ title: 'Failed to remove member', description: e.message, variant: 'destructive' }),
  });

  const transferMutation = useMutation({
    mutationFn: ({ teamId, newCaptainId }: { teamId: string; newCaptainId: string }) =>
      apiClient.post(`/api/teams/${teamId}/transfer-captain`, { newCaptainId }),
    onSuccess: () => {
      invalidateTeams();
      toast({ title: 'Captaincy Transferred', description: 'Team captaincy transferred successfully.' });
    },
    onError: (e: Error) => toast({ title: 'Transfer failed', description: e.message, variant: 'destructive' }),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ teamId, userId, message }: { teamId: string; userId: string; message?: string }) =>
      apiClient.post(`/api/teams/${teamId}/invite`, { userId, message }),
    onSuccess: () => {
      invalidateInvites();
      toast({ title: 'Invitation Sent' });
    },
    onError: (e: Error) => toast({ title: 'Invite failed', description: e.message, variant: 'destructive' }),
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiClient.post(`/api/teams/invites/${inviteId}/accept`),
    onSuccess: () => { invalidateAll(); toast({ title: 'Invite Accepted', description: 'You have joined the team.' }); },
    onError: (e: Error) => toast({ title: 'Failed to accept', description: e.message, variant: 'destructive' }),
  });

  const declineInviteMutation = useMutation({
    mutationFn: (inviteId: string) =>
      apiClient.post(`/api/teams/invites/${inviteId}/decline`),
    onSuccess: () => { invalidateInvites(); toast({ title: 'Invite Declined' }); },
    onError: (e: Error) => toast({ title: 'Failed to decline', description: e.message, variant: 'destructive' }),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: string) => apiClient.delete(`/api/teams/invites/${inviteId}`),
    onSuccess: () => { invalidateInvites(); },
    onError: (e: Error) => toast({ title: 'Failed to revoke', description: e.message, variant: 'destructive' }),
  });

  // ── Backward-compatible action wrappers (return boolean like the old hook) ─

  const createTeam     = useCallback(async (data: CreateTeamData): Promise<Team | null> => {
    try   { return await createTeamMutation.mutateAsync(data); }
    catch { return null; }
  }, [createTeamMutation]);

  const updateTeam     = useCallback(async (teamId: string, updates: Partial<Team>): Promise<boolean> => {
    try   { await updateTeamMutation.mutateAsync({ teamId, updates }); return true; }
    catch { return false; }
  }, [updateTeamMutation]);

  const deleteTeam     = useCallback(async (teamId: string): Promise<boolean> => {
    try   { await deleteMutation.mutateAsync(teamId); return true; }
    catch { return false; }
  }, [deleteMutation]);

  const disbandTeam    = deleteTeam; // alias

  const leaveTeam      = useCallback(async (teamId: string): Promise<boolean> => {
    try   { await leaveMutation.mutateAsync(teamId); return true; }
    catch { return false; }
  }, [leaveMutation]);

  const removeTeamMember = useCallback(async (teamId: string, userId: string): Promise<boolean> => {
    try   { await removeMemberMutation.mutateAsync({ teamId, userId }); return true; }
    catch { return false; }
  }, [removeMemberMutation]);

  const transferCaptaincy = useCallback(async (teamId: string, newCaptainId: string): Promise<boolean> => {
    try   { await transferMutation.mutateAsync({ teamId, newCaptainId }); return true; }
    catch { return false; }
  }, [transferMutation]);

  const inviteUserToTeam = useCallback(async (teamId: string, userId: string, message?: string): Promise<boolean> => {
    try   { await inviteMutation.mutateAsync({ teamId, userId, message }); return true; }
    catch { return false; }
  }, [inviteMutation]);

  const acceptTeamInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try   { await acceptInviteMutation.mutateAsync(inviteId); return true; }
    catch { return false; }
  }, [acceptInviteMutation]);

  const declineTeamInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try   { await declineInviteMutation.mutateAsync(inviteId); return true; }
    catch { return false; }
  }, [declineInviteMutation]);

  const revokeTeamInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try   { await revokeInviteMutation.mutateAsync(inviteId); return true; }
    catch { return false; }
  }, [revokeInviteMutation]);

  const getVerifiedUsers = useCallback(async (q?: string) => {
    try   { return await apiClient.get<any[]>(`/api/profiles/verified${q ? `?q=${encodeURIComponent(q)}` : ''}`); }
    catch { return []; }
  }, []);

  const changeRole = useCallback(async (teamId: string, userId: string, role: 'member' | 'substitute' | 'coach'): Promise<boolean> => {
    try {
      await apiClient.put(`/api/teams/${teamId}/members/${userId}/role`, { role });
      queryClient.invalidateQueries({ queryKey: ['my-teams'] });
      toast({ title: 'Role updated', description: `Member role changed to ${role}.` });
      return true;
    } catch (err: any) {
      toast({ title: 'Failed to change role', description: err?.body?.error || err.message, variant: 'destructive' });
      return false;
    }
  }, [queryClient, toast]);

  const updateRosterMemberRole = useCallback(async (
    teamId: string,
    rosterId: string,
    userId: string,
    rosterRole: 'starter' | 'substitute' | 'coach',
  ): Promise<boolean> => {
    try {
      await apiClient.put(`/api/teams/${teamId}/rosters/${rosterId}/members/${userId}/role`, { rosterRole });
      toast({ title: 'Lineup role updated', description: `Player is now a ${rosterRole}.` });
      return true;
    } catch (err: any) {
      toast({ title: 'Failed to update lineup role', description: err?.body?.error || err.message, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const submitting = createTeamMutation.isPending || updateTeamMutation.isPending
    || deleteMutation.isPending || inviteMutation.isPending;

  return {
    // State
    userTeams,
    teamInvites,
    loading,
    invitesLoading,
    submitting,
    fetchingTeam: loading,

    // Actions
    createTeam,
    updateTeam,
    deleteTeam,
    disbandTeam,
    leaveTeam,
    inviteUserToTeam,
    acceptTeamInvite,
    declineTeamInvite,
    revokeTeamInvite,
    removeTeamMember,
    removeMemberFromTeam: removeTeamMember,
    transferCaptaincy,
    changeRole,
    updateRosterMemberRole,
    getVerifiedUsers,

    // Refresh
    fetchUserTeams:  invalidateTeams,
    fetchTeamInvites: invalidateInvites,
    refreshTeams:     invalidateAll,
  };
};
