import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, MapPin, DollarSign, Edit, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Tournament, BaseTournament, TournamentRegistration, RegistrationStatus, RegistrationType } from '@/types/tournament';
import TournamentRegistrationForm from '@/components/TournamentRegistration';
import TournamentBracket from '@/components/tournament/TournamentBracket';
import DisputeSubmission from '@/components/player/DisputeSubmission';
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
  participant_type: string;
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
  const location = useLocation();
  const urlMatchId = typeof window !== 'undefined' ? new URLSearchParams(location.search).get('matchId') : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<TournamentRegistration | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeTitle, setDisputeTitle] = useState("");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [allRegistrations, setAllRegistrations] = useState<DatabaseRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);

  const isOrganizer = currentRole === 'organizer' && !!(user?.id && tournament?.user_id && user.id === tournament.user_id);

  const sb: any = supabase;

  const fetchTournamentData = useCallback(async () => {
    if (!slug || slug === 'undefined') {
      console.error('Invalid slug provided:', slug);
      setError('Invalid tournament identifier');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Try by slug first, then fall back to ID to be resilient to bad links
      let tournamentData: any = null;
      let tournamentError: any = null;

      const bySlug = await sb
        .from('tournaments')
        .select(`
          id,
          name,
          description,
          slug,
          game,
          format,
          max_teams,
          min_teams,
          entry_fee,
          prize_pool,
          start_date,
          end_date,
          registration_deadline,
          status,
          organizer_id,
          venue_id,
          is_public,
          banner_url,
          logo_url,
          created_at,
          updated_at
        `)
        .eq('slug', slug)
        .single();

      if (!bySlug.error && bySlug.data) {
        tournamentData = bySlug.data;
      } else {
        const byId = await sb
          .from('tournaments')
          .select(`
            id,
            name,
            description,
            slug,
            game,
            format,
            max_teams,
            min_teams,
            entry_fee,
            prize_pool,
            start_date,
            end_date,
            registration_deadline,
            status,
            organizer_id,
            venue_id,
            is_public,
            banner_url,
            logo_url,
            created_at,
            updated_at
          `)
          .eq('id', slug)
          .single();
        if (!byId.error && byId.data) {
          tournamentData = byId.data;
        } else {
          tournamentError = bySlug.error || byId.error;
        }
      }

      if (tournamentError) throw tournamentError;
      if (!tournamentData) throw new Error('Tournament not found');
      
      // Get venue name if venue_id exists
      let venueName = null;
      if (tournamentData.venue_id) {
        const { data: venueData } = await sb
          .from('venues')
          .select('name')
          .eq('id', tournamentData.venue_id)
          .single();
        venueName = venueData?.name || null;
      }
      
      const baseTournament: BaseTournament = {
        id: tournamentData.id,
        name: tournamentData.name,
        game: tournamentData.game,
        date: tournamentData.start_date ? new Date(tournamentData.start_date).toISOString().split('T')[0] : '',
        time: tournamentData.start_date ? new Date(tournamentData.start_date).toTimeString().split(' ')[0] : '',
        venue: venueName || '',
        is_online: !tournamentData.venue_id,
        max_participants: tournamentData.max_teams,
        team_size: 1, // Default team size for now
        prize_pool: tournamentData.prize_pool?.toString() || '0',
        entry_fee: tournamentData.entry_fee?.toString() || '0',
        description: tournamentData.description || '',
        user_id: tournamentData.organizer_id,
        created_at: tournamentData.created_at,
        image_url: tournamentData.banner_url || tournamentData.logo_url || null
      };
      
      const { count, error: countError } = await sb
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentData.id);
      if (countError) throw countError;

      // Try RPC for accurate count if RLS limits visibility
      let participantCount = count || 0;
      try {
        const { data: rpcCount } = await (sb as any).rpc('get_tournament_participant_count', { t_id: tournamentData.id });
        if (typeof rpcCount === 'number' && rpcCount >= 0) {
          participantCount = rpcCount;
        }
      } catch {}
      
      const newTournament: Tournament = {
        ...baseTournament,
        current_participants: participantCount,
        status: tournamentData.status === 'draft' ? 'upcoming' : tournamentData.status as any
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
      const { data: regData, error } = await sb
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournament.id)
        .or(`user_id.eq.${user.id},team_captain_id.eq.${user.id}`)
        .maybeSingle();
      if (error) throw error;
      if (regData) {
        const dbRegistration = regData as DatabaseRegistration;
        const teamId = (dbRegistration as any).team_id;
        
        // If this is a team registration, validate that the team still exists
        if (teamId && (dbRegistration as any).participant_type === 'team') {
          console.log('[TournamentDetails] Validating team exists for registration:', teamId);
          const { data: teamExists, error: teamCheckError } = await sb
            .from('teams')
            .select('id')
            .eq('id', teamId)
            .maybeSingle();
          
          if (teamCheckError) {
            console.error('[TournamentDetails] Error checking team existence:', teamCheckError);
          }
          
          // If team doesn't exist, treat as not registered
          if (!teamExists) {
            console.warn('[TournamentDetails] Team registration found but team no longer exists, cleaning up registration:', (dbRegistration as any).id);
            // Clean up the orphaned registration
            try {
              const { error: deleteError } = await sb
                .from('tournament_participants')
                .delete()
                .eq('id', (dbRegistration as any).id);
              
              if (deleteError) {
                console.error('[TournamentDetails] Failed to clean up orphaned registration:', deleteError);
              } else {
                console.log('[TournamentDetails] Successfully cleaned up orphaned registration');
              }
            } catch (cleanupError) {
              console.error('[TournamentDetails] Exception while cleaning up orphaned registration:', cleanupError);
            }
            setIsRegistered(false);
            setRegistrationDetails(null);
            setError(null);
            setRegistrationLoading(false);
            return;
          } else {
            console.log('[TournamentDetails] Team exists, registration is valid');
          }
        }
        
        setIsRegistered(true);
        console.log('Registration data:', dbRegistration);
        const registration: TournamentRegistration & { team_id?: string; team_captain_id?: string } = {
          id: (dbRegistration as any).id,
          tournament_id: (dbRegistration as any).tournament_id,
          user_id: (dbRegistration as any).user_id,
          registration_type: (dbRegistration as any).participant_type === 'solo' ? 'solo' : 'team',
          gamer_tag: (dbRegistration as any).gamer_tag || null,
          team_name: (dbRegistration as any).team_name || null,
          team_members: (dbRegistration as any).team_members || null,
          status: (dbRegistration as any).status || 'registered',
          registered_at: (dbRegistration as any).registered_at || (dbRegistration as any).created_at,
          created_at: (dbRegistration as any).created_at,
          updated_at: (dbRegistration as any).updated_at || (dbRegistration as any).created_at,
          team_id: (dbRegistration as any).team_id || undefined,
          team_captain_id: (dbRegistration as any).team_captain_id || undefined
        };
        setRegistrationDetails(registration as TournamentRegistration);
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

  // Check if user is team captain
  useEffect(() => {
    const checkCaptain = async () => {
      if (!user?.id || !registrationDetails) {
        setIsCaptain(false);
        return;
      }
      // If solo registration, not a captain
      if (registrationDetails.registration_type === 'solo') {
        setIsCaptain(false);
        return;
      }
      
      // First check: if team_captain_id directly matches user.id
      const teamCaptainId = (registrationDetails as any)?.team_captain_id;
      if (teamCaptainId === user.id) {
        console.log('User is captain (team_captain_id match)');
        setIsCaptain(true);
        return;
      }
      
      // If team registration, check if user is captain (owner of team OR has captain role in team_members)
      const teamId = (registrationDetails as any)?.team_id;
      if (teamId) {
        try {
          // First check teams table for owner_id
          const { data: team, error: teamError } = await sb
            .from('teams')
            .select('owner_id')
            .eq('id', teamId)
            .single();
          
          console.log('Checking captain status:', { teamId, userId: user.id, team, teamError });
          
          if (!teamError && team && team.owner_id === user.id) {
            console.log('User is team owner (captain)');
            setIsCaptain(true);
            return;
          }
          
          // Also check team_members table for captain role
          const { data: member, error: memberError } = await sb
            .from('team_members')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();
          
          console.log('Team member check:', { member, memberError });
          
          if (!memberError && member && (member.role === 'captain' || member.role === 'Captain')) {
            console.log('User has captain role in team_members');
            setIsCaptain(true);
            return;
          }
          
          setIsCaptain(false);
        } catch (e) {
          console.error('Error checking captain status:', e);
          setIsCaptain(false);
        }
      } else {
        // If no team_id, try to find team by team_name from registration
        const teamName = registrationDetails.team_name;
        if (teamName) {
          try {
            const { data: team, error } = await sb
              .from('teams')
              .select('id, owner_id')
              .eq('name', teamName)
              .maybeSingle();
            
            if (!error && team) {
              if (team.owner_id === user.id) {
                setIsCaptain(true);
                return;
              }
              // Check team_members
              const { data: member } = await sb
                .from('team_members')
                .select('role')
                .eq('team_id', team.id)
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();
              
              if (member && (member.role === 'captain' || member.role === 'Captain')) {
                setIsCaptain(true);
                return;
              }
            }
          } catch (e) {
            console.error('Error checking captain by team name:', e);
          }
        }
        setIsCaptain(false);
      }
    };
    checkCaptain();
  }, [user?.id, registrationDetails]);

  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (!slug || !isMounted) return;
      setLoading(true);
      await fetchTournamentData();
      await checkRegistration();
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [slug, checkRegistration, fetchTournamentData]);

  // Listen for team disband/delete events to refresh registration status
  useEffect(() => {
    const handleTeamLeft = () => {
      console.log('[TournamentDetails] Team left event detected, refreshing registration status...');
      // Delay slightly to ensure database changes have propagated
      setTimeout(() => {
        checkRegistration();
      }, 500);
    };

    const handleVisibilityChange = () => {
      // When page becomes visible again, re-check registration status
      if (!document.hidden) {
        checkRegistration();
      }
    };

    window.addEventListener('teamLeft', handleTeamLeft);
    window.addEventListener('teamDeleted', handleTeamLeft);
    window.addEventListener('teamCreated', handleTeamLeft);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('teamLeft', handleTeamLeft);
      window.removeEventListener('teamDeleted', handleTeamLeft);
      window.removeEventListener('teamCreated', handleTeamLeft);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkRegistration]);

  const handleRegistrationSuccess = useCallback(async () => {
    setShowEditDialog(false);
    await checkRegistration();
    await fetchTournamentData();
  }, [checkRegistration, fetchTournamentData]);

  const handleRegister = async () => {
    if (!user?.id || !tournament) return;

    try {
      const { data: existingRegistration, error: checkError } = await sb
        .from('tournament_participants')
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
          registration_type: dbData.participant_type === 'solo' ? 'solo' : 'team',
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
      const { data: existingRegistration, error: fetchError } = await sb
        .from('tournament_participants')
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

      // Delete from tournament_participants
      const { error: registrationError } = await sb
        .from('tournament_participants')
        .delete()
        .eq('id', existingRegistration.id);

      if (registrationError) {
        console.error('Error deleting registration:', registrationError);
        throw registrationError;
      }

      console.log('Successfully deleted registration');

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

  const getMembers = (members: any): string[] => {
    if (!members) return [];
    if (Array.isArray(members)) {
      return members
        .map((m) => (typeof m === 'string' ? m : String(m)))
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (typeof members === 'string') {
      return members
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // Attempt to unwrap common shapes like { members: [...] }
    if (typeof members === 'object' && Array.isArray((members as any).members)) {
      return (members as any).members
        .map((m: any) => (typeof m === 'string' ? m : String(m)))
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const selectedGame = tournament ? esportsGames.games.find(
    (g) => normalize(g.name) === normalize(tournament.game)
  ) : null;

  // Fallback: resolve team members from team if registration has none
  const [resolvedMembers, setResolvedMembers] = useState<string[] | null>(null);
  useEffect(() => {
    const run = async () => {
      if (!registrationDetails || registrationDetails.registration_type !== 'team') return;
      const current = getMembers(registrationDetails.team_members);
      if (current.length > 0) {
        setResolvedMembers(current);
        return;
      }
      if (!registrationDetails.team_name || !user?.id) return;
      try {
        const { data: teamRow } = await sb
          .from('teams')
          .select('id')
          .eq('owner_id', user.id)
          .ilike('name', registrationDetails.team_name)
          .maybeSingle();
        if (!teamRow?.id) return;
        const { data: memberRows } = await sb
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamRow.id)
          .eq('is_active', true);
        const memberIds = Array.from(new Set([...(memberRows || []).map(m => m.user_id), user.id]));
        if (memberIds.length === 0) { setResolvedMembers([]); return; }
        const { data: profiles } = await sb
          .from('profiles')
          .select('*')
          .in('id', memberIds);
        const names = (profiles || []).map(p => (p as any).gamer_tag || (p as any).username || (p as any).full_name || (p as any).id).filter(Boolean) as string[];
        setResolvedMembers(names);
      } catch {
        setResolvedMembers(null);
      }
    };
    run();
  }, [registrationDetails, user?.id]);

  // Fetch all registrations if organizer
  useEffect(() => {
    const fetchAllRegistrations = async () => {
      if (!isOrganizer || !tournament?.id) return;
      setRegistrationsLoading(true);
      try {
        const { data, error } = await sb
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', tournament.id);
        if (error) throw error;
        const regs = ((data || []) as unknown as DatabaseRegistration[]);
        // Simplified enrichment: 1) roster_id -> members; 2) derive by team_id + tournament.game
        const game = (tournament?.game || '').trim().toLowerCase();
        for (const r of regs) {
          const isTeam = (r as any).participant_type === 'team';
          if (!isTeam) continue;
          try {
            let names: string[] = [];
            const rosterId = (r as any).roster_id as string | null | undefined;
            // Step 1: roster_id
            if (rosterId) {
              const { data: roster } = await sb.rpc('get_roster_members', { r_id: rosterId });
              names = (roster || []).map((row: any) => row.username || row.full_name || `player_${String(row.user_id).substring(0, 8)}`);
            }
            // Step 2: derive by team_id + game if still empty
            if ((!names || names.length === 0) && game) {
              // Resolve team_id from team_name if missing
              let effectiveTeamId: string | null = (r as any).team_id || null;
              const teamName = (r as any).team_name as string | null | undefined;
              if (!effectiveTeamId && teamName) {
                const exact = await sb
                  .from('teams')
                  .select('id')
                  .eq('name', teamName)
                  .maybeSingle();
                effectiveTeamId = exact.data?.id || null;
                if (!effectiveTeamId) {
                  const fuzzy = await sb
                    .from('teams')
                    .select('id')
                    .ilike('name', `%${teamName}%`)
                    .limit(1)
                    .maybeSingle();
                  effectiveTeamId = fuzzy.data?.id || null;
                }
              }
              if (!effectiveTeamId) {
                // Cannot derive without a team reference
                continue;
              }
              const { data: rosters } = await sb
                .from('team_rosters')
                .select('id, name, game, created_at')
                .eq('team_id', effectiveTeamId);
              const list = rosters || [];
              let pickedId: string | null = null;
              if (list.length === 1) {
                pickedId = list[0].id;
              } else if (list.length > 1) {
                const byGame = list.filter((x: any) => String(x.game || '').trim().toLowerCase() === game);
                if (byGame.length === 1) {
                  pickedId = byGame[0].id;
                } else if (byGame.length > 1) {
                  const sorted = [...byGame].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                  pickedId = sorted[0].id;
                } else {
                  const byName = list.filter((x: any) => String(x.name || '').toLowerCase().includes(game));
                  if (byName.length > 0) {
                    const sorted = [...byName].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                    pickedId = sorted[0].id;
                  }
                }
              }
              if (!pickedId && list.length > 0) {
                const sorted = [...list].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                pickedId = sorted[0].id;
              }
              if (pickedId) {
                const { data: roster } = await sb.rpc('get_roster_members', { r_id: pickedId });
                names = (roster || []).map((row: any) => row.username || row.full_name || `player_${String(row.user_id).substring(0, 8)}`);
              }
            }
            if (names && names.length > 0) {
              (r as any).team_members = names;
            }
          } catch {}
        }
        setAllRegistrations(regs);
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
    if (!loading && tournament && isOrganizer) {
      navigate(`/organizer/tournament/${slug}`);
    }
  }, [loading, tournament, isOrganizer, navigate]);

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
                  onClick={() => navigate(`/tournaments/edit/${slug}`)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Tournament
                </Button>
              )}
            </div>
          </div>

          {/* Quick actions (no results upload here per request) */}
          {isRegistered && user && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Player Actions</h3>
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800" onClick={() => setShowDisputeModal(true)}>
                  Raise a dispute
                </Button>
              </div>
              <p className="text-gray-400 text-sm mt-3">To upload a match result, use the upload icon on the specific match in the Brackets page.</p>
            </div>
          )}

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
                    onClick={() => navigate('/auth/signin')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Login to Register
                  </Button>
                </div>
              ) : isOrganizer ? (
                <div className="text-center py-4">
                  <p className="text-gray-400">You are the organizer of this tournament</p>
                </div>
              ) : (currentRole && currentRole !== 'casual') ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-3">Switch to Player role to register for tournaments.</p>
                  <Button
                    onClick={() => navigate('/user/dashboard')}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Go to Dashboard
                  </Button>
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
                            {(resolvedMembers || getMembers(registrationDetails.team_members)).map((member, idx) => (
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
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Tournament Bracket</h3>
              <Button
                onClick={() => navigate(`/tournaments/${tournament.id}/brackets`)}
                className="bg-gaming-purple hover:bg-gaming-purple/80 text-white"
              >
                View Full Bracket
              </Button>
            </div>
            <p className="text-gray-400">View the complete tournament bracket with match details and team progression.</p>
          </div>

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
                        <th className="px-4 py-2 text-left text-gray-300">Roster</th>
                        <th className="px-4 py-2 text-left text-gray-300">Members</th>
                        <th className="px-4 py-2 text-left text-gray-300">Registered At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRegistrations.map((reg) => (
                        <tr key={reg.id} className="border-t border-gray-700">
                          <td className="px-4 py-2 text-white">
                            {reg.participant_type === 'team' ? 'Team' : 'Solo'}
                          </td>
                          <td className="px-4 py-2 font-semibold text-white">
                            {reg.participant_type === 'team' ? reg.team_name : reg.gamer_tag || 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-gray-300">
                            {(reg as any).roster_name || '-'}
                          </td>
                          <td className="px-4 py-2 text-gray-300">
                            {reg.participant_type === 'team' && reg.team_members ? (
                              <ul className="list-disc list-inside">
                                {getMembers(reg.team_members).map((member, idx) => (
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
            onRegisterSuccess={handleRegistrationSuccess}
            onCancel={() => setShowEditDialog(false)}
            initialData={registrationDetails}
            isEdit={!!registrationDetails}
            structure={selectedGame?.defaultFormat || ''}
            teamSize={selectedGame?.formats.find(f => f.value === selectedGame.defaultFormat)?.teamSize || 1}
          />
        </DialogContent>
      </Dialog>

      {/* Dispute Modal */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent className="sm:max-w-[600px] bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Raise a Dispute</DialogTitle>
            <DialogDescription className="text-gray-400">Describe the issue and attach optional evidence. Organizers will review.</DialogDescription>
          </DialogHeader>
          {tournament && (
            <DisputeSubmission
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              teamId={(registrationDetails as any)?.team_id || null}
              matchId={null}
              onClose={() => {
                setShowDisputeModal(false);
                setDisputeTitle("");
                setDisputeDesc("");
                setDisputeFile(null);
              }}
            />
          )}
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