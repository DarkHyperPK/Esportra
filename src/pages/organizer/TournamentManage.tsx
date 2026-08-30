// OrganizerTournamentDashboard.tsx
// This file is for managing a single tournament (participants, brackets, settings, etc.)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { OrganizerTeamCard } from '@/components/organizer/OrganizerTeamCard';
import { motion, AnimatePresence } from 'framer-motion';

import Footer from '@/components/Footer';
import { CancelButton, DangerButton, OutlineButton } from '@/components/ui/app-buttons';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Edit2,
  Eye,
  EyeOff,
  GamepadIcon,
  Globe,
  Copy,
  Lock,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  Swords,
  Trophy,
  X,
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
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAdmin } from '@/hooks/useAdmin';
import { isSuperAdminUser } from '@/lib/adminAccess';
import type { StaffPermission } from '@/types/staff';
import { useTournamentAccess } from '@/hooks/useTournamentAccess';
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
import { getEffectiveGameFeatures, getParticipantMode, isBattleRoyaleTournament, getBRConfig, getGameByName, getPersistedTournamentFormat } from '@/utils/gameFeatures';
import BanManagement from '@/components/organizer/BanManagement';
import PaymentManagement from '@/components/organizer/PaymentManagement';
import { useOrganizerDisputeUnread } from '@/hooks/useOrganizerDisputeUnread';
import TournamentAnnouncementPanel from '@/components/organizer/TournamentAnnouncementPanel';
// Staff management has moved to Organization Settings (OrganizationStaffManager)
import { StageManagementTab } from '@/components/organizer/tabs/StageManagementTab';
import { PrizeDistributionTab } from '@/components/organizer/PrizeDistributionTab';
import { BRStageManagementTab } from '@/components/organizer/tabs/BRStageManagementTab';
import { BRGamesTab } from '@/components/organizer/tabs/BRGamesTab';
import { BRScheduleTab } from '@/components/organizer/tabs/BRScheduleTab';
import StageSchedulingConfig from '@/components/tournament/StageSchedulingConfig';
import RoundSchedulingPanel from '@/components/tournament/RoundSchedulingPanel';
import { useTournamentDashboard, type DashboardParticipant } from '@/hooks/useTournamentDashboard';
import { useStageRealtime } from '@/hooks/useStageRealtime';
import { MockModePanel } from '@/components/tournament/MockModePanel';
import { useMockTournament } from '@/hooks/useMockTournament';
import { useTournamentInvitations } from '@/hooks/useTournamentInvitations';
import { EMPTY_INVITATION_SUMMARY } from '@/types/invitation';
import {
  buildInviteSettingsPayload,
  canConfigureInvitedTeams,
  defaultReservedInviteSlots,
  getInviteExpiryDaysFromTournament,
  getReservedInviteSlotsFromTournament,
} from '@/utils/tournamentInviteUtils';
import { resolveBRRegisteredUnitCount } from '@/utils/brStageFlow';
import {
  launchStateToUpdatePayload,
  makePrivateUpdatePayload,
} from '@/utils/tournamentVisibilityUtils';
import {
  countCheckedInParticipants,
  countPendingCheckInParticipants,
  isActiveRegistration,
} from '@/utils/brCheckIn';
import {
  hasCheckInClosed,
  hasCheckInNotOpenedYet,
  resolveCheckInWindow,
} from '@/utils/tournamentLifecycle';
import { CommandButton, CommandTabButton } from '@/components/management/CommandSurface';

const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
const PARTICIPANTS_PAGE_SIZE = 24;
const isValidInviteEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

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
  payment_status?: string | null;
  payment_receipt_url?: string | null;
  payment_rejection_reason?: string | null;
  entry_kind?: string | null;
  display_logo_url?: string | null;
  entry_fee_amount?: number | null;
  entry_fee_paid?: boolean;
  source?: string | null;
  user: {
    username: string;
    full_name: string | null;
  };
}

// ── handleTeamClick helpers ──

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const looksLikeUuid = (s: string) => UUID_RE.test(s);

function extractMemberName(m: unknown): string {
  if (typeof m === 'string') return m;
  return (m as any)?.username || (m as any)?.name || '';
}

function parseTeamMembers(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(extractMemberName).filter(Boolean);
  if (typeof input !== 'string') return [];
  const trimmed = input.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(extractMemberName).filter(Boolean);
    } catch { /* fall through */ }
  }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}

async function resolveTeamIdentity(
  participant: Participant,
): Promise<{ teamId: string | null; logoUrl: string | null }> {
  let teamId = participant.team_id as string | null;
  let logoUrl: string | null = participant.team_logo || participant.display_logo_url || null;
  const isSolo = participant.participant_type === 'solo' || participant.entry_kind === 'solo_player';

  if (isSolo) {
    logoUrl = logoUrl || participant.display_logo_url || null;
  } else if (!teamId) {
    try {
      const teamResults = await apiClient.get<any[]>(`/api/teams/search?name=${encodeURIComponent(participant.team_name || '')}`).catch(() => []);
      const exactMatch = (teamResults || []).find((t: any) => t.name === participant.team_name);
      const match = exactMatch || (teamResults || [])[0];
      if (match) { teamId = match.id; logoUrl = logoUrl || match.logo_url || null; }
    } catch { /* ignored */ }
  } else {
    try {
      const teamData = await apiClient.get<any>(`/api/teams/${teamId}`).catch(() => null);
      if (teamData) logoUrl = logoUrl || teamData.logo_url || null;
    } catch { /* ignored */ }
  }
  return { teamId, logoUrl };
}

function resolveProfileDisplayName(profile: any, preferRiotTag: boolean): string {
  const tag = preferRiotTag ? profile.riot_tag : (profile.riot_tag || profile.steam_tag);
  return tag || profile.username || profile.full_name || `player_${String(profile.id).substring(0, 8)}`;
}

function resolveProfileMatchedKey(profile: any): string | null {
  const field = profile.matched_field;
  if (field === 'riot_tag') return profile.riot_tag;
  if (field === 'steam_tag') return profile.steam_tag;
  if (field === 'username') return profile.username;
  return profile.full_name ?? null;
}

function resolveProfileBestName(profile: any): string {
  return profile.riot_tag || profile.steam_tag || profile.username || profile.full_name || '';
}

async function resolvePlayerNames(
  tokens: string[],
  preferRiotTag: boolean,
): Promise<string[]> {
  const areUuids = tokens.every(looksLikeUuid);
  const resolved = await apiClient.post<any[]>('/api/profiles/resolve-players', {
    tokens: areUuids ? tokens : Array.from(new Set(tokens)),
    areUuids,
  });

  if (areUuids) {
    const map = new Map<string, string>();
    (resolved || []).forEach((p: any) => map.set(p.id, resolveProfileDisplayName(p, preferRiotTag)));
    return tokens.map(id => map.get(id) || `player_${String(id).substring(0, 8)}`);
  }

  const uniq = Array.from(new Set(tokens));
  const map = new Map<string, string>();
  (resolved || []).forEach((p: any) => {
    const key = resolveProfileMatchedKey(p);
    if (key) map.set(key, resolveProfileBestName(p));
  });
  return uniq.map(t => map.get(t) || t);
}

interface CachedGameData { background_image: string | null; logo_image: string | null; timestamp: number }

function readCachedGameImages(gameName: string): { background: string | null; logo: string | null } {
  const cacheKey = `rawg_cache_${normalize(gameName)}`;
  const cached = localStorage.getItem(cacheKey);
  if (!cached) return { background: null, logo: null };
  try {
    const { background_image, logo_image, timestamp } = JSON.parse(cached) as CachedGameData;
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
      return { background: background_image, logo: logo_image };
    }
  } catch { /* corrupt cache */ }
  localStorage.removeItem(cacheKey);
  return { background: null, logo: null };
}

async function fetchAndCacheRawgImages(gameName: string): Promise<{ background: string | null; logo: string | null }> {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/games/search?q=${encodeURIComponent(gameName)}`);
    const data = await res.json();
    if (data?.results?.length > 0) {
      const bg = data.results[0].background_image ?? null;
      const cacheKey = `rawg_cache_${normalize(gameName)}`;
      localStorage.setItem(cacheKey, JSON.stringify({ background_image: bg, logo_image: bg, timestamp: Date.now() }));
      return { background: bg, logo: bg };
    }
  } catch (e) {
    console.warn('RAWG proxy fetch failed, using fallbacks:', e);
  }
  return { background: null, logo: null };
}

async function fetchGameLogo(gameName: string): Promise<string | null> {
  if (!gameName) return null;

  const staticGame = getGameByName(gameName);
  if (staticGame?.logo) return staticGame.logo;

  let { background, logo } = readCachedGameImages(gameName);
  if (!background && !logo) {
    const fetched = await fetchAndCacheRawgImages(gameName);
    background = fetched.background;
    logo = fetched.logo;
  }

  return logo ?? background ?? null;
}

function computeAutoExtensionDate(
  tournament: { start_date?: string | null; end_date?: string | null },
  stageCompletionQueries: { isLoading: boolean; isError: boolean; data: unknown }[],
): Date | null {
  const startDate = tournament.start_date ? new Date(tournament.start_date) : null;
  const endDate = tournament.end_date ? new Date(tournament.end_date) : null;
  if (!startDate || !endDate) return null;

  const now = new Date();
  if (now < startDate || endDate < startDate) return null;
  if (now <= endDate) return null;

  const hasIncompleteStage = stageCompletionQueries.some(
    (q) => !q.isLoading && !q.isError && !q.data,
  );
  if (!hasIncompleteStage) return null;

  const newEnd = new Date(now);
  newEnd.setDate(newEnd.getDate() + 1);
  if (newEnd < startDate) {
    newEnd.setTime(startDate.getTime());
    newEnd.setDate(newEnd.getDate() + 1);
  }
  return newEnd;
}

async function resolveRegistrationMembers(
  tournamentId: string | undefined,
  teamName: string | null,
  preferRiotTag: boolean,
): Promise<string[] | null> {
  if (!tournamentId || !teamName) return null;

  const regRow = await apiClient.get<any>(
    `/api/tournaments/${tournamentId}/participants?team_name=${encodeURIComponent(teamName)}`,
  ).then(r => (Array.isArray(r) ? r[0] : r)).catch(() => null);

  if (!regRow?.team_members) return null;

  const tokens = parseTeamMembers(regRow.team_members);
  if (tokens.length === 0) return null;

  if (tokens.some(t => !looksLikeUuid(t))) return tokens;

  const names = await resolvePlayerNames(tokens, preferRiotTag);
  return names.length > 0 ? names : null;
}

const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  'scores:update': 'Scores',
  'teams:manage': 'Teams',
  'bracket:edit': 'Brackets',
  'announcements:send': 'Announcements',
  'disputes:assist': 'Disputes',
};

// ErrorBoundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }
  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
    // You can log errorInfo here if needed
    // console.error('ErrorBoundary caught:', _error, _errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center">
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
  const { user, profile } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const admin = useAdmin();

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useTournamentDashboard(slug);

  const {
    access: tournamentAccess,
    isLoading: accessLoading,
    isStaffAdmin,
    can,
  } = useTournamentAccess(slug);

  const tournament = dashboardData?.tournament;
  useStageRealtime({ tournamentId: tournament?.id });
  const tournamentModeFeatures = getEffectiveGameFeatures(tournament?.game || '', tournament?.game_mode);
  const registrationParticipantMode = getParticipantMode(tournament?.game || '', tournament?.game_mode);
  const participants = useMemo(
    () => (dashboardData?.participants || []) as Participant[],
    [dashboardData?.participants],
  );
  const stages = useMemo(
    () => dashboardData?.stages ?? [],
    [dashboardData?.stages],
  );
  const isOrganizer = tournamentAccess?.isOrganizer || dashboardData?.isOrganizer || false;
  const isPlatformAdmin = tournamentAccess?.isPlatformAdmin || false;
  const isSuperAdmin = isSuperAdminUser(admin, profile);
  const inOrganizerSession = currentRole === 'organizer' || isSuperAdmin;
  /** Owner powers when session role is Organizer OR user is a platform admin. */
  const canActAsOwner = (isOrganizer || isPlatformAdmin) && inOrganizerSession;

  const needsStageCompletionCheck = useMemo(() => {
    if (!canActAsOwner || !tournament?.end_date || stages.length === 0) return false;
    const start = tournament.start_date ? new Date(tournament.start_date) : null;
    if (!start || Number.isNaN(start.getTime())) return false;
    return Date.now() >= start.getTime();
  }, [canActAsOwner, tournament?.end_date, tournament?.start_date, stages.length]);

  const stageCompletionQueries = useQueries({
    queries: stages.map((stage) => ({
      queryKey: ['stage-completion', stage.id],
      queryFn: async () => {
        const raw = await apiClient.get<{ isComplete?: boolean }>(`/api/stages/${stage.id}/completion-status`);
        return Boolean(raw.isComplete);
      },
      enabled: Boolean(stage.id) && needsStageCompletionCheck,
      staleTime: 60_000,
    })),
  });

  const staffPermissions = useMemo(
    () => (tournamentAccess?.permissions ?? []) as StaffPermission[],
    [tournamentAccess?.permissions],
  );
  const hasTournamentStaffAccess = Boolean(
    tournamentAccess && !tournamentAccess.isOrganizer && tournamentAccess.role !== 'none',
  );

  // Player session: leave organizer dashboard unless staff on this tournament
  useEffect(() => {
    if (dashboardLoading || accessLoading || roleLoading || admin.loading) return;
    if (inOrganizerSession || hasTournamentStaffAccess) return;
    if (slug) {
      toast({
        title: 'Organizer mode required',
        description: 'Switch to Organizer role to manage this tournament.',
      });
      navigate(`/tournaments/${slug}`, { replace: true });
      return;
    }
    navigate('/unauthorized', { replace: true });
  }, [
    dashboardLoading,
    accessLoading,
    roleLoading,
    admin.loading,
    inOrganizerSession,
    hasTournamentStaffAccess,
    slug,
    navigate,
    toast,
  ]);
  const mockCount = dashboardData?.mockCount ?? 0;

  // BR game results management
  const isBR = isBattleRoyaleTournament(
    tournament?.game || '',
    getPersistedTournamentFormat(tournament),
  );
  const brConf = isBR ? getBRConfig(tournament?.game || '') : null;
  const brSettings = isBR ? tournament?.settings : null;
  const brPresetKey = brSettings?.brScoringPreset || brConf?.defaultPreset || '';
  const brScoringPreset = brSettings?.brCustomScoring
    || (brConf?.scoringPresets?.[brPresetKey])
    || { name: 'Default', placements: [10, 6, 5, 4, 3, 2, 1, 1], killPoints: 1, killCap: null };

  // Tab State & Direction
  const TAB_ORDER = ['overview', 'participants', 'stages', 'brackets', 'prizes', 'schedule', 'games', 'bans', 'disputes', 'announcements', 'staff', 'settings'];
  // activeTab is declared below with location.state init
  const [direction, setDirection] = useState(0);
  const prevTabRef = React.useRef(0);

  const handleTabChange = (newTab: string) => {
    if (newTab === 'disputes' && slug) {
      navigate(`/organizer/tournament/${slug}/disputes`);
      return;
    }
    const newIndex = TAB_ORDER.indexOf(newTab);
    const oldIndex = prevTabRef.current;

    setDirection(newIndex > oldIndex ? 1 : -1);
    prevTabRef.current = newIndex;
    setActiveTab(newTab);
    setSearchParams(prev => { prev.set('tab', newTab); return prev; }, { replace: true });
  };

  const loading = dashboardLoading;
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banTarget, setBanTarget] = useState<{ id: string, userId: string } | null>(null);
  const [gameLogo, setGameLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Participant | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [teamCaptain, setTeamCaptain] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState<boolean>(false);
  // Initialize activeTab from ?tab= query param, then location state, then default 'overview'
  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') || (location.state as { activeTab?: string })?.activeTab || 'overview'
  );

  const [removingUnchecked, setRemovingUnchecked] = useState(false);
  const [savingAssistedReporting, setSavingAssistedReporting] = useState(false);
  const [savingMapVeto, setSavingMapVeto] = useState(false);
  const [hasStaffAccess, setHasStaffAccess] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [participantsPage, setParticipantsPage] = useState(1);
  const [publishMockGuardOpen, setPublishMockGuardOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [pendingPublishMode, setPendingPublishMode] = useState<'private' | 'public' | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [draftInviteEmails, setDraftInviteEmails] = useState<string[]>([]);
  const [csvImportText, setCsvImportText] = useState('');
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [inviteSettingsEnabled, setInviteSettingsEnabled] = useState(false);
  const [inviteSettingsReservedSlots, setInviteSettingsReservedSlots] = useState(0);
  const [inviteSettingsExpiryDays, setInviteSettingsExpiryDays] = useState(7);
  const [savingInviteSettings, setSavingInviteSettings] = useState(false);
  const openedParticipantParamRef = React.useRef<string | null>(null);

  const {
    invitations: invitationQuery,
    createDrafts: createInviteDrafts,
    sendInvites,
    revokeInvite,
    resendInvites,
    importCsv,
  } = useTournamentInvitations(tournament?.id);

  const invitationResult = invitationQuery.data;
  const invitationRows = invitationResult?.invitations ?? [];
  const inviteSummary = invitationResult?.summary ?? EMPTY_INVITATION_SUMMARY;
  const registrationType = tournament?.registration_type ?? (tournament?.settings as any)?.registrationType ?? 'open';
  const maxTeams = tournament?.max_teams ?? tournament?.max_participants ?? 0;
  const configuredReservedInviteSlots = getReservedInviteSlotsFromTournament(tournament);
  const effectiveReservedInviteSlots = inviteSummary.reservedSlots > 0
    ? inviteSummary.reservedSlots
    : configuredReservedInviteSlots > 0
      ? configuredReservedInviteSlots
      : registrationType === 'invite_only'
        ? maxTeams
        : 0;
  const usedInviteSlots = inviteSummary.activeSlots + draftInviteEmails.length;
  const remainingInviteSlots = Math.max(0, inviteSummary.remainingSlots - draftInviteEmails.length);
  const showInvitedTeamsFeature = canConfigureInvitedTeams(tournament?.team_size ?? 1, isBR);
  const openRegistrationSlots = maxTeams > 0
    ? Math.max(maxTeams - effectiveReservedInviteSlots, 0)
    : null;
  const brRegisteredUnitCount = useMemo(
    () => resolveBRRegisteredUnitCount(participants, maxTeams, !!tournament?.check_in_required),
    [participants, maxTeams, tournament?.check_in_required],
  );

  const { clear: clearMockForPublish } = useMockTournament({
    tournamentId: tournament?.id ?? '',
    slug: slug ?? '',
    userId: user?.id,
  });

  const executePublish = useCallback(async (mode: 'private' | 'public', clearMocksFirst = false) => {
    if (!tournament?.id || isPublishing) return;
    setIsPublishing(true);
    try {
      if (clearMocksFirst) {
        await clearMockForPublish.mutateAsync();
      }
      const payload = launchStateToUpdatePayload(mode, tournament.status);
      await apiClient.put(`/api/tournaments/${tournament.id}`, payload);
      await refetchDashboard();
      toast({
        title: mode === 'private' ? 'Published privately' : 'Published publicly',
        description: mode === 'private'
          ? 'Your tournament is live via direct link. It will not appear in public listings.'
          : 'Your tournament is now discoverable and open for registration.',
      });
      setPublishDialogOpen(false);
      setPublishMockGuardOpen(false);
      setPendingPublishMode(null);
    } catch (err: unknown) {
      toast({
        title: 'Publish failed',
        description: getApiErrorMessage(err, { context: 'tournamentPublish' }),
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  }, [tournament?.id, tournament?.status, isPublishing, clearMockForPublish, refetchDashboard, toast]);

  const requestPublish = useCallback((mode: 'private' | 'public') => {
    if (isPublishing) return;
    if (mockCount > 0) {
      setPendingPublishMode(mode);
      setPublishDialogOpen(false);
      setPublishMockGuardOpen(true);
      return;
    }
    void executePublish(mode);
  }, [mockCount, isPublishing, executePublish]);

  const handleMakePrivate = useCallback(async () => {
    if (!tournament?.id) return;
    try {
      const payload = makePrivateUpdatePayload(tournament.status);
      await apiClient.put(`/api/tournaments/${tournament.id}`, payload);
      refetchDashboard();
      toast({
        title: 'Tournament is now private',
        description: 'It remains accessible via direct link but is hidden from public listings.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Update failed',
        description: getApiErrorMessage(err, { context: 'tournamentPrivate' }),
        variant: 'destructive',
      });
    }
  }, [tournament?.id, tournament?.status, refetchDashboard, toast]);

  const activeParticipants = useMemo(
    () => participants.filter((participant) => !['rejected', 'cancelled', 'disqualified'].includes(participant.status)),
    [participants],
  );
  const totalParticipantPages = Math.max(1, Math.ceil(activeParticipants.length / PARTICIPANTS_PAGE_SIZE));
  const pagedParticipants = useMemo(() => {
    const start = (participantsPage - 1) * PARTICIPANTS_PAGE_SIZE;
    return activeParticipants.slice(start, start + PARTICIPANTS_PAGE_SIZE);
  }, [activeParticipants, participantsPage]);
  const participantRangeStart = activeParticipants.length === 0
    ? 0
    : ((participantsPage - 1) * PARTICIPANTS_PAGE_SIZE) + 1;
  const participantRangeEnd = Math.min(participantsPage * PARTICIPANTS_PAGE_SIZE, activeParticipants.length);

  // Sync staff access state
  useEffect(() => {
    setHasStaffAccess(hasTournamentStaffAccess);
  }, [hasTournamentStaffAccess]);

  useEffect(() => {
    if (!tournament) return;
    const reserved = getReservedInviteSlotsFromTournament(tournament);
    setInviteSettingsEnabled(reserved > 0);
    setInviteSettingsReservedSlots(reserved > 0 ? reserved : defaultReservedInviteSlots(maxTeams));
    setInviteSettingsExpiryDays(getInviteExpiryDaysFromTournament(tournament));
  }, [tournament, maxTeams]);

  // Overdue Check & Auto-Extension Effect
  useEffect(() => {
    const checkOverdue = async () => {
      if (!tournament || !canActAsOwner || stages.length === 0) return;
      if (tournament.status === 'completed') return;

      const extensionDate = computeAutoExtensionDate(tournament, stageCompletionQueries);
      if (!extensionDate) return;

      try {
        await apiClient.put(`/api/tournaments/${tournament.id}`, { endDate: extensionDate.toISOString() });
        toast({
          title: 'Tournament Extended',
          description: 'Tournament end time has passed with incomplete stages. Extended by 24 hours.',
          variant: 'default',
          duration: 6000,
        });
        refetchDashboard();
      } catch (err) {
        console.error('Error auto-extending tournament:', err);
      }
    };

    checkOverdue();
  }, [tournament, canActAsOwner, stages.length, stageCompletionQueries, refetchDashboard, toast]);


  const handleTeamClick = useCallback(async (participant: Participant) => {
    setSelectedTeam(participant);
    setTeamLoading(true);
    setTeamCaptain(null);
    try {
      const rawTokens = parseTeamMembers(participant.team_members);
      if (rawTokens.length > 0 && !rawTokens.some(looksLikeUuid)) {
        setSelectedTeamMembers(rawTokens);
      }

      const identity = await resolveTeamIdentity(participant);
      if (identity.logoUrl && selectedTeam) selectedTeam.team_logo = identity.logoUrl;

      const resolved = await resolveRegistrationMembers(
        tournament?.id, participant.team_name, tournamentModeFeatures.assistedReporting,
      );
      if (resolved) {
        setSelectedTeamMembers(resolved);
        setTeamLoading(false);
        setTeamDialogOpen(true);
        return;
      }

      setTeamLoading(false);
      setTeamDialogOpen(true);
    } catch (e) {
      console.error(e);
      setTeamLoading(false);
    }
  }, [tournament?.id, selectedTeam, tournamentModeFeatures.assistedReporting]);

  // Data managed by useTournamentDashboard


  useEffect(() => {
    if (activeTab !== 'participants') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activeTab]);

  useEffect(() => {
    setParticipantsPage(1);
  }, [activeTab, activeParticipants.length]);

  useEffect(() => {
    setParticipantsPage((current) => Math.min(current, totalParticipantPages));
  }, [totalParticipantPages]);



  // Real-time subscriptions removed to eliminate dashboard lag as requested by user.

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
      case 'open':
      case 'upcoming': return 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
      case 'ongoing': return 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
      case 'completed': return 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
      case 'cancelled': return 'border-gray-500';
      default: return 'border-white/10';
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

  const handleAddInviteEmail = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!isValidInviteEmail(email)) {
      toast({ title: 'Invalid email', description: 'Enter a valid captain email address.', variant: 'destructive' });
      return;
    }
    if (draftInviteEmails.includes(email) || invitationRows.some((invite) => invite.email.toLowerCase() === email && invite.status !== 'revoked')) {
      toast({ title: 'Already added', description: `${email} already has an invitation.` });
      return;
    }
    if (effectiveReservedInviteSlots <= 0) {
      toast({ title: 'Invite slots not configured', description: 'Add reserved invite slots before sending guaranteed invite codes.', variant: 'destructive' });
      return;
    }
    if (effectiveReservedInviteSlots > 0 && remainingInviteSlots <= 0) {
      toast({ title: 'No invite slots remaining', description: 'Increase reserved invite slots or revoke an existing invitation.', variant: 'destructive' });
      return;
    }
    setDraftInviteEmails((current) => [...current, email]);
    setInviteEmail('');
  };

  const handleSendInviteEmails = async () => {
    if (!tournament?.id || draftInviteEmails.length === 0) return;
    try {
      const created = await createInviteDrafts.mutateAsync({ emails: draftInviteEmails });
      const invitationIds = created.map((invite) => invite.id).filter(Boolean);
      await sendInvites.mutateAsync(invitationIds.length > 0 ? { invitationIds } : {});
      setDraftInviteEmails([]);
      toast({ title: 'Invitations sent', description: 'Codes were generated and emailed to the selected captains.' });
    } catch (error: any) {
      toast({ title: 'Unable to send invitations', description: error.message || 'Please try again later.', variant: 'destructive' });
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await revokeInvite.mutateAsync(invitationId);
      toast({ title: 'Invitation revoked', description: 'The code can no longer be redeemed.' });
    } catch (error: any) {
      toast({ title: 'Unable to revoke invitation', description: error.message || 'Please try again later.', variant: 'destructive' });
    }
  };

  // Payment rejection
  const [rejectingPayment, setRejectingPayment] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);

  const handleRejectPayment = async (participantId: string) => {
    if (!tournament?.id) return;
    setRejectingPayment(participantId);
    try {
      await apiClient.post(`/api/tournaments/${tournament.id}/participants/${participantId}/reject-payment`, {
        reason: rejectionReason || 'Payment could not be verified.'
      });
      toast({ title: 'Payment Rejected', description: 'The participant has been notified.' });
      setShowRejectDialog(null);
      setRejectionReason('');
      refetchDashboard();
    } catch (error: any) {
      toast({ title: 'Rejection Failed', description: error.message, variant: 'destructive' });
    } finally {
      setRejectingPayment(null);
    }
  };

  const handleSaveInviteSettings = async () => {
    if (!tournament?.id) return;

    if (inviteSettingsEnabled) {
      if (inviteSettingsReservedSlots < 1) {
        toast({ title: 'Invalid configuration', description: `Reserve at least 1 slot for invited ${inviteParticipantLabel}.`, variant: 'destructive' });
        return;
      }
      if (maxTeams > 0 && inviteSettingsReservedSlots > maxTeams) {
        toast({ title: 'Invalid configuration', description: 'Reserved invite slots cannot exceed max teams.', variant: 'destructive' });
        return;
      }
      if (inviteSettingsReservedSlots < inviteSummary.activeSlots) {
        toast({
          title: 'Cannot reduce slots',
          description: `${inviteSummary.activeSlots} active invitation${inviteSummary.activeSlots === 1 ? '' : 's'} — revoke some before lowering reserved slots.`,
          variant: 'destructive',
        });
        return;
      }
    } else if (inviteSummary.activeSlots > 0) {
      toast({
        title: `Cannot disable invited ${inviteParticipantLabel}`,
        description: 'Revoke all active invitations before disabling reserved invite slots.',
        variant: 'destructive',
      });
      return;
    }

    setSavingInviteSettings(true);
    try {
      const currentSettings = typeof tournament.settings === 'object' && tournament.settings
        ? tournament.settings as Record<string, unknown>
        : {};
      const payload = buildInviteSettingsPayload(
        inviteSettingsEnabled,
        inviteSettingsReservedSlots,
        inviteSettingsExpiryDays,
        currentSettings,
      );
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        reservedInviteSlots: payload.reservedInviteSlots,
        inviteExpiryDays: payload.inviteExpiryDays,
        settings: payload.settings,
      });
      toast({
        title: inviteSettingsEnabled ? 'Invited teams configured' : 'Invited teams disabled',
        description: inviteSettingsEnabled
          ? `${payload.reservedInviteSlots} slot${payload.reservedInviteSlots === 1 ? '' : 's'} reserved. Send codes from the Participants tab.`
          : 'Reserved invite slots have been cleared.',
      });
      refetchDashboard();
      invitationQuery.refetch();
    } catch (error: any) {
      toast({
        title: 'Failed to update invite settings',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSavingInviteSettings(false);
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
      refetchDashboard();
      queryClient.invalidateQueries({ queryKey: ['bracket-graph'] });
      queryClient.invalidateQueries({ queryKey: ['bracket-versions'] });
    } catch (error: any) {
      console.error('Error banning participant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to ban participant.',
        variant: 'destructive'
      });
    }
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
  const checkInWindow = useMemo(
    () => resolveCheckInWindow({
      startDate: tournament?.start_date,
      checkInDeadline: tournament?.check_in_deadline,
      settings: tournament?.settings,
    }),
    [tournament?.start_date, tournament?.check_in_deadline, tournament?.settings],
  );

  const checkInEligibleParticipants = useMemo(
    () => participants.filter((participant) => isActiveRegistration(participant.status)),
    [participants],
  );
  const checkedInParticipants = useMemo(
    () => countCheckedInParticipants(participants),
    [participants],
  );
  const pendingCheckInParticipants = useMemo(
    () => countPendingCheckInParticipants(participants),
    [participants],
  );
  const checkInProgress = checkInEligibleParticipants.length
    ? Math.round((checkedInParticipants / checkInEligibleParticipants.length) * 100)
    : 0;
  const isCheckInNotYetOpen = hasCheckInNotOpenedYet(checkInWindow, new Date(now));
  const isCheckInClosed = hasCheckInClosed(checkInWindow, new Date(now));
  const checkInCountdownTargetMs = isCheckInNotYetOpen
    ? checkInWindow.opensAt?.getTime()
    : !isCheckInClosed
      ? checkInWindow.closesAt?.getTime()
      : null;
  const checkInCountdown =
    checkInCountdownTargetMs != null && checkInCountdownTargetMs > now
      ? formatCountdown(checkInCountdownTargetMs - now)
      : null;
  const checkInCountdownLabel = isCheckInNotYetOpen ? 'until open' : 'left';
  const showCheckInSummary = Boolean(
    effectiveCheckInRequired && checkInEligibleParticipants.length > 0,
  );

  const staffPermissionSummary =
    staffPermissions.map((perm) => STAFF_PERMISSION_LABELS[perm] || perm).join(', ') || 'Limited access';

  const canManageStaff = canActAsOwner;
  const canAssistDisputes = canActAsOwner || isStaffAdmin || tournamentAccess?.isPlatformAdmin || staffPermissions.includes('disputes:assist');
  const { badgeCount: disputeBadgeCount, refresh: _refreshDisputeUnread } = useOrganizerDisputeUnread(
    tournament?.id,
    canAssistDisputes,
  );
  const canManageTeams = canActAsOwner || isStaffAdmin || staffPermissions.includes('teams:manage');
  const canEditBracket =
    can('bracket:edit')
    && (inOrganizerSession || hasTournamentStaffAccess || Boolean(tournamentAccess?.isPlatformAdmin));
  const canSendAnnouncements = canActAsOwner || isStaffAdmin || staffPermissions.includes('announcements:send');

  const PermissionNotice = ({ message }: { message: string }) => (
    <Card className="bg-[#080d18] border border-white/5">
      <CardContent className="py-6 text-center text-gray-400 text-sm">{message}</CardContent>
    </Card>
  );

  const renderTabLabel = (tab: string) => {
    if (tab !== 'disputes' || disputeBadgeCount <= 0) {
      return tab;
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        {tab}
        <span
          className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-black"
          title={`${disputeBadgeCount} pending dispute${disputeBadgeCount === 1 ? '' : 's'}`}
        >
          {disputeBadgeCount > 9 ? '9+' : disputeBadgeCount}
        </span>
      </span>
    );
  };

  const renderCheckInBadge = (participant: Participant) => {
    // Payment status badges take priority
    if (participant.payment_status === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-amber-400/40 bg-amber-500/10 text-amber-200">
          Payment Pending
        </span>
      );
    }
    if (participant.payment_status === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-red-500/40 bg-red-500/10 text-red-300">
          Rejected
        </span>
      );
    }

    if (participant.status === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-amber-400/40 bg-amber-500/10 text-amber-200">
          Pending Approval
        </span>
      );
    }

    // Check-in badges (only when check-in is required)
    if (effectiveCheckInRequired) {
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
          Awaiting Check-in
        </span>
      );
    }

    // Approved (no check-in required or paid tournament approved)
    if (participant.status === 'approved') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-green-500/40 bg-green-500/10 text-green-300">
          Approved
        </span>
      );
    }

    return null;
  };

  // Fetch game background from RAWG API
  useEffect(() => {
    if (!tournament?.game) return;
    fetchGameLogo(tournament.game).then((logo) => {
      if (logo) setGameLogo(logo);
    });
  }, [tournament?.game]);

  useEffect(() => {
    const participantId = searchParams.get('participant');
    if (activeTab !== 'participants' || !participantId || openedParticipantParamRef.current === participantId || participants.length === 0) {
      return;
    }

    const participant = participants.find((item) => item.id === participantId);
    if (!participant) return;

    openedParticipantParamRef.current = participantId;
    void handleTeamClick(participant);
  }, [activeTab, participants, searchParams, handleTeamClick]);

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
            <div className="h-8 w-1/3 bg-zinc-800/20 rounded"></div>
            <div className="h-64 bg-zinc-800/20 rounded"></div>
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
          <div className="text-center max-w-md mx-auto bg-[#0d0d10] border border-white/10 p-8 rounded-none">
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
            <button type="button"
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-red-600 hover:bg-red-500 font-bold px-8 py-6 rounded-none transition-all hover:scale-105"
            >
              Back to Tournaments
            </button>
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

  const tournamentLinkUrl = slug
    ? `${window.location.origin}/tournaments/${slug}`
    : tournament?.id
      ? `${window.location.origin}/tournaments/${tournament.id}`
      : '';
  const showDirectLinks = Boolean(tournament && (!tournament.is_public || tournament.status === 'draft'));
  const inviteParticipantLabel = (tournament?.team_size ?? 1) > 1 ? 'teams' : 'players';

  const copyTournamentLink = async (url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Tournament link copied to clipboard.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy the link. Copy it manually from the address bar.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="esportra-ambient-page relative min-h-screen overflow-hidden font-sans text-white">
      <main className="container mx-auto px-4 py-8 relative z-10 font-heading">
        {hasStaffAccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-none border border-cyan-500/20 bg-cyan-950/30 text-sm text-cyan-200 px-4 py-2 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            Staff Mode: <span className="font-medium text-cyan-100">{staffPermissionSummary}</span>
          </motion.div>
        )}

        {/* HERO BANNER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6"
        >
          <div className="relative flex flex-col lg:flex-row gap-8 justify-between z-10">
            {/* Left: Identity */}
            <div className="flex gap-6 items-start">
              {/* Big Game Logo with Glow */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-none bg-[#09090b] border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden transition-transform duration-500">
                  {gameLogo && !logoError ? (
                    <img
                      src={gameLogo}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <GamepadIcon className="w-10 h-10 text-rose-400" />
                  )}
                </div>
                {/* Glowing dot */}
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-[#09090b] ${getStatusColor(tournament.status).includes('red') ? 'bg-red-500' : getStatusColor(tournament.status).includes('emerald') ? 'bg-emerald-500' : getStatusColor(tournament.status).includes('purple') ? 'bg-rose-500' : 'bg-gray-500'}`} />
              </div>

              <div className="pt-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                    {tournament.is_online ? 'Online' : 'LAN'} Event
                  </span>
                  {tournament.game && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                      {tournament.game}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-2 min-h-[1.2em]">
                  {tournament.name}
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
                  {tournament.winner_team_name && (
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
                {canActAsOwner && tournament.status === 'draft' && (
                  <CommandButton
                    onClick={() => setPublishDialogOpen(true)}
                    variant="primary"
                    size="sm"
                  >
                    <Globe className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
                    Publish Tournament
                  </CommandButton>
                )}

                {canActAsOwner && tournament.status !== 'draft' && !tournament.is_public && (
                  <CommandButton
                    onClick={() => requestPublish('public')}
                    variant="primary"
                    size="sm"
                  >
                    <Globe className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
                    Make Public
                  </CommandButton>
                )}

                {canActAsOwner && tournament.status !== 'draft' && tournament.is_public && (
                  <CommandButton
                    onClick={() => void handleMakePrivate()}
                    variant="secondary"
                    size="sm"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Make Private
                  </CommandButton>
                )}

                <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                  <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Publish Tournament</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Choose how players can discover this tournament. You can change visibility later from the dashboard.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <CommandButton
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start h-auto py-4 px-4"
                        disabled={isPublishing}
                        onClick={() => requestPublish('private')}
                      >
                        {isPublishing ? (
                          <Loader2 className="w-5 h-5 mr-3 shrink-0 animate-spin text-purple-400" />
                        ) : (
                          <EyeOff className="w-5 h-5 mr-3 shrink-0 text-purple-400" />
                        )}
                        <div className="text-left">
                          <div className="font-bold text-white">Publish privately</div>
                          <div className="text-xs text-gray-500 font-normal mt-0.5">Link-only access. Hidden from browse and search.</div>
                        </div>
                      </CommandButton>
                      <CommandButton
                        variant="primary"
                        size="sm"
                        className="w-full justify-start h-auto py-4 px-4"
                        disabled={isPublishing}
                        onClick={() => requestPublish('public')}
                      >
                        {isPublishing ? (
                          <Loader2 className="w-5 h-5 mr-3 shrink-0 animate-spin" />
                        ) : (
                          <Globe className="w-5 h-5 mr-3 shrink-0" />
                        )}
                        <div className="text-left">
                          <div className="font-bold">Publish publicly</div>
                          <div className="text-xs opacity-80 font-normal mt-0.5">Listed in discovery. Open for registration.</div>
                        </div>
                      </CommandButton>
                    </div>
                    <DialogFooter>
                      <CommandButton variant="ghost" size="sm" onClick={() => setPublishDialogOpen(false)}>
                        Cancel
                      </CommandButton>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog
                  open={publishMockGuardOpen}
                  onOpenChange={(open) => {
                    setPublishMockGuardOpen(open);
                    if (!open) setPendingPublishMode(null);
                  }}
                >
                  <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        Mock teams detected
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-zinc-400">
                        This tournament has {mockCount} mock team{mockCount !== 1 ? 's' : ''} from simulation
                        mode. They must be removed before publishing.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <CommandButton variant="secondary" size="sm">Cancel</CommandButton>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <CommandButton
                          variant="primary"
                          size="sm"
                          disabled={isPublishing}
                          onClick={async (event) => {
                            event.preventDefault();
                            const mode = pendingPublishMode ?? 'public';
                            await executePublish(mode, true);
                          }}
                        >
                          {isPublishing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Publishing...
                            </>
                          ) : (
                            'Clear & Publish'
                          )}
                        </CommandButton>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {canActAsOwner && tournament.status !== 'completed' && tournament.status !== 'draft' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <CommandButton
                        variant="secondary"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2 transition-transform group-hover:rotate-12" />
                        Mark as Finished
                      </CommandButton>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Lock className="h-5 w-5 text-amber-400" />
                          Finish Tournament
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will finalize results and lock bracket scores, placements, and stage settings. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <CommandButton variant="secondary" size="sm">Cancel</CommandButton>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <CommandButton
                            variant="danger"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); handleCompleteTournament(); }}
                          >
                            Finish Tournament
                          </CommandButton>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}


                {canActAsOwner && (
                  <CommandButton
                    onClick={handleEditTournament}
                    variant="warning"
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2 transition-transform group-hover:-rotate-12" />
                    Edit Tournament
                  </CommandButton>
                )}

                <CommandButton
                  onClick={() => navigate(`/tournaments/${slug}`)}
                  variant="secondary"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                  View Page
                </CommandButton>

                {showDirectLinks && (
                  <CommandButton
                    onClick={() => void copyTournamentLink(tournamentLinkUrl)}
                    variant="secondary"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Tournament Link
                  </CommandButton>
                )}
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
                {formatCurrency(parseFloat(tournament.prize_pool || '0'), tournament.currency)}
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
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-rose-400 text-xs font-bold uppercase">
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
                <SelectTrigger className="w-full h-12 bg-[#09090b] border-white/10 text-white rounded-none px-4 font-bold tracking-wide">
                  <SelectValue placeholder="Select View" />
                </SelectTrigger>
                <SelectContent className="bg-[#09090b] border-white/10 text-white z-[60]">
                  {(() => {
                    const isBRMobile = isBattleRoyaleTournament(
                      tournament?.game || '',
                      getPersistedTournamentFormat(tournament),
                    );
                    const mobileTabs = isBRMobile
                      ? ['overview', 'participants', 'stages', 'prizes', 'schedule', 'games', 'bans', 'disputes', 'announcements', 'staff', 'settings']
                      : ['overview', 'participants', 'stages', 'brackets', 'prizes', 'schedule', 'bans', 'disputes', 'announcements', 'staff', 'settings'];
                    return mobileTabs.map((tab) => {
                    // Filter tabs based on permissions
                    if (tab === 'bans' && !canManageTeams) return null;
                    if (tab === 'disputes' && !canAssistDisputes) return null;
                    if (tab === 'announcements' && !canSendAnnouncements) return null;
                    if (tab === 'schedule' && !canEditBracket) return null;
                    if (tab === 'staff' && !canManageStaff) return null;
                    if (tab === 'settings' && !canActAsOwner) return null;

                    return (
                      <SelectItem key={tab} value={tab} className="capitalize font-medium focus:bg-white/10 focus:text-white cursor-pointer py-3">
                        {renderTabLabel(tab)}
                      </SelectItem>
                    );
                  });
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop View: Floating Animated Tabs */}
          <div className="hidden md:flex sticky top-4 z-40 mb-8 justify-center perspective-1000">
            <motion.div
              className="p-1 bg-[#0d0d10] border border-white/10 rounded-none shadow-2xl inline-flex relative overflow-hidden"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                {(() => {
                  const isBR = isBattleRoyaleTournament(
    tournament?.game || '',
    getPersistedTournamentFormat(tournament),
  );
                  const tabs = isBR
                    ? ['overview', 'participants', 'stages', 'prizes', 'schedule', 'games', 'bans', 'disputes', 'announcements', 'staff', 'settings']
                    : ['overview', 'participants', 'stages', 'brackets', 'prizes', 'schedule', 'bans', 'disputes', 'announcements', 'staff', 'settings'];
                  return tabs.map((tab) => {
                  if (tab === 'brackets') {
                    return (
                      <CommandTabButton
                        key="brackets"
                        onClick={() => navigate(`/tournaments/${slug}/brackets`)}
                        disabled={!canEditBracket}
                        className="flex h-full items-center justify-center px-6 py-2.5 text-sm capitalize disabled:opacity-50"
                      >
                        Brackets
                      </CommandTabButton>
                    );
                  }

                  if (tab === 'bans' && !canManageTeams) return null;
                  if (tab === 'disputes' && !canAssistDisputes) return null;
                  if (tab === 'schedule' && !canEditBracket) return null;
                  if (tab === 'staff' && !canManageStaff) return null;
                  if (tab === 'settings' && !canActAsOwner) return null;

                  return (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="h-auto rounded-none border border-transparent px-6 py-2.5 text-sm font-medium capitalize text-gray-400 transition-colors hover:border-white/10 hover:bg-white/5 hover:text-white data-[state=active]:border-rose-500 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                    >
                      <span className="relative z-10">{renderTabLabel(tab)}</span>
                    </TabsTrigger>
                  );
                });
                })()}
              </TabsList>
            </motion.div>
          </div>


          {/* Premium Tab Navigation */}


          <div className="tournament-dashboard-tab-content relative min-h-[400px]">
            <AnimatePresence mode="wait" custom={direction}>
              {activeTab === 'overview' && (
                <TabsContent value="overview" forceMount key="overview">
                  <TabTransition direction={direction}>
                    <Card className="bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden mb-6">
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
                            <span className="text-xl font-bold text-white">{tournament.entry_fee ? formatCurrency(parseFloat(tournament.entry_fee), tournament.currency) : 'Free'}</span>
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
                    {/* Mock Mode panel pinned above stages; always show clear controls while mocks exist. */}
                    {(isOrganizer || isPlatformAdmin) && (tournament.status === 'draft' || mockCount > 0) && (
                      <div className="mb-4">
                        <MockModePanel
                          tournamentId={tournament.id}
                          slug={slug ?? ''}
                          maxTeams={tournament.max_teams}
                          mockCount={mockCount}
                          canGenerate={tournament.status === 'draft' || mockCount > 0}
                        />
                      </div>
                    )}
                    {isBR ? (
                      <BRStageManagementTab
                        tournamentId={tournament.id}
                        stages={stages}
                        participants={participants}
                        maxTeams={tournament.max_teams ?? tournament.max_participants ?? null}
                        maxParticipants={tournament.max_participants ?? null}
                        teamSize={tournament.team_size ?? null}
                        gameMode={tournament.game_mode ?? null}
                        participantMode={registrationParticipantMode}
                        game={tournament.game || ''}
                        tournamentSettings={brSettings as Record<string, unknown> | null}
                        scoringPreset={brScoringPreset}
                        checkInRequired={!!tournament.check_in_required}
                        onUpdate={() => refetchDashboard()}
                        locked={tournament.status === 'completed' && !isSuperAdmin}
                      />
                    ) : (
                      <StageManagementTab
                        tournamentId={tournament.id}
                        stages={stages}
                        onUpdate={() => refetchDashboard()}
                        game={tournament.game || ''}
                        isPublic={tournament.is_public}
                        checkInRequired={!!tournament.check_in_required}
                        locked={tournament.status === 'completed' && !isSuperAdmin}
                      />
                    )}
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'prizes' && canActAsOwner && (
                <TabsContent value="prizes" forceMount key="prizes">
                  <TabTransition direction={direction}>
                    <PrizeDistributionTab tournament={tournament} locked={tournament.status === 'completed' && !isSuperAdmin} />
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'schedule' && canEditBracket && (
                <TabsContent value="schedule" forceMount key="schedule">
                  <TabTransition direction={direction}>
                    {isBR ? (
                      <BRScheduleTab
                        tournamentId={tournament.id}
                        tournamentStartDate={tournament.start_date || null}
                        tournamentEndDate={tournament.end_date || null}
                        stages={stages}
                        registeredUnitCount={brRegisteredUnitCount}
                        onUpdate={() => refetchDashboard()}
                        locked={tournament.status === 'completed' && !isSuperAdmin}
                      />
                    ) : (
                      <div className="space-y-6">
                        <Card className="border-white/10 bg-[#0a0a0c]/90">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                              <Calendar className="h-5 w-5 text-rose-400" />
                              Schedule
                            </CardTitle>
                            <p className="text-sm text-zinc-400">
                              Configure match scheduling, check-in windows, and round deadlines for each stage.
                            </p>
                          </CardHeader>
                        </Card>

                        {stages.length === 0 ? (
                          <Card className="border-dashed border-white/10 bg-[#0a0a0c]/70">
                            <CardContent className="p-10 text-center text-sm text-zinc-500">
                              Add a stage before configuring match schedules.
                            </CardContent>
                          </Card>
                        ) : (
                          [...stages]
                            .sort((a: any, b: any) => (a.stage_order ?? 0) - (b.stage_order ?? 0))
                            .map((stage: any) => {
                              const schedulingConfig = typeof stage.scheduling_config === 'string'
                                ? (() => { try { return JSON.parse(stage.scheduling_config); } catch { return null; } })()
                                : stage.scheduling_config;
                              const selfPlayEnabled = Boolean(schedulingConfig?.self_play_enabled);

                              return (
                                <Card key={stage.id} className="border-white/10 bg-[#0a0a0c]/90">
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between gap-3 text-white">
                                      <span>{stage.name}</span>
                                      <Badge className="border-white/10 bg-white/5 text-zinc-300">
                                        {(stage.format || 'single_elimination').replace(/_/g, ' ')}
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                    <StageSchedulingConfig
                                      stageId={stage.id}
                                      stageFormat={stage.format || 'single_elimination'}
                                      gameName={tournament.game || ''}
                                      onConfigChange={() => refetchDashboard()}
                                    />
                                    <RoundSchedulingPanel
                                      stageId={stage.id}
                                      stageFormat={stage.format || 'single_elimination'}
                                      tournamentStartDate={tournament.start_date || null}
                                      tournamentEndDate={tournament.end_date || null}
                                      selfPlayEnabled={selfPlayEnabled}
                                      onScheduleApplied={() => refetchDashboard()}
                                    />
                                  </CardContent>
                                </Card>
                              );
                            })
                        )}
                      </div>
                    )}
                  </TabTransition>
                </TabsContent>
              )}

              {/* BR Games Tab */}
              {activeTab === 'games' && isBR && (
                <TabsContent value="games" forceMount key="games">
                  <TabTransition direction={direction}>
                    <BRGamesTab
                      tournamentId={tournament!.id}
                      tournamentStartDate={tournament.start_date || null}
                      tournamentEndDate={tournament.end_date || null}
                      stages={stages}
                      game={tournament.game || ''}
                      tournamentSettings={brSettings as Record<string, unknown> | null}
                      teamSize={tournament.team_size ?? 1}
                      maxTeams={tournament.max_teams ?? tournament.max_participants ?? null}
                      participants={participants}
                      scoringPreset={brScoringPreset}
                      checkInRequired={!!tournament.check_in_required}
                      locked={tournament.status === 'completed' && !isSuperAdmin}
                    />
                  </TabTransition>
                </TabsContent>
              )}

              {activeTab === 'participants' && (
                <TabsContent value="participants" forceMount key="participants">
                  <TabTransition direction={direction}>
                    {showCheckInSummary && (
                      <Card className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6 group">
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
                              {checkInWindow.opensAt && checkInWindow.closesAt
                                ? `Opens ${checkInWindow.opensAt.toLocaleString()} · Closes ${checkInWindow.closesAt.toLocaleString()}`
                                : 'Check-in schedule not set'}
                              {checkInCountdown && (
                                <motion.span
                                  key={checkInCountdown}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-rose-400 font-bold ml-2"
                                >
                                  · {checkInCountdown} {checkInCountdownLabel}
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
                              : isCheckInNotYetOpen
                                ? 'Opens Soon'
                              : checkInProgress === 100
                                ? 'Ready'
                                : 'Check-In Open'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-0 space-y-6 relative z-10">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0">
                            <div className="flex flex-col sm:border-r border-white/10 px-4 gap-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Participants</span>
                              <span className="text-3xl font-black text-white tracking-tight">{checkInEligibleParticipants.length}</span>
                            </div>
                            <div className="flex flex-col sm:border-r border-white/10 px-4 gap-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Checked In</span>
                              <span className="text-3xl font-black text-rose-400 tracking-tight">{checkedInParticipants}</span>
                            </div>
                            <div className="flex flex-col px-4 gap-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending</span>
                              <span className="text-3xl font-black text-amber-400 tracking-tight">{pendingCheckInParticipants}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                              <span>Progress</span>
                              <span className="text-white">{checkInProgress}%</span>
                            </div>
                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div
                                className="h-full bg-rose-500 relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, checkInProgress)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12" />
                              </motion.div>
                            </div>
                          </div>

                          {canActAsOwner && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                              <div className="flex gap-2">
                                <OutlineButton
                                  type="button"
                                  size="sm"
                                  onClick={() => refetchDashboard()}
                                >
                                  Refresh
                                </OutlineButton>
                              </div>
                              <DangerButton
                                onClick={handleRemoveUncheckedParticipants}
                                disabled={pendingCheckInParticipants <= 0 || removingUnchecked}
                                className="w-full sm:w-auto shadow-lg shadow-red-900/20"
                                size="sm"
                              >
                                {removingUnchecked
                                  ? 'Clearing...'
                                  : registrationParticipantMode === 'solo'
                                    ? 'Remove unchecked players'
                                    : 'Remove unchecked teams'}
                              </DangerButton>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    {canManageTeams && showInvitedTeamsFeature && (
                      <Card className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6 group">
                        <CardHeader className="p-0 border-b border-white/5 pb-4 mb-6 relative z-10">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <CardTitle className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                                <Mail className="h-5 w-5 text-rose-300" />
                                Invite Participants
                              </CardTitle>
                              <p className="mt-1 text-sm text-gray-400">
                                Email-locked codes let invited {inviteParticipantLabel} register into this tournament.
                                {openRegistrationSlots !== null && effectiveReservedInviteSlots > 0 && (
                                  <> {openRegistrationSlots} open registration slot{openRegistrationSlots === 1 ? '' : 's'} remain alongside {effectiveReservedInviteSlots} reserved.</>
                                )}
                              </p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-3">
                                <p className="text-gray-500 uppercase tracking-wider">Reserved</p>
                                <p className="mt-1 text-lg font-black text-white">{effectiveReservedInviteSlots}</p>
                              </div>
                              <div className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-3">
                                <p className="text-gray-500 uppercase tracking-wider">Used</p>
                                <p className="mt-1 text-lg font-black text-white">{usedInviteSlots}</p>
                              </div>
                              <div className="rounded-none border border-white/10 bg-white/[0.03] px-4 py-3">
                                <p className="text-gray-500 uppercase tracking-wider">Remaining</p>
                                <p className="mt-1 text-lg font-black text-emerald-300">{remainingInviteSlots}</p>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0 relative z-10 space-y-5">
                          {/* Invitation stats breakdown */}
                          {invitationRows.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
                              {[
                                { label: 'Draft', value: invitationRows.filter(i => i.status === 'draft').length, color: 'text-amber-300' },
                                { label: 'Sent', value: invitationRows.filter(i => i.status === 'sent').length, color: 'text-amber-300' },
                                { label: 'Redeemed', value: invitationRows.filter(i => i.status === 'redeemed').length, color: 'text-emerald-300' },
                                { label: 'Expired', value: invitationRows.filter(i => i.status === 'expired').length, color: 'text-red-300' },
                                { label: 'Revoked', value: invitationRows.filter(i => i.status === 'revoked').length, color: 'text-zinc-400' },
                              ].map((stat) => (
                                <div key={stat.label} className="rounded-none border border-white/5 bg-white/[0.02] px-2 py-2">
                                  <p className="text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                                  <p className={`mt-0.5 text-sm font-bold ${stat.color}`}>{stat.value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {invitationRows.filter(i => i.status === 'draft').length > 0 && (
                            <div className="flex items-center gap-3 rounded-none border border-amber-500/20 bg-amber-500/10 p-3">
                              <span className="text-sm text-amber-100">
                                {invitationRows.filter(i => i.status === 'draft').length} invitation{invitationRows.filter(i => i.status === 'draft').length === 1 ? '' : 's'} pending in draft
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  sendInvites.mutate({}, {
                                    onSuccess: () => toast({ title: 'All drafts sent', description: 'Invitation emails and notifications dispatched.' }),
                                    onError: (err: any) => toast({ title: 'Send failed', description: err.message || 'Try again later.', variant: 'destructive' }),
                                  });
                                }}
                                disabled={sendInvites.isPending}
                                className={cn(buttonVariants({ size: 'sm' }), 'border-transparent bg-emerald-600 hover:bg-emerald-500 text-white ml-auto')}
                              >
                                {sendInvites.isPending ? 'Sending...' : 'Send All Drafts'}
                              </button>
                            </div>
                          )}
                          {effectiveReservedInviteSlots <= 0 && (
                            <div className="rounded-none border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                              Reserved invite slots are not configured. Enable invited participants in the Settings tab before sending guaranteed invite codes.
                            </div>
                          )}
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Input
                              type="email"
                              value={inviteEmail}
                              onChange={(event) => setInviteEmail(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  handleAddInviteEmail();
                                }
                              }}
                              placeholder={(tournament?.team_size ?? 1) > 1 ? 'captain@team.com' : 'player@email.com'}
                              className="border-white/10 bg-black/30 text-white"
                            />
                            <OutlineButton
                              type="button"
                              onClick={handleAddInviteEmail}
                              disabled={effectiveReservedInviteSlots <= 0}
                            >
                              Add
                            </OutlineButton>
                            <button
                              type="button"
                              onClick={handleSendInviteEmails}
                              disabled={effectiveReservedInviteSlots <= 0 || draftInviteEmails.length === 0 || createInviteDrafts.isPending || sendInvites.isPending}
                              className={cn(buttonVariants({ size: 'sm' }), 'border-transparent bg-purple-600 hover:bg-rose-500 text-white')}
                            >
                              {(createInviteDrafts.isPending || sendInvites.isPending) ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="mr-2 h-4 w-4" />
                              )}
                              Send Codes
                            </button>
                          </div>

                          {draftInviteEmails.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {draftInviteEmails.map((email) => (
                                <Badge key={email} className="bg-white/10 text-white border border-white/10">
                                  {email}
                                  <button
                                    type="button"
                                    onClick={() => setDraftInviteEmails((current) => current.filter((item) => item !== email))}
                                    className="ml-2 text-gray-400 hover:text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* CSV Import */}
                          <div className="flex gap-2">
                            <OutlineButton
                              type="button"
                              size="sm"
                              onClick={() => setShowCsvImport(!showCsvImport)}
                              disabled={effectiveReservedInviteSlots <= 0 || remainingInviteSlots <= 0}
                              className="text-xs"
                            >
                              {showCsvImport ? 'Hide' : 'CSV Import'}
                            </OutlineButton>
                          </div>

                          {showCsvImport && (
                            <div className="rounded-none border border-white/10 bg-black/20 p-4 space-y-3">
                              <p className="text-xs text-gray-400">Paste emails separated by commas, semicolons, or newlines:</p>
                              <textarea
                                value={csvImportText}
                                onChange={(e) => setCsvImportText(e.target.value)}
                                placeholder="captain1@team.com, captain2@team.com\ncaptain3@team.com"
                                rows={4}
                                className="w-full rounded-none border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!csvImportText.trim()) return;
                                  importCsv.mutate({ csvContent: csvImportText }, {
                                    onSuccess: async (data) => {
                                      if (data.inviteIds && data.inviteIds.length > 0) {
                                        try {
                                          await sendInvites.mutateAsync({ invitationIds: data.inviteIds });
                                          toast({ title: 'CSV Import complete', description: `${data.imported} invitations sent.` });
                                        } catch {
                                          toast({ title: 'CSV Import complete', description: `${data.imported} imported as drafts but failed to send. Use the Send button on each.`, variant: 'destructive' });
                                        }
                                      } else {
                                        toast({ title: 'CSV Import complete', description: `${data.imported} imported, ${data.skipped} skipped.` });
                                      }
                                      setCsvImportText('');
                                      setShowCsvImport(false);
                                    },
                                    onError: (err: any) => toast({ title: 'CSV import failed', description: err.message || 'Try again.', variant: 'destructive' }),
                                  });
                                }}
                                disabled={importCsv.isPending || !csvImportText.trim() || effectiveReservedInviteSlots <= 0 || remainingInviteSlots <= 0}
                                className={cn(buttonVariants({ size: 'sm' }), 'border-transparent bg-purple-600 hover:bg-rose-500 text-white')}
                              >
                                {importCsv.isPending ? 'Importing...' : 'Import Emails'}
                              </button>
                            </div>
                          )}

                          <div className="rounded-none border border-white/10 overflow-hidden">
                            {invitationQuery.isLoading ? (
                              <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading invitations...
                              </div>
                            ) : invitationRows.length === 0 ? (
                              <div className="p-6 text-sm text-gray-500">No invitation codes generated yet.</div>
                            ) : (
                              <div className="divide-y divide-white/10">
                                {invitationRows.map((invite) => (
                                  <div key={invite.id} className="grid gap-3 p-4 text-sm md:grid-cols-[minmax(0,1.3fr)_120px_100px_160px_90px] md:items-center">
                                    <div className="min-w-0">
                                      <p className="truncate font-medium text-white">{invite.email}</p>
                                      {invite.teamName && <p className="truncate text-xs text-gray-500">{invite.teamName}</p>}
                                    </div>
                                    <code className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-rose-200">
                                      {invite.code || 'Pending'}
                                    </code>
                                    <Badge className={cn(
                                      'w-fit capitalize',
                                      invite.status === 'redeemed' && 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
                                      invite.status === 'sent' && 'bg-amber-500/20 text-amber-200 border-amber-500/30',
                                      invite.status === 'expired' && 'bg-red-500/20 text-red-200 border-red-500/30',
                                      invite.status === 'revoked' && 'bg-zinc-500/20 text-zinc-200 border-zinc-500/30',
                                      invite.status === 'draft' && 'bg-amber-500/20 text-amber-200 border-amber-500/30',
                                    )}>
                                      {invite.status}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      Expires {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : '—'}
                                    </span>
                                    <div className="flex gap-1">
                                      {invite.status === 'draft' && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            sendInvites.mutate({ invitationIds: [invite.id] }, {
                                              onSuccess: () => toast({ title: 'Invitation sent', description: `Sent to ${invite.email}` }),
                                              onError: (err: any) => toast({ title: 'Send failed', description: err.message || 'Try again later.', variant: 'destructive' }),
                                            });
                                          }}
                                          disabled={sendInvites.isPending}
                                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 text-xs px-2')}
                                        >
                                          Send
                                        </button>
                                      )}
                                      {(invite.status === 'sent' || invite.status === 'expired') && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            resendInvites.mutate({ invitationIds: [invite.id] }, {
                                              onSuccess: () => toast({ title: 'Invitation resent', description: `Re-sent to ${invite.email}` }),
                                              onError: (err: any) => toast({ title: 'Resend failed', description: err.message || 'Try again later.', variant: 'destructive' }),
                                            });
                                          }}
                                          disabled={resendInvites.isPending}
                                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 text-xs px-2')}
                                        >
                                          Resend
                                        </button>
                                      )}
                                      {(invite.status === 'draft' || invite.status === 'sent') && (
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeInvitation(invite.id)}
                                          disabled={revokeInvite.isPending}
                                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'justify-start text-red-300 hover:bg-red-500/10 hover:text-red-200 text-xs px-2')}
                                        >
                                          Revoke
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {/* Payment Review — only for paid tournaments */}
                    {tournament && parseFloat(tournament.entry_fee || '0') > 0 && (
                      <PaymentManagement
                        tournamentId={tournament.id}
                        participants={participants as DashboardParticipant[]}
                        onRefresh={refetchDashboard}
                      />
                    )}
                    <Card className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6 group">
                      <CardHeader className="p-0 border-b border-white/5 pb-4 mb-6 relative z-10">
                        <CardTitle className="text-lg font-bold text-white tracking-wide">
                          {registrationParticipantMode === 'solo' ? 'Registered Participants' : 'Registered Teams'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 relative z-10">
                        {activeParticipants.length === 0 ? (
                          <p className="text-gray-400 italic">No participants registered yet.</p>
                        ) : (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              <AnimatePresence mode="popLayout">
                                {pagedParticipants.map((participant) => (
                                  <OrganizerTeamCard
                                    key={participant.id}
                                    participant={participant}
                                    onManage={handleTeamClick}
                                    renderStatusBadge={renderCheckInBadge}
                                  />
                                ))}
                              </AnimatePresence>
                            </div>

                            {totalParticipantPages > 1 && (
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-zinc-500">
                                  Showing {participantRangeStart}-{participantRangeEnd} of {activeParticipants.length}
                                </p>
                                <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                                  <PaginationContent>
                                    <PaginationItem>
                                      <PaginationPrevious
                                        href="#participants"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          if (participantsPage > 1) {
                                            setParticipantsPage((page) => page - 1);
                                          }
                                        }}
                                        className={participantsPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                      />
                                    </PaginationItem>
                                    <PaginationItem>
                                      <PaginationLink
                                        href="#participants"
                                        isActive
                                        onClick={(event) => event.preventDefault()}
                                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                                      >
                                        {participantsPage} / {totalParticipantPages}
                                      </PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                      <PaginationNext
                                        href="#participants"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          if (participantsPage < totalParticipantPages) {
                                            setParticipantsPage((page) => page + 1);
                                          }
                                        }}
                                        className={participantsPage >= totalParticipantPages ? 'pointer-events-none opacity-50' : ''}
                                      />
                                    </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              </div>
                            )}
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

              {activeTab === 'disputes' && slug && (
                <TabsContent value="disputes" forceMount key="disputes">
                  <Navigate to={`/organizer/tournament/${slug}/disputes`} replace />
                </TabsContent>
              )}

              {activeTab === 'staff' && (
                <TabsContent value="staff" forceMount key="staff">
                  <TabTransition direction={direction}>
                    <Card className="bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8">
                      <CardContent className="text-center py-8 space-y-4">
                        <ShieldCheck className="w-12 h-12 text-rose-400 mx-auto" />
                        <h3 className="text-xl font-bold text-white">Staff Management Moved</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                          Staff is now managed at the <strong>organization level</strong>.
                          Staff members added to your organization automatically gain access to all your tournaments.
                        </p>
                        <button type="button"
                          onClick={() => navigate('/organizer/settings?tab=staff')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-none transition-all hover:scale-105"
                        >
                          Go to Organization Settings
                        </button>
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
                    {!canActAsOwner ? (
                      <PermissionNotice message="Tournament settings are available only to the organizer." />
                    ) : (
                      <>
                      <Card className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6 group">
                        <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
                          <CardTitle className="text-lg font-semibold text-white">Check-In Requirements</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-5">
                          {effectiveCheckInRequired ? (
                            <div className="flex flex-col gap-4">
                              <div className="flex items-start gap-2 text-sm text-gray-300 p-4 rounded-none bg-white/[0.02] border border-white/5">
                                <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-white mb-1">Check-in Enforcement</p>
                                  <ul className="list-disc list-inside space-y-1 text-gray-400">
                                    <li>Check-in is <span className="text-rose-400 font-medium">required</span> for all teams.</li>
                                    <li>Teams who fail to check in before the deadline will be <span className="text-red-400 font-medium">auto-removed</span>.</li>
                                    <li>Only checked-in teams will be added to the bracket.</li>
                                  </ul>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-none bg-white/[0.02] border border-white/5 gap-4">
                                <div>
                                  <p className="font-semibold text-white">Manual Enforcement</p>
                                  <p className="text-sm text-gray-400">You can manually trigger removal of teams who haven't checked in yet.</p>
                                </div>
                                <DangerButton
                                  onClick={handleRemoveUncheckedParticipants}
                                  disabled={removingUnchecked}
                                  className="w-full sm:w-auto min-w-[200px]"
                                >
                                  {removingUnchecked ? 'Processing...' : 'Remove Unchecked Teams'}
                                </DangerButton>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 text-sm text-gray-300 p-4 rounded-none bg-white/[0.02] border border-white/5">
                              <div>
                                <p className="font-medium text-white mb-1">Check-in Disabled</p>
                                <p className="text-gray-400">
                                  Check-in is not required for this tournament. All approved teams are eligible for bracket seeding.
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {showInvitedTeamsFeature && (
                        <Card className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6 group">
                          <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                              <Mail className="w-5 h-5 text-rose-300" />
                              Invited Participants
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-none bg-white/[0.02] border border-white/5">
                              <Switch
                                checked={inviteSettingsEnabled}
                                onCheckedChange={(enabled) => {
                                  if (!enabled && inviteSummary.activeSlots > 0) {
                                    toast({
                                      title: 'Cannot disable',
                                      description: 'Revoke all active invitations before disabling reserved invite slots.',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  setInviteSettingsEnabled(enabled);
                                  if (enabled && inviteSettingsReservedSlots < 1) {
                                    setInviteSettingsReservedSlots(defaultReservedInviteSlots(maxTeams));
                                  }
                                }}
                                disabled={savingInviteSettings || inviteSummary.activeSlots > 0}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm">
                                  {savingInviteSettings ? 'Saving...' : `Reserve slots for invited ${inviteParticipantLabel}`}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Hold guaranteed spots for email invites. Send codes from the Participants tab after saving.
                                  {maxTeams > 0 && inviteSettingsEnabled && (
                                    <> {Math.max(maxTeams - inviteSettingsReservedSlots, 0)} slot{Math.max(maxTeams - inviteSettingsReservedSlots, 0) === 1 ? '' : 's'} remain for open registration.</>
                                  )}
                                </p>
                              </div>
                            </div>

                            {inviteSettingsEnabled && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-none bg-white/[0.02] border border-white/5">
                                <div className="space-y-2">
                                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Reserved slots</p>
                                  <Input
                                    type="number"
                                    min={Math.max(1, inviteSummary.activeSlots)}
                                    max={maxTeams > 0 ? maxTeams : 1024}
                                    value={inviteSettingsReservedSlots}
                                    onChange={(event) => setInviteSettingsReservedSlots(Math.max(0, parseInt(event.target.value, 10) || 0))}
                                    className="border-white/10 bg-black/30 text-white"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Code expiry (days)</p>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={inviteSettingsExpiryDays}
                                    onChange={(event) => setInviteSettingsExpiryDays(Math.min(365, Math.max(1, parseInt(event.target.value, 10) || 7)))}
                                    className="border-white/10 bg-black/30 text-white"
                                  />
                                </div>
                              </div>
                            )}

                            {inviteSummary.activeSlots > 0 && (
                              <p className="text-xs text-amber-300 px-4">
                                {inviteSummary.activeSlots} active invitation{inviteSummary.activeSlots === 1 ? '' : 's'} — reserved slots cannot go below this count.
                              </p>
                            )}

                            <div className="flex justify-end px-4 pb-2">
                              <button
                                type="button"
                                onClick={handleSaveInviteSettings}
                                disabled={savingInviteSettings}
                                className={cn(buttonVariants(), 'border-transparent bg-purple-600 hover:bg-rose-500 text-white')}
                              >
                                {savingInviteSettings ? 'Saving...' : 'Save Invite Settings'}
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Assisted Match Reporting — games with API integration */}
                      {tournamentModeFeatures.assistedReporting && (
                        <Card className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6 group">
                          <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                              <Zap className="w-5 h-5 text-amber-400" />
                              Assisted Match Reporting
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-none bg-white/[0.02] border border-white/5">
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
                              <div className="flex items-start gap-2 text-sm text-gray-300 p-4 rounded-none bg-amber-500/5 border border-amber-500/20">
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
                      {tournamentModeFeatures.mapVeto && (
                        <Card className="relative bg-[#0d0d10] border border-white/10 rounded-none overflow-hidden p-6 sm:p-8 mb-6 group">
                          <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                              <Swords className="w-5 h-5 text-rose-400" />
                              Map Veto
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-none bg-white/[0.02] border border-white/5">
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
                              <div className="flex items-start gap-2 text-sm text-gray-300 p-4 rounded-none bg-rose-500/5 border border-rose-500/20">
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
              <DialogContent className="sm:max-w-[480px] bg-[#09090b] border border-white/10 rounded-none shadow-2xl p-0 gap-0 overflow-hidden duration-300">
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
                        <span className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-rose-400">👑 {teamCaptain}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-6 pt-0 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setTeamDialogOpen(false)} className="border border-white/10 text-white hover:bg-white/5 h-10 px-5 rounded-lg">Close</button>
                  {effectiveCheckInRequired && selectedTeam && !selectedTeam.checked_in_at && selectedTeam.status !== 'disqualified' && (
                    <button type="button"
                      onClick={async () => {
                        if (!selectedTeam || !tournament?.id) return;
                        try {
                          await apiClient.post(`/api/tournaments/${tournament.id}/participants/${selectedTeam.id}/check-in`, {});
                          toast({ title: 'Checked In', description: `${selectedTeam.team_name || 'Participant'} has been manually checked in.` });
                          setTeamDialogOpen(false);
                          refetchDashboard();
                        } catch (err: any) {
                          toast({ title: 'Error', description: err.message || 'Failed to check in participant.', variant: 'destructive' });
                        }
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-6 rounded-lg font-bold shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                    >
                      Check In
                    </button>
                  )}
                  <button type="button"
                    onClick={() => {
                      if (!selectedTeam) return;
                      setBanDialogOpen(true);
                      setBanTarget({ id: selectedTeam.id, userId: selectedTeam.user_id });
                      setTeamDialogOpen(false);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white h-10 px-6 rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all hover:scale-105"
                  >
                    Ban Team
                  </button>
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

      {/* Payment Rejection Dialog */}
      <Dialog open={!!showRejectDialog} onOpenChange={(open) => { if (!open) setShowRejectDialog(null); }}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription className="text-gray-400">
              Provide a reason for rejecting this payment. The participant will be notified and can re-upload a receipt.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Receipt is blurry, amount doesn't match, wrong payment method..."
            className="bg-white/5 border-white/10 text-white min-h-[80px]"
          />
          <DialogFooter className="gap-2">
            <CancelButton type="button" onClick={() => setShowRejectDialog(null)}>
              Cancel
            </CancelButton>
            <DangerButton
              disabled={!!rejectingPayment}
              onClick={() => showRejectDialog && handleRejectPayment(showRejectDialog)}
            >
              {rejectingPayment ? 'Rejecting...' : 'Reject Payment'}
            </DangerButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

// Wrap TournamentDashboard in ErrorBoundary for export
export default function TournamentDashboardWithBoundary(props: Record<string, unknown>) {
  return (
    <ErrorBoundary>
      <TournamentDashboard {...props} />
    </ErrorBoundary>
  );
} 



