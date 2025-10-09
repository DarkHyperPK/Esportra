import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface TeamMember {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: 'captain' | 'player' | 'substitute';
  verified: boolean;
  joined_at: string;
  is_active: boolean;
}

export interface Team {
  id: string;
  name: string;
  tag: string;
  game: string;
  games?: string[]; // Array of games the team plays
  game_format: string;
  logo_url?: string;
  description?: string;
  website_url?: string;
  social_media?: any;
  achievements?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  members: TeamMember[];
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
  members: Array<{
    user_id: string;
    role: 'captain' | 'player' | 'substitute';
  }>;
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
  team: {
    name: string;
    game: string;
    logo_url?: string;
  };
  inviter: {
    username: string;
    avatar_url?: string;
  };
}

export const useTeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fix existing teams by adding missing captain to team_members
  const fixTeamCaptain = async (teamId: string, captainId: string) => {
    try {
      // Check if captain is already in team_members with any role
      const { data: existingCaptain } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('team_id', teamId)
        .eq('user_id', captainId)
        .single();

      if (!existingCaptain) {
        // Add captain to team_members
        await supabase
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: captainId,
            role: 'captain',
            is_active: true,
            joined_at: new Date().toISOString(),
          });
      } else if (existingCaptain.role !== 'captain') {
        // Update existing member to captain role
        await supabase
          .from('team_members')
          .update({ role: 'captain' })
          .eq('team_id', teamId)
          .eq('user_id', captainId);
      }
    } catch (error) {
      console.error('Error fixing team captain:', error);
    }
  };

  // Fetch user's teams
  const fetchUserTeams = useCallback(async () => {
    if (!user) {
      setUserTeams([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get teams where user is a member
      const { data: memberTeams, error: memberError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          joined_at,
          is_active,
          teams (
            id,
            name,
            tag,
            game,
            games,
            game_format,
            logo_url,
            description,
            website_url,
            social_media,
            achievements,
            created_by,
            created_at,
            updated_at,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memberError) throw memberError;

      // Get teams created by user
      const { data: createdTeams, error: createdError } = await supabase
        .from('teams')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_active', true);

      if (createdError) throw createdError;

      // Combine and deduplicate teams
      const allTeams = [...(memberTeams || []), ...(createdTeams || [])];
      const uniqueTeams = Array.from(
        new Map(allTeams.map(t => [t.teams?.id || t.id, t])).values()
      );

      // Fetch members for each team
      const teamsWithMembers = await Promise.all(
        uniqueTeams.map(async (team) => {
          const teamId = team.teams?.id || team.id;
          const teamCreatedBy = team.teams?.created_by || team.created_by;
          
          // Fix missing captain in team_members
          await fixTeamCaptain(teamId, teamCreatedBy);
          
          const { data: members } = await supabase
            .from('team_members')
            .select(`
              user_id,
              role,
              joined_at,
              is_active,
              profiles (
                id,
                username,
                full_name,
                avatar_url,
                verified
              )
            `)
            .eq('team_id', teamId)
            .eq('is_active', true);

          console.log('Raw members data for team', teamId, ':', members);

          // Calculate tournament stats (placeholder for now)
          const { count: tournamentWins } = await supabase
            .from('tournament_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId)
            .eq('status', 'winner');

          const { count: totalMatches } = await supabase
            .from('tournament_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);

          return {
            id: teamId,
            name: team.teams?.name || team.name,
            tag: team.teams?.tag || team.tag,
            game: team.teams?.game || team.game,
            games: team.teams?.games || team.games || [],
            game_format: team.teams?.game_format || team.game_format,
            logo_url: team.teams?.logo_url || team.logo_url,
            description: team.teams?.description || team.description,
            website_url: team.teams?.website_url || team.website_url,
            social_media: team.teams?.social_media || team.social_media,
            achievements: team.teams?.achievements || team.achievements,
            created_by: team.teams?.created_by || team.created_by,
            created_at: team.teams?.created_at || team.created_at,
            updated_at: team.teams?.updated_at || team.updated_at,
            is_active: team.teams?.is_active || team.is_active,
            members: (members || []).map(m => {
              console.log('Mapping member:', m);
              const mappedMember = {
                id: m.user_id,
                user_id: m.user_id, // Add user_id field for filtering
                username: m.profiles?.username || 'Unknown',
                full_name: m.profiles?.full_name,
                avatar_url: m.profiles?.avatar_url,
                role: m.role,
                verified: m.profiles?.verified || false,
                joined_at: m.joined_at,
                is_active: m.is_active,
              };
              console.log('Mapped member:', mappedMember);
              return mappedMember;
            }),
            tournament_wins: tournamentWins || 0,
            total_matches: totalMatches || 0,
          };
        })
      );

      setUserTeams(teamsWithMembers);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch team invites
  const fetchTeamInvites = useCallback(async () => {
    if (!user) {
      setTeamInvites([]);
      setInvitesLoading(false);
      return;
    }

    try {
      setInvitesLoading(true);

      const { data: invites, error } = await supabase
        .from('team_invites')
        .select(`
          id,
          team_id,
          user_id,
          invited_by,
          status,
          message,
          created_at,
          responded_at,
          teams (
            name,
            game,
            logo_url
          ),
          profiles!team_invites_invited_by_fkey (
            username,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedInvites: TeamInvite[] = (invites || []).map(invite => ({
        id: invite.id,
        team_id: invite.team_id,
        user_id: invite.user_id,
        invited_by: invite.invited_by,
        status: invite.status,
        message: invite.message,
        created_at: invite.created_at,
        responded_at: invite.responded_at,
        team: {
          name: invite.teams.name,
          game: invite.teams.game,
          logo_url: invite.teams.logo_url,
        },
        inviter: {
          username: invite.profiles.username,
          avatar_url: invite.profiles.avatar_url,
        },
      }));

      setTeamInvites(formattedInvites);
    } catch (error) {
      console.error('Error fetching team invites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team invites',
        variant: 'destructive',
      });
    } finally {
      setInvitesLoading(false);
    }
  }, [user, toast]);

  // Create a new team
  const createTeam = async (teamData: CreateTeamData): Promise<Team | null> => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create a team',
        variant: 'destructive',
      });
      return null;
    }

    setSubmitting(true);

    try {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamData.name,
          tag: teamData.tag,
          game: teamData.game,
          game_format: teamData.game_format,
          logo_url: teamData.logo_url,
          description: teamData.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add team members (including the creator as captain)
      const memberRows = [
        // Add the team creator as captain
        {
          team_id: team.id,
          user_id: user.id,
          role: 'captain',
        },
        // Add other team members
        ...teamData.members.map(member => ({
          team_id: team.id,
          user_id: member.user_id,
          role: member.role,
        }))
      ];

      const { error: memberError } = await supabase
        .from('team_members')
        .insert(memberRows);

      if (memberError) throw memberError;

      // Send notifications to team members (excluding the creator)
      const notifications = teamData.members
        .filter(m => m.user_id !== user.id) // Don't notify yourself
        .map(member => ({
          user_id: member.user_id,
          type: 'team_created',
          title: 'Team Created',
          message: `You have been added to team "${teamData.name}" as ${member.role}`,
          data: { team_id: team.id, team_name: teamData.name },
          read: false,
          created_at: new Date().toISOString(),
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      toast({
        title: 'Team Created!',
        description: `Team "${teamData.name}" has been created successfully`,
        variant: 'default',
      });

      // Refresh teams list
      await fetchUserTeams();

      return team;
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Update team
  const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<boolean> => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Team Updated',
        description: 'Team has been updated successfully',
        variant: 'default',
      });

      await fetchUserTeams();
      return true;
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Delete team
  const deleteTeam = async (teamId: string): Promise<boolean> => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'Team Deleted',
        description: 'Team has been deleted successfully',
        variant: 'default',
      });

      await fetchUserTeams();
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Invite user to team (enforce: user cannot be member of another team for overlapping games)
  const inviteUserToTeam = async (teamId: string, userId: string, message?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Prevent inviting yourself
      if (userId === user.id) {
        toast({ title: 'Invalid Invite', description: 'You cannot invite yourself.', variant: 'destructive' });
        return false;
      }
      // Load games for this team
      const { data: teamRow, error: teamLoadError } = await supabase
        .from('teams')
        .select('id, games')
        .eq('id', teamId)
        .single();
      if (teamLoadError) throw teamLoadError;

      const teamGames: string[] = Array.isArray(teamRow?.games) ? teamRow.games : [];

      if (teamGames.length > 0) {
        // Find teams this user already belongs to and check overlap client-side (works whether games is jsonb[] or text[])
        const { data: candidateTeams, error: conflictError } = await supabase
          .from('teams')
          .select('id, name, games, team_members!inner(user_id, is_active)')
          .eq('team_members.user_id', userId)
          .eq('team_members.is_active', true);

        if (conflictError) throw conflictError;

        const hasConflict = (candidateTeams || []).some((t: any) =>
          Array.isArray(t?.games) && t.games.some((g: string) => teamGames.includes(g))
        );

        if (hasConflict) {
          toast({
            title: 'Cannot Invite',
            description: 'User is already a member of another team for one or more selected games.',
            variant: 'destructive',
          });
          return false;
        }
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        toast({
          title: 'Already a Member',
          description: 'This user is already a team member',
          variant: 'destructive',
        });
        return false;
      }

      // Handle existing invites (pending/declined/accepted)
      const { data: existingInvite } = await supabase
        .from('team_invites')
        .select('id, status')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (existingInvite) {
        if (existingInvite.status === 'accepted') {
          // User previously accepted, but may have left. Re-open invite to allow re-joining.
          await supabase
            .from('team_invites')
            .update({ status: 'pending', responded_at: null, created_at: new Date().toISOString() })
            .eq('id', existingInvite.id);
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'team_invite',
            title: 'Team Invitation',
            message: `You have been invited to re-join a team`,
            team_id: teamId,
            is_read: false,
            created_at: new Date().toISOString(),
          });
          toast({ title: 'Invite re-sent', description: 'User can re-join the team.' });
          return true;
        }
        if (existingInvite.status === 'pending') {
          // Re-send notification as a reminder
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'team_invite',
            title: 'Team Invitation Reminder',
            message: `You still have a pending team invite`,
            team_id: teamId,
            is_read: false,
            created_at: new Date().toISOString(),
          });
          toast({ title: 'Reminder sent', description: 'User already had a pending invite. Reminder sent.' });
          return true;
        }
        if (existingInvite.status === 'declined') {
          // Re-open the invite
          await supabase
            .from('team_invites')
            .update({ status: 'pending', responded_at: null, created_at: new Date().toISOString() })
            .eq('id', existingInvite.id);
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'team_invite',
            title: 'Team Invitation',
            message: message || `You have been invited to join a team`,
            team_id: teamId,
            is_read: false,
            created_at: new Date().toISOString(),
          });
          toast({ title: 'Invite re-sent', description: 'Declined invite reopened and sent again.' });
          return true;
        }
      }

      // Create invite
      const { error: inviteError } = await supabase
        .from('team_invites')
        .insert({
          team_id: teamId,
          user_id: userId,
          invited_by: user.id,
          status: 'pending',
          message,
        });

      if (inviteError) throw inviteError;

      // Send notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'team_invite',
        title: 'Team Invitation',
        message: message || `You have been invited to join a team`,
        team_id: teamId,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      if (notifError) console.error('Notification insert error', notifError);

      toast({
        title: 'Invite Sent',
        description: 'Team invitation has been sent',
        variant: 'default',
      });

      return true;
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Accept team invite
  const acceptTeamInvite = async (inviteId: string): Promise<boolean> => {
    try {
      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from('team_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (inviteError) throw inviteError;

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invite.team_id,
          user_id: invite.user_id,
          role: 'player',
        });

      if (memberError) throw memberError;

      // Update invite status
      const { error: updateError } = await supabase
        .from('team_invites')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      // Clean up related notifications
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('team_id', invite.team_id)
          .eq('type', 'team_invite')
          .eq('user_id', invite.user_id);
      } catch (notifError) {
        console.warn('Failed to clean up notifications:', notifError);
      }

      toast({
        title: 'Invite Accepted',
        description: 'You have joined the team successfully',
        variant: 'default',
      });

      // Refresh data
      await Promise.all([fetchUserTeams(), fetchTeamInvites()]);

      return true;
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Decline team invite
  const declineTeamInvite = async (inviteId: string): Promise<boolean> => {
    try {
      // Get invite details first
      const { data: invite, error: inviteError } = await supabase
        .from('team_invites')
        .select('*')
        .eq('id', inviteId)
        .single();

      if (inviteError) throw inviteError;

      const { error } = await supabase
        .from('team_invites')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;

      // Clean up related notifications
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('team_id', invite.team_id)
          .eq('type', 'team_invite')
          .eq('user_id', invite.user_id);
      } catch (notifError) {
        console.warn('Failed to clean up notifications:', notifError);
      }

      toast({
        title: 'Invite Declined',
        description: 'Team invitation has been declined',
        variant: 'default',
      });

      await fetchTeamInvites();
      return true;
    } catch (error) {
      console.error('Error declining invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Remove team member
  const removeTeamMember = async (teamId: string, userId: string): Promise<boolean> => {
    try {
      console.log('=== REMOVE MEMBER DEBUG ===');
      console.log('Team ID:', teamId);
      console.log('User ID to remove:', userId);
      
      const { data, error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select();

      console.log('Delete result:', data, 'error:', error);

      if (error) throw error;

      console.log('Member removed successfully, refreshing teams...');
      await fetchUserTeams();
      
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  };

  // Get verified users for team creation
  const getVerifiedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, verified, email')
        .eq('verified', true)
        .order('username');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching verified users:', error);
      return [];
    }
  };

  // Initialize data
  useEffect(() => {
    fetchUserTeams();
    fetchTeamInvites();
  }, [fetchUserTeams, fetchTeamInvites]);

  // Remove member from team (alias for removeTeamMember)
  const removeMemberFromTeam = removeTeamMember;

  // Transfer captaincy
  const transferCaptaincy = async (teamId: string, newCaptainId: string): Promise<boolean> => {
    try {
      console.log('=== TRANSFER CAPTAINCY DEBUG ===');
      console.log('Team ID:', teamId);
      console.log('New Captain ID:', newCaptainId);
      console.log('Current User ID:', user?.id);
      
      // Update the team's created_by field to the new captain
      const { error: teamError } = await supabase
        .from('teams')
        .update({ created_by: newCaptainId })
        .eq('id', teamId);

      if (teamError) {
        console.error('Team update error:', teamError);
        throw teamError;
      }

      // Update member roles - handle both 'captain' and 'Captain' cases
      const { error: oldCaptainError } = await supabase
        .from('team_members')
        .update({ role: 'player' })
        .eq('team_id', teamId)
        .in('role', ['captain', 'Captain']);

      if (oldCaptainError) {
        console.error('Old captain role update error:', oldCaptainError);
        throw oldCaptainError;
      }

      const { error: newCaptainError } = await supabase
        .from('team_members')
        .update({ role: 'captain' })
        .eq('team_id', teamId)
        .eq('user_id', newCaptainId);

      if (newCaptainError) {
        console.error('New captain role update error:', newCaptainError);
        throw newCaptainError;
      }

      console.log('Captaincy transfer completed successfully');

      toast({
        title: 'Captaincy Transferred',
        description: 'Team captaincy has been transferred successfully',
        variant: 'default',
      });

      await fetchUserTeams();
      return true;
    } catch (error) {
      console.error('Error transferring captaincy:', error);
      toast({
        title: 'Error',
        description: 'Failed to transfer captaincy',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Disband team (hard delete team row and related records)
  const disbandTeam = async (teamId: string): Promise<boolean> => {
    try {
      // 1) Delete tournament registrations for this team
      const { error: registrationsError } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('team_id', teamId);
      if (registrationsError) throw registrationsError;

      // 2) Delete any pending/in-flight invites for this team
      const { error: invitesError } = await supabase
        .from('team_invites')
        .delete()
        .eq('team_id', teamId);
      if (invitesError) throw invitesError;

      // 3) Remove all team members
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);
      if (membersError) throw membersError;

      // 4) Optionally clean notifications that reference this team (best-effort)
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('team_id', teamId);
      } catch (e) {
        // Best effort: ignore if column doesn't exist or policy blocks
        console.warn('Notification cleanup skipped/failed:', e);
      }

      // 5) Finally delete the team row itself
      const { error: teamDeleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      if (teamDeleteError) throw teamDeleteError;

      toast({
        title: 'Team Disbanded',
        description: 'Team has been permanently deleted',
        variant: 'default',
      });

      await fetchUserTeams();
      return true;
    } catch (error) {
      console.error('Error disbanding team (hard delete):', error);
      toast({
        title: 'Error',
        description: 'Failed to disband team',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Leave team
  const leaveTeam = async (teamId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Left Team',
        description: 'You have left the team successfully',
        variant: 'default',
      });

      await fetchUserTeams();
      return true;
    } catch (error) {
      console.error('Error leaving team:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave team',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    // State
    userTeams,
    teamInvites,
    loading: loading as boolean,
    invitesLoading,
    submitting,
    fetchingTeam: loading,

    // Actions
    createTeam,
    updateTeam,
    deleteTeam,
    inviteUserToTeam,
    acceptTeamInvite,
    declineTeamInvite,
    removeTeamMember,
    removeMemberFromTeam,
    transferCaptaincy,
    disbandTeam,
    leaveTeam,
    getVerifiedUsers,
    
    // Refresh functions
    fetchUserTeams,
    fetchTeamInvites,
  };
};
