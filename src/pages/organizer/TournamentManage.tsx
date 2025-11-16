// OrganizerTournamentDashboard.tsx
// This file is for managing a single tournament (participants, brackets, settings, etc.)

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import BanManagement from '@/components/organizer/BanManagement';
import DisputeCenter from '@/components/organizer/DisputeCenter';

const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

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
  participant_type: 'solo' | 'team';
  team_id?: string | null;
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
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Participant | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [teamCaptain, setTeamCaptain] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState<boolean>(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamModalData, setTeamModalData] = useState<{ id?: string | null; name: string; logo?: string | null; members: string[] }>({ name: '', members: [] });

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
      let { data: tournamentData, error: tournamentError } = await supabase
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

      // Fallback: try by ID if slug lookup fails
      if ((tournamentError || !tournamentData) && slug) {
        const byId = await supabase
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
          tournamentError = null as any;
        }
      }

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

      // Get participant count from tournament_participants (teams count as 1 entry)
      const { count, error: countError } = await supabase
        .from('tournament_participants')
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
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', typedTournamentData.id);

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        throw new DatabaseError(
          'Failed to fetch tournament registrations',
          'DATABASE_ERROR',
          { error: registrationsError }
        );
      }

      // Resolve solo usernames from profiles
      const regs = (registrationsData as any[]) || [];
      const soloUserIds = Array.from(new Set(regs.filter(r => r.participant_type !== 'team' && r.user_id).map(r => r.user_id)));
      let profileMap: Record<string, { username: string; full_name: string | null }> = {};
      if (soloUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', soloUserIds);
        for (const p of (profiles || [])) {
          profileMap[p.id] = { username: p.username || 'User', full_name: p.full_name || null };
        }
      }

      const participants = regs.map((reg: any) => {
        const isTeam = reg.participant_type === 'team';
        const teamMembersStr = Array.isArray(reg.team_members) ? reg.team_members.join(', ') : (reg.team_members || null);
        const participant: Participant = {
          id: reg.id,
          user_id: reg.user_id,
          tournament_id: reg.tournament_id,
          participant_type: isTeam ? 'team' as const : 'solo' as const,
          team_id: reg.team_id || null,
          team_name: isTeam ? (reg.team_name || 'Team') : null,
          team_members: isTeam ? teamMembersStr : null,
          gamer_tag: isTeam ? null : (reg.gamer_tag || null),
          status: reg.status || 'registered',
          registered_at: reg.registered_at || reg.registration_date || reg.created_at,
          created_at: reg.created_at || reg.registered_at || reg.registration_date,
          team_logo: null,
          user: isTeam ? { username: '', full_name: null } : (profileMap[reg.user_id] || { username: 'User', full_name: null })
        };
        return participant;
      });

      // Resolve team rosters: use roster_id from registration to get roster-specific members
      for (const p of participants) {
        if (p.participant_type !== 'team') continue;
        
        // If existing string contains plain names (not UUIDs), keep it
        if (p.team_members && p.team_members.trim().length > 0) {
          const tokens = p.team_members.split(',').map(s => s.trim()).filter(Boolean);
          const looksLikeUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
          if (tokens.some(t => !looksLikeUuid(t))) continue;
        }
        
        try {
          // Get the registration row to access roster_id
          const { data: regRow } = await supabase
            .from('tournament_participants')
            .select('roster_id, team_id')
            .eq('id', p.id)
            .maybeSingle();
          
          const rosterId = (regRow as any)?.roster_id || null;
          let teamId = p.team_id as string | null || (regRow as any)?.team_id || null;
          let ownerId: string | null = null;
          
          // Resolve team id by exact name if missing
          if (!teamId && p.team_name) {
            const exact = await (supabase as any).from('teams').select('id, owner_id, logo_url').eq('name', p.team_name).maybeSingle();
            if (exact.data) { 
              teamId = exact.data.id; 
              ownerId = exact.data.owner_id; 
              if (!p.team_logo) p.team_logo = exact.data.logo_url || null; 
            }
            if (!teamId) {
              const fuzzy = await (supabase as any).from('teams').select('id, owner_id, logo_url').ilike('name', `%${p.team_name}%`).limit(1).maybeSingle();
              if (fuzzy.data) {
                teamId = fuzzy.data.id; 
                ownerId = fuzzy.data.owner_id; 
                if (!p.team_logo) p.team_logo = fuzzy.data.logo_url || null;
              }
            }
          }
          
          if (teamId && !ownerId) {
            const meta = await (supabase as any).from('teams').select('owner_id, logo_url').eq('id', teamId).maybeSingle();
            if (meta.data) {
              ownerId = meta.data.owner_id || null; 
              if (!p.team_logo) p.team_logo = meta.data.logo_url || null;
            }
          }
          
          let names: string[] = [];
          
          // Priority 1: Use roster_id from registration to get roster-specific members
          if (rosterId) {
            const { data: roster, error: rosterError } = await supabase.rpc('get_roster_members', { r_id: rosterId });
            if (rosterError) {
              console.error('Error fetching roster members:', rosterError, 'for roster_id:', rosterId);
            } else {
              names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0,8)}`);
              console.log('Resolved members from roster_id:', rosterId, 'names:', names);
            }
          }
          
          // Priority 2: If no roster_id, resolve roster by team_id + tournament game
          if (names.length === 0 && teamId && typedTournamentData.game) {
            const game = (typedTournamentData.game || '').trim().toLowerCase();
            const { data: rosters, error: rostersError } = await supabase
              .from('team_rosters')
              .select('id, name, game, created_at')
              .eq('team_id', teamId);
            
            if (rostersError) {
              console.error('Error fetching rosters:', rostersError, 'for team_id:', teamId);
            } else {
              const list = rosters || [];
              let pickedRosterId: string | null = null;
              
              if (list.length === 1) {
                pickedRosterId = list[0].id;
              } else if (list.length > 1) {
                // Match by game
                const byGame = list.filter((r: any) => String(r.game || '').trim().toLowerCase() === game);
                if (byGame.length === 1) {
                  pickedRosterId = byGame[0].id;
                } else if (byGame.length > 0) {
                  // Multiple matches, pick most recent
                  const sorted = [...byGame].sort((a: any, b: any) => 
                    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                  );
                  pickedRosterId = sorted[0].id;
                } else if (list.length > 0) {
                  // No game match, pick most recent
                  const sorted = [...list].sort((a: any, b: any) => 
                    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                  );
                  pickedRosterId = sorted[0].id;
                }
              }
              
              if (pickedRosterId) {
                const { data: roster, error: rosterError2 } = await supabase.rpc('get_roster_members', { r_id: pickedRosterId });
                if (rosterError2) {
                  console.error('Error fetching roster members (priority 2):', rosterError2, 'for roster_id:', pickedRosterId);
                } else {
                  names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0,8)}`);
                  console.log('Resolved members from inferred roster_id:', pickedRosterId, 'names:', names);
                }
              }
            }
          }
          
          // Priority 3: Final fallback to organization-wide team members (legacy)
          if (names.length === 0 && teamId) {
            const { data: roster, error: teamRosterError } = await (supabase as any).rpc('get_team_roster', { t_id: teamId });
            if (teamRosterError) {
              console.error('Error fetching team roster:', teamRosterError, 'for team_id:', teamId);
            } else {
              names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0,8)}`);
              if (names.length === 0 && ownerId) {
                const { data: owner } = await supabase.from('profiles').select('id, username, full_name').eq('id', ownerId).maybeSingle();
                const ownerName = owner?.username || owner?.full_name || `player_${String(ownerId).substring(0,8)}`;
                names = [ownerName];
              }
              console.log('Resolved members from team_roster fallback:', names);
            }
          }
          
          if (names.length > 0) {
            p.team_members = names.join(', ');
            console.log('Final member list for participant:', p.id, 'team_name:', p.team_name, 'members:', p.team_members);
          } else {
            console.warn('No members found for participant:', p.id, 'team_name:', p.team_name, 'roster_id:', rosterId, 'team_id:', teamId);
          }
        } catch (e) {
          console.error('Error resolving members for participant:', p.id, e);
          // ignore and continue to next team
        }
      }

      // Attempt to resolve team logos
      try {
        const byIds = Array.from(new Set(participants.filter(p => p.participant_type === 'team' && p.team_id).map(p => p.team_id as string)));
        if (byIds.length > 0) {
          const { data: teamRows } = await (supabase as any).from('teams').select('id, logo_url').in('id', byIds);
          const logoById = new Map<string, string | null>();
          (teamRows || []).forEach((t: any) => logoById.set(t.id, t.logo_url || null));
          participants.forEach(p => { if (p.team_id && logoById.has(p.team_id)) p.team_logo = logoById.get(p.team_id) || null; });
        }
        // Fallback by team_name from tournament_registrations or teams
        const byNames = participants.filter(p => p.participant_type === 'team' && !p.team_logo && p.team_name).map(p => p.team_name as string);
        if (byNames.length > 0) {
          const { data: regRows } = await supabase
            .from('tournament_registrations')
            .select('team_name, team_logo')
            .in('team_name', byNames);
          const logoByName = new Map<string, string | null>();
          (regRows || []).forEach((r: any) => logoByName.set(r.team_name, r.team_logo || null));
          // Try teams table next for any still missing
          const missingNames = byNames.filter(n => !logoByName.has(n));
          if (missingNames.length > 0) {
            const { data: teamRowsByName } = await supabase
              .from('teams')
              .select('name, logo_url')
              .in('name', missingNames);
            (teamRowsByName || []).forEach((t: any) => logoByName.set(t.name, t.logo_url || null));
          }
          participants.forEach(p => {
            if (!p.team_logo && p.team_name && logoByName.has(p.team_name)) {
              p.team_logo = logoByName.get(p.team_name) || null;
            }
          });
        }
      } catch {}

      // Attach team logos where team_id is available
      const teamIds = Array.from(new Set(participants.filter(p => p.participant_type === 'team' && p.team_id).map(p => p.team_id))) as string[];
      if (teamIds.length > 0) {
        const { data: teamsMeta } = await supabase
          .from('teams')
          .select('id, logo_url')
          .in('id', teamIds);
        const logoMap = new Map<string, string | null>();
        (teamsMeta || []).forEach((t: any) => logoMap.set(t.id, t.logo_url || null));
        for (const p of participants) {
          if (p.participant_type === 'team' && p.team_id && (logoMap.has(p.team_id))) {
            (p as any).team_logo = logoMap.get(p.team_id);
          }
        }
      }

      // Transform the data to match the Tournament type
      const now = new Date();
      const start = new Date(typedTournamentData.start_date);
      console.log('Tournament data:', typedTournamentData);
      
      // Get venue name if venue_id exists
      let venueName = '';
      if (typedTournamentData.venue_id) {
        // For now, just use venue_id as venue name
        venueName = `Venue ${typedTournamentData.venue_id}`;
      }
      
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
        date: typedTournamentData.start_date ? new Date(typedTournamentData.start_date).toISOString().split('T')[0] : '',
        time: typedTournamentData.start_date ? new Date(typedTournamentData.start_date).toTimeString().split(' ')[0] : '',
        venue: venueName,
        max_participants: typedTournamentData.max_teams,
        prize_pool: typedTournamentData.prize_pool?.toString() || '0',
        description: typedTournamentData.description || '',
        organizer_id: typedTournamentData.organizer_id,
        user_id: typedTournamentData.organizer_id || '',
        entry_fee: typedTournamentData.entry_fee?.toString() || '0',
        is_online: !typedTournamentData.venue_id,
        created_at: typedTournamentData.created_at,
        updated_at: typedTournamentData.updated_at,
        status: computedStatus,
        image_url: typedTournamentData.banner_url || typedTournamentData.logo_url,
        team_size: typedTournamentData.team_size || 1,
        current_participants: count
      };

      // Pick logo: RAWG API first, then local mapping, then DB games table, then tournament image
      try {
        const searchName = typedTournamentData.game.trim().toLowerCase() === 'cs2' ? 'Counter-Strike 2' : typedTournamentData.game;
        const rawgRes = await fetch(`https://api.rawg.io/api/games?key=55e8210bf73448108b7f3c6707739206&search=${encodeURIComponent(searchName)}&page_size=1`);
        const rawgJson = await rawgRes.json();
        const apiImg = rawgJson?.results?.[0]?.background_image || rawgJson?.results?.[0]?.background_image_additional || '';
        if (apiImg) {
          setGameLogo(apiImg);
        } else {
          const localGame = (esportsGames as any).games.find((g: any) => normalize(g.name) === normalize(typedTournamentData.game));
          if (localGame?.logo) {
            setGameLogo(localGame.logo);
          } else {
            const { data: gameData } = await (supabase as any)
        .from('games')
        .select('logo_url')
        .eq('name', typedTournamentData.game)
              .maybeSingle();
            if (gameData?.logo_url) {
        setGameLogo(gameData.logo_url);
            } else if (tournament.image_url) {
              setGameLogo(tournament.image_url);
      } else {
        setGameLogo(null);
            }
          }
        }
      } catch {
        const localGame = (esportsGames as any).games.find((g: any) => normalize(g.name) === normalize(typedTournamentData.game));
        if (localGame?.logo) {
          setGameLogo(localGame.logo);
        } else if (tournament.image_url) {
          setGameLogo(tournament.image_url);
        } else {
          setGameLogo(null);
        }
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

  // Open team modal: fetch members and logo on demand for accuracy
  const openTeamModal = async (p: Participant) => {
    try {
      let teamId = p.team_id || null;
      let logo: string | null | undefined = (p as any).team_logo;
      // Load the exact registration row first (use id for precision)
      let regTeamMembers: string[] = [];
      let regRosterId: string | null = null;
      let regRosterName: string | null = null;
      let regTeamId: string | null = null;
      try {
        const { data: regRow } = await supabase
          .from('tournament_participants')
          .select('team_members, roster_id, roster_name, team_id, team_captain_id')
          .eq('id', p.id)
          .maybeSingle();
        if (regRow) {
          const raw = regRow.team_members;
          regRosterId = regRow.roster_id || null;
          regRosterName = regRow.roster_name || null;
          regTeamId = regRow.team_id || null;

          // Robustly parse team_members in multiple shapes
          if (raw) {
            if (Array.isArray(raw)) {
              // Could be array of strings, ids or objects
              const items = raw as any[];
              // If objects with usernames/gamer_tag/full_name
              if (items.length > 0 && typeof items[0] === 'object' && items[0] !== null) {
                const maybeNames = items
                  .map((it: any) => it?.gamer_tag || it?.username || it?.full_name || it?.name || null)
                  .filter(Boolean);
                if (maybeNames.length > 0) {
                  regTeamMembers = maybeNames as string[];
                } else {
                  const ids = items.map((it: any) => it?.user_id).filter(Boolean);
                  if (ids.length > 0) {
                    const { data: profsTok } = await supabase
                      .from('profiles')
                      .select('id, gamer_tag, username, full_name')
                      .in('id', ids);
                    const mapTok = new Map<string, string>();
                    (profsTok || []).forEach((p: any) => mapTok.set(p.id, p.gamer_tag || p.username || p.full_name || `player_${String(p.id).substring(0,8)}`));
                    regTeamMembers = ids.map((id: string) => mapTok.get(id) || `player_${String(id).substring(0,8)}`);
                  }
                }
              } else {
                regTeamMembers = items.map((s: any) => String(s).trim()).filter(Boolean);
              }
            } else if (typeof raw === 'string') {
              regTeamMembers = String(raw).split(',').map(s => s.trim()).filter(Boolean);
            } else if (typeof raw === 'object' && Array.isArray((raw as any).members)) {
              const m = (raw as any).members as any[];
              regTeamMembers = m.map((s: any) => String(s).trim()).filter(Boolean);
            }
          }
        }
      } catch {}
      if (!teamId && p.team_name) {
        const { data: teamRow } = await supabase
          .from('teams')
          .select('id, logo_url')
          .ilike('name', p.team_name)
          .maybeSingle();
        teamId = teamRow?.id || null;
        logo = teamRow?.logo_url || logo;
      } else if (teamId && !logo) {
        const { data: teamRow } = await supabase
          .from('teams')
          .select('logo_url')
          .eq('id', teamId)
          .maybeSingle();
        logo = teamRow?.logo_url || null;
      }
      // Simplified logic: 1) Already resolved names from participants list; 2) roster_id; 3) derive roster by team_id + tournament.game
      let members: string[] = [];

      const toNames = (rows: any[]) =>
        (rows || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0,8)}`);

      // Step 0: Check if participant already has resolved readable member names (from fetchTournamentData loop)
      if (p.team_members && p.team_members.trim().length > 0) {
        const tokens = p.team_members.split(',').map(s => s.trim()).filter(Boolean);
        const looksLikeUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
        // If any token is NOT a UUID, assume these are readable names already resolved
        if (tokens.some(t => !looksLikeUuid(t))) {
          members = tokens;
          console.log('Using already-resolved members from participant.team_members:', members);
        }
      }

      // Step 1: If we have parsed names from regRow.team_members, use those
      if (members.length === 0 && regTeamMembers.length > 0) {
        members = regTeamMembers;
        console.log('Using parsed members from registration row:', members);
      }

      // Step 2: use roster_id on registration if available
      if (members.length === 0 && regRosterId) {
        const { data: roster, error: rosterError } = await supabase.rpc('get_roster_members', { r_id: regRosterId });
        if (rosterError) {
          console.error('Error fetching roster members in modal:', rosterError);
        } else {
          const names = toNames(roster || []);
          if (names.length > 0) {
            members = names;
            console.log('Resolved members from roster_id in modal:', members);
          }
        }
      }

      // Step 3: if missing, derive roster by team_id + game match (game or name ilike)
      if (members.length === 0) {
        const effectiveTeamId = regTeamId || teamId;
        const game = String(tournament?.game || '').trim().toLowerCase();
        if (effectiveTeamId && game) {
          const { data: rosters } = await supabase
            .from('team_rosters')
            .select('id, name, game, created_at')
            .eq('team_id', effectiveTeamId);
          const list = rosters || [];
          let pickedId: string | null = null;
          if (list.length === 1) {
            pickedId = list[0].id;
          } else if (list.length > 1) {
            const byGame = list.filter((r: any) => String(r.game || '').trim().toLowerCase() === game);
            if (byGame.length === 1) {
              pickedId = byGame[0].id;
            } else if (byGame.length > 1) {
              // pick most recent among game matches
              const sorted = [...byGame].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
              pickedId = sorted[0].id;
            } else {
              // fallback: name contains game
              const byName = list.filter((r: any) => String(r.name || '').toLowerCase().includes(game));
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
            const { data: roster, error: rosterError3 } = await supabase.rpc('get_roster_members', { r_id: pickedId });
            if (rosterError3) {
              console.error('Error fetching roster members (Step 3) in modal:', rosterError3);
            } else {
              const names = toNames(roster || []);
              if (names.length > 0) {
                members = names;
                console.log('Resolved members from inferred roster (Step 3) in modal:', members);
              }
            }
          }
        }
      }

      console.log('Modal opening - participant:', p.team_name, 'resolved members:', members);
      setTeamModalData({ id: teamId, name: p.team_name || 'Team', logo: logo || null, members });
      setTeamModalOpen(true);
    } catch (e) {
      setTeamModalData({ id: p.team_id || null, name: p.team_name || 'Team', logo: (p as any).team_logo || null, members: (p.team_members || '').split(',').map(s => s.trim()).filter(Boolean) });
      setTeamModalOpen(true);
    }
  };

  // Ban participant (delete registration from DB)
  const handleBan = async (participantId: string, userId: string) => {
    try {
      // Get participant info to determine if it's a user or team ban
      const { data: participant } = await supabase
        .from('tournament_participants')
        .select('user_id, team_id')
        .eq('id', participantId)
        .maybeSingle();

      // Remove registration
      await supabase
        .from('tournament_participants')
        .delete()
        .eq('id', participantId);

      // Insert into tournament_bans
      const banData: any = {
        tournament_id: tournament?.id,
        participant_id: participantId,
        ban_reason: banReason.trim(),
        banned_by: user?.id,
        banned_at: new Date().toISOString(),
        is_active: true,
      };

      // Set user_id or team_id based on participant type
      if (participant?.user_id) {
        banData.user_id = participant.user_id;
      } else if (participant?.team_id) {
        banData.team_id = participant.team_id;
      } else {
        // Fallback to provided userId
        banData.user_id = userId;
      }

      await supabase
        .from('tournament_bans')
        .insert(banData);
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
    const teams = participants.filter(p => p.participant_type === 'team');
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
              <img src={gameLogo} alt={tournament.game + ' logo'} className="w-12 h-12 object-cover rounded border border-gray-700 bg-transparent" />
            ) : (
              <span className="w-12 h-12 flex items-center justify-center rounded bg-gray-800 border border-gray-700">
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
            <TabsTrigger value="bans">Bans</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
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
                    <span className="block font-semibold">{participants.filter(p => p.participant_type === 'team').length}</span>
                  </div>
                  <div>
                    <span className="block text-sm text-gray-400">Solo Players</span>
                    <span className="block font-semibold">{participants.filter(p => p.participant_type === 'solo').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <Card className="bg-gaming-dark border-gaming-gray/30">
              <CardHeader>
                <CardTitle>Teams</CardTitle>
              </CardHeader>
              <CardContent>
                {participants.filter(p => p.participant_type === 'team').length === 0 ? (
                  <p className="text-gray-400">No teams registered yet.</p>
                ) : (
                      <div className="overflow-x-auto rounded-lg border border-gaming-gray/30">
                        <table className="min-w-full bg-gaming-dark text-white">
                          <thead className="bg-gaming-gray/20">
                            <tr>
                          <th className="py-2 px-4 text-left">Logo</th>
                          <th className="py-2 px-4 text-left">Team Name</th>
                              <th className="py-2 px-4 text-left">Registered</th>
                              <th className="py-2 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                        {participants
                          .filter(p => p.participant_type === 'team')
                                .map((participant) => (
                            <tr key={participant.id} className="border-t border-gaming-gray/30 hover:bg-gaming-gray/10 cursor-pointer"
                              onClick={async () => {
                                setSelectedTeam(participant);
                                setTeamLoading(true);
                                setTeamCaptain(null);
                                try {
                                  // Parse any pre-saved members; if they look like UUIDs, we will resolve them to profile names
                                  const rawTokens = participant.team_members ? participant.team_members.split(',').map(s => s.trim()).filter(Boolean) : [];
                                  const looksLikeUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
                                  const tokensAreIds = rawTokens.some(t => looksLikeUuid(t));
                                  if (rawTokens.length > 0 && !tokensAreIds) {
                                    setSelectedTeamMembers(rawTokens);
                                  }
                                  // Resolve team id and owner
                                  let teamId = participant.team_id as string | null;
                                  let ownerId: string | null = null;
                                  let logoUrl: string | null = participant.team_logo || null;
                                  if (!teamId) {
                                    // Try exact name match first
                                    const exact = await supabase
                                      .from('teams')
                                      .select('id, owner_id, logo_url')
                                      .eq('name', participant.team_name || '')
                                      .maybeSingle();
                                    if (exact.data) {
                                      teamId = exact.data.id; ownerId = exact.data.owner_id; logoUrl = logoUrl || exact.data.logo_url || null;
                                    } else {
                                      // Try fuzzy name
                                      const fuzzy = await supabase
                                        .from('teams')
                                        .select('id, owner_id, logo_url')
                                        .ilike('name', `%${participant.team_name || ''}%`)
                                        .limit(1)
                                        .maybeSingle();
                                      if (fuzzy.data) {
                                        teamId = fuzzy.data.id; ownerId = fuzzy.data.owner_id; logoUrl = logoUrl || fuzzy.data.logo_url || null;
                                      }
                                    }
                                  } else {
                                    const byId = await supabase
                                      .from('teams')
                                      .select('id, owner_id, logo_url')
                                      .eq('id', teamId)
                                      .maybeSingle();
                                    if (byId.data) {
                                      ownerId = byId.data.owner_id; logoUrl = logoUrl || byId.data.logo_url || null;
                                    }
                                  }
                                  if (logoUrl && selectedTeam) selectedTeam.team_logo = logoUrl;
                                  // First, try reading names saved in tournament registration directly
                                  if (tournament?.id && participant.team_name) {
                                    const { data: regRow } = await supabase
                                      .from('tournament_participants')
                                      .select('team_members')
                                      .eq('tournament_id', tournament.id)
                                      .eq('team_name', participant.team_name)
                                      .maybeSingle();
                                    if (regRow?.team_members) {
                                      const raw = Array.isArray(regRow.team_members)
                                        ? (regRow.team_members as any[]).map(String)
                                        : String(regRow.team_members);
                                      const tokens = (Array.isArray(raw) ? raw : raw.split(',')).map((s: string) => s.trim()).filter(Boolean);
                                      const looksUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
                                      const hasPlainNames = tokens.some(t => !looksUuid(t));
                                      if (tokens.length > 0 && hasPlainNames) {
                                        setSelectedTeamMembers(tokens);
                                        setTeamLoading(false);
                                        setTeamDialogOpen(true);
                                        return;
                                      }
                                      if (tokens.length > 0) {
                                        let namesResolved: string[] = [];
                                        if (tokens.every(looksUuid)) {
                                          const { data: prows } = await supabase
                                            .from('profiles')
                                            .select('id, gamer_tag, username, full_name')
                                            .in('id', tokens);
                                          const mapTok = new Map<string, string>();
                                          (prows || []).forEach((p: any) => mapTok.set(p.id, p.gamer_tag || p.username || p.full_name || `player_${String(p.id).substring(0,8)}`));
                                          namesResolved = tokens.map(id => mapTok.get(id) || `player_${String(id).substring(0,8)}`);
                                        } else {
                                          const uniq = Array.from(new Set(tokens));
                                          const [byTag, byUser, byFull] = await Promise.all([
                                            supabase.from('profiles').select('id, gamer_tag, username, full_name').in('gamer_tag', uniq),
                                            supabase.from('profiles').select('id, gamer_tag, username, full_name').in('username', uniq),
                                            supabase.from('profiles').select('id, gamer_tag, username, full_name').in('full_name', uniq),
                                          ]);
                                          const map = new Map<string, string>();
                                          (byTag.data || []).forEach((p: any) => map.set(p.gamer_tag, p.gamer_tag || p.username || p.full_name));
                                          (byUser.data || []).forEach((p: any) => map.set(p.username, p.gamer_tag || p.username || p.full_name));
                                          (byFull.data || []).forEach((p: any) => map.set(p.full_name, p.gamer_tag || p.username || p.full_name));
                                          namesResolved = uniq.map(t => map.get(t) || t);
                                        }
                                        if (namesResolved.length > 0) {
                                          setSelectedTeamMembers(namesResolved);
                                          setTeamLoading(false);
                                          setTeamDialogOpen(true);
                                          return;
                                        }
                                      }
                                    }
                                  }

                                  // Resolve members via roster (not organization-wide)
                                  let names: string[] = [];
                                  
                                  // Step 1: Get roster_id from registration
                                  const { data: regRowForRoster } = await supabase
                                    .from('tournament_participants')
                                    .select('roster_id')
                                    .eq('id', participant.id)
                                    .maybeSingle();
                                  const rosterId = (regRowForRoster as any)?.roster_id || null;
                                  
                                  // Step 2: Use roster_id to fetch roster members
                                  if (rosterId) {
                                    const { data: roster } = await supabase.rpc('get_roster_members', { r_id: rosterId });
                                    names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0,8)}`);
                                    console.log('Row onClick: Resolved members from roster_id:', rosterId, 'names:', names);
                                  }
                                  
                                  // Step 3: If no roster_id, match roster by team_id + tournament game
                                  if (names.length === 0 && teamId && tournament?.game) {
                                    const game = (tournament.game || '').trim().toLowerCase();
                                    const { data: rosters } = await supabase
                                      .from('team_rosters')
                                      .select('id, name, game, created_at')
                                      .eq('team_id', teamId);
                                    const list = rosters || [];
                                    let pickedRosterId: string | null = null;
                                    if (list.length === 1) {
                                      pickedRosterId = list[0].id;
                                    } else if (list.length > 1) {
                                      const byGame = list.filter((r: any) => String(r.game || '').trim().toLowerCase() === game);
                                      if (byGame.length === 1) {
                                        pickedRosterId = byGame[0].id;
                                      } else if (byGame.length > 0) {
                                        const sorted = [...byGame].sort((a: any, b: any) => 
                                          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                                        );
                                        pickedRosterId = sorted[0].id;
                                      } else if (list.length > 0) {
                                        const sorted = [...list].sort((a: any, b: any) => 
                                          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                                        );
                                        pickedRosterId = sorted[0].id;
                                      }
                                    }
                                    if (pickedRosterId) {
                                      const { data: roster } = await supabase.rpc('get_roster_members', { r_id: pickedRosterId });
                                      names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0,8)}`);
                                      console.log('Row onClick: Resolved members from inferred roster_id:', pickedRosterId, 'names:', names);
                                    }
                                  }
                                  
                                  // Step 4: Fallback to organization-wide members (legacy)
                                  if (names.length === 0 && teamId) {
                                    const { data: roster } = await supabase.rpc('get_team_roster', { t_id: teamId });
                                    names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0,8)}`);
                                    if (names.length === 0 && ownerId) {
                                      const { data: ownerProfile } = await supabase
                                        .from('profiles')
                                        .select('id, username, full_name')
                                        .eq('id', ownerId)
                                        .maybeSingle();
                                      const ownerName = ownerProfile?.username || ownerProfile?.full_name || `player_${String(ownerId).substring(0,8)}`;
                                      names = [ownerName];
                                    }
                                  }
                                  
                                  // Step 5: If registration stored user IDs, resolve them as names
                                  if (names.length === 0 && tokensAreIds && rawTokens.length > 0) {
                                    const { data: profsTok } = await supabase
                                      .from('profiles')
                                      .select('id, username, full_name')
                                      .in('id', rawTokens);
                                    const mapTok = new Map<string, string>();
                                    (profsTok || []).forEach((p: any) => mapTok.set(p.id, p.username || p.full_name || `player_${String(p.id).substring(0,8)}`));
                                    names = rawTokens.map(id => mapTok.get(id) || `player_${String(id).substring(0,8)}`);
                                  }
                                  
                                  // Step 6: Last resort - show parsed tokens
                                  if (names.length === 0 && rawTokens.length > 0 && !tokensAreIds) {
                                    names = rawTokens;
                                  }
                                  
                                  if (names.length > 0) {
                                    setSelectedTeamMembers(names);
                                    console.log('Row onClick: Final members set:', names);
                                  } else {
                                    console.warn('Row onClick: No members found for participant:', participant.team_name);
                                    setSelectedTeamMembers([]);
                                  }
                                } catch {
                                  setSelectedTeamMembers([]);
                                } finally {
                                  setTeamLoading(false);
                                }
                                setTeamDialogOpen(true);
                              }}
                            >
                              <td className="py-2 px-4">
                                {participant.team_logo ? (
                                  <img src={participant.team_logo} alt={participant.team_name || 'team'} className="w-8 h-8 rounded object-cover border border-gray-700" />
                                ) : (
                                  <span className="w-8 h-8 inline-flex items-center justify-center rounded bg-gray-800 border border-gray-700 text-xs">
                                    {(participant.team_name || 'T')[0]}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-4 font-semibold">{participant.team_name}</td>
                                    <td className="py-2 px-4 text-sm text-gray-400">{new Date(participant.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                    <td className="py-2 px-4 text-right">
                                <Button size="sm" variant="secondary" className="mr-2"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    // Use the row's onClick handler which will populate members
                                    // We'll just wait a bit for the async operation
                                    setSelectedTeam(participant);
                                    // Manually trigger member resolution (same as row onClick does)
                                    const row = e.currentTarget.closest('tr');
                                    if (row) {
                                      (row as any).click();
                                    }
                                  }}
                                >
                                  Manage
                                </Button>
                                      <Button size="sm" variant="destructive"
                                  onClick={(e) => { e.stopPropagation(); setBanDialogOpen(true); setBanTarget({ id: participant.id, userId: participant.user_id }); }}
                                        className="flex items-center gap-1"
                                      >
                                  <BanIcon className="w-4 h-4" />
                                  Ban
                                      </Button>
                                    </td>
                                  </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                )}
              </CardContent>
            </Card>

            {/* Team Management Dialog */}
            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
              <DialogContent className="sm:max-w-[520px] bg-gaming-dark border border-gaming-gray/30">
                <DialogHeader>
                  <DialogTitle className="text-white">{selectedTeam?.team_name || 'Team'}</DialogTitle>
                  <DialogDescription className="text-gray-400">Roster and management</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                    <div className="text-xs text-gray-400 mb-1">Players</div>
                    {teamLoading ? (
                      <div className="text-sm text-gray-400">Loading roster…</div>
                    ) : selectedTeamMembers.length === 0 ? (
                      <div className="text-sm text-gray-400">No members found</div>
                    ) : (
                      <>
                        {teamCaptain && (
                          <div className="text-sm text-gaming-purple mb-1">Captain: {teamCaptain}</div>
                        )}
                        <ul className="list-disc list-inside text-sm text-gray-200">
                          {selectedTeamMembers.map((m, i) => <li key={i}>{m}</li>)}
                                        </ul>
                      </>
                    )}
                      </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="destructive" onClick={() => { setBanDialogOpen(true); setBanTarget({ id: selectedTeam?.id!, userId: selectedTeam?.user_id! }); }}>Ban Team</Button>
                    <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>Close</Button>
                    </div>
                  </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="brackets">
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                <CardTitle>Brackets</CardTitle>
                  <Button
                    onClick={() => {
                      console.log('Navigating to brackets for tournament:', slug);
                      navigate(`/tournaments/${slug}/brackets`);
                    }}
                    className="bg-gaming-purple hover:bg-gaming-purple/80 text-white"
                  >
                    View Full Bracket System
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold text-white mb-2">Professional Bracket System</h3>
                  <p className="text-gray-400 mb-4">
                    Access the full bracket visualization with team count selection (8, 16, 24, 32 teams) and mock data generation.
                  </p>
                  <Button
                    onClick={() => {
                      console.log('Opening bracket system for tournament:', slug);
                      navigate(`/tournaments/${slug}/brackets`);
                    }}
                    className="bg-gaming-purple hover:bg-gaming-purple/80 text-white"
                  >
                    Open Bracket System
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bans">
            {tournament?.id && (
              <BanManagement tournamentId={tournament.id} />
            )}
          </TabsContent>

          <TabsContent value="disputes">
            {tournament?.id && user?.id && (
              <DisputeCenter tournamentId={tournament.id} organizerId={user.id} />
            )}
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