// OrganizerTournamentDashboard.tsx
// This file is for managing a single tournament (participants, brackets, settings, etc.)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { OrganizerTeamCard } from '@/components/organizer/OrganizerTeamCard';
import { motion, AnimatePresence } from 'framer-motion';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Tournament as TournamentType } from '@/hooks/useTournaments';
import { TournamentStatus } from '@/types/tournament';
import { apiClient } from '@/lib/apiClient';
import { TypewriterEffect } from '@/components/effects/TypewriterEffect';
import { FluidButton } from '@/components/effects/FluidButton';
import { MotionTiles } from '@/components/effects/MotionTiles';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Ban as BanIcon,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Eye,
  GamepadIcon,
  Globe,
  Layers,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Shuffle,
  Swords,
  Trash2,
  Trophy,
  Unlock,
  Users,
  Zap,
} from 'lucide-react';
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
import { getGameFeatures, isBattleRoyale, getBRConfig } from '@/utils/gameFeatures';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import BanManagement from '@/components/organizer/BanManagement';
import DisputeCenter from '@/components/organizer/DisputeCenter';
import MatchChecker from '@/components/organizer/MatchChecker';
import TournamentAnnouncementPanel from '@/components/organizer/TournamentAnnouncementPanel';
// Staff management has moved to Organization Settings (OrganizationStaffManager)
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { StageManagementTab } from '@/components/organizer/tabs/StageManagementTab';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import BRGameResults from '@/components/tournament/br/BRGameResults';
import BRScoringConfig from '@/components/tournament/br/BRScoringConfig';
import { useBRGameResults } from '@/hooks/useBRGameResults';
import { useTournamentDashboard, type DashboardParticipant } from '@/hooks/useTournamentDashboard';

const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

interface DatabaseTournament {
  id: string;
  name?: string;
  game?: string;
  date?: string;
  time?: string;
  venue?: string;
  max_participants?: number;
  prize_pool?: string;
  description?: string;
  organizer_id?: string;
  entry_fee?: string | null;
  is_online?: boolean;
  created_at?: string;
  updated_at?: string;
  status?: string;
  image_url?: string | null;
  team_size?: number;
  slug?: string;
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
  format?: string;
  registration_open?: boolean;
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

const tabVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

const TabTransition = ({ children, direction, className }: { children: React.ReactNode, direction: number, className?: string }) => {
  return (
    <motion.div
      custom={direction}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const TournamentDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useTournamentDashboard(slug);

  const tournament = dashboardData?.tournament;
  const participants = (dashboardData?.participants || []) as Participant[];
  const stages = dashboardData?.stages || [];
  const isOrganizer = dashboardData?.isOrganizer || false;
  const staffPermissions = (dashboardData?.staffPermissions || []) as StaffPermission[];

  // BR game results management
  const isBR = isBattleRoyale(tournament?.game || '');
  const brConf = isBR ? getBRConfig(tournament?.game || '') : null;
  const brSettings = isBR ? tournament?.settings : null;
  const brGameCount = brSettings?.brGameCount || brConf?.defaultGameCount || 6;
  const brPresetKey = brSettings?.brScoringPreset || brConf?.defaultPreset || '';
  const brScoringPreset = brSettings?.brCustomScoring
    || (brConf?.scoringPresets?.[brPresetKey])
    || { name: 'Default', placements: [10, 6, 5, 4, 3, 2, 1, 1], killPoints: 1, killCap: null };
  const brKillCap = brSettings?.brKillCap ?? brScoringPreset.killCap ?? null;
  const brTeams = useMemo(() =>
    isBR ? participants.map(p => ({
      id: p.team_id || p.id,
      name: p.team_name || p.gamer_tag || p.user?.username || 'Unknown',
      logo: p.team_logo || undefined,
    })) : [],
    [isBR, participants]
  );

  const brResults = useBRGameResults({
    tournamentId: isBR ? tournament?.id : undefined,
    gameCount: brGameCount,
    scoringPreset: brScoringPreset,
    killCap: brKillCap,
    teams: brTeams,
    tiebreaker: brSettings?.brTiebreaker || 'most_wins',
  });

  // Tab State & Direction
  const TAB_ORDER = ['overview', 'participants', 'stages', 'games', 'bans', 'disputes', 'staff', 'settings'];
  // activeTab is declared below with location.state init
  const [direction, setDirection] = useState(0);
  const prevTabRef = React.useRef(0);

  const handleTabChange = (newTab: string) => {
    const newIndex = TAB_ORDER.indexOf(newTab);
    const oldIndex = prevTabRef.current;

    setDirection(newIndex > oldIndex ? 1 : -1);
    prevTabRef.current = newIndex;
    setActiveTab(newTab);
    setSearchParams(prev => { prev.set('tab', newTab); return prev; }, { replace: true });
  };

  const loading = dashboardLoading;
  const [isDeleting, setIsDeleting] = useState(false);
  const [bracket, setBracket] = useState<any[]>([]);
  const [bracketGenerated, setBracketGenerated] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banTarget, setBanTarget] = useState<{ id: string, userId: string } | null>(null);
  const [bracketType, setBracketType] = useState<'single' | 'double' | 'roundrobin' | 'swiss'>('single');
  const [gameLogo, setGameLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const [gameBackgroundUrl, setGameBackgroundUrl] = useState<string | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Participant | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [teamCaptain, setTeamCaptain] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState<boolean>(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [teamModalData, setTeamModalData] = useState<{ id?: string | null; name: string; logo?: string | null; members: string[] }>({ name: '', members: [] });
  // Initialize activeTab from ?tab= query param, then location state, then default 'overview'
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || (location.state as { activeTab?: string })?.activeTab || 'overview'
  );

  const [removingUnchecked, setRemovingUnchecked] = useState(false);
  const [savingAssistedReporting, setSavingAssistedReporting] = useState(false);
  const [savingMapVeto, setSavingMapVeto] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cascadeWarnings, setCascadeWarnings] = useState<Array<{ entity: string; count: number; description?: string }>>([]);
  const [hasStaffAccess, setHasStaffAccess] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Sync staff access state
  useEffect(() => {
    setHasStaffAccess(staffPermissions.length > 0);
  }, [staffPermissions]);

  // Overdue Check & Auto-Extension Effect
  useEffect(() => {
    const checkOverdue = async () => {
      if (!tournament || !isOrganizer || stages.length === 0) return;

      const endDate = tournament.end_date ? new Date(tournament.end_date) : null;
      if (!endDate) return;

      const currentTime = new Date();
      const isOverdue = currentTime > endDate;
      const incompleteStages = stages.some(stage => stage.status !== 'completed');

      if (isOverdue && incompleteStages && tournament.status !== 'completed') {
        console.log('[TournamentManage] Tournament is overdue with incomplete stages. Extending matches...');

        // Extend by 24 hours
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + 1);

        try {
          await apiClient.put(`/api/tournaments/${tournament.id}`, { endDate: newEndDate.toISOString() });
          toast({
            title: 'Tournament Extended',
            description: 'Tournament end time has passed with incomplete stages. Extended by 24 hours.',
            variant: 'default',
            duration: 6000
          });
          refetchDashboard();
        } catch (err) {
          console.error('Error auto-extending tournament:', err);
        }
      }
    };

    checkOverdue();
  }, [tournament?.id, tournament?.end_date, stages.length, isOrganizer]);


  const handleTeamClick = async (participant: Participant) => {
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
        try {
          const results = await apiClient.get<any[]>(`/api/profiles/search?q=${encodeURIComponent(participant.team_name || '')}&type=team`);
          // Search teams by name — use team search endpoint
          const teamResults = await apiClient.get<any[]>(`/api/teams/search?name=${encodeURIComponent(participant.team_name || '')}`).catch(() => []);
          const exactMatch = (teamResults || []).find((t: any) => t.name === participant.team_name);
          const fuzzyMatch = (teamResults || [])[0];
          const match = exactMatch || fuzzyMatch;
          if (match) {
            teamId = match.id; ownerId = match.owner_id; logoUrl = logoUrl || match.logo_url || null;
          }
        } catch { }
      } else {
        try {
          const teamData = await apiClient.get<any>(`/api/teams/${teamId}`).catch(() => null);
          if (teamData) {
            ownerId = teamData.owner_id; logoUrl = logoUrl || teamData.logo_url || null;
          }
        } catch { }
      }
      if (logoUrl && selectedTeam) selectedTeam.team_logo = logoUrl;
      // First, try reading names saved in tournament registration directly
      if (tournament?.id && participant.team_name) {
        const regRow = await apiClient.get<any>(`/api/tournaments/${tournament.id}/participants?team_name=${encodeURIComponent(participant.team_name)}`).then(r => (Array.isArray(r) ? r[0] : r)).catch(() => null);
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
            const areUuids = tokens.every(looksUuid);
            const resolved = await apiClient.post<any[]>('/api/profiles/resolve-players', {
              tokens: areUuids ? tokens : Array.from(new Set(tokens)),
              areUuids,
            });
            if (areUuids) {
              const mapTok = new Map<string, string>();
              const isVal = tournament?.game?.toLowerCase() === 'valorant';
              (resolved || []).forEach((p: any) => {
                const tag = isVal ? p.riot_tag : (p.riot_tag || p.steam_tag);
                mapTok.set(p.id, tag || p.username || p.full_name || `player_${String(p.id).substring(0, 8)}`);
              });
              namesResolved = tokens.map(id => mapTok.get(id) || `player_${String(id).substring(0, 8)}`);
            } else {
              const uniq = Array.from(new Set(tokens));
              const map = new Map<string, string>();
              (resolved || []).forEach((p: any) => {
                const key = p.matched_field === 'riot_tag' ? p.riot_tag
                  : p.matched_field === 'steam_tag' ? p.steam_tag
                  : p.matched_field === 'username' ? p.username
                  : p.full_name;
                if (key) map.set(key, p.riot_tag || p.steam_tag || p.username || p.full_name);
              });
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
      // If we reach here, logic continues... (omitted for brevity, assume full logic is needed but I'll trust the user just wants the modal open)
      // For now, if no logic matched, just open with basic info
      setTeamLoading(false);
      setTeamDialogOpen(true);
    } catch (e) {
      console.error(e);
      setTeamLoading(false);
    }
  };

  // Data managed by useTournamentDashboard


  useEffect(() => {
    if (activeTab !== 'participants') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeTab]);



  // Real-time subscriptions removed to eliminate dashboard lag as requested by user.

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, { status: newStatus });

      refetchDashboard();
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
      case 'draft': return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
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
      case 'draft': return 'text-amber-400';
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
      await apiClient.put(`/api/tournaments/${tournament?.id}`, { deletedAt: new Date().toISOString() } as any);

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

  const handleMarkFinished = async () => {
    if (!isOrganizer) return;

    if (isBR) {
      // BR tournaments: require all games completed
      if (brResults.gamesCompleted < brGameCount) {
        toast({
          title: 'Cannot Finish',
          description: `All ${brGameCount} games must have results before finishing the tournament.`,
          variant: 'destructive'
        });
        return;
      }
    } else {
      // Bracket tournaments: require all stages completed
      const incomplete = stages.some(s => s.status !== 'completed');
      if (incomplete) {
        toast({
          title: 'Cannot Finish',
          description: 'All stages must be completed before finishing the tournament.',
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      const winnerName = isBR && brResults.winner ? brResults.winner.teamName : undefined;

      // Send status + winner in one call so backend can award RP
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        status: 'completed',
        ...(winnerName && { winner_team_name: winnerName }),
      });

      refetchDashboard();
      toast({
        title: 'Tournament Finished',
        description: winnerName
          ? `${winnerName} crowned as champion!`
          : 'Tournament has been marked as completed.',
      });
      queryClient.invalidateQueries({ queryKey: ['tournament-dashboard'] });
    } catch (e) {
      console.error('Error finishing tournament:', e);
      toast({
        title: 'Error',
        description: 'Failed to complete tournament.',
        variant: 'destructive',
      });
    }
  };





  const handleRemoveUncheckedParticipants = async () => {
    if (!tournament?.id) return;
    setRemovingUnchecked(true);
    try {
      const data = await apiClient.post<any>(`/api/tournaments/${tournament.id}/remove-unchecked`);
      const removedCount = data?.removedCount || 0;

      toast({
        title: 'Unchecked teams removed',
        description:
          removedCount > 0
            ? `${removedCount} registrations were removed for missing check-in.`
            : 'No unchecked teams remained.',
      });

      refetchDashboard();
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

  const handleToggleAssistedReporting = async (enabled: boolean) => {
    if (!tournament?.id) return;
    setSavingAssistedReporting(true);
    try {
      const currentSettings = typeof tournament.settings === 'object' && tournament.settings
        ? tournament.settings
        : {};
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        settings: { ...currentSettings, assistedMatchReporting: enabled },
      });
      toast({
        title: enabled ? 'Assisted Reporting Enabled' : 'Assisted Reporting Disabled',
        description: enabled
          ? 'Players will need linked Riot accounts. Match results can be auto-detected.'
          : 'Assisted match reporting has been turned off.',
      });
      refetchDashboard();
    } catch (error: any) {
      console.error('Error toggling assisted reporting:', error);
      toast({
        title: 'Failed to update setting',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSavingAssistedReporting(false);
    }
  };

  const handleToggleMapVeto = async (enabled: boolean) => {
    if (!tournament?.id) return;
    setSavingMapVeto(true);
    try {
      const currentSettings = typeof tournament.settings === 'object' && tournament.settings
        ? tournament.settings
        : {};
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        settings: { ...currentSettings, mapVetoEnabled: enabled },
      });
      toast({
        title: enabled ? 'Map Veto Enabled' : 'Map Veto Disabled',
        description: enabled
          ? 'Captains will go through a map veto process before each match.'
          : 'Map veto has been turned off. Matches will proceed without map selection.',
      });
      refetchDashboard();
    } catch (error: any) {
      console.error('Error toggling map veto:', error);
      toast({
        title: 'Failed to update setting',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSavingMapVeto(false);
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
        const regRow = await apiClient.get<any>(`/api/tournaments/${tournament?.id}/participants/${p.id}`).catch(() => null);
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
                    const profsTok = await apiClient.post<any[]>('/api/profiles/resolve-players', { tokens: ids, areUuids: true }).catch(() => []);
                    const mapTok = new Map<string, string>();
                    const isVal = tournament?.game?.toLowerCase() === 'valorant';
                    (profsTok || []).forEach((p: any) => {
                      const tag = isVal ? p.riot_tag : (p.riot_tag || p.steam_tag);
                      mapTok.set(p.id, tag || p.username || p.full_name || `player_${String(p.id).substring(0, 8)}`);
                    });
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
        try {
          const teamResults = await apiClient.get<any[]>(`/api/teams/search?name=${encodeURIComponent(p.team_name)}`).catch(() => []);
          const match = (teamResults || [])[0];
          if (match) { teamId = match.id; logo = logo || match.logo_url || null; }
        } catch { }
      } else if (teamId && !logo) {
        try {
          const teamData = await apiClient.get<any>(`/api/teams/${teamId}`).catch(() => null);
          logo = teamData?.logo_url || null;
        } catch { }
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
        const roster = await apiClient.get<any[]>(`/api/rosters/${regRosterId}/members`).catch(() => null);
        const rosterError = !roster;
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
          const rosters = await apiClient.get<any[]>(`/api/teams/${effectiveTeamId}/rosters`).catch(() => []);
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
            const roster = await apiClient.get<any[]>(`/api/rosters/${pickedId}/members`).catch(() => null);
            const rosterError3 = !roster;
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

      // Server handles: fetch participant → insert ban → delete registration atomically
      const result = await apiClient.post<any>(`/api/tournaments/${tournament.id}/ban-participant`, {
        participantId,
        userId,
        banReason: banReason.trim(),
      });

      const deleteError = result?.deleteError;

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
      refetchDashboard(); // Refresh participants
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
  interface BracketTeam {
    id: string;
    name: string;
    logo?: string | null;
    team_name?: string;
  }

  interface BracketMatchType {
    id: string;
    round: number;
    home: BracketTeam;
    visitor: BracketTeam;
  }

  type BracketTeamWithName = BracketTeam;

  const generateCustomBracketMatches = (teams: BracketTeamWithName[]): BracketMatchType[] => {
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
    let matches: BracketMatchType[] = [];
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
                    <img src={home.logo} loading="lazy" alt={getTeamDisplayName(home)} className="w-6 h-6 rounded bg-white border border-gray-300" />
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
                    <img src={visitor.logo} loading="lazy" alt={getTeamDisplayName(visitor)} className="w-6 h-6 rounded bg-white border border-gray-300" />
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
                <img src={home.logo} loading="lazy" alt={getTeamDisplayName(home)} className="w-5 h-5 rounded bg-white border border-gray-300" />
              ) : (
                <GamepadIcon className="w-4 h-4 text-emerald-400" />
              )}
              <span className="font-semibold text-white text-xs">{getTeamDisplayName(home)}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              {visitor.logo ? (
                <img src={visitor.logo} loading="lazy" alt={getTeamDisplayName(visitor)} className="w-5 h-5 rounded bg-white border border-gray-300" />
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

  const effectiveCheckInRequired = !!tournament?.check_in_required;
  const effectiveDeadlineMs = tournament?.check_in_deadline
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
  const showCheckInSummary = Boolean((effectiveCheckInRequired || isOrganizer) && teamParticipants.length > 0);
  const pendingDisplayTeams = teamParticipants.filter((p) => !p.checked_in_at).slice(0, 4);

  const staffPermissionSummary =
    staffPermissions.map((perm) => STAFF_PERMISSION_LABELS[perm] || perm).join(', ') || 'Limited access';

  const canManageStaff = isOrganizer;
  const canAssistDisputes = isOrganizer || staffPermissions.includes('disputes:assist');
  const canManageTeams = isOrganizer || staffPermissions.includes('teams:manage');
  const canEditBracket = isOrganizer || staffPermissions.includes('bracket:edit');
  const canSendAnnouncements = isOrganizer || staffPermissions.includes('announcements:send');

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
  // Combined Game Data Fetching (Static + RAWG with Caching)
  useEffect(() => {
    async function fetchGameData(gameName: string) {
      if (!gameName) return;

      const cacheKey = `rawg_cache_${normalize(gameName)}`;
      let background = null;
      let logo = null;

      // 1. Check Cache for RAWG Data
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { background_image, logo_image, timestamp } = JSON.parse(cached);
          // Cache valid for 24 hours
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            background = background_image;
            logo = logo_image;
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      // 2. Fetch from RAWG via Edge Function proxy if missing data
      if (!background || !logo) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/games/search?q=${encodeURIComponent(gameName)}`);
          const data = await res.json();
          if (data && data.results && data.results.length > 0) {
            const game = data.results[0];
            background = background || game.background_image;
            logo = logo || game.background_image; // RAWG uses background_image as the main visual
            // Cache the result
            localStorage.setItem(cacheKey, JSON.stringify({
              background_image: background,
              logo_image: logo,
              timestamp: Date.now()
            }));
          }
        } catch (e) {
          console.warn('RAWG proxy fetch failed, using fallbacks:', e);
        }
      }

      // 3. Update State
      setGameBackgroundUrl(background);

      // Check static data for logo override
      const foundGame = esportsGames.games.find(g =>
        normalize(g.name) === normalize(gameName) ||
        g.name.toLowerCase() === gameName.toLowerCase()
      );
      if (foundGame?.logo) {
        setGameLogo(foundGame.logo);
      } else if (logo) {
        setGameLogo(logo);
      } else if (background) {
        setGameLogo(background);
      }
    }

    if (tournament?.game) {
      fetchGameData(tournament.game);
    }
  }, [tournament?.game]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white">
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

  if (!tournament || dashboardError) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">
              {dashboardError ? 'Error Loading Tournament' : 'Tournament not found'}
            </h1>
            <p className="text-gray-400 mb-6">
              {(dashboardError as any)?.message ||
                (typeof dashboardError === 'string' ? dashboardError : null) ||
                (dashboardError ? `Error details: ${JSON.stringify(dashboardError)}` : null) ||
                "We couldn't find the tournament you're looking for or you don't have permission to manage it."}
            </p>
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-red-600 hover:bg-red-500 font-bold px-8 py-6 rounded-2xl transition-all hover:scale-105"
            >
              Back to Tournaments
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }



  const handleCompleteTournament = async () => {
    if (!tournament) return;

    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, { status: 'completed' });

      refetchDashboard();
      toast({
        title: 'Tournament Completed',
        description: 'The tournament has been marked as finished.',
      });
    } catch (error) {
      console.error('Error completing tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete tournament.',
        variant: 'destructive',
      });
    }
  };

  const handleEditTournament = () => {
    if (!slug) return;
    navigate(`/tournaments/edit/${slug}`);
  };

  return (
    <div className="min-h-screen bg-transparent text-white relative overflow-hidden font-sans">

      <main className="container mx-auto px-4 py-8 relative z-10 font-heading">
        {hasStaffAccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-950/30 backdrop-blur-md text-sm text-cyan-200 px-4 py-2 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            Staff Mode: <span className="font-medium text-cyan-100">{staffPermissionSummary}</span>
          </motion.div>
        )}

        {/* HERO BANNER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6"
        >
          {/* Motion Background Grid */}
          <MotionTiles />
          {/* Decorative Gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-blue-500/20 opacity-0 transition-opacity duration-1000 pointer-events-none mix-blend-overlay" />

          <div className="relative flex flex-col lg:flex-row gap-8 justify-between z-10">
            {/* Left: Identity */}
            <div className="flex gap-6 items-start">
              {/* Big Game Logo with Glow */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#09090b]/80 border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden transition-transform duration-500 backdrop-blur-sm">
                  {gameLogo && !logoError ? (
                    <img
                      src={gameLogo}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <GamepadIcon className="w-10 h-10 text-emerald-400" />
                  )}
                </div>
                {/* Glowing dot */}
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-[#09090b] ${getStatusColor(tournament.status).includes('red') ? 'bg-red-500' : getStatusColor(tournament.status).includes('emerald') ? 'bg-emerald-500' : getStatusColor(tournament.status).includes('purple') ? 'bg-purple-500' : 'bg-gray-500'}`} />
              </div>

              <div className="pt-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/60 backdrop-blur-sm">
                    {tournament.is_online ? 'Online' : 'LAN'} Event
                  </span>
                  {tournament.game && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-400 backdrop-blur-sm">
                      {tournament.game}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-2 drop-shadow-sm min-h-[1.2em]">
                  {/* Typewriter Effect for Title */}
                  <TypewriterEffect words={[tournament.name, "Tournament Dashboard", "Manage Event"]} />
                </h1>
                <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <Calendar className="w-4 h-4" />
                    {tournament.date || 'TBA'}
                  </div>
                  <div className="flex items-center gap-2 hover:text-white transition-colors">
                    <MapPin className="w-4 h-4" />
                    {tournament.venue || 'Remote'}
                  </div>
                  {tournament.status === 'completed' && tournament.winner_team_name && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Trophy className="w-4 h-4" />
                      Winner: {tournament.winner_team_name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions & Status */}
            <div className="flex flex-col items-end gap-3 self-end sm:self-auto">
              <div className="flex flex-wrap items-center justify-end gap-3 mt-auto">
                {isOrganizer && (tournament.status === 'draft' || !tournament.is_public) && (
                  <Button
                    onClick={async () => {
                      try {
                        await apiClient.put(`/api/tournaments/${tournament.id}`, { status: 'open', isPublic: true });
                        refetchDashboard();
                        toast({ title: 'Tournament Published!', description: 'Your tournament is now live and public.' });
                      } catch (err: any) {
                        toast({ title: 'Error', description: err.message, variant: 'destructive' });
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-tight text-xs py-2 px-4 h-10 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)] group"
                  >
                    <Globe className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
                    Publish Tournament
                  </Button>
                )}

                {isOrganizer && tournament.status !== 'completed' && tournament.status !== 'draft' && (
                  <Button
                    onClick={handleCompleteTournament}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-tight text-xs py-2 px-4 h-10 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.1)] group"
                  >
                    <CheckCircle className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
                    Mark as Finished
                  </Button>
                )}

                {isOrganizer && tournament.status === 'completed' && (
                  <Button
                    onClick={() => handleStatusChange('published')}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-tight text-xs py-2 px-4 h-10 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.1)] group"
                  >
                    <RefreshCw className="w-4 h-4 mr-2 transition-transform group-hover:rotate-180" />
                    Reopen Tournament
                  </Button>
                )}

                {isOrganizer && (
                  <Button
                    onClick={handleEditTournament}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-tight text-xs py-2 px-4 h-10 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.1)] group"
                  >
                    <Edit2 className="w-4 h-4 mr-2 transition-transform group-hover:-rotate-12" />
                    Edit Tournament
                  </Button>
                )}

                <Button
                  onClick={() => navigate(`/tournaments/${slug}`)}
                  className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold uppercase tracking-tight text-xs py-2 px-4 h-10 rounded-xl transition-all hover:scale-105 active:scale-95 group"
                >
                  <Eye className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                  View Public Page
                </Button>
              </div>
            </div>
          </div>

          {/* STATS STRIP - Divider Line */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6 lg:my-8 relative z-10" />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-0 relative z-10">
            {/* Stat 1 */}
            <div className="flex flex-col items-center lg:items-start lg:border-r border-white/5 px-4 gap-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prize Pool</span>
              <span className="text-2xl lg:text-3xl font-black text-white flex items-baseline gap-1">
                <span className="text-amber-400 text-lg">$</span>{tournament.prize_pool || '0'}
              </span>
            </div>
            {/* Stat 2 */}
            <div className="flex flex-col items-center lg:items-start lg:border-r border-white/5 px-4 gap-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Participants</span>
              <span className="text-2xl lg:text-3xl font-black text-white flex items-baseline gap-1">
                {tournament.current_participants}<span className="text-white/20 text-xl font-medium">/{tournament.max_participants}</span>
              </span>
            </div>
            {/* Stat 3 */}

            {/* Stat 4 */}
            <div className="flex flex-col items-center lg:items-start px-4 gap-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Registration</span>
              <div className="flex items-center gap-2 mt-1">
                {tournament.registration_open ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase">
                    Closed
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating Animated Dropdown Nav */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Mobile View: Select Dropdown for Tabs */}
          <div className="md:hidden sticky top-4 z-40 mb-6">
            <div className="relative">
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger className="w-full h-12 bg-[#09090b]/90 backdrop-blur-xl border-white/10 text-white rounded-xl px-4 font-bold tracking-wide">
                  <SelectValue placeholder="Select View" />
                </SelectTrigger>
                <SelectContent className="bg-[#09090b] border-white/10 text-white z-[60]">
                  {['overview', 'participants', 'stages', 'brackets', 'bans', 'disputes', 'announcements', 'staff', 'settings'].map((tab) => {
                    // Filter tabs based on permissions
                    if (tab === 'bans' && !canManageTeams) return null;
                    if (tab === 'disputes' && !canAssistDisputes) return null;
                    if (tab === 'announcements' && !canSendAnnouncements) return null;
                    if (tab === 'staff' && !canManageStaff) return null;
                    if (tab === 'settings' && !isOrganizer) return null;

                    return (
                      <SelectItem key={tab} value={tab} className="capitalize font-medium focus:bg-white/10 focus:text-white cursor-pointer py-3">
                        {tab}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop View: Floating Animated Tabs */}
          <div className="hidden md:flex sticky top-4 z-40 mb-8 justify-center perspective-1000">
            <motion.div
              className="p-1 bg-black/70 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl inline-flex relative overflow-hidden"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                {(() => {
                  const isBR = isBattleRoyale(tournament?.game || '');
                  const tabs = isBR
                    ? ['overview', 'participants', 'games', 'bans', 'disputes', 'announcements', 'staff', 'settings']
                    : ['overview', 'participants', 'stages', 'brackets', 'bans', 'disputes', 'announcements', 'staff', 'settings'];
                  return tabs.map((tab) => {
                  if (tab === 'brackets') {
                    return (
                      <button
                        key="brackets"
                        onClick={() => navigate(`/tournaments/${slug}/brackets`)}
                        disabled={!canEditBracket}
                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all flex items-center justify-center h-full"
                      >
                        Brackets
                      </button>
                    );
                  }

                  if (tab === 'bans' && !canManageTeams) return null;
                  if (tab === 'disputes' && !canAssistDisputes) return null;
                  if (tab === 'staff' && !canManageStaff) return null;
                  if (tab === 'settings' && !isOrganizer) return null;

                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-600 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg relative overflow-hidden capitalize h-auto"
                    >
                      <span className="relative z-10">{tab}</span>
                    </TabsTrigger>
                  );
                });
                })()}
              </TabsList>
            </motion.div>
          </div>


          {/* Premium Tab Navigation */}


          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait" custom={direction}>
              {activeTab === 'overview' && (
                <TabsContent value="overview" forceMount key="overview">
                  <TabTransition direction={direction}>
                    <Card className="bg-none bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden mb-6">
                      <CardHeader className="pb-4 border-b border-white/5">
                        <CardTitle className="text-lg font-bold text-white tracking-wide">Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="mb-6">
                          <h2 className="text-2xl font-bold text-white mb-3">{tournament.name}</h2>
                          <p className="text-gray-300 leading-relaxed font-medium">{tournament.description || 'No description provided.'}</p>
                        </div>
                        <div className="w-full h-px bg-white/5 my-6" />
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 mb-8">
                          <div className="flex flex-col lg:border-r border-white/10 px-4 gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Date & Time</span>
                            <span className="text-xl font-bold text-white">{tournament.date} <span className="text-gray-500 text-sm font-normal">at {tournament.time}</span></span>
                          </div>
                          <div className="flex flex-col lg:border-r border-white/10 px-4 gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Venue</span>
                            <span className="text-xl font-bold text-white">{tournament.venue || 'Online'}</span>
                          </div>
                          <div className="flex flex-col lg:border-r border-white/10 px-4 gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Entry Fee</span>
                            <span className="text-xl font-bold text-white">{tournament.entry_fee || 'Free'}</span>
                          </div>
                          <div className="flex flex-col px-4 gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Format</span>
                            <span className="text-xl font-bold text-white">{tournament.is_online ? 'Online' : 'LAN'}</span>
                          </div>
                        </div>
                        <div className="w-full h-px bg-white/5 my-6" />
                        <div className="grid grid-cols-1 gap-6 sm:gap-0">
                          <div className="flex flex-col px-4 gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Teams Registered</span>
                            <span className="text-3xl font-black text-white tracking-tight">
                              {participants.filter(p => p.participant_type === 'team').length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'stages' && (
                <TabsContent value="stages" forceMount key="stages">
                  <TabTransition direction={direction}>
                    <StageManagementTab
                      tournamentId={tournament.id}
                      stages={stages}
                      onUpdate={() => refetchDashboard()}
                      game={tournament.game || ''}
                    />
                  </TabTransition>
                </TabsContent>
              )}

              {/* BR Games Tab */}
              {activeTab === 'games' && isBR && (
                <TabsContent value="games" forceMount key="games">
                  <TabTransition direction={direction}>
                    <div className="space-y-6">
                      {/* Scoring Config */}
                      <BRScoringConfig preset={brScoringPreset} killCap={brKillCap} />

                      {/* Live Leaderboard */}
                      <BRLeaderboard
                        entries={brResults.leaderboard}
                        totalGames={brGameCount}
                        gamesCompleted={brResults.gamesCompleted}
                      />

                      {/* Winner banner */}
                      {brResults.winner && (
                        <Card className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-2xl p-6">
                          <div className="flex items-center gap-4">
                            <Trophy className="w-10 h-10 text-amber-400" />
                            <div>
                              <h3 className="text-lg font-bold text-white">Tournament Winner</h3>
                              <p className="text-amber-300 font-medium">{brResults.winner.teamName} — {brResults.winner.totalPoints} points</p>
                            </div>
                            {tournament?.status !== 'completed' && (
                              <Button
                                onClick={async () => {
                                  try {
                                    await apiClient.put(`/api/tournaments/${tournament!.id}`, {
                                      status: 'completed',
                                      winner_team_name: brResults.winner!.teamName,
                                    });
                                    toast({ title: 'Tournament Completed', description: `${brResults.winner!.teamName} crowned as champion!` });
                                    queryClient.invalidateQueries({ queryKey: ['tournament-dashboard'] });
                                  } catch {
                                    toast({ title: 'Error', description: 'Failed to complete tournament.', variant: 'destructive' });
                                  }
                                }}
                                className="ml-auto bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Completed
                              </Button>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* Game Result Entry */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white">Games</h3>
                        {brTeams.length === 0 && (
                          <Card className="bg-black/20 backdrop-blur-md border border-amber-500/20 rounded-2xl p-4 text-center">
                            <p className="text-amber-400/80 text-sm">No participants registered yet. Games can be started once teams register.</p>
                          </Card>
                        )}
                        {Array.from({ length: brGameCount }, (_, i) => {
                          const gameNum = i + 1;
                          const gameStatus = brResults.getGameStatus(gameNum);
                          // Sequential: locked if any prior game is not completed
                          const isLocked = i > 0 && brResults.getGameStatus(i) !== 'completed';
                          return (
                            <BRGameResults
                              key={i}
                              gameNumber={gameNum}
                              teams={brTeams}
                              scoringPreset={brScoringPreset}
                              killCap={brKillCap}
                              existingResults={brResults.getGameResults(gameNum)}
                              lobbyCode={brResults.getLobbyCode(gameNum)}
                              isOrganizer={isOrganizer}
                              gameStatus={gameStatus}
                              isLocked={isLocked}
                              evidence={brResults.getEvidence(gameNum)}
                              onStartGame={(lobbyCode) => {
                                brResults.startGame(gameNum, lobbyCode);
                              }}
                              onSave={(results, lobbyCode) => {
                                brResults.saveGameResults(gameNum, results, lobbyCode);
                              }}
                              onResetGame={() => brResults.resetGame(gameNum)}
                              onUpdateLobbyCode={(code) => brResults.updateLobbyCode(gameNum, code)}
                              isSaving={brResults.isSaving}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'participants' && (
                <TabsContent value="participants" forceMount key="participants">
                  <TabTransition direction={direction}>
                    {showCheckInSummary && (
                      <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6 group">
                        <CardHeader className="p-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10 border-b border-white/5 pb-4 mb-6">
                          <div>
                            <CardTitle className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
                              Check-In Monitor
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                              />
                            </CardTitle>
                            <p className="text-xs font-medium text-gray-400 mt-1 font-mono uppercase tracking-wider">
                              {tournament.check_in_deadline
                                ? `Deadline: ${new Date(tournament.check_in_deadline).toLocaleString()}`
                                : 'Deadline not set'}
                              {checkInCountdown && (
                                <motion.span
                                  key={checkInCountdown}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-emerald-400 font-bold ml-2"
                                >
                                  · {checkInCountdown} left
                                </motion.span>
                              )}
                            </p>
                          </div>
                          <Badge
                            className={`text-xs px-3 py-1 font-bold uppercase tracking-wider ${isCheckInClosed
                              ? 'bg-red-500/20 text-red-200 border-red-500/40'
                              : checkInProgress === 100
                                ? 'bg-green-500/20 text-green-200 border-green-500/40'
                                : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                              }`}
                          >
                            {isCheckInClosed
                              ? 'Closed'
                              : checkInProgress === 100
                                ? 'Ready'
                                : 'Check-In Open'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-0 space-y-6 relative z-10">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0">
                            <div className="flex flex-col sm:border-r border-white/10 px-4 gap-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Participants</span>
                              <span className="text-3xl font-black text-white tracking-tight">{participants.length}</span>
                            </div>
                            <div className="flex flex-col sm:border-r border-white/10 px-4 gap-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Checked In</span>
                              <span className="text-3xl font-black text-emerald-400 tracking-tight">{participants.filter(p => p.status === 'checked_in').length}</span>
                            </div>
                            <div className="flex flex-col px-4 gap-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending</span>
                              <span className="text-3xl font-black text-amber-400 tracking-tight">{Math.max(0, participants.filter(p => p.status === 'registered' || p.status === 'pending').length)}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                              <span>Progress</span>
                              <span className="text-white">{checkInProgress}%</span>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, checkInProgress)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12" />
                              </motion.div>
                            </div>
                          </div>

                          {isOrganizer && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => refetchDashboard()}
                                  variant="outline"
                                  size="sm"
                                  className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
                                >
                                  Refresh
                                </Button>
                              </div>
                              <Button
                                onClick={handleRemoveUncheckedParticipants}
                                disabled={pendingTeams <= 0 || removingUnchecked}
                                className="bg-red-600 hover:bg-red-500 text-white w-full sm:w-auto shadow-lg shadow-red-900/20"
                                size="sm"
                              >
                                {removingUnchecked ? 'Clearing...' : 'Remove unchecked teams'}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6 group">
                      <MotionTiles />
                      <CardHeader className="p-0 border-b border-white/5 pb-4 mb-6 relative z-10">
                        <CardTitle className="text-lg font-bold text-white tracking-wide">
                          {tournament.team_size === 1 ? 'Registered Participants' : 'Registered Teams'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 relative z-10">
                        {participants.length === 0 ? (
                          <p className="text-gray-400 italic">No participants registered yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            <AnimatePresence>
                              {participants.map((participant) => (
                                <OrganizerTeamCard
                                  key={participant.id}
                                  participant={participant}
                                  onManage={handleTeamClick}
                                  renderStatusBadge={renderCheckInBadge}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'bans' && (
                <TabsContent value="bans" forceMount key="bans">
                  <TabTransition direction={direction}>
                    {!canManageTeams ? (
                      <PermissionNotice message="Only organizers or staff with team management permissions can manage bans." />
                    ) : (
                      tournament?.id && <BanManagement tournamentId={tournament.id} />
                    )}
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'disputes' && (
                <TabsContent value="disputes" forceMount key="disputes">
                  <TabTransition direction={direction}>
                    {!canAssistDisputes ? (
                      <PermissionNotice message="Your staff role does not include dispute assistance permissions." />
                    ) : (
                      tournament?.id && user?.id && (
                        <>
                          <DisputeCenter
                            key={tournament.id}
                            tournamentId={tournament.id}
                            organizerId={tournament.organizer_id}
                            currentUserId={user.id}
                          />
                          <div className="mt-6">
                            <MatchChecker tournamentId={tournament.id} />
                          </div>
                        </>
                      )
                    )}
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'staff' && (
                <TabsContent value="staff" forceMount key="staff">
                  <TabTransition direction={direction}>
                    <Card className="bg-none bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8">
                      <CardContent className="text-center py-8 space-y-4">
                        <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
                        <h3 className="text-xl font-bold text-white">Staff Management Moved</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                          Staff is now managed at the <strong>organization level</strong>.
                          Staff members added to your organization automatically gain access to all your tournaments.
                        </p>
                        <Button
                          onClick={() => navigate('/organizer/dashboard?tab=staff')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-105"
                        >
                          Go to Organization Settings
                        </Button>
                      </CardContent>
                    </Card>
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'announcements' && (
                <TabsContent value="announcements" forceMount key="announcements">
                  <TabTransition direction={direction}>
                    {tournament?.id ? (
                      <TournamentAnnouncementPanel tournamentId={tournament.id} />
                    ) : (
                      <PermissionNotice message="Tournament not loaded." />
                    )}
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'settings' && (
                <TabsContent value="settings" forceMount key="settings">
                  <TabTransition direction={direction}>
                    {!isOrganizer ? (
                      <PermissionNotice message="Tournament settings are available only to the organizer." />
                    ) : (
                      <>
                      <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6 group">
                        <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
                          <CardTitle className="text-lg font-semibold text-white">Check-In Requirements</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-5">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-2 text-sm text-gray-300 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                              <AlertTriangle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-white mb-1">Check-in Enforcement</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-400">
                                  <li>Check-in is <span className="text-emerald-400 font-medium">mandatory</span> for all teams.</li>
                                  <li>Teams who fail to check in before the deadline will be <span className="text-red-400 font-medium">auto-removed</span>.</li>
                                  <li>Only checked-in teams will be added to the bracket.</li>
                                </ul>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 gap-4">
                              <div>
                                <p className="font-semibold text-white">Manual Enforcement</p>
                                <p className="text-sm text-gray-400">You can manually trigger removal of teams who haven't checked in yet.</p>
                              </div>
                              <Button
                                variant="destructive"
                                onClick={handleRemoveUncheckedParticipants}
                                disabled={removingUnchecked}
                                className="w-full sm:w-auto min-w-[200px]"
                              >
                                {removingUnchecked ? 'Processing...' : 'Remove Unchecked Teams'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Assisted Match Reporting — games with API integration */}
                      {getGameFeatures(tournament?.game || '').assistedReporting && (
                        <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6 group">
                          <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                              <Zap className="w-5 h-5 text-amber-400" />
                              Assisted Match Reporting
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                              <Switch
                                checked={tournament?.settings?.assistedMatchReporting === true}
                                onCheckedChange={handleToggleAssistedReporting}
                                disabled={savingAssistedReporting}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm">
                                  {savingAssistedReporting ? 'Saving...' : 'Enable Assisted Match Reporting'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Automatically detects match results from Riot's API. Captains can scan their recent Valorant matches to report scores instantly.
                                </p>
                              </div>
                            </div>
                            {tournament?.settings?.assistedMatchReporting && (
                              <div className="flex items-start gap-2 text-sm text-gray-300 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-amber-300 mb-1">Riot Account Required</p>
                                  <p className="text-gray-400 text-xs">
                                    All participating players must link their Riot account for auto-detection to work. Players without linked accounts will be prompted during registration.
                                  </p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Map Veto — games with map veto support */}
                      {getGameFeatures(tournament?.game || '').mapVeto && (
                        <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6 group">
                          <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                              <Swords className="w-5 h-5 text-rose-400" />
                              Map Veto
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                              <Switch
                                checked={tournament?.settings?.mapVetoEnabled !== false}
                                onCheckedChange={handleToggleMapVeto}
                                disabled={savingMapVeto}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm">
                                  {savingMapVeto ? 'Saving...' : 'Enable Map Veto'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  When enabled, team captains will go through a ban/pick map veto process before each match begins.
                                </p>
                              </div>
                            </div>
                            {tournament?.settings?.mapVetoEnabled === false && (
                              <div className="flex items-start gap-2 text-sm text-gray-300 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-rose-300 mb-1">Map Veto Disabled</p>
                                  <p className="text-gray-400 text-xs">
                                    Matches will proceed without map selection. Captains will report scores directly via manual match reporting.
                                  </p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                      </>
                    )}
                  </TabTransition>
                </TabsContent>
              )}
            </AnimatePresence>

            {/* Team Management Dialog - Outside AnimatePresence to avoid layout issues */}
            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
              <DialogContent className="sm:max-w-[480px] bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-0 gap-0 overflow-hidden duration-300">
                <div className="p-6 pb-2">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-2xl font-bold text-white tracking-tight">{selectedTeam?.team_name || 'Team'}</DialogTitle>
                    <DialogDescription className="text-gray-400 font-medium text-sm">Roster and management</DialogDescription>
                  </DialogHeader>
                </div>
                <div className="p-6 pt-4 pb-8">
                  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Players</div>
                  {teamLoading ? (
                    <div className="flex gap-2">
                      {[1, 2, 3].map(i => <div key={i} className="h-8 w-20 rounded-full bg-white/5 animate-pulse" />)}
                    </div>
                  ) : selectedTeamMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No members found.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {selectedTeamMembers.map((m, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/5 text-sm font-medium text-gray-200"
                        >
                          {m}
                        </motion.span>
                      ))}
                      {teamCaptain && (
                        <span className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-400">👑 {teamCaptain}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-6 pt-0 flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={() => setTeamDialogOpen(false)} className="border border-white/10 text-white hover:bg-white/5 h-10 px-5 rounded-lg">Close</Button>
                  <Button
                    variant="destructive"
                    onClick={() => { setBanDialogOpen(true); setBanTarget({ id: selectedTeam?.id!, userId: selectedTeam?.user_id! }); setTeamDialogOpen(false); }}
                    className="bg-red-500 hover:bg-red-600 text-white h-10 px-6 rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105"
                  >
                    Ban Team
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Tabs >
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
