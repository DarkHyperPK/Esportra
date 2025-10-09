// OrganizerTournamentDashboard.tsx
// This file is for managing a single tournament (participants, brackets, settings, etc.)

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Tournament as TournamentType } from '@/hooks/useTournaments';
import { TournamentStatus } from '@/types/tournament';
import { supabase } from '@/lib/supabase';
import { Users, Trophy, Settings, Edit2, Trash2, GamepadIcon, Ban as BanIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { handleError, TournamentError, AuthError, DatabaseError } from '@/utils/errorHandler';
import { tournamentApi } from '@/services/api';
import esportsGames from '@/data/esportsGames.json';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SingleEliminationBracketCustom, { BracketTeam, BracketMatch } from '@/components/bracket/SingleEliminationBracketCustom';

interface DatabaseTournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  prize_pool: string;
  description: string;
  organizer_id: string;
  entry_fee: string | null;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  status: string;
  image_url: string | null;
  team_size: number;
  slug: string;
}

interface Tournament extends DatabaseTournament {
  current_participants: number;
}

interface TournamentRegistration {
  id: string;
  tournament_id: string;
  user_id: string;
  gamer_tag: string | null;
  team_name: string | null;
  team_members: string | null;
  status: string;
  registered_at: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string | null;
  };
}

interface Participant {
  id: string;
  user_id: string;
  tournament_id: string;
  registration_type: 'solo' | 'team';
  team_name: string | null;
  team_members: string | null;
  gamer_tag: string | null;
  status: string;
  registered_at: string;
  created_at: string;
  team_logo?: string | null;
  user: {
    username: string;
    full_name: string | null;
  };
}

// Mock data for teams and bracket
const mockTeams = [
  { id: 'team1', name: 'Alpha Squad', members: ['Alice', 'Bob'] },
  { id: 'team2', name: 'Bravo Force', members: ['Charlie', 'Dave'] },
  { id: 'team3', name: 'Charlie Crew', members: ['Eve', 'Frank'] },
  { id: 'team4', name: 'Delta Team', members: ['Grace', 'Heidi'] },
];
const mockBracket = [
  { round: 1, match: 1, teamA: 'Alpha Squad', teamB: 'Bravo Force', winner: null },
  { round: 1, match: 2, teamA: 'Charlie Crew', teamB: 'Delta Team', winner: null },
  { round: 2, match: 1, teamA: null, teamB: null, winner: null }, // Finals
];

// ErrorBoundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // You can log errorInfo here if needed
    // console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-esports-dark text-white flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Something went wrong</h1>
          <div className="mb-2 text-gray-300">{this.state.error?.message || 'An unexpected error occurred.'}</div>
          <button
            className="bg-gaming-purple text-white px-4 py-2 rounded mt-4"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const getTeamDisplayName = (team: any) => team.name || team.team_name || 'Unknown';

const TournamentDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<TournamentType | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bracket, setBracket] = useState<any[]>([]);
  const [bracketGenerated, setBracketGenerated] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banTarget, setBanTarget] = useState<{ id: string, userId: string } | null>(null);
  const [bracketType, setBracketType] = useState<'single' | 'double' | 'roundrobin' | 'swiss'>('single');
  const [gameLogo, setGameLogo] = useState<string | null>(null);
  const [gameBackgroundUrl, setGameBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    if (slug && user) {
      console.log('Tournament slug from URL:', slug);
      console.log('Current user:', user);
      fetchTournamentData();
    }
  }, [slug, user]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      console.log('Starting to fetch tournament data for slug:', slug);
      
      if (!slug) {
        console.error('No tournament slug provided');
        throw new TournamentError(
          'Tournament slug is required',
          'INVALID_SLUG',
          { tournamentSlug: slug }
        );
      }

      // First, get the tournament data
      console.log('Executing Supabase query for tournament:', slug);
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          game,
          date,
          time,
          venue,
          max_participants,
          prize_pool,
          description,
          organizer_id,
          entry_fee,
          is_online,
          created_at,
          updated_at,
          status,
          image_url,
          team_size,
          slug
        `)
        .eq('slug', slug)
        .single();

      console.log('Tournament query response:', {
        data: tournamentData,
        error: tournamentError,
        errorCode: tournamentError?.code,
        errorMessage: tournamentError?.message,
        errorDetails: tournamentError?.details,
        userId: user?.id,
        tournamentSlug: slug
      });

      if (tournamentError) {
        console.error('Tournament query error:', {
          code: tournamentError.code,
          message: tournamentError.message,
          details: tournamentError.details,
          hint: tournamentError.hint,
          query: slug,
          userId: user?.id
        });

        if (tournamentError.code === 'PGRST116') {
          throw new TournamentError(
            'Tournament not found',
            'TOURNAMENT_NOT_FOUND',
            { tournamentSlug: slug }
          );
        }
        throw new DatabaseError(
          'Failed to fetch tournament data',
          'DATABASE_ERROR',
          { error: tournamentError }
        );
      }

      // Type guard: check if tournamentData is an object and has expected properties
      if (!tournamentData || typeof tournamentData !== 'object' || !('id' in tournamentData)) {
        console.error('No valid tournament data found for slug:', slug);
        throw new TournamentError(
          'Tournament not found',
          'TOURNAMENT_NOT_FOUND',
          { tournamentSlug: slug }
        );
      }
      const typedTournamentData = (tournamentData as DatabaseTournament)!;

      // Get participant count separately
      const { count, error: countError } = await supabase
        .from('tournament_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', typedTournamentData.id);

      if (countError) {
        console.error('Error getting participant count:', countError);
        throw new DatabaseError(
          'Failed to get participant count',
          'DATABASE_ERROR',
          { error: countError }
        );
      }

      console.log('Found tournament data:', {
        tournament: typedTournamentData,
        participantCount: count,
        userId: user?.id,
        isOrganizer: typedTournamentData.organizer_id === user?.id
      });

      // Check if the current user is the tournament organizer
      console.log('Checking user permissions:', { 
        tournamentOrganizerId: typedTournamentData.organizer_id, 
        currentUserId: user?.id,
        isOrganizer: typedTournamentData.organizer_id === user?.id
      });

      if (!user) {
        throw new AuthError(
          'You must be logged in to manage tournaments',
          'NOT_AUTHENTICATED',
          { tournamentSlug: slug }
        );
      }

      if (typedTournamentData.organizer_id !== user.id) {
        throw new AuthError(
          'You do not have permission to manage this tournament.',
          'ACCESS_DENIED',
          { tournamentSlug: slug }
        );
      }

      // Fetch registrations separately
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          tournament_id,
          user_id,
          gamer_tag,
          team_name,
          team_members,
          status,
          registered_at,
          created_at,
          team_logo
        `)
        .eq('tournament_id', typedTournamentData.id)
        .order('created_at', { ascending: false });

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        throw new DatabaseError(
          'Failed to fetch tournament registrations',
          'DATABASE_ERROR',
          { error: registrationsError }
        );
      }

      // Transform and set the participants data
      const participants = (registrationsData || []).map((reg: any) => {
        console.log('Processing registration:', reg);
        const participant: Participant = {
          id: reg.id,
          user_id: reg.user_id,
          tournament_id: reg.tournament_id,
          registration_type: reg.team_name ? 'team' : 'solo',
          team_name: reg.team_name,
          team_members: reg.team_members,
          gamer_tag: reg.gamer_tag,
          status: reg.status || 'registered',
          registered_at: reg.registered_at || reg.created_at,
          created_at: reg.created_at,
          team_logo: reg.team_logo || null,
          user: {
            username: reg.team_name || reg.gamer_tag || 'Unknown User',
            full_name: null
          }
        };
        console.log('Transformed participant:', participant);
        return participant;
      });

      // Transform the data to match the Tournament type
      const now = new Date();
      const start = new Date(`${typedTournamentData.date}T${typedTournamentData.time}`);
      console.log('Tournament data:', typedTournamentData);
      // Only allow the three statuses
      let computedStatus: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
      if (typedTournamentData.status === 'completed') {
        computedStatus = 'completed';
      } else if (now >= start) {
        computedStatus = 'ongoing';
      }

      const tournament: TournamentType = {
        id: typedTournamentData.id,
        name: typedTournamentData.name,
        game: typedTournamentData.game,
        date: typedTournamentData.date,
        time: typedTournamentData.time,
        venue: typedTournamentData.venue,
        max_participants: typedTournamentData.max_participants,
        prize_pool: typedTournamentData.prize_pool,
        description: typedTournamentData.description,
        organizer_id: typedTournamentData.organizer_id,
        user_id: typedTournamentData.organizer_id || '',
        entry_fee: typedTournamentData.entry_fee,
        is_online: typedTournamentData.is_online,
        created_at: typedTournamentData.created_at,
        updated_at: typedTournamentData.updated_at,
        status: computedStatus,
        image_url: typedTournamentData.image_url,
        team_size: typedTournamentData.team_size || 1,
        current_participants: count
      };

      // Fetch game logo from Supabase games table
      const { data: gameData, error: gameError } = await (supabase as any)
        .from('games')
        .select('logo_url')
        .eq('name', typedTournamentData.game)
        .single();
      if (!gameError && gameData && typeof gameData.logo_url === 'string' && gameData.logo_url) {
        setGameLogo(gameData.logo_url);
      } else {
        setGameLogo(null);
      }

      // Set the tournament data
      setTournament(tournament);
      setParticipants(participants as Participant[]);
    } catch (error) {
      console.error('Error in fetchTournamentData:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load tournament data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await tournamentApi.deleteTournament(slug!);

      toast({
        title: 'Success',
        description: 'Tournament deleted successfully',
      });
      navigate('/organizer/tournaments');
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tournament',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Ban participant (delete registration from DB)
  const handleBan = async (participantId: string, userId: string) => {
    try {
      // Remove registration
      await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', participantId);
      // Insert into tournament_bans
      await supabase
        .from('tournament_bans')
        .insert({
          tournament_id: slug,
          user_id: userId,
          ban_reason: banReason.trim(),
          banned_by: user?.id,
          banned_at: new Date().toISOString(),
        });
      toast({ title: 'Banned', description: 'Participant has been banned from this tournament.' });
      setBanDialogOpen(false);
      setBanReason('');
      setBanTarget(null);
      fetchTournamentData(); // Refresh participants
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to ban participant.', variant: 'destructive' });
    }
  };

  // Helper: next power of two
  function nextPowerOfTwo(n: number) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  // Update validateMatches for custom bracket structure
  function validateMatches(matches) {
    if (!Array.isArray(matches) || matches.length === 0) return false;
    for (const match of matches) {
      if (!match || typeof match !== 'object') return false;
      const home = match.home;
      const visitor = match.visitor;
      if (!home || typeof home !== 'object') return false;
      if (!visitor || typeof visitor !== 'object') return false;
      // Accept either 'name' or 'team_name'
      if (!('id' in home) || (!('name' in home) && !('team_name' in home))) return false;
      if (!('id' in visitor) || (!('name' in visitor) && !('team_name' in visitor))) return false;
    }
    return true;
  }

  // Update BracketTeam type to allow team_name (for normalization)
  // If BracketTeam is imported, add a local type override here:
  type BracketTeamWithName = BracketTeam & { team_name?: string };

  function generateCustomBracketMatches(teams: BracketTeamWithName[]): BracketMatch[] {
    // Pad to next power of two
    const totalTeams = teams.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
    const byes = bracketSize - totalTeams;
    const allTeams = [...teams];
    for (let i = 0; i < byes; i++) {
      allTeams.push({ id: `bye-${i}`, name: 'BYE', logo: null });
    }
    // Normalize: ensure every team has a .name property
    const normalizedTeams = allTeams.map(team => ({
      ...team,
      name: team.name || team.team_name || 'Unknown'
    }));
    let matches: BracketMatch[] = [];
    let round = 1;
    let matchId = 1;
    let currentRoundTeams = normalizedTeams;
    while (currentRoundTeams.length > 1) {
      let nextRoundTeams: BracketTeam[] = [];
      for (let i = 0; i < currentRoundTeams.length; i += 2) {
        const home = currentRoundTeams[i];
        const visitor = currentRoundTeams[i + 1];
        matches.push({
          id: matchId.toString(),
          round,
          home,
          visitor,
        });
        // For next round, winner is TBD
        nextRoundTeams.push({ id: `tbd-${round}-${i / 2}`, name: 'TBD', logo: null });
        matchId++;
      }
      currentRoundTeams = nextRoundTeams;
      round++;
    }
    return matches;
  }

  // Custom BracketMatch component
  const BracketMatch = ({ match }) => {
    const home = match.home;
    const visitor = match.visitor;
    const round = match.round ? `Round ${match.round}` : 'Match';
    return (
      <TooltipProvider>
        <UITooltip>
          <TooltipTrigger asChild>
            <div className="bg-gaming-dark border border-gaming-gray/40 rounded-lg shadow-md px-4 py-3 flex flex-col items-center min-w-[180px] max-w-[220px]">
              <div className="flex items-center gap-2 mb-2 w-full justify-between">
                {/* Home team */}
                <div className="flex items-center gap-2">
                  {home.logo ? (
                    <img src={home.logo} alt={getTeamDisplayName(home)} className="w-6 h-6 rounded bg-white border border-gray-300" />
                  ) : (
                    <span className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-300">
                      <GamepadIcon className="w-4 h-4 text-gaming-purple" />
                    </span>
                  )}
                  <span className="font-semibold text-white text-sm truncate max-w-[80px]">{getTeamDisplayName(home)}</span>
                </div>
                <span className="text-xs text-gray-400 font-bold">vs</span>
                {/* Visitor team */}
                <div className="flex items-center gap-2">
                  {visitor.logo ? (
                    <img src={visitor.logo} alt={getTeamDisplayName(visitor)} className="w-6 h-6 rounded bg-white border border-gray-300" />
                  ) : (
                    <span className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-300">
                      <GamepadIcon className="w-4 h-4 text-gaming-purple" />
                    </span>
                  )}
                  <span className="font-semibold text-white text-sm truncate max-w-[80px]">{getTeamDisplayName(visitor)}</span>
                </div>
              </div>
              <div className="text-xs text-gaming-purple font-bold mb-1">{round}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-gaming-dark border border-gaming-purple/40 rounded-lg shadow-lg p-3">
            <div className="mb-1 text-gaming-purple font-bold">{round}</div>
            <div className="flex items-center gap-2 mb-1">
              {home.logo ? (
                <img src={home.logo} alt={getTeamDisplayName(home)} className="w-5 h-5 rounded bg-white border border-gray-300" />
              ) : (
                <GamepadIcon className="w-4 h-4 text-gaming-purple" />
              )}
              <span className="font-semibold text-white text-xs">{getTeamDisplayName(home)}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              {visitor.logo ? (
                <img src={visitor.logo} alt={getTeamDisplayName(visitor)} className="w-5 h-5 rounded bg-white border border-gray-300" />
              ) : (
                <GamepadIcon className="w-4 h-4 text-gaming-purple" />
              )}
              <span className="font-semibold text-white text-xs">{getTeamDisplayName(visitor)}</span>
            </div>
          </TooltipContent>
        </UITooltip>
      </TooltipProvider>
    );
  };

  // Move the bracket rendering logic to a separate function to avoid linter error
  function renderBracketTab(participants, bracketGenerated, setBracketGenerated, toast) {
    const teams = participants.filter(p => p.registration_type === 'team');
    const matches = generateCustomBracketMatches(teams);
    const canGenerate = teams.length >= 2;
    if (!bracketGenerated) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-gray-400 mb-4">Bracket not generated yet.</div>
          <Button
            onClick={() => {
              setBracketGenerated(true);
              toast({ title: 'Bracket Generated', description: 'Bracket has been generated.' });
            }}
            disabled={!canGenerate}
            className="bg-gaming-purple hover:bg-gaming-purple/80"
          >
            Generate Bracket
          </Button>
          {!canGenerate && (
            <div className="text-xs text-gray-400 mt-2">At least 2 teams are required to generate a bracket.</div>
          )}
        </div>
      );
    }
    // Always show matches JSON for debugging
    return (
      <div>
        {/* 2 teams: show final */}
        {matches.length === 1 && teams.length === 2 && (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-lg font-bold mb-2">Final</div>
            <div className="flex gap-4 items-center">
              <span className="font-semibold">{matches[0].home?.name || 'TBD'}</span>
              <span className="text-gray-400">vs</span>
              <span className="font-semibold">{matches[0].visitor?.name || 'TBD'}</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">Only 2 teams registered. No bracket tree to display.</div>
            <Button
              onClick={() => setBracketGenerated(false)}
              variant="outline"
              className="mt-4"
            >
              Regenerate Bracket
            </Button>
          </div>
        )}
        {/* 3 teams: show message */}
        {teams.length === 3 && (
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className="text-lg font-bold mb-2">Bracket Not Supported</div>
            <div className="text-xs text-gray-400 mt-2">Single elimination brackets require 2, 4, 8, ... teams. 3 teams is not supported. Please add or remove a team.</div>
            <Button
              onClick={() => setBracketGenerated(false)}
              variant="outline"
              className="mt-4"
            >
              Regenerate Bracket
            </Button>
          </div>
        )}
        {/* 4+ teams: render bracket if valid, else show error and JSON */}
        {teams.length >= 4 && matches.length > 1 && (
          validateMatches(matches) ? (
            <div
              className="w-full h-full flex justify-center items-center overflow-x-auto bracket-svg-root relative"
              style={{
                minHeight: 600,
                width: '100%',
                maxWidth: 1200,
                margin: '0 auto',
                borderRadius: 32,
                boxShadow: '0 8px 48px #000a',
                padding: 0,
                position: 'relative',
                background: gameBackgroundUrl
                  ? `url('${gameBackgroundUrl}') center/cover no-repeat`
                  : `url('/backgrounds/generic-gaming.jpg') center/cover no-repeat`,
                overflow: 'hidden',
              }}
            >
              <BracketSVGStyle />
              <BracketPremiumOverlay />
              {/* Dark overlay for readability on top of SVG */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(18,18,22,0.82)',
                borderRadius: 32,
                zIndex: 3,
                pointerEvents: 'none',
              }} />
              <div style={{ width: '100%', height: '100%', zIndex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, borderRadius: 32 }}>
                <SingleEliminationBracketCustom teams={teams} matches={matches} />
              </div>
              <Button
                onClick={() => setBracketGenerated(false)}
                variant="outline"
                className="mt-4 absolute right-4 top-4 z-10"
                style={{ borderRadius: 16 }}
              >
                Regenerate Bracket
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              <div className="text-lg font-bold mb-2 text-red-400">Bracket Data Invalid</div>
              <div className="text-xs text-gray-400 mt-2">The generated bracket data is invalid or incomplete. Please contact support.</div>
              <Button
                onClick={() => setBracketGenerated(false)}
                variant="outline"
                className="mt-4"
              >
                Regenerate Bracket
              </Button>
            </div>
          )
        )}
      </div>
    );
  }

  // Fetch game background from RAWG API
  useEffect(() => {
    async function fetchGameBackground(gameName: string) {
      if (!gameName) return;
      try {
        const res = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(gameName)}&key=55e8210bf73448108b7f3c6707739206`);
        const data = await res.json();
        if (data && data.results && data.results.length > 0) {
          setGameBackgroundUrl(data.results[0].background_image);
        } else {
          setGameBackgroundUrl(null);
        }
      } catch (e) {
        setGameBackgroundUrl(null);
      }
    }
    if (tournament?.game) {
      fetchGameBackground(tournament.game);
    }
  }, [tournament?.game]);

  // Update BracketSVGStyle for more aggressive SVG and parent container overrides
  const BracketSVGStyle = () => (
    <style>{`
      .bracket-svg-root,
      .bracket-svg-root > div,
      .bracket-svg-root svg {
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .bracket-svg-root svg {
        background: transparent !important;
      }
    `}</style>
  );

  // Add a blurred background and animated border/glow
  const BracketPremiumOverlay = () => (
    <>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(18,18,22,0.7)',
        borderRadius: 32,
        pointerEvents: 'none',
      }} />
      <div className="bracket-glow-border" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 32,
        boxShadow: '0 0 32px 4px #a259ff88, 0 0 0 4px #18181b',
        border: '2px solid #a259ff',
        pointerEvents: 'none',
        animation: 'bracketGlow 2s infinite alternate',
        zIndex: 2,
      }} />
      <style>{`
        @keyframes bracketGlow {
          0% { box-shadow: 0 0 32px 4px #a259ff44, 0 0 0 4px #18181b; }
          100% { box-shadow: 0 0 48px 8px #a259ffcc, 0 0 0 4px #18181b; }
        }
      `}</style>
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-gaming-gray/20 rounded"></div>
            <div className="h-64 bg-gaming-gray/20 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Tournament not found</h1>
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              Back to Tournaments
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {/* Game Logo */}
            {gameLogo ? (
              <img src={gameLogo} alt={tournament.game + ' logo'} className="w-12 h-12 object-contain rounded bg-white border border-gray-200" />
            ) : (
              <span className="w-12 h-12 flex items-center justify-center rounded bg-white border border-gray-200">
                <GamepadIcon className="w-8 h-8 text-gaming-purple" />
              </span>
            )}
            <div>
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <p className="text-gray-400 flex items-center gap-2">
                {tournament.game}
                {/* Game Format */}
                {(() => {
                  const gameInfo = esportsGames.games.find(g => g.name.toLowerCase() === tournament.game.toLowerCase());
                  const format = gameInfo?.formats.find(f => f.teamSize === tournament.team_size);
                  return format ? (
                    <span className="ml-2 px-2 py-1 bg-gaming-gray/30 rounded text-xs font-semibold text-gaming-purple">{format.name}</span>
                  ) : null;
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(`/organizer/tournament/${slug}/edit`)}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this tournament? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Prize Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gaming-green">{tournament.prize_pool}</p>
            </CardContent>
          </Card>

          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{tournament.current_participants} / {tournament.max_participants}</p>
            </CardContent>
          </Card>

          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold capitalize">{tournament.status}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="brackets">Brackets</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="bg-gaming-dark border-gaming-gray/30 mb-6">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">{tournament.name}</h2>
                  <p className="text-gray-300 mb-2">{tournament.description}</p>
                </div>
                <div className="flex flex-wrap gap-8 mb-4">
                  <div>
                    <span className="block text-sm text-gray-400">Date & Time</span>
                    <span className="block font-semibold">{tournament.date} at {tournament.time}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-400">Venue</span>
                    <span className="block font-semibold">{tournament.venue}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-400">Entry Fee</span>
                    <span className="block font-semibold">{tournament.entry_fee || 'Free'}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-400">Format</span>
                    <span className="block font-semibold">{tournament.is_online ? 'Online' : 'LAN'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-8">
                  <div>
                    <span className="block text-sm text-gray-400">Participants</span>
                    <span className="block font-semibold">{tournament.current_participants} / {tournament.max_participants}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-400">Teams Registered</span>
                    <span className="block font-semibold">{participants.filter(p => p.registration_type === 'team').length}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-400">Solo Players</span>
                    <span className="block font-semibold">{participants.filter(p => p.registration_type === 'solo').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <Card className="bg-gaming-dark border-gaming-gray/30">
              <CardHeader>
                <CardTitle>Registered Participants</CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-gray-400">No participants registered yet.</p>
                ) : (
                  <div className="space-y-10">
                    {/* Solo Players Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Solo Players</h3>
                      <div className="overflow-x-auto rounded-lg border border-gaming-gray/30">
                        <table className="min-w-full bg-gaming-dark text-white">
                          <thead className="bg-gaming-gray/20">
                            <tr>
                              <th className="py-2 px-4 text-left">Username</th>
                              <th className="py-2 px-4 text-left">Registered</th>
                              <th className="py-2 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.filter(p => p.registration_type === 'solo').length === 0 ? (
                              <tr>
                                <td colSpan={3} className="text-center py-4 text-gray-400">No solo players registered.</td>
                              </tr>
                            ) : (
                              participants
                                .filter(p => p.registration_type === 'solo')
                                .map((participant) => (
                                  <tr key={participant.id} className="border-t border-gaming-gray/30 hover:bg-gaming-gray/10">
                                    <td className="py-2 px-4 font-semibold">{participant.user.username}</td>
                                    <td className="py-2 px-4 text-sm text-gray-400">{new Date(participant.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                    <td className="py-2 px-4 text-right">
                                      <Button size="sm" variant="destructive"
                                        onClick={() => { setBanDialogOpen(true); setBanTarget({ id: participant.id, userId: participant.user_id }); }}
                                        className="flex items-center gap-1"
                                      >
                                        <TooltipProvider>
                                          <UITooltip>
                                            <TooltipTrigger asChild>
                                              <span className="flex items-center"><BanIcon className="w-4 h-4 mr-1" />Ban</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Ban prevents this user from participating in this tournament again.
                                            </TooltipContent>
                                          </UITooltip>
                                        </TooltipProvider>
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Teams Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Teams</h3>
                      <div className="overflow-x-auto rounded-lg border border-gaming-gray/30">
                        <table className="min-w-full bg-gaming-dark text-white">
                          <thead className="bg-gaming-gray/20">
                            <tr>
                              <th className="py-2 px-4 text-left">Team Name</th>
                              <th className="py-2 px-4 text-left">Registered</th>
                              <th className="py-2 px-4 text-left">Team Members</th>
                              <th className="py-2 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {participants.filter(p => p.registration_type === 'team').length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-4 text-gray-400">No teams registered.</td>
                              </tr>
                            ) : (
                              participants
                                .filter(p => p.registration_type === 'team')
                                .map((participant) => (
                                  <tr key={participant.id} className="border-t border-gaming-gray/30 hover:bg-gaming-gray/10">
                                    <td className="py-2 px-4 font-semibold">{participant.team_name}</td>
                                    <td className="py-2 px-4 text-sm text-gray-400">{new Date(participant.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                    <td className="py-2 px-4 text-sm text-gray-400">
                                      {participant.team_members ? (
                                        <ul className="list-disc list-inside">
                                          {participant.team_members.split(',').map((member, idx) => (
                                            <li key={idx}>{member.trim()}</li>
                                          ))}
                                        </ul>
                                      ) : '-'}
                                    </td>
                                    <td className="py-2 px-4 text-right">
                                      <Button size="sm" variant="destructive"
                                        onClick={() => { setBanDialogOpen(true); setBanTarget({ id: participant.id, userId: participant.user_id }); }}
                                        className="flex items-center gap-1"
                                      >
                                        <TooltipProvider>
                                          <UITooltip>
                                            <TooltipTrigger asChild>
                                              <span className="flex items-center"><BanIcon className="w-4 h-4 mr-1" />Ban</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Ban prevents this team from participating in this tournament again.
                                            </TooltipContent>
                                          </UITooltip>
                                        </TooltipProvider>
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brackets">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Brackets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4 items-center">
                  <label htmlFor="bracketType">Bracket Type:</label>
                  <select
                    id="bracketType"
                    value={bracketType}
                    onChange={e => setBracketType(e.target.value as any)}
                    className="bg-gaming-dark border border-gaming-gray/30 rounded px-2 py-1"
                  >
                    <option value="single">Single Elimination</option>
                    <option value="double">Double Elimination</option>
                    <option value="roundrobin">Round Robin</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>
                {bracketType !== 'single' && (
                  <div className="text-yellow-400 mb-4">Only Single Elimination is implemented for now.</div>
                )}
                {/* Bracket generation logic */}
                {renderBracketTab(participants, bracketGenerated, setBracketGenerated, toast)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-gaming-dark border-gaming-gray/30">
              <CardHeader>
                <CardTitle>Tournament Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">Date & Time</h3>
                    <p className="text-gray-400">{tournament.date} at {tournament.time}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Venue</h3>
                    <p className="text-gray-400">{tournament.venue}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Entry Fee</h3>
                    <p className="text-gray-400">{tournament.entry_fee || 'Free'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Format</h3>
                    <p className="text-gray-400">{tournament.is_online ? 'Online' : 'LAN'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      {banDialogOpen && (
        <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ban Participant</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to ban this participant? This will remove their registration and prevent them from joining this tournament again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <label className="block mb-2 font-semibold">Ban Reason (required)</label>
              <input
                className="w-full p-2 rounded border border-gray-600 bg-gaming-dark text-white"
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Enter reason for ban..."
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setBanDialogOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!banReason.trim()}
                className="bg-red-600 hover:bg-red-700"
                onClick={() => banTarget && handleBan(banTarget.id, banTarget.userId)}
              >
                Ban
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

// Wrap TournamentDashboard in ErrorBoundary for export
export default function TournamentDashboardWithBoundary(props) {
  return (
    <ErrorBoundary>
      <TournamentDashboard {...props} />
    </ErrorBoundary>
  );
} 