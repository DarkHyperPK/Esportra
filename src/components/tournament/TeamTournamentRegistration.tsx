import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTeamManagement, Team } from '@/hooks/useTeamManagement';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Trophy, 
  Gamepad2, 
  CheckCircle, 
  XCircle,
  Crown,
  Shield,
  Calendar,
  MapPin
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  game: string;
  team_size: number;
  entry_fee: string | null;
  prize_pool: string;
  date: string;
  time: string;
  venue: string | null;
  is_online: boolean;
  max_participants: number;
  current_participants: number;
  status: string;
  slug: string;
}

interface TeamTournamentRegistrationProps {
  tournament: Tournament;
  onRegistrationComplete?: () => void;
}

const TeamTournamentRegistration: React.FC<TeamTournamentRegistrationProps> = ({
  tournament,
  onRegistrationComplete
}) => {
  const { user } = useAuth();
  const { userTeams, loading: teamsLoading } = useTeamManagement();
  const { toast } = useToast();
  
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  type RegistrationRow = {
    id: string;
    team_name: string | null;
    status: string | null;
    created_at: string;
  } | null;
  const [registrationData, setRegistrationData] = useState<RegistrationRow>(null);

  // Check if a team of this user is already registered
  useEffect(() => {
    const checkRegistration = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('tournament_registrations')
          .select('*')
          .eq('tournament_id', tournament.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking registration:', error);
          return;
        }

        if (data) {
          setIsRegistered(true);
          setRegistrationData(data);
        }
      } catch (error) {
        console.error('Error checking registration:', error);
      }
    };

    checkRegistration();
  }, [user, tournament.id]);

  // Filter teams that match the tournament requirements (game match, member count, captain, verified)
  const eligibleTeams = userTeams.filter((team) => {

    // Check if team has the tournament game
    const teamGames: string[] = (Array.isArray(team.games) && team.games.length > 0) 
      ? team.games.map(g => (g || '').toLowerCase())
      : [team.game].map(g => (g || '').toLowerCase());
    
    if (!teamGames.includes((tournament.game || '').toLowerCase())) return false;

    // Check if team has enough members (including captain)
    const totalMembers = team.members.length + (team.created_by === user?.id ? 1 : 0); // Add 1 for captain if not in members list
    if (totalMembers < tournament.team_size) return false;

    // Check if user is captain of the team (either in members list or team creator)
    const userMember = team.members.find(m => m.user_id === user?.id || m.id === user?.id);
    const isTeamCreator = team.created_by === user?.id;
    const isCaptain = (userMember && userMember.role === 'captain') || isTeamCreator;
    
    if (!isCaptain) return false;

    // All members verified (including captain if not in members list)
    const allMembersVerified = team.members.every(m => m.verified);
    const captainVerified = isTeamCreator ? true : (userMember?.verified ?? false); // Assume captain is verified if team creator
    
    if (!allMembersVerified || !captainVerified) return false;

    return true;
  });

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    setShowTeamSelector(false);
  };

  const handleRegister = async () => {
    if (!user || !selectedTeam) return;

    setSubmitting(true);

    try {
      // Check if team is already registered for this tournament
      const { data: existingRegistration } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('team_id', selectedTeam.id)
        .maybeSingle();

      if (existingRegistration) {
        toast({
          title: 'Already Registered',
          description: 'This team is already registered for this tournament',
          variant: 'destructive',
        });
        return;
      }

      // Create registration
      const registrationData = {
        tournament_id: tournament.id,
        user_id: user.id,
        registration_type: 'team',
        team_id: selectedTeam.id,
        team_name: selectedTeam.name,
        team_members: selectedTeam.members.map(m => m.username).join(','),
        team_captain: selectedTeam.members.find(m => m.role === 'captain')?.username || '',
        status: 'registered',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('tournament_registrations')
        .insert(registrationData);

      if (error) throw error;

      // Notify all team members
      const memberIds = selectedTeam.members
        .map((m) => (m.user_id ?? m.id))
        .filter((v): v is string => Boolean(v));
      if (memberIds.length > 0) {
        await supabase.from('notifications').insert(
          memberIds.map((uid) => ({
            user_id: uid,
            type: 'tournament_registration',
            title: 'Team Registered in Tournament',
            message: `${selectedTeam.name} registered for ${tournament.name}.`,
            team_id: selectedTeam.id,
            is_read: false,
            created_at: new Date().toISOString(),
          }))
        );
      }

      toast({
        title: 'Registration Successful!',
        description: `Team "${selectedTeam.name}" has been registered for "${tournament.name}"`,
        variant: 'default',
      });

      setIsRegistered(true);
      setRegistrationData(registrationData);
      onRegistrationComplete?.();

    } catch (error) {
      console.error('Error registering team:', error);
      toast({
        title: 'Registration Failed',
        description: 'Failed to register team. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnregister = async () => {
    if (!user) {
      console.log('No user found for unregister');
      return;
    }

    if (!registrationData) {
      console.log('No registration data found, trying to fetch current registration');
      
      // Try to fetch the current registration
      try {
        const { data: currentRegistration, error: fetchError } = await supabase
          .from('tournament_registrations')
          .select('*')
          .eq('tournament_id', tournament.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching current registration:', fetchError);
          toast({
            title: 'Error',
            description: 'Failed to find registration. Please try again.',
            variant: 'destructive',
          });
          return;
        }

        if (!currentRegistration) {
          console.log('No registration found to unregister');
          setIsRegistered(false);
          setRegistrationData(null);
          onRegistrationComplete?.();
          return;
        }

        // Use the fetched registration data
        setRegistrationData(currentRegistration);
        console.log('Found registration to unregister:', currentRegistration);
      } catch (error) {
        console.error('Error fetching registration:', error);
        toast({
          title: 'Error',
          description: 'Failed to find registration. Please try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      console.log('Starting team unregister process for registration:', registrationData?.id);
      
      if (!registrationData?.id) {
        throw new Error('No registration ID found');
      }

      // Delete the registration using the tournament_id and user_id as backup
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting registration:', error);
        throw error;
      }

      console.log('Successfully unregistered team');

      toast({
        title: 'Unregistered Successfully',
        description: 'Your team has been unregistered from the tournament',
        variant: 'default',
      });

      setIsRegistered(false);
      setRegistrationData(null);
      onRegistrationComplete?.();

    } catch (error) {
      console.error('Error unregistering:', error);
      toast({
        title: 'Error',
        description: 'Failed to unregister. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (teamsLoading) {
    return (
      <div className="card-esports spacing-card">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700/50 rounded w-1/3"></div>
          <div className="h-8 bg-gray-700/50 rounded"></div>
          <div className="h-4 bg-gray-700/50 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="bg-esports-dark border border-gray-600/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Registered for Tournament</h3>
            <p className="text-gray-400 text-sm">Your team is successfully registered</p>
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-4">
          <div className="text-sm font-medium text-white mb-2">Registration Details</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Team:</span>
              <span className="text-white font-medium">{registrationData?.team_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-green-400 font-medium capitalize">{registrationData?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Registered:</span>
              <span className="text-white">{new Date(registrationData?.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <Button
          onClick={handleUnregister}
          className="bg-red-600 hover:bg-red-700 text-white w-full"
          disabled={submitting}
        >
          <XCircle className="h-4 w-4 mr-2" />
          {submitting ? 'Unregistering...' : 'Unregister Team'}
        </Button>
      </div>
    );
  }

  if (eligibleTeams.length === 0) {
    return (
      <div className="bg-esports-dark border border-gray-600/30 rounded-lg p-6">
        <div className="text-center mb-4">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No Eligible Teams</h3>
          <p className="text-gray-400 text-sm">You need to create or manage teams to register</p>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-4">
          <div className="text-sm font-medium text-white mb-2">Requirements</div>
          <div className="space-y-1 text-sm text-gray-400">
            <div>• You need to be a team captain</div>
            <div>• Team game must match: {tournament.game}</div>
            <div>• Team must have at least {tournament.team_size} members</div>
            <div>• All team members must be verified</div>
          </div>
        </div>
        
        <Button
          onClick={() => window.location.href = '/player/teams'}
          className="bg-blue-600 hover:bg-blue-700 text-white w-full"
        >
          <Users className="h-4 w-4 mr-2" />
          Create or Manage Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-esports-dark border border-gray-600/30 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-1">Team Registration</h3>
        <p className="text-gray-400 text-sm">Register your team for this tournament</p>
      </div>

      {/* Tournament Info */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-white">{tournament.name}</h4>
            <p className="text-gray-400 text-sm">Tournament Details</p>
          </div>
          <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
            {tournament.game} {tournament.team_size}v{tournament.team_size}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Date:</span>
              <span className="text-white font-medium">
                {new Date(tournament.date).toLocaleDateString()} at {tournament.time}
              </span>
            </div>
            {tournament.venue && (
              <div className="flex justify-between">
                <span className="text-gray-400">Venue:</span>
                <span className="text-white font-medium">{tournament.venue}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Entry Fee:</span>
              <span className="text-white font-medium">{tournament.entry_fee || 'Free'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Prize Pool:</span>
              <span className="text-white font-medium">{tournament.prize_pool}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Team */}
      {selectedTeam ? (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <h5 className="text-lg font-semibold text-white">Selected Team</h5>
                <p className="text-gray-400 text-sm">Ready to register</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTeam(null)}
              className="border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              Change
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
              {selectedTeam.logo_url ? (
                <img src={selectedTeam.logo_url} alt={selectedTeam.name} className="w-full h-full object-contain p-1" />
              ) : (
                <Gamepad2 className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-white">{selectedTeam.name}</div>
              <div className="text-sm text-gray-400">
                [{selectedTeam.tag}] • {selectedTeam.members.length} members
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-white">Team Members</div>
            <div className="grid grid-cols-2 gap-2">
              {selectedTeam.members.slice(0, tournament.team_size).map((member) => (
                <div key={member.id} className="flex items-center gap-2 bg-gray-700/50 rounded p-2">
                  <Avatar className="h-6 w-6">
                    <img src={member.avatar_url} alt={member.username} />
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">{member.username}</div>
                    <div className="flex items-center gap-1">
                      {member.role === 'captain' && <Crown className="h-3 w-3 text-yellow-500" />}
                      {member.verified && <Shield className="h-3 w-3 text-green-500" />}
                      <span className="text-xs text-gray-400 capitalize">{member.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        ) : (
          <div className="text-center py-6">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">Select a Team</h4>
            <p className="text-gray-400 mb-4">
              Choose one of your eligible teams to register for this tournament
            </p>
            <Button
              onClick={() => setShowTeamSelector(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Select Team ({eligibleTeams.length} available)
            </Button>
          </div>
        )}

      {/* Register Button */}
      {selectedTeam && (
        <Button
          onClick={handleRegister}
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700 text-white w-full py-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Registering...
            </>
          ) : (
            <>
              <Trophy className="h-4 w-4 mr-2" />
              Register Team for {tournament.entry_fee || 'Free'}
            </>
          )}
        </Button>
      )}

      {/* Team Selector Modal */}
      <Dialog open={showTeamSelector} onOpenChange={setShowTeamSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">
              Select Team for {tournament.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Choose one of your eligible teams to register for this tournament.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {eligibleTeams.map((team) => (
              <div
                key={team.id}
                className="bg-gray-800 border border-gray-700 hover:border-gray-600 cursor-pointer transition-all duration-200 rounded-lg p-4"
                onClick={() => handleTeamSelect(team)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Gamepad2 className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{team.name}</div>
                    <div className="text-sm text-gray-400">
                      [{team.tag}] • {team.members.length} members • {team.tournament_wins} wins
                    </div>
                  </div>
                  <div className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                    Eligible
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamTournamentRegistration;
