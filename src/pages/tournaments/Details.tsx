import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, MapPin, DollarSign, Edit, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Tournament, BaseTournament, TournamentRegistration, RegistrationStatus, RegistrationType } from '@/types/tournament';
import TournamentRegistrationForm from '@/components/TournamentRegistration';
import TournamentBracket from '@/components/tournament/TournamentBracket';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import esportsGamesData from '@/data/esportsGames.json';

interface EsportsGame {
  name: string;
  formats: {
    name: string;
    value: string;
    teamSize: number;
  }[];
  defaultFormat: string;
}

interface EsportsGamesData {
  games: EsportsGame[];
}

const esportsGames = esportsGamesData as EsportsGamesData;

interface DatabaseTournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string | null;
  is_online: boolean;
  max_participants: number;
  team_size?: number;
  prize_pool: string;
  entry_fee: string | null;
  description: string;
  user_id: string;
  created_at: string;
  image_url?: string | null;
  slug: string;
}

interface DatabaseRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  registration_type: string;
  gamer_tag?: string | null;
  team_name?: string | null;
  team_members?: string | null;
  status?: RegistrationStatus;
  registered_at?: string;
  created_at: string;
  updated_at?: string;
  team_captain?: string | null;
  team_email?: string | null;
  team_phone?: string | null;
  team_logo?: string | null;
}

const TournamentDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<TournamentRegistration | null>(null);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [allRegistrations, setAllRegistrations] = useState<DatabaseRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);

  const isOrganizer = currentRole === 'organizer' && user?.id && tournament?.user_id && user.id === tournament.user_id;

  const fetchTournamentData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .single();
      if (tournamentError) throw tournamentError;
      if (!tournamentData) throw new Error('Tournament not found');
      const dbTournament = tournamentData as DatabaseTournament;
      const baseTournament: BaseTournament = {
        id: dbTournament.id,
        name: dbTournament.name,
        game: dbTournament.game,
        date: dbTournament.date,
        time: dbTournament.time,
        venue: dbTournament.venue,
        is_online: dbTournament.is_online,
        max_participants: dbTournament.max_participants,
        team_size: dbTournament.team_size ?? 1,
        prize_pool: dbTournament.prize_pool,
        entry_fee: dbTournament.entry_fee,
        description: dbTournament.description,
        user_id: dbTournament.user_id,
        created_at: dbTournament.created_at,
        image_url: dbTournament.image_url ?? null,
        slug: dbTournament.slug
      };
      const { count, error: countError } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', dbTournament.id);
      if (countError) throw countError;
      const newTournament: Tournament = {
        ...baseTournament,
        current_participants: count || 0,
        status: 'upcoming' as const
      };
      setTournament(newTournament);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tournament details';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  const checkRegistration = useCallback(async () => {
    setRegistrationLoading(true);
    if (!user?.id || !tournament?.id) {
      setIsRegistered(false);
      setRegistrationDetails(null);
      setRegistrationLoading(false);
      return;
    }
    try {
      const { data: regData, error } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (regData) {
        setIsRegistered(true);
        const dbRegistration = regData as DatabaseRegistration;
        const registration: TournamentRegistration = {
          id: dbRegistration.id,
          tournament_id: dbRegistration.tournament_id,
          user_id: dbRegistration.user_id,
          registration_type: dbRegistration.registration_type === 'solo' ? 'solo' : 'team',
          gamer_tag: dbRegistration.gamer_tag || null,
          team_name: dbRegistration.team_name || null,
          team_members: dbRegistration.team_members || null,
          status: dbRegistration.status || 'registered',
          registered_at: dbRegistration.registered_at || dbRegistration.created_at,
          created_at: dbRegistration.created_at,
          updated_at: dbRegistration.updated_at || dbRegistration.created_at
        };
        setRegistrationDetails(registration);
        setShowEditDialog(false);
      } else {
        setIsRegistered(false);
        setRegistrationDetails(null);
      }
      setError(null);
    } catch (error) {
      setIsRegistered(false);
      setRegistrationDetails(null);
      setError(error instanceof Error ? error.message : 'Error checking registration');
    } finally {
      setRegistrationLoading(false);
    }
  }, [user?.id, tournament?.id]);

  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (slug && user?.id && isMounted) {
        setLoading(true);
        await Promise.all([
          checkRegistration(),
          fetchTournamentData()
        ]);
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [slug, user?.id, checkRegistration, fetchTournamentData]);

  const handleRegistrationSuccess = useCallback(async () => {
    setShowEditDialog(false);
    await checkRegistration();
    await fetchTournamentData();
  }, [checkRegistration, fetchTournamentData]);

  const handleRegister = async () => {
    if (!user?.id || !tournament) return;

    try {
      const { data: existingRegistration, error: checkError } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRegistration) {
        console.log('Found existing registration:', existingRegistration);
        const dbData = existingRegistration as any;
        const registration: TournamentRegistration = {
          id: dbData.id,
          tournament_id: dbData.tournament_id,
          user_id: dbData.user_id,
          registration_type: dbData.registration_type === 'solo' ? 'solo' : 'team',
          gamer_tag: dbData.gamer_tag || null,
          team_name: dbData.team_name || null,
          team_members: dbData.team_members || null,
          status: dbData.status as RegistrationStatus || 'registered',
          registered_at: dbData.registered_at || dbData.created_at,
          created_at: dbData.created_at,
          updated_at: dbData.updated_at || dbData.created_at
        };
        setIsRegistered(true);
        setRegistrationDetails(registration);
        setShowEditDialog(false);
        toast({
          title: "Already Registered",
          description: "You are already registered for this tournament",
        });
        return;
      }

      setShowEditDialog(true);
    } catch (error: any) {
      console.error('Error checking registration:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check registration status',
        variant: 'destructive',
      });
    }
  };

  const handleEditRegistration = () => {
    setShowEditDialog(true);
  };

  const handleWithdraw = async () => {
    if (!user?.id || !tournament) return;

    try {
      console.log('Starting withdrawal process for user:', user.id, 'tournament:', tournament.id);
      
      // First, try to get the registration to see what we're dealing with
      const { data: existingRegistration, error: fetchError } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching registration:', fetchError);
        throw fetchError;
      }

      if (!existingRegistration) {
        console.log('No registration found to withdraw');
        setIsRegistered(false);
        setRegistrationDetails(null);
        setShowWithdrawDialog(false);
        return;
      }

      console.log('Found registration:', existingRegistration);

      // Delete from tournament_registrations first
      const { error: registrationError } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', existingRegistration.id);

      if (registrationError) {
        console.error('Error deleting registration:', registrationError);
        throw registrationError;
      }

      console.log('Successfully deleted registration');

      // Try to delete from tournament_participants if it exists
      // This might fail if the table doesn't exist or the record doesn't exist, which is fine
      try {
        const { error: participantError } = await supabase
          .from('tournament_participants')
          .delete()
          .eq('tournament_id', tournament.id)
          .eq('user_id', user.id);

        if (participantError) {
          console.warn('Warning deleting from tournament_participants (this might be expected):', participantError);
          // Don't throw here as this table might not exist or the record might not exist
        } else {
          console.log('Successfully deleted from tournament_participants');
        }
      } catch (participantErr) {
        console.warn('Warning with tournament_participants deletion (this might be expected):', participantErr);
        // Continue with the process even if this fails
      }

      setIsRegistered(false);
      setRegistrationDetails(null);
      setShowWithdrawDialog(false);

      await fetchTournamentData();

      toast({
        title: "Withdrawal Successful",
        description: "You have been withdrawn from the tournament",
      });
    } catch (error: any) {
      console.error('Error withdrawing from tournament:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to withdraw from tournament. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    console.log('Dialog state changed:', { showEditDialog, slug, userId: user?.id });
    if (!showEditDialog && slug && user?.id) {
      console.log('Dialog closed, rechecking registration...');
      checkRegistration();
    }
  }, [showEditDialog]);

  const normalize = (str) => str?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

  const selectedGame = tournament ? esportsGames.games.find(
    (g) => normalize(g.name) === normalize(tournament.game)
  ) : null;

  // Fetch all registrations if organizer
  useEffect(() => {
    const fetchAllRegistrations = async () => {
      if (!isOrganizer || !tournament?.id) return;
      setRegistrationsLoading(true);
      try {
        const { data, error } = await supabase
          .from('tournament_registrations')
          .select('*')
          .eq('tournament_id', tournament.id);
        if (error) throw error;
        setAllRegistrations(data || []);
      } catch (err) {
        setAllRegistrations([]);
      } finally {
        setRegistrationsLoading(false);
      }
    };
    if (isOrganizer && tournament?.id) {
      fetchAllRegistrations();
    }
  }, [isOrganizer, tournament?.id]);

  useEffect(() => {
    if (!loading && tournament && user?.id && tournament.user_id && user.id === tournament.user_id && currentRole === 'organizer') {
      navigate(`/organizer/tournament/${tournament.slug}`);
    }
  }, [loading, tournament, user, navigate, currentRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
            <p className="text-muted-foreground">{error || 'Tournament not found'}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/tournaments')}
            >
              Back to Tournaments
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isFull = tournament.current_participants >= tournament.max_participants;
  const registrationDeadline = new Date(tournament.date);
  registrationDeadline.setHours(registrationDeadline.getHours() - 24);
  const isRegistrationOpen = new Date() < registrationDeadline;

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{tournament.name}</h1>
                {selectedGame && (
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-medium text-gray-300">{selectedGame.name}</div>
                    <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                      {selectedGame.formats.find(
                        f => f.teamSize === tournament.team_size
                      )?.name || selectedGame.defaultFormat}
                    </div>
                  </div>
                )}
              </div>
              {isOrganizer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/tournaments/edit/${tournament.slug}`)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Tournament
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tournament Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{new Date(tournament.date).toLocaleDateString()} at {tournament.time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{tournament.is_online ? 'Online' : tournament.venue}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">{tournament.current_participants} / {tournament.max_participants} Participants</span>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-300">Prize Pool: {tournament.prize_pool}</span>
                </div>
                {tournament.entry_fee && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Entry Fee: {tournament.entry_fee}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Registration</h3>
              {!user ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-4">Please log in to register for this tournament</p>
                  <Button 
                    onClick={() => navigate('/login')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Login to Register
                  </Button>
                </div>
              ) : isOrganizer ? (
                <div className="text-center py-4">
                  <p className="text-gray-400">You are the organizer of this tournament</p>
                </div>
              ) : isRegistered ? (
                <div className="space-y-4">
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">Your Registration</h4>
                    {registrationDetails?.registration_type === 'team' ? (
                      <>
                        <div className="mb-2">
                          <span className="block text-sm text-gray-400">Team Name</span>
                          <span className="block text-lg font-bold text-white">{registrationDetails.team_name}</span>
                        </div>
                        <div>
                          <span className="block text-sm text-gray-400 mb-1">Team Members</span>
                          <ul className="flex flex-wrap gap-2">
                            {registrationDetails.team_members?.split(',').map((member, idx) => (
                              <li key={idx} className="bg-gray-600/50 px-3 py-1 rounded-full flex items-center gap-2">
                                <span className="inline-block w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                                  {member.trim().charAt(0).toUpperCase()}
                                </span>
                                <span className="text-sm text-white">{member.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <p className="text-white">Gamer Tag: {registrationDetails?.gamer_tag}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowWithdrawDialog(true)}
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Withdraw Registration
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {isFull ? (
                    <p className="text-center text-gray-400">Tournament is full</p>
                  ) : !isRegistrationOpen ? (
                    <p className="text-center text-gray-400">Registration is closed</p>
                  ) : (
                    <Button
                      onClick={() => setShowEditDialog(true)}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                    >
                      Register Now
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{tournament.description}</p>
          </div>

          {/* Tournament Bracket */}
          <TournamentBracket 
            tournamentId={tournament.id}
            isOrganizer={isOrganizer}
            onBracketUpdate={fetchTournamentData}
          />

          {/* Organizer: Show all registrations */}
          {isOrganizer && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Participants & Teams</h3>
              {registrationsLoading ? (
                <div className="text-gray-400">Loading registrations...</div>
              ) : allRegistrations.length === 0 ? (
                <div className="text-gray-400">No participants registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-300">Type</th>
                        <th className="px-4 py-2 text-left text-gray-300">Team Name / Gamer Tag</th>
                        <th className="px-4 py-2 text-left text-gray-300">Members</th>
                        <th className="px-4 py-2 text-left text-gray-300">Registered At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRegistrations.map((reg) => (
                        <tr key={reg.id} className="border-t border-gray-700">
                          <td className="px-4 py-2 text-white">
                            {reg.registration_type === 'team' ? 'Team' : 'Solo'}
                          </td>
                          <td className="px-4 py-2 font-semibold text-white">
                            {reg.registration_type === 'team' ? reg.team_name : reg.gamer_tag || 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-gray-300">
                            {reg.registration_type === 'team' && reg.team_members ? (
                              <ul className="list-disc list-inside">
                                {reg.team_members.split(',').map((member, idx) => (
                                  <li key={idx}>{member.trim()}</li>
                                ))}
                              </ul>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-300">
                            {reg.created_at ? new Date(reg.created_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Register for Tournament</DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in your registration details below.
            </DialogDescription>
          </DialogHeader>
          <TournamentRegistrationForm
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            game={tournament.game}
            onSuccess={handleRegistrationSuccess}
            initialData={registrationDetails}
            isEdit={!!registrationDetails}
            structure={selectedGame?.defaultFormat || ''}
            teamSize={selectedGame?.formats.find(f => f.value === selectedGame.defaultFormat)?.teamSize || 1}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent className="bg-gray-900 border border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Withdraw Registration</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to withdraw your registration? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleWithdraw}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default TournamentDetails; 