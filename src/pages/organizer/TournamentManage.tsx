// OrganizerTournamentDashboard.tsx
// This file is for managing a single tournament (participants, brackets, settings, etc.)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Tournament as TournamentType } from '@/hooks/useTournaments';
import { TournamentStatus } from '@/types/tournament';
import { supabase } from '@/lib/supabase';
import { Users, Trophy, Settings, Edit2, Trash2, GamepadIcon, Ban as BanIcon, AlertTriangle, Plus, ArrowUp, ArrowDown, Layers, Lock, Unlock, Shuffle, ArrowRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { StaffPermission } from '@/lib/tournamentStaff';
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
import TournamentStaffManager from '@/components/organizer/TournamentStaffManager';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { StageManagementTab } from '@/components/organizer/tabs/StageManagementTab';

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
  check_in_required?: boolean;
  check_in_deadline?: string | null;
  auto_remove_unchecked?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  registration_deadline?: string | null;
  venue_id?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  max_teams?: number | null;
  min_teams?: number | null;
  is_public?: boolean;
}

interface LocalTournament extends DatabaseTournament {
  current_participants: number;
  check_in_required?: boolean;
  check_in_deadline?: string | null;
  auto_remove_unchecked?: boolean;
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
  checked_in_at?: string | null;
  user: {
    username: string;
    full_name: string | null;
  };
}

const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  'scores:update': 'Scores',
  'teams:manage': 'Teams',
  'bracket:edit': 'Brackets',
  'announcements:send': 'Announcements',
  'disputes:assist': 'Disputes',
};

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
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded mt-4"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              // Force a page reload to reset the component state
              window.location.reload();
            }}
          >
            Retry
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
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id;
  const [tournament, setTournament] = useState<LocalTournament | null>(null);
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
  // Initialize activeTab from location state if available
  const [activeTab, setActiveTab] = useState((location.state as { activeTab?: string })?.activeTab || 'overview');
  const [checkInRequiredSetting, setCheckInRequiredSetting] = useState(false);
  const [checkInDeadlineSetting, setCheckInDeadlineSetting] = useState('');
  const [autoRemoveUncheckedSetting, setAutoRemoveUncheckedSetting] = useState(true);
  const [savingCheckInSettings, setSavingCheckInSettings] = useState(false);
  const [removingUnchecked, setRemovingUnchecked] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cascadeWarnings, setCascadeWarnings] = useState<Array<{ entity: string; count: number; description?: string }>>([]);
  const [hasStaffAccess, setHasStaffAccess] = useState(false);
  const [staffPermissions, setStaffPermissions] = useState<StaffPermission[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [now, setNow] = useState(Date.now());

  const fetchTournamentData = useCallback(async () => {
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
          updated_at,
          check_in_required,
          check_in_deadline,
          check_in_required,
          check_in_deadline,
          auto_remove_unchecked,
          team_size
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
            updated_at,
            check_in_required,
            check_in_deadline,
            check_in_required,
            check_in_deadline,
            auto_remove_unchecked,
            team_size
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

      const organizerMatch = typedTournamentData.organizer_id === user.id;
      let staffPerms: StaffPermission[] = [];

      if (!organizerMatch) {
        const { data: staffRecord } = await supabase
          .from('tournament_staff')
          .select('permissions,status')
          .eq('tournament_id', typedTournamentData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!staffRecord || staffRecord.status !== 'active') {
          throw new AuthError(
            'You do not have permission to manage this tournament.',
            'ACCESS_DENIED',
            { tournamentSlug: slug }
          );
        }

        staffPerms = (staffRecord.permissions || []) as StaffPermission[];
      }

      const [countResponse, registrationsResponse, bansResponse, stagesResponse, matchesResponse] = await Promise.all([
        supabase
          .from('tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', typedTournamentData.id),
        supabase
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', typedTournamentData.id),
        supabase
          .from('tournament_bans')
          .select('user_id, team_id')
          .eq('tournament_id', typedTournamentData.id)
          .eq('is_active', true),
        supabase
          .from('tournament_stages')
          .select('*')
          .eq('tournament_id', typedTournamentData.id)
          .order('stage_order', { ascending: true }),
        supabase
          .from('tournament_matches')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', typedTournamentData.id)
      ]);

      if (countResponse.error) {
        console.error('Error getting participant count:', countResponse.error);
        throw new DatabaseError(
          'Failed to get participant count',
          'DATABASE_ERROR',
          { error: countResponse.error }
        );
      }

      if (registrationsResponse.error) {
        console.error('Error fetching registrations:', registrationsResponse.error);
        throw new DatabaseError(
          'Failed to fetch tournament registrations',
          'DATABASE_ERROR',
          { error: registrationsResponse.error }
        );
      }

      if (bansResponse.error) {
        console.error('Error fetching bans:', bansResponse.error);
        throw new DatabaseError(
          'Failed to fetch tournament bans',
          'DATABASE_ERROR',
          { error: bansResponse.error }
        );
      }

      if (stagesResponse.error) {
        console.error('Error fetching stages:', stagesResponse.error);
        throw new DatabaseError(
          'Failed to fetch tournament stages',
          'DATABASE_ERROR',
          { error: stagesResponse.error }
        );
      }

      const count = countResponse.count || 0;
      setStages(stagesResponse.data || []);
      setMatchCount(matchesResponse.count || 0);

      const registrationsData = registrationsResponse.data;

      // Get banned user_ids and team_ids
      const bannedUserIds = new Set(((bansResponse.data as any[]) || []).filter(b => b.user_id).map(b => b.user_id));
      const bannedTeamIds = new Set(((bansResponse.data as any[]) || []).filter(b => b.team_id).map(b => b.team_id));

      // Filter out banned participants
      const filteredRegistrations = (registrationsData || []).filter((reg: any) => {
        if (reg.user_id && bannedUserIds.has(reg.user_id)) return false;
        if (reg.team_id && bannedTeamIds.has(reg.team_id)) return false;
        return true;
      });

      console.log('Found tournament data:', {
        tournament: typedTournamentData,
        participantCount: count,
        userId: user?.id,
        isOrganizer: typedTournamentData.organizer_id === user?.id
      });

      // Resolve solo usernames from profiles
      const regs = (filteredRegistrations as any[]) || [];
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

      // Resolve team names from teams table
      const registrationTeamIds = Array.from(
        new Set(
          regs
            .filter((r) => r.participant_type === 'team' && r.team_id)
            .map((r) => r.team_id as string)
        )
      );
      let teamNameMap: Record<string, { name: string | null; logo_url: string | null }> = {};
      if (registrationTeamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id,name,logo_url')
          .in('id', registrationTeamIds);
        (teams || []).forEach((team: any) => {
          teamNameMap[team.id] = { name: team.name, logo_url: team.logo_url || null };
        });
      }

      const participants = regs.map((reg: any) => {
        const isTeam = reg.participant_type === 'team';
        const teamMembersStr = Array.isArray(reg.team_members) ? reg.team_members.join(', ') : (reg.team_members || null);
        const resolvedTeamName =
          (reg.team_id && teamNameMap[reg.team_id]?.name) ||
          reg.team_name ||
          'Team';
        const resolvedTeamLogo =
          (reg.team_id && teamNameMap[reg.team_id]?.logo_url) ||
          null;
        const participant: Participant = {
          id: reg.id,
          user_id: reg.user_id,
          tournament_id: reg.tournament_id,
          participant_type: isTeam ? 'team' as const : 'solo' as const,
          team_id: reg.team_id || null,
          team_name: isTeam ? resolvedTeamName : null,
          team_members: isTeam ? teamMembersStr : null,
          gamer_tag: isTeam ? null : (reg.gamer_tag || null),
          status: reg.status || 'registered',
          registered_at: reg.registered_at || reg.registration_date || reg.created_at,
          created_at: reg.created_at || reg.registered_at || reg.registration_date,
          team_logo: resolvedTeamLogo,
          checked_in_at: reg.checked_in_at || null,
          user: isTeam ? { username: '', full_name: null } : (profileMap[reg.user_id] || { username: 'User', full_name: null })
        };
        return participant;
      });

      // Resolve team rosters: use roster_id from registration to get roster-specific members
      for (const p of participants) {
        if (p.participant_type !== 'team') continue;

        // If existing string contains plain names (not UUIDs), keep it
        if (p.team_members && typeof p.team_members === 'string' && p.team_members.trim().length > 0) {
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
              names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0, 8)}`);
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
                  names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0, 8)}`);
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
              names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0, 8)}`);
              if (names.length === 0 && ownerId) {
                const { data: owner } = await supabase.from('profiles').select('id, username, full_name').eq('id', ownerId).maybeSingle();
                const ownerName = owner?.username || owner?.full_name || `player_${String(ownerId).substring(0, 8)}`;
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
        // Fallback by team_name from tournament_participants or teams
        const byNames = participants.filter(p => p.participant_type === 'team' && !p.team_logo && p.team_name).map(p => p.team_name as string);
        if (byNames.length > 0) {
          const { data: regRows } = await supabase
            .from('tournament_participants')
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
      } catch { }

      // Attach team logos where team_id is available
      const participantTeamIds = Array.from(new Set(participants.filter(p => p.participant_type === 'team' && p.team_id).map(p => p.team_id))) as string[];
      if (participantTeamIds.length > 0) {
        const { data: teamsMeta } = await supabase
          .from('teams')
          .select('id, logo_url')
          .in('id', participantTeamIds);
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

      const transformedTournament: LocalTournament = {
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
        entry_fee: typedTournamentData.entry_fee?.toString() || '0',
        is_online: !typedTournamentData.venue_id,
        created_at: typedTournamentData.created_at,
        updated_at: typedTournamentData.updated_at,
        status: computedStatus,
        image_url: typedTournamentData.banner_url || typedTournamentData.logo_url,
        team_size: typedTournamentData.team_size || 1,
        current_participants: filteredRegistrations.length,
        check_in_required: typedTournamentData.check_in_required ?? false,
        check_in_deadline: typedTournamentData.check_in_deadline,
        auto_remove_unchecked: typedTournamentData.auto_remove_unchecked ?? true,
        slug: typedTournamentData.slug,
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
            } else if (transformedTournament.image_url) {
              setGameLogo(transformedTournament.image_url);
            } else {
              setGameLogo(null);
            }
          }
        }
      } catch {
        const localGame = (esportsGames as any).games.find((g: any) => normalize(g.name) === normalize(typedTournamentData.game));
        if (localGame?.logo) {
          setGameLogo(localGame.logo);
        } else if (transformedTournament.image_url) {
          setGameLogo(transformedTournament.image_url);
        } else {
          setGameLogo(null);
        }
      }

      // Set the tournament data
      setTournament(transformedTournament);
      setCheckInRequiredSetting(!!transformedTournament.check_in_required);
      setAutoRemoveUncheckedSetting(transformedTournament.auto_remove_unchecked ?? true);
      setCheckInDeadlineSetting(
        transformedTournament.check_in_deadline
          ? new Date(transformedTournament.check_in_deadline).toISOString().slice(0, 16)
          : ''
      );
      setParticipants(participants as Participant[]);
      setIsOrganizer(organizerMatch);
      setHasStaffAccess(!organizerMatch && staffPerms.length > 0);
      setStaffPermissions(staffPerms);
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
  }, [slug, userId, toast]);

  // Lightweight function to refresh only stages without full page reload
  const refreshStages = useCallback(async () => {
    if (!tournament?.id) return;
    try {
      const { data, error } = await supabase
        .from('tournament_stages')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error refreshing stages:', error);
    }
  }, [tournament?.id]);


  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (slug && userId) {
      console.log('Tournament slug from URL:', slug);
      console.log('Current user ID:', userId);
      fetchTournamentData();
    }
  }, [slug, userId, fetchTournamentData]);

  useEffect(() => {
    if (!tournament) return;
    setCheckInRequiredSetting(!!tournament.check_in_required);
    setAutoRemoveUncheckedSetting(tournament.auto_remove_unchecked ?? true);
    setCheckInDeadlineSetting(
      tournament.check_in_deadline
        ? new Date(tournament.check_in_deadline).toISOString().slice(0, 16)
        : ''
    );
  }, [tournament]);

  // Set up realtime subscriptions for tournaments and participants
  useEffect(() => {
    if (!tournament?.id) return;

    console.log('[TournamentManage] Setting up realtime subscriptions for tournament:', tournament.id);

    // Subscribe to tournament changes
    const tournamentChannel = supabase
      .channel(`tournament_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournament.id}`
        },
        (payload) => {
          console.log('[TournamentManage] Tournament change detected:', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Update tournament state directly from payload
            const updated = payload.new as any;
            setTournament(prev => prev ? {
              ...prev,
              name: updated.name || prev.name,
              description: updated.description || prev.description,
              status: updated.status || prev.status,
              prize_pool: updated.prize_pool?.toString() || prev.prize_pool,
              max_participants: updated.max_teams || prev.max_participants,
              entry_fee: updated.entry_fee?.toString() || prev.entry_fee,
            } : null);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournament.id}`
        },
        async (payload) => {
          console.log('[TournamentManage] Participant change detected:', payload);
          // Refetch participants when they change (complex data structure)
          // But do it without showing loading state
          try {
            const { data: registrationsData } = await supabase
              .from('tournament_participants')
              .select('*')
              .eq('tournament_id', tournament.id);

            if (registrationsData) {
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

              // Resolve team names and logos (same as in fetchTournamentData)
              const registrationTeamIds = Array.from(
                new Set(
                  regs
                    .filter((r) => r.participant_type === 'team' && r.team_id)
                    .map((r) => r.team_id as string)
                )
              );
              let teamNameMap: Record<string, { name: string | null; logo_url: string | null }> = {};
              if (registrationTeamIds.length > 0) {
                const { data: teams } = await supabase
                  .from('teams')
                  .select('id,name,logo_url')
                  .in('id', registrationTeamIds);
                (teams || []).forEach((team: any) => {
                  teamNameMap[team.id] = { name: team.name, logo_url: team.logo_url || null };
                });
              }

              const participants = regs.map((reg: any) => {
                const isTeam = reg.participant_type === 'team';
                const teamMembersStr = Array.isArray(reg.team_members) ? reg.team_members.join(', ') : (reg.team_members || null);
                const resolvedTeamName =
                  (reg.team_id && teamNameMap[reg.team_id]?.name) ||
                  reg.team_name ||
                  'Team';
                const resolvedTeamLogo =
                  (reg.team_id && teamNameMap[reg.team_id]?.logo_url) ||
                  null;
                return {
                  id: reg.id,
                  user_id: reg.user_id,
                  tournament_id: reg.tournament_id,
                  participant_type: isTeam ? 'team' as const : 'solo' as const,
                  team_id: reg.team_id || null,
                  team_name: isTeam ? resolvedTeamName : null,
                  team_members: isTeam ? teamMembersStr : null,
                  gamer_tag: isTeam ? null : (reg.gamer_tag || null),
                  status: reg.status || 'registered',
                  registered_at: reg.registered_at || reg.registration_date || reg.created_at,
                  created_at: reg.created_at || reg.registered_at || reg.registration_date,
                  team_logo: resolvedTeamLogo,
                  checked_in_at: reg.checked_in_at || null, // CRITICAL: Include checked_in_at for check-in status
                  user: isTeam ? { username: '', full_name: null } : (profileMap[reg.user_id] || { username: 'User', full_name: null })
                };
              });

              // Update participant count
              setTournament(prev => prev ? {
                ...prev,
                current_participants: participants.length
              } : null);

              setParticipants(participants as Participant[]);
            }
          } catch (error) {
            console.error('[TournamentManage] Error updating participants from realtime:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_disputes',
          filter: `tournament_id=eq.${tournament.id}`
        },
        (payload) => {
          const status = payload.new?.status || payload.old?.status;
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New dispute received',
              description: payload.new?.title || 'A player raised a dispute.',
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: 'Dispute updated',
              description: `Status changed to ${String(status || '').replace('_', ' ')}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[TournamentManage] Cleaning up realtime subscriptions');
      tournamentChannel.unsubscribe();
    };
  }, [tournament?.id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', tournament.id);

      if (error) throw error;

      setTournament(prev => prev ? { ...prev, status: newStatus as any } : null);
      toast({
        title: 'Status Updated',
        description: `Tournament status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: `Failed to update status: ${(error as any)?.message || JSON.stringify(error) || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'upcoming': return 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
      case 'ongoing': return 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
      case 'completed': return 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      case 'cancelled': return 'border-gray-500';
      default: return 'border-white/10';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'upcoming': return 'text-purple-400';
      case 'ongoing': return 'text-red-400';
      case 'completed': return 'text-emerald-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  const handleDelete = async () => {
    if (!isOrganizer) {
      toast({
        title: 'Not allowed',
        description: 'Only the lead organizer can delete this tournament.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsDeleting(true);

      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from('tournaments')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', tournament?.id);

      if (error) throw error;

      toast({
        title: 'Tournament deleted',
        description: `${tournament?.name} has been moved to deleted tournaments. You can restore it within 7 days.`,
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

  const handleSaveCheckInSettings = async () => {
    if (!tournament?.id) return;
    setSavingCheckInSettings(true);
    try {
      const payload = {
        check_in_required: checkInRequiredSetting,
        auto_remove_unchecked: autoRemoveUncheckedSetting,
        check_in_deadline: checkInDeadlineSetting
          ? new Date(checkInDeadlineSetting).toISOString()
          : null,
      };

      const { error } = await supabase
        .from('tournaments')
        .update(payload)
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: 'Check-in settings updated',
        description: 'Players will now see the updated requirements.',
      });

      setTournament((prev) =>
        prev
          ? {
            ...prev,
            check_in_required: payload.check_in_required,
            auto_remove_unchecked: payload.auto_remove_unchecked,
            check_in_deadline: payload.check_in_deadline,
          }
          : prev
      );
    } catch (error: any) {
      console.error('Error saving check-in settings:', error);
      toast({
        title: 'Unable to update settings',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSavingCheckInSettings(false);
    }
  };

  const handleRemoveUncheckedParticipants = async () => {
    if (!tournament?.id) return;
    setRemovingUnchecked(true);
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .update({ status: 'cancelled' })
        .eq('tournament_id', tournament.id)
        .is('checked_in_at', null)
        .in('status', ['pending', 'approved', 'registered'])
        .select('id');

      if (error) throw error;
      const removedCount = data?.length || 0;

      toast({
        title: 'Unchecked teams removed',
        description:
          removedCount > 0
            ? `${removedCount} registrations were removed for missing check-in.`
            : 'No unchecked teams remained.',
      });

      fetchTournamentData();
    } catch (error: any) {
      console.error('Error removing unchecked participants:', error);
      toast({
        title: 'Unable to remove teams',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setRemovingUnchecked(false);
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
                    (profsTok || []).forEach((p: any) => mapTok.set(p.id, p.gamer_tag || p.username || p.full_name || `player_${String(p.id).substring(0, 8)}`));
                    regTeamMembers = ids.map((id: string) => mapTok.get(id) || `player_${String(id).substring(0, 8)}`);
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
      } catch { }
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
        (rows || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0, 8)}`);

      // Step 0: Check if participant already has resolved readable member names (from fetchTournamentData loop)
      if (p.team_members && typeof p.team_members === 'string' && p.team_members.trim().length > 0) {
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
      const safeTeamMembers = typeof p.team_members === 'string' ? p.team_members : '';
      setTeamModalData({ id: p.team_id || null, name: p.team_name || 'Team', logo: (p as any).team_logo || null, members: safeTeamMembers.split(',').map(s => s.trim()).filter(Boolean) });
      setTeamModalOpen(true);
    }
  };

  // Ban participant (delete registration from DB)
  const handleBan = async (participantId: string, userId: string) => {
    try {
      if (!tournament?.id) {
        toast({ title: 'Error', description: 'Tournament not found.', variant: 'destructive' });
        return;
      }

      // Get participant info to determine if it's a user or team ban (BEFORE deleting)
      const { data: participant, error: participantError } = await supabase
        .from('tournament_participants')
        .select('user_id, team_id')
        .eq('id', participantId)
        .maybeSingle();

      if (participantError) {
        console.error('Error fetching participant:', participantError);
        throw participantError;
      }

      if (!participant) {
        toast({ title: 'Error', description: 'Participant not found.', variant: 'destructive' });
        return;
      }

      // Prepare ban data
      const banData: any = {
        tournament_id: tournament.id,
        participant_id: participantId,
        ban_reason: banReason.trim(),
        banned_by: user?.id,
        banned_at: new Date().toISOString(),
        is_active: true,
      };

      // Determine user_id OR team_id for the ban
      // Try to set only one (check constraint requires exactly one)
      // If database schema has user_id as NOT NULL, we'll get an error and need to run migration
      if (participant.team_id) {
        // Team ban - set only team_id (correct approach per schema)
        banData.team_id = participant.team_id;
        // Do NOT set user_id - this will fail if user_id is NOT NULL, requiring migration
      } else if (participant.user_id) {
        // Solo participant ban - set only user_id
        banData.user_id = participant.user_id;
      } else {
        // Fallback: use provided userId
        if (!userId) {
          toast({
            title: 'Error',
            description: 'Cannot determine user ID for ban.',
            variant: 'destructive'
          });
          return;
        }
        banData.user_id = userId;
      }

      // Insert ban first (in case deletion fails, we still have the ban record)
      const { error: banError } = await supabase
        .from('tournament_bans')
        .insert(banData);

      if (banError) {
        console.error('Error inserting ban:', banError);
        throw banError;
      }

      // Remove registration
      const { error: deleteError } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('id', participantId);

      if (deleteError) {
        console.error('Error deleting participant:', deleteError);
        // Ban was inserted, but deletion failed - log error but don't fail completely
        toast({
          title: 'Warning',
          description: 'Participant was banned but registration removal failed. Please refresh.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Banned', description: 'Participant has been banned from this tournament.' });
      }

      setBanDialogOpen(false);
      setBanReason('');
      setBanTarget(null);
      fetchTournamentData(); // Refresh participants
    } catch (error: any) {
      console.error('Error banning participant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to ban participant.',
        variant: 'destructive'
      });
    }
  };

  // Helper: next power of two
  const nextPowerOfTwo = (n: number) => {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  };

  // Update validateMatches for custom bracket structure
  const validateMatches = (matches: any[]) => {
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
  };

  // Update BracketTeam type to allow team_name (for normalization)
  // If BracketTeam is imported, add a local type override here:
  type BracketTeamWithName = BracketTeam & { team_name?: string };

  const generateCustomBracketMatches = (teams: BracketTeamWithName[]): BracketMatch[] => {
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
  };

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
                      <GamepadIcon className="w-4 h-4 text-emerald-400" />
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
                      <GamepadIcon className="w-4 h-4 text-emerald-400" />
                    </span>
                  )}
                  <span className="font-semibold text-white text-sm truncate max-w-[80px]">{getTeamDisplayName(visitor)}</span>
                </div>
              </div>
              <div className="text-xs text-emerald-300 font-bold mb-1">{round}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-gaming-dark border border-emerald-400/40 rounded-lg shadow-lg p-3">
            <div className="mb-1 text-emerald-300 font-bold">{round}</div>
            <div className="flex items-center gap-2 mb-1">
              {home.logo ? (
                <img src={home.logo} alt={getTeamDisplayName(home)} className="w-5 h-5 rounded bg-white border border-gray-300" />
              ) : (
                <GamepadIcon className="w-4 h-4 text-emerald-400" />
              )}
              <span className="font-semibold text-white text-xs">{getTeamDisplayName(home)}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              {visitor.logo ? (
                <img src={visitor.logo} alt={getTeamDisplayName(visitor)} className="w-5 h-5 rounded bg-white border border-gray-300" />
              ) : (
                <GamepadIcon className="w-4 h-4 text-emerald-400" />
              )}
              <span className="font-semibold text-white text-xs">{getTeamDisplayName(visitor)}</span>
            </div>
          </TooltipContent>
        </UITooltip>
      </TooltipProvider>
    );
  };

  // Update BracketSVGStyle for more aggressive SVG and parent container overrides
  const BracketSVGStyle = () => {
    return (
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
  };

  // Add a blurred background and animated border/glow
  const BracketPremiumOverlay = () => {
    return (
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
  };

  const formatCountdown = useCallback((ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, []);

  const effectiveCheckInRequired = checkInRequiredSetting;
  const effectiveDeadlineMs = checkInDeadlineSetting
    ? new Date(checkInDeadlineSetting).getTime()
    : tournament?.check_in_deadline
      ? new Date(tournament.check_in_deadline).getTime()
      : null;

  const teamParticipants = useMemo(
    () => participants.filter((p) => p.participant_type === 'team'),
    [participants]
  );
  const checkedInTeams = useMemo(
    () => teamParticipants.filter((p) => Boolean(p.checked_in_at)),
    [teamParticipants]
  );
  const pendingTeams = Math.max(0, teamParticipants.length - checkedInTeams.length);
  const checkInProgress = teamParticipants.length
    ? Math.round((checkedInTeams.length / teamParticipants.length) * 100)
    : 0;
  const isCheckInClosed = effectiveDeadlineMs ? now > effectiveDeadlineMs : false;
  const checkInCountdown =
    effectiveDeadlineMs && !isCheckInClosed
      ? formatCountdown(effectiveDeadlineMs - now)
      : null;
  const showCheckInSummary = Boolean(effectiveCheckInRequired && teamParticipants.length > 0);
  const pendingDisplayTeams = teamParticipants.filter((p) => !p.checked_in_at).slice(0, 4);

  const staffPermissionSummary =
    staffPermissions.map((perm) => STAFF_PERMISSION_LABELS[perm] || perm).join(', ') || 'Limited access';

  const canManageStaff = isOrganizer;
  const canAssistDisputes = isOrganizer || staffPermissions.includes('disputes:assist');
  const canManageTeams = isOrganizer || staffPermissions.includes('teams:manage');
  const canEditBracket = isOrganizer || staffPermissions.includes('bracket:edit');

  const PermissionNotice = ({ message }: { message: string }) => (
    <Card className="bg-[#080d18] border border-white/5">
      <CardContent className="py-6 text-center text-gray-400 text-sm">{message}</CardContent>
    </Card>
  );

  const renderCheckInBadge = (participant: Participant) => {
    if (!effectiveCheckInRequired) return null;
    if (participant.checked_in_at) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-green-500/40 bg-green-500/10 text-green-300">
          Checked In
        </span>
      );
    }
    if (isCheckInClosed) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-red-500/40 bg-red-500/10 text-red-300">
          Missed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-amber-400/40 bg-amber-500/10 text-amber-200">
        Awaiting
      </span>
    );
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          {hasStaffAccess && (
            <div className="mb-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-sm text-cyan-100 px-4 py-3">
              You are viewing this tournament as approved staff. Available permissions:{' '}
              {staffPermissionSummary}.
            </div>
          )}
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
              className="bg-red-600 hover:bg-red-500"
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
        {hasStaffAccess && (
          <div className="mb-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-sm text-cyan-100 px-4 py-3">
            You are viewing this tournament as approved staff. Available permissions: {staffPermissionSummary}.
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Game Logo */}
            {gameLogo ? (
              <img src={gameLogo} alt={tournament.game + ' logo'} className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border border-gray-700 bg-transparent flex-shrink-0" />
            ) : (
              <span className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded bg-gray-800 border border-gray-700 flex-shrink-0">
                <GamepadIcon className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{tournament.name}</h1>
              <p className="text-gray-400 flex items-center gap-2 flex-wrap text-sm sm:text-base">
                {tournament.game}
                {/* Game Format */}
                {(() => {
                  const gameInfo = esportsGames.games.find(g => g.name.toLowerCase() === tournament.game.toLowerCase());
                  const format = gameInfo?.formats.find(f => f.teamSize === tournament.team_size);
                  return format ? (
                    <span className="px-2 py-1 bg-gaming-gray/30 rounded text-xs font-semibold text-emerald-300">{format.name}</span>
                  ) : null;
                })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={() => navigate(`/organizer/tournament/${slug}/edit`)}
              className="bg-yellow-500 hover:bg-yellow-600 text-xs sm:text-sm px-2 sm:px-4"
              size="sm"
            >
              <Edit2 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Edit</span>
            </Button>
            <Button variant="destructive" size="sm" className="text-xs sm:text-sm px-2 sm:px-4" onClick={async () => {
              // Check cascade effects before showing modal
              try {
                const warnings = [];
                if (tournament?.current_participants && tournament.current_participants > 0) {
                  warnings.push({
                    entity: 'participant',
                    count: tournament.current_participants,
                    description: 'will be removed from this tournament'
                  });
                }
                setCascadeWarnings(warnings);
                setDeleteModalOpen(true);
              } catch (error) {
                console.error('Error checking cascade effects:', error);
              }
            }}>
              <Trash2 className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Delete</span>
            </Button>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
              isOpen={deleteModalOpen}
              onClose={() => {
                setDeleteModalOpen(false);
                setCascadeWarnings([]);
              }}
              onConfirm={handleDelete}
              entityType="tournament"
              entityName={tournament?.name || 'Tournament'}
              isDeleting={isDeleting}
              cascadeWarnings={cascadeWarnings}
              requireNameConfirmation={cascadeWarnings.length > 0 || tournament?.status !== 'upcoming'}
              customWarning={
                tournament?.status === 'ongoing'
                  ? 'This tournament is currently ongoing. Deleting it will affect all participants.'
                  : tournament?.status === 'completed'
                    ? 'This tournament is completed. All historical data will be preserved but hidden.'
                    : undefined
              }
            />
          </div>
        </div>

        {/* Premium Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
          {/* Prize Pool Card */}
          <div className="relative group">
            <Card whileHover={{ y: 0 }} className="relative glass-premium rounded-2xl overflow-hidden transition-all duration-300 border-2 border-white/5 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-sm text-gray-400 font-medium uppercase tracking-wider">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  Prize Pool
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {tournament.prize_pool}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Participants Card */}
          <div className="relative group">
            <Card whileHover={{ y: 0 }} className="relative glass-premium rounded-2xl overflow-hidden transition-all duration-300 border-2 border-white/5 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-sm text-gray-400 font-medium uppercase tracking-wider">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  <span className="text-white">{tournament.current_participants}</span>
                  <span className="text-gray-600 mx-1">/</span>
                  <span className="text-gray-500">{tournament.max_participants}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Card */}
          <div className="relative group sm:col-span-2 lg:col-span-1">
            <Card whileHover={{ y: 0 }} className={cn("relative glass-premium rounded-2xl overflow-hidden transition-all duration-300 border-2", getStatusColor(tournament.status))}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-sm text-gray-400 font-medium uppercase tracking-wider">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select
                  value={tournament.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className={cn("border-0 bg-transparent p-0 h-auto text-2xl sm:text-3xl font-bold focus:ring-0 transition-colors duration-300", getStatusTextColor(tournament.status))}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open" className="text-purple-400 focus:text-purple-400">Upcoming</SelectItem>
                    <SelectItem value="ongoing" className="text-red-400 focus:text-red-400">Ongoing (Live)</SelectItem>
                    <SelectItem value="completed" className="text-emerald-400 focus:text-emerald-400">Completed</SelectItem>
                    <SelectItem value="cancelled" className="text-gray-400 focus:text-gray-400">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Premium Tab Navigation */}
          <div className="mb-6">
            <TabsList className="w-full flex-nowrap justify-start sm:justify-center p-1.5 bg-black/50 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden">
              <TabsTrigger
                value="overview"
                className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="participants"
                className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
              >
                Participants
              </TabsTrigger>
              <TabsTrigger
                value="stages"
                className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
              >
                Stages
              </TabsTrigger>
              {matchCount > 0 && (
                <button
                  onClick={() => navigate(`/tournaments/${slug}/brackets`)}
                  disabled={!canEditBracket}
                  className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Brackets
                </button>
              )}
              <TabsTrigger
                value="bans"
                disabled={!canManageTeams}
                className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
              >
                Bans
              </TabsTrigger>
              <TabsTrigger
                value="disputes"
                disabled={!canAssistDisputes}
                className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
              >
                Disputes
              </TabsTrigger>
              {canManageStaff && (
                <TabsTrigger
                  value="staff"
                  className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
                >
                  Staff
                </TabsTrigger>
              )}
              <TabsTrigger
                value="settings"
                disabled={!isOrganizer}
                className="text-xs sm:text-sm whitespace-nowrap px-4 py-2.5 rounded-xl data-[state=active]:bg-white/10 data-[state=active]:border data-[state=active]:border-white/20 data-[state=active]:text-white transition-all duration-300"
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <Card whileHover={{ y: 0 }} className="glass-premium rounded-2xl border-0 mb-6">
              <CardHeader className="pb-4 border-b border-white/5">
                <CardTitle className="text-lg font-semibold text-white">Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Tournament Name & Description */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-3">{tournament.name}</h2>
                  <p className="text-gray-400 leading-relaxed">{tournament.description || 'No description provided.'}</p>
                </div>

                {/* Info Grid - Row 1 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Date & Time</span>
                    <span className="block text-sm font-medium text-white">{tournament.date} at {tournament.time}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Venue</span>
                    <span className="block text-sm font-medium text-white">{tournament.venue || 'Online'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Entry Fee</span>
                    <span className="block text-sm font-medium text-white">{tournament.entry_fee || 'Free'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Format</span>
                    <span className="block text-sm font-medium text-white">{tournament.is_online ? 'Online' : 'LAN'}</span>
                  </div>
                </div>

                {/* Info Grid - Row 2 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Participants</span>
                    <span className="text-lg font-bold text-white">
                      {tournament.current_participants} / {tournament.max_participants}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Teams Registered</span>
                    <span className="text-lg font-bold text-white">
                      {participants.filter(p => p.participant_type === 'team').length}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Solo Players</span>
                    <span className="text-lg font-bold text-white">
                      {participants.filter(p => p.participant_type === 'solo').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stages">
            <StageManagementTab
              tournamentId={tournament.id}
              stages={stages}
              onUpdate={() => fetchTournamentData()}
              game={tournament.game || ''}
            />
          </TabsContent>

          <TabsContent value="participants">
            {showCheckInSummary && (
              <Card className="glass-premium rounded-2xl border-0 mb-6">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">Check-In Monitor</CardTitle>
                    <p className="text-xs text-slate-400 mt-1">
                      {tournament.check_in_deadline
                        ? `Deadline: ${new Date(tournament.check_in_deadline).toLocaleString()}`
                        : 'Deadline not set'}
                      {checkInCountdown && ` · ${checkInCountdown} left`}
                    </p>
                  </div>
                  <Badge
                    className={`text-xs ${isCheckInClosed
                      ? 'bg-red-500/10 text-red-200 border-red-500/40'
                      : checkInProgress === 100
                        ? 'bg-green-500/10 text-green-200 border-green-500/40'
                        : 'bg-amber-500/10 text-amber-200 border-amber-500/40'
                      }`}
                  >
                    {isCheckInClosed
                      ? 'Closed'
                      : checkInProgress === 100
                        ? 'Ready'
                        : 'Open'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Total Teams</p>
                      <p className="text-2xl font-bold text-white mt-1">{teamParticipants.length}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Checked In</p>
                      <p className="text-2xl font-bold text-green-400 mt-1">{checkedInTeams.length}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-xs uppercase tracking-widest text-slate-400">Pending</p>
                      <p className="text-2xl font-bold text-amber-300 mt-1">{Math.max(0, pendingTeams)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Progress</span>
                      <span>{checkInProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, checkInProgress)}%` }}
                      />
                    </div>
                  </div>
                  {pendingTeams > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Waiting on</p>
                      <div className="flex flex-wrap gap-2">
                        {pendingDisplayTeams.map((team) => (
                          <span
                            key={team.id}
                            className="text-xs px-3 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-200"
                          >
                            {team.team_name || 'Team'}
                          </span>
                        ))}
                        {pendingTeams > pendingDisplayTeams.length && (
                          <span className="text-xs text-slate-400">
                            +{pendingTeams - pendingDisplayTeams.length} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {isOrganizer && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <Button
                        onClick={handleRemoveUncheckedParticipants}
                        disabled={pendingTeams <= 0 || removingUnchecked}
                        className="bg-red-600 hover:bg-red-500 text-white w-full sm:w-auto"
                      >
                        {removingUnchecked ? 'Clearing...' : 'Remove unchecked teams'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fetchTournamentData(undefined)}
                        className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto"
                      >
                        Refresh statuses
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="glass-premium rounded-2xl border-0">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-lg font-semibold text-white">Teams</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {participants.filter(p => p.participant_type === 'team').length === 0 ? (
                  <p className="text-gray-400">No teams registered yet.</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border border-white/5">
                      <table className="min-w-full text-white">
                        <thead className="bg-white/[0.02]">
                          <tr>
                            <th className="py-4 px-5 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Logo</th>
                            <th className="py-4 px-5 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Team Name</th>
                            <th className="py-4 px-5 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">Registered</th>
                            <th className="py-4 px-5 text-right text-xs uppercase tracking-wider text-gray-500 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {participants
                            .filter(p => p.participant_type === 'team')
                            .map((participant) => (
                              <tr key={participant.id} className="border-t border-gaming-gray/30 hover:bg-gaming-gray/10 cursor-pointer transition-colors"
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
                                            (prows || []).forEach((p: any) => mapTok.set(p.id, p.gamer_tag || p.username || p.full_name || `player_${String(p.id).substring(0, 8)}`));
                                            namesResolved = tokens.map(id => mapTok.get(id) || `player_${String(id).substring(0, 8)}`);
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
                                      names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0, 8)}`);
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
                                        names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0, 8)}`);
                                        console.log('Row onClick: Resolved members from inferred roster_id:', pickedRosterId, 'names:', names);
                                      }
                                    }

                                    // Step 4: Fallback to organization-wide members (legacy)
                                    if (names.length === 0 && teamId) {
                                      const { data: roster } = await supabase.rpc('get_team_roster', { t_id: teamId });
                                      names = (roster || []).map((r: any) => r.username || r.full_name || `player_${String(r.user_id).substring(0, 8)}`);
                                      if (names.length === 0 && ownerId) {
                                        const { data: ownerProfile } = await supabase
                                          .from('profiles')
                                          .select('id, username, full_name')
                                          .eq('id', ownerId)
                                          .maybeSingle();
                                        const ownerName = ownerProfile?.username || ownerProfile?.full_name || `player_${String(ownerId).substring(0, 8)}`;
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
                                      (profsTok || []).forEach((p: any) => mapTok.set(p.id, p.username || p.full_name || `player_${String(p.id).substring(0, 8)}`));
                                      names = rawTokens.map(id => mapTok.get(id) || `player_${String(id).substring(0, 8)}`);
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
                                <td className="py-3 px-4">
                                  {participant.team_logo ? (
                                    <img src={participant.team_logo} alt={participant.team_name || 'team'} className="w-10 h-10 rounded-lg object-contain" />
                                  ) : (
                                    <span className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 text-sm font-semibold text-gray-400">
                                      {(participant.team_name || 'T')[0]}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-semibold">{participant.team_name}</td>
                                <td className="py-3 px-4 text-sm text-gray-400">
                                  {new Date(participant.created_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                  {tournament.check_in_required && (
                                    <div className="mt-1">
                                      {renderCheckInBadge(participant) || (
                                        <span className="text-xs text-slate-500">Pending</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button size="sm" variant="secondary" className="text-xs"
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
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      <BanIcon className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Ban</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {participants
                        .filter(p => p.participant_type === 'team')
                        .map((participant) => {
                          // Parse team members for display
                          const rawTokens = participant.team_members ? participant.team_members.split(',').map(s => s.trim()).filter(Boolean) : [];
                          const looksLikeUuid = (s: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
                          const tokensAreIds = rawTokens.some(t => looksLikeUuid(t));
                          const displayMembers = rawTokens.length > 0 && !tokensAreIds ? rawTokens : [];

                          const handleOpenDialog = async () => {
                            setSelectedTeam(participant);
                            setTeamLoading(true);
                            setTeamCaptain(null);

                            // First, try to use the already-parsed members from display
                            if (displayMembers.length > 0) {
                              setSelectedTeamMembers(displayMembers);
                              setTeamLoading(false);
                              setTeamDialogOpen(true);
                              return;
                            }

                            // Otherwise, try to resolve from database
                            try {
                              let teamId = participant.team_id as string | null;
                              let ownerId: string | null = null;
                              let logoUrl: string | null = participant.team_logo || null;

                              if (!teamId && participant.team_name) {
                                const exact = await supabase
                                  .from('teams')
                                  .select('id, owner_id, logo_url')
                                  .eq('name', participant.team_name || '')
                                  .maybeSingle();
                                if (exact.data) {
                                  teamId = exact.data.id;
                                  ownerId = exact.data.owner_id;
                                  logoUrl = logoUrl || exact.data.logo_url || null;
                                }
                              }

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
                                }
                              }

                              // Fallback: use raw tokens if available
                              if (rawTokens.length > 0) {
                                setSelectedTeamMembers(rawTokens);
                              } else {
                                setSelectedTeamMembers([]);
                              }
                            } catch (error) {
                              console.error('Error loading team members:', error);
                              setSelectedTeamMembers([]);
                            } finally {
                              setTeamLoading(false);
                            }

                            setTeamDialogOpen(true);
                          };

                          return (
                            <div
                              key={participant.id}
                              className="bg-gaming-dark border border-gaming-gray/30 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3 hover:border-emerald-400/40 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 sm:gap-3">
                                {participant.team_logo ? (
                                  <img src={participant.team_logo} alt={participant.team_name || 'team'} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-contain flex-shrink-0" />
                                ) : (
                                  <span className="w-12 h-12 sm:w-14 sm:h-14 inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 text-sm sm:text-base font-semibold text-gray-400 flex-shrink-0">
                                    {(participant.team_name || 'T')[0]}
                                  </span>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-white text-sm sm:text-base truncate">{participant.team_name}</h4>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(participant.created_at).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </p>
                                  {tournament.check_in_required && (
                                    <div className="mt-1">
                                      {renderCheckInBadge(participant) || (
                                        <span className="text-xs text-slate-500">Awaiting check-in</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Team Members Section */}
                              {displayMembers.length > 0 && (
                                <div className="pt-2 border-t border-gaming-gray/30">
                                  <p className="text-xs text-gray-400 mb-1.5 font-medium">Members ({displayMembers.length}):</p>
                                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                    {displayMembers.map((member, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs text-gray-300 bg-gaming-gray/20 border border-gaming-gray/40"
                                      >
                                        {member}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-2 border-t border-gaming-gray/30">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="flex-1 text-xs h-8 sm:h-9"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDialog();
                                  }}
                                >
                                  Manage
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 text-xs h-8 sm:h-9 flex items-center justify-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBanDialogOpen(true);
                                    setBanTarget({ id: participant.id, userId: participant.user_id });
                                  }}
                                >
                                  <BanIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  <span className="hidden xs:inline">Ban</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
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
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-2 font-medium">Players</div>
                    {teamLoading ? (
                      <div className="text-sm text-gray-400">Loading roster…</div>
                    ) : selectedTeamMembers.length === 0 ? (
                      <div className="text-sm text-gray-400">No members found</div>
                    ) : (
                      <div className="space-y-2">
                        {teamCaptain && (
                          <div className="text-sm text-emerald-300 font-medium mb-2">Captain: {teamCaptain}</div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {selectedTeamMembers.map((m, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-3 py-1.5 rounded-md bg-gaming-gray/20 text-sm text-gray-200 border border-gaming-gray/40"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gaming-gray/30">
                    <Button variant="destructive" onClick={() => { setBanDialogOpen(true); setBanTarget({ id: selectedTeam?.id!, userId: selectedTeam?.user_id! }); setTeamDialogOpen(false); }}>Ban Team</Button>
                    <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>Close</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>


          <TabsContent value="bans">
            {!canManageTeams ? (
              <PermissionNotice message="Only organizers or staff with team management permissions can manage bans." />
            ) : (
              tournament?.id && (
                <BanManagement tournamentId={tournament.id} />
              )
            )}
          </TabsContent>

          <TabsContent value="disputes">
            {!canAssistDisputes ? (
              <PermissionNotice message="Your staff role does not include dispute assistance permissions." />
            ) : (
              tournament?.id && user?.id && (
                <DisputeCenter
                  tournamentId={tournament.id}
                  organizerId={tournament.organizer_id}
                  currentUserId={user.id}
                />
              )
            )}
          </TabsContent>

          {canManageStaff && (
            <TabsContent value="staff">
              {tournament?.id && user?.id ? (
                <TournamentStaffManager tournamentId={tournament.id} organizerId={user.id} />
              ) : (
                <Card className="glass-premium rounded-2xl border-0">
                  <CardContent className="text-sm text-gray-400 py-6">
                    Sign in to assign moderators to this tournament.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}


          <TabsContent value="settings">
            {!isOrganizer ? (
              <PermissionNotice message="Tournament settings are available only to the organizer." />
            ) : (
              <>
                <Card className="glass-premium rounded-2xl border-0">
                  <CardHeader className="border-b border-white/5">
                    <CardTitle className="text-lg font-semibold text-white">Check-In Requirements</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div>
                        <p className="font-semibold text-white">Require check-in</p>
                        <p className="text-sm text-gray-400">
                          Force captains to confirm attendance before brackets are generated.
                        </p>
                      </div>
                      <Switch
                        checked={checkInRequiredSetting}
                        onCheckedChange={setCheckInRequiredSetting}
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Check-in deadline</label>
                      <input
                        type="datetime-local"
                        value={checkInDeadlineSetting}
                        onChange={(e) => setCheckInDeadlineSetting(e.target.value)}
                        disabled={!checkInRequiredSetting}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white disabled:opacity-50 focus:border-white/30 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Players will see the deadline in their tournament view with a live countdown.
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div>
                        <p className="font-semibold text-white">Auto-remove no-shows</p>
                        <p className="text-sm text-gray-400">
                          Automatically mark unchecked teams as cancelled after the deadline.
                        </p>
                      </div>
                      <Switch
                        checked={autoRemoveUncheckedSetting}
                        onCheckedChange={setAutoRemoveUncheckedSetting}
                        disabled={!checkInRequiredSetting}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        onClick={handleSaveCheckInSettings}
                        disabled={savingCheckInSettings}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 w-full sm:w-auto"
                      >
                        {savingCheckInSettings ? 'Saving...' : 'Save Settings'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleRemoveUncheckedParticipants}
                        disabled={removingUnchecked || !checkInRequiredSetting}
                        className="w-full sm:w-auto"
                      >
                        {removingUnchecked ? 'Removing...' : 'Remove Unchecked Teams'}
                      </Button>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-gray-400 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <AlertTriangle className="w-4 h-4 text-gray-400 mt-0.5" />
                      Participants who miss check-in will be set to &quot;Cancelled&quot; and lose their spot.
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main >
      <Footer />
      {
        banDialogOpen && (
          <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
            <AlertDialogContent className="bg-[#12121a] border-white/10 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Ban Participant</AlertDialogTitle>
                <AlertDialogDescription className="text-white/70">
                  Are you sure you want to ban this participant? This will remove their registration and prevent them from joining this tournament again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="my-4">
                <label className="block mb-2 font-semibold text-white">Ban Reason (required)</label>
                <input
                  className="w-full p-2.5 rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  placeholder="Enter reason for ban..."
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBanDialogOpen(false)} className="border-white/20 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!banReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => banTarget && handleBan(banTarget.id, banTarget.userId)}
                >
                  Ban
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      }
    </div >
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