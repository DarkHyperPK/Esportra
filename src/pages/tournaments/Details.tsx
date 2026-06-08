import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import slugify from 'slugify';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiClient, ApiError } from '@/lib/apiClient';
import Footer from '@/components/Footer';
import {
  TournamentHeader
} from '@/components/tournament/details/TournamentHeader';
import { OverviewTab } from '@/components/tournament/details/OverviewTab';
import { TeamsTab } from '@/components/tournament/details/TeamsTab';
import { BracketsTab } from '@/components/tournament/details/BracketsTab';
import { StagesTab } from '@/components/tournament/details/StagesTab';
import { RulesTab } from '@/components/tournament/details/RulesTab';
import ImageUploader from '@/components/tournament/wizard/ImageUploader';
import { usePublicBracketData } from '@/hooks/usePublicBracketData';
import { Button } from '@/components/ui/button';
import { Trophy, Swords, EyeOff, LogIn } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { formatDate, formatTime } from '@/utils/dateFormat';
import { Tournament, BaseTournament, TournamentRegistration } from '@/types/tournament';
import TournamentRegistrationForm from '@/components/TournamentRegistration';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import { isBattleRoyaleTournament, getBRConfig, getDefaultGameMode, getGameByName, getPersistedTournamentFormat } from '@/utils/gameFeatures';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { cn } from '@/lib/utils';
import { useGameTerminology } from '@/hooks/useGameTerminology';
import { useBRGameResults } from '@/hooks/useBRGameResults';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import BRScoringConfig from '@/components/tournament/br/BRScoringConfig';
import BRGroupStageView from '@/components/tournament/br/BRGroupStageView';
import { useBRGroupStage } from '@/hooks/useBRGroupLeaderboard';
import ArtworkPicker from '@/components/tournament/ArtworkPicker';
import { SEO } from '@/components/SEO';
import InviteCodeRedemption from '@/components/tournament/InviteCodeRedemption';
import { normalizeInviteCode } from '@/utils/inviteCodeUtils';
import {
  canShowInviteRedemption,
  canShowOpenRegistration,
  getOpenRegistrationCapacity,
  getReservedInviteSlotsFromTournament,
} from '@/utils/tournamentInviteUtils';

const TournamentDetails = () => {
  useGameCatalog();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setCheckInCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<TournamentRegistration | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessState, setAccessState] = useState<'none' | 'unavailable' | 'sign_in_required'>('none');
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [bannerMode, setBannerMode] = useState<'upload' | 'artwork'>('upload');
  const terminology = useGameTerminology(tournament?.game);
  const isBR = isBattleRoyaleTournament(
    tournament?.game || '',
    getPersistedTournamentFormat(tournament),
  );
  const detailsSearchParams = typeof window !== 'undefined' ? new URLSearchParams(location.search) : null;
  const requestedDetailsTab = detailsSearchParams?.get('tab') ?? null;
  const requestedBRStageId = detailsSearchParams?.get('brStage') ?? null;
  const competitorTabValue = terminology.competitorLabelPlural.toLowerCase();
  const [activeTab, setActiveTab] = useState(requestedDetailsTab || 'overview');
  const initialInviteCode = normalizeInviteCode(detailsSearchParams?.get('code') || '');

  useEffect(() => {
    setActiveTab(requestedDetailsTab || 'overview');
  }, [requestedDetailsTab]);

  // BR leaderboard config (only computed for BR tournaments)
  const brConf = isBR ? getBRConfig(tournament?.game || '') : null;
  const brSettings = isBR ? (tournament?.settings as any) : null;
  const brGameCount = brSettings?.brGameCount || brConf?.defaultGameCount || 6;
  const brPresetKey = brSettings?.brScoringPreset || brConf?.defaultPreset || '';
  const brScoringPreset = brSettings?.brCustomScoring
    || (brConf?.scoringPresets?.[brPresetKey as string])
    || { name: 'Default', placements: [10, 6, 5, 4, 3, 2, 1, 1], killPoints: 1, killCap: null };
  const brKillCap = brSettings?.brKillCap ?? brScoringPreset.killCap ?? null;

  const isOrganizer = (currentRole === 'organizer' && !!(user?.id && tournament?.organization?.owner_id && user.id === tournament.organization.owner_id)) || admin.hasPermission('tournaments:edit');
  const requiresCheckIn = Boolean(tournament?.check_in_required);
  const checkInDeadlineDate = useMemo(
    () => (tournament?.check_in_deadline ? new Date(tournament.check_in_deadline) : null),
    [tournament?.check_in_deadline]
  );
  const registrationStatus = (registrationDetails?.status || '').toLowerCase();
  const hasCheckedIn = Boolean(registrationDetails?.checked_in_at) || registrationStatus === 'checked_in';
  const awaitingApproval = registrationStatus === 'pending';
  const isCaptainOrSelf = registrationDetails?.registration_type === 'team' ? isCaptain : true;
  const now = typeof window !== 'undefined' ? new Date() : null;
  const hasMissedCheckIn =
    isRegistered &&
    requiresCheckIn &&
    checkInDeadlineDate instanceof Date &&
    now instanceof Date &&
    now > checkInDeadlineDate &&
    !hasCheckedIn;
  const checkInWindowMinutes = (tournament?.settings as any)?.checkInWindowMinutes || 60; // Default to 60 if not set
  const checkInStartTime = checkInDeadlineDate ? new Date(checkInDeadlineDate.getTime() - (checkInWindowMinutes * 60 * 1000)) : null;
  const tournamentRegistrationType = tournament?.registration_type ?? (tournament?.settings as any)?.registrationType ?? 'open';
  const tournamentReservedInviteSlots = getReservedInviteSlotsFromTournament(tournament);
  const tournamentMaxTeams = tournament?.max_participants ?? (tournament as { max_teams?: number })?.max_teams ?? 0;
  const openRegistrationCapacity = getOpenRegistrationCapacity(tournamentMaxTeams, tournamentReservedInviteSlots);
  const tournamentIsPublic = tournament?.is_public !== false;

  const registrationVisibilityInput = useMemo(() => ({
    isOrganizer,
    isRegistered,
    registrationType: tournamentRegistrationType,
    reservedSlots: tournamentReservedInviteSlots,
    maxTeams: tournamentMaxTeams,
    isPublic: tournamentIsPublic,
    status: tournament?.status,
  }), [
    isOrganizer,
    isRegistered,
    tournamentRegistrationType,
    tournamentReservedInviteSlots,
    tournamentMaxTeams,
    tournamentIsPublic,
    tournament?.status,
  ]);

  const showInviteRedemption = canShowInviteRedemption(registrationVisibilityInput);
  const showOpenRegistration = canShowOpenRegistration(registrationVisibilityInput);

  useEffect(() => {
    if (initialInviteCode && showInviteRedemption) {
      setShowInviteDialog(true);
    }
  }, [initialInviteCode, showInviteRedemption]);

  const canSelfCheckIn =
    requiresCheckIn &&
    !!registrationDetails &&
    isCaptainOrSelf &&
    !hasCheckedIn &&
    !awaitingApproval &&
    checkInDeadlineDate instanceof Date &&
    now instanceof Date &&
    checkInStartTime instanceof Date &&
    now >= checkInStartTime && // Must be AFTER check-in opens
    now <= checkInDeadlineDate; // Must be BEFORE check-in closes

  // Global handler for banner edit
  useEffect(() => {
    (window as any).dispatchBannerEdit = () => setShowBannerDialog(true);
    return () => { delete (window as any).dispatchBannerEdit; };
  }, []);

  // Public Bracket View State - Refactored to Hook
  const { stages, activeVersionsMap } = usePublicBracketData(tournament?.id);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(requestedBRStageId);

  // Multi-group stage detection — check first stage for groups
  const firstBRStageId = isBR && activeTab === 'leaderboard' && stages.length > 0 ? stages[0].id : null;
  const { hasGroups: brHasGroups, isLoading: brGroupsLoading } = useBRGroupStage(firstBRStageId);

  // Auto-select first stage when stages load
  useEffect(() => {
    if (stages.length > 0 && (!selectedStageId || !stages.some((stage: any) => stage.id === selectedStageId))) {
      setSelectedStageId(stages[0].id);
    }
  }, [stages, selectedStageId]);

  const shouldLoadParticipants = !!tournament?.id && (
    activeTab === competitorTabValue
    || (isBR && activeTab === 'leaderboard' && !brGroupsLoading && !brHasGroups)
  );

  // Fetch robust participant data (logos, rosters, profiles) — single request, no N+1
  const { data: enrichedParticipants = [] } = useQuery({
    queryKey: ['tournament-participants', tournament?.id],
    queryFn: async () => {
      const participants = await apiClient.get<any[]>(`/api/tournaments/${tournament!.id}/participants`);
      if (!participants) return [];

      const gameKey = tournament?.game?.toLowerCase();
      const isValorant = gameKey === 'valorant';

      return participants.map(p => {
        const display_name = (isValorant && p.solo_riot_tag)
          ? p.solo_riot_tag
          : p.solo_username || p.solo_full_name || 'Anonymous';

        return {
          ...p,
          team_logo: p.team_logo_url,
          display_name,
          user: {
            id: p.user_id,
            username: p.solo_username,
            full_name: p.solo_full_name,
            riot_tag: p.solo_riot_tag,
            avatar_url: p.solo_avatar_url,
          },
        };
      });
    },
    enabled: shouldLoadParticipants,
    staleTime: 2 * 60_000,
  });

  // BR leaderboard hook (only active for BR tournaments)
  const brTeams = useMemo(() =>
    isBR ? (enrichedParticipants || []).map((p: any) => ({
      id: p.team_id || p.id,
      name: p.team_name || p.display_name || p.gamer_tag || p.solo_username || 'Unknown',
      logo: p.team_logo || undefined,
    })) : [],
    [isBR, enrichedParticipants]
  );

  const shouldLoadLegacyBRLeaderboard = isBR && activeTab === 'leaderboard' && !brGroupsLoading && !brHasGroups;
  const brResults = useBRGameResults({
    tournamentId: isBR ? tournament?.id : undefined,
    gameCount: brGameCount,
    scoringPreset: brScoringPreset,
    killCap: brKillCap,
    teams: brTeams,
    tiebreaker: brSettings?.brTiebreaker || 'most_wins',
    enabled: shouldLoadLegacyBRLeaderboard,
  });

  const fetchTournamentData = useCallback(async () => {
    if (!slug || slug === 'undefined') {
      console.error('Invalid slug provided:', slug);
      setError('Invalid tournament identifier');
      setLoading(false);
      return;
    }
    setLoading(true);
    setAccessState('none');
    try {
      const data = await apiClient.get<any>(`/api/tournaments/${encodeURIComponent(slug)}`);
      if (!data?.tournament) throw new ApiError(404, null, 'Tournament not found');

      const t = data.tournament;
      const parsedSettings = typeof t.settings === 'string' ? (() => { try { return JSON.parse(t.settings); } catch { return t.settings; } })() : (t.settings || {});
      setCheckInCount(t.checked_in_count || 0);

      const baseTournament: BaseTournament = {
        id: t.id,
        slug: t.slug,
        name: t.name,
        game: t.game,
        date: t.start_date ? formatDate(t.start_date) : '',
        time: t.start_date ? formatTime(t.start_date) : '',
        venue: t.venue_name || '',
        is_online: !t.venue_id,
        is_public: t.is_public ?? t.isPublic ?? true,
        max_participants: t.max_teams,
        reserved_invite_slots: getReservedInviteSlotsFromTournament({ ...t, settings: parsedSettings }),
        invite_expiry_days: t.invite_expiry_days ?? t.inviteExpiryDays ?? parsedSettings?.inviteExpiryDays ?? 7,
        registration_type: t.registration_type ?? t.registrationType ?? parsedSettings?.registrationType ?? null,
        team_size: t.team_size ?? t.teamSize ?? parsedSettings?.teamSize ?? 1,
        game_mode: t.game_mode ?? t.gameMode ?? parsedSettings?.gameMode ?? null,
        prize_pool: t.prize_pool?.toString() || '0',
        entry_fee: t.entry_fee?.toString() || '0',
        description: t.description || '',
        user_id: t.organization_owner_id || t.organizer_id || '',
        rewards: t.rewards,
        created_at: t.created_at,
        image_url: t.banner_url || null,
        check_in_required: !!t.check_in_required,
        check_in_deadline: t.check_in_deadline,
        auto_remove_unchecked: t.auto_remove_unchecked ?? true,
        end_date: t.end_date ? formatDate(t.end_date) : undefined,
        organization: {
          slug: t.organization_slug,
          name: t.organization_name,
          logo_url: t.organization_logo,
          owner_id: t.organization_owner_id
        },
        organization_id: t.organization_id,
        organizer: {
          username: t.organizer_username,
          avatar_url: t.organizer_avatar
        },
        settings: parsedSettings,
        rules: t.rules || null,
        payment_instructions: t.payment_instructions || null,
      };

      const newTournament: Tournament = {
        ...baseTournament,
        current_participants: t.current_participants || 0,
        status: t.status as Tournament['status'],
        winner_team_name: t.winner_team_name || null,
      };
      setTournament(newTournament);
      setError(null);
      setAccessState('none');
    } catch (error) {
      setTournament(null);

      if (error instanceof ApiError && error.status === 401) {
        setAccessState('sign_in_required');
        setError('Sign in to view this tournament.');
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setAccessState('unavailable');
        setError('This tournament could not be found. Check that the slug or tournament ID in the link is correct.');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to load tournament details';
      setAccessState('unavailable');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  const hasCheckedRegistration = React.useRef(false);

  const checkRegistration = useCallback(async (force = false) => {
    if (!force && hasCheckedRegistration.current) return;

    if (!user?.id || !tournament?.id) {
      setRegistrationLoading(false);
      setIsRegistered(false);
      setRegistrationDetails(null);
      return;
    }
    setRegistrationLoading(true);
    try {
      const status = await apiClient.get<any>(`/api/tournaments/${tournament.id}/my-status`);

      // Handle bans
      if (status.userBan || status.teamBan) {
        setIsRegistered(false);
        setRegistrationDetails(null);
        setIsCaptain(false);
        setRegistrationLoading(false);
        hasCheckedRegistration.current = true;
        return;
      }

      // Try primary endpoint first, then fallback
      const r = status.registration;

      if (r) {
        const rStatus = (r.status || '').toLowerCase();
        // Rejected or cancelled registrations = not registered
        if (rStatus === 'rejected' || rStatus === 'cancelled') {
          setIsRegistered(false);
          setRegistrationDetails(null);
          setIsCaptain(false);
        } else {
        setIsRegistered(true);

        const registration: TournamentRegistration & { team_id?: string; team_captain_id?: string } = {
          id: r.id,
          tournament_id: r.tournament_id || r.tournamentId,
          user_id: r.user_id || r.userId,
          registration_type: (r.participant_type || r.participantType) === 'solo' ? 'solo' : 'team',
          riot_tag: r.riot_tag || r.riotTag || null,
          steam_tag: r.steam_tag || r.steamTag || null,
          gamer_tag: r.gamer_tag || r.gamerTag || null,
          team_name: r.team_name || r.teamName || null,
          team_logo: r.team_logo || r.teamLogo || null,
          team_members: r.team_members || r.teamMembers || null,
          status: r.status || 'approved',
          checked_in_at: r.checked_in_at || r.checkedInAt || null,
          registered_at: r.registration_date || r.registrationDate || r.registered_at || r.registeredAt || r.created_at || r.createdAt,
          created_at: r.created_at || r.createdAt,
          updated_at: r.updated_at || r.updatedAt || r.created_at || r.createdAt,
          team_id: r.team_id || r.teamId || undefined,
          team_captain_id: r.team_captain_id || r.teamCaptainId || undefined
        };
        setRegistrationDetails(registration as TournamentRegistration);
        setShowEditDialog(false);

        // Determine captain status
        const participantType = r.participant_type || r.participantType;
        const teamCaptainId = r.team_captain_id || r.teamCaptainId;
        const isCap = participantType === 'solo' ||
          teamCaptainId === user.id ||
          (status.captainTeams || []).some((t: any) => t.id === (r.team_id || r.teamId));
        setIsCaptain(isCap);
        }
      } else {
        setIsRegistered(false);
        setRegistrationDetails(null);
        setIsCaptain(false);
      }
      setError(null);
    } catch {
      setIsRegistered(false);
      setRegistrationDetails(null);
      setIsCaptain(false);
    } finally {
      setRegistrationLoading(false);
      hasCheckedRegistration.current = true;
    }
  }, [user?.id, tournament?.id]);

  // Captain status is set within checkRegistration via my-status response

  useEffect(() => {
    hasCheckedRegistration.current = false;
    void fetchTournamentData();
  }, [fetchTournamentData]);

  // Check registration when tournament or user becomes available
  useEffect(() => {
    if (!tournament?.id) {
      setRegistrationLoading(false);
      return;
    }

    if (!user?.id) {
      setRegistrationLoading(false);
      setIsRegistered(false);
      setRegistrationDetails(null);
      setIsCaptain(false);
      return;
    }

    if (!hasCheckedRegistration.current) {
      void checkRegistration();
    }
  }, [tournament?.id, user?.id, checkRegistration]);

  // Listen for team disband/delete events to refresh registration status
  useEffect(() => {
    const handleTeamLeft = () => {
      // Delay slightly to ensure database changes have propagated
      setTimeout(() => {
        checkRegistration(true);
      }, 500);
    };

    window.addEventListener('teamLeft', handleTeamLeft);
    window.addEventListener('teamDeleted', handleTeamLeft);
    window.addEventListener('teamCreated', handleTeamLeft);

    return () => {
      window.removeEventListener('teamLeft', handleTeamLeft);
      window.removeEventListener('teamDeleted', handleTeamLeft);
      window.removeEventListener('teamCreated', handleTeamLeft);
    };
  }, [checkRegistration]);

  const handleRegistrationSuccess = useCallback(async () => {
    setShowEditDialog(false);
    await checkRegistration(true);
    await fetchTournamentData();
  }, [checkRegistration, fetchTournamentData]);

  const handleWithdraw = async () => {
    if (!user?.id || !tournament) return;

    try {
      await apiClient.delete(`/api/tournaments/${tournament.id}/register`);

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

  const handleSelfCheckIn = async () => {
    if (!registrationDetails || !tournament) return;
    setCheckInSubmitting(true);
    try {
      await apiClient.post(`/api/tournaments/${tournament.id}/check-in`);

      toast({
        title: 'Checked in',
        description: 'Your team is confirmed for this tournament.'
      });

      await checkRegistration(true);
    } catch (error: any) {
      console.error('Check-in failed:', error);
      toast({
        title: 'Check-in failed',
        description: error.message || 'Unable to complete check-in. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCheckInSubmitting(false);
    }
  };

  const handleBannerUpdate = async (url: string | null) => {
    if (!tournament?.id) return;

    try {
      await apiClient.put(`/api/tournaments/${tournament.id}/banner`, { url });

      setTournament(prev => prev ? { ...prev, image_url: url } : null);
      setShowBannerDialog(false);
      setBannerMode('upload');
      toast({
        title: 'Banner updated',
        description: 'The tournament banner has been updated successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update banner',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (!showEditDialog && slug && user?.id) {
      checkRegistration();
    }
  }, [showEditDialog, slug, user?.id, checkRegistration]);

  const selectedGame = tournament ? getGameByName(tournament.game) : null;
  const selectedGameMode = selectedGame ? getDefaultGameMode(selectedGame.name) : undefined;

  if (loading) {
    return <PremiumLoadingScreen text="LOADING TOURNAMENT DATA" />;
  }

  if (error || !tournament) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-[60vh] max-w-lg mx-auto text-center">
            {accessState === 'sign_in_required' ? (
              <LogIn className="w-12 h-12 text-rose-400 mb-4" />
            ) : (
              <EyeOff className="w-12 h-12 text-amber-400 mb-4" />
            )}
            <h1 className="text-2xl font-bold mb-3">
              {accessState === 'sign_in_required' ? 'Sign in required' : 'Tournament unavailable'}
            </h1>
            <p className="text-gray-400 leading-relaxed">
              {error || 'This tournament could not be loaded.'}
            </p>
            {accessState === 'unavailable' && (
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                Direct links use <span className="text-gray-300">/tournaments/your-slug</span> or{' '}
                <span className="text-gray-300">/tournaments/tournament-id</span>.
                Draft and private tournaments work via link but do not appear in browse.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {accessState === 'sign_in_required' && (
                <Button
                  className="bg-rose-500 hover:bg-rose-600"
                  onClick={() => navigate(`/auth/signin?returnTo=${returnTo}`)}
                >
                  Sign in
                </Button>
              )}
              <Button
                variant="outline"
                className="border-white/10"
                onClick={() => navigate('/tournaments')}
              >
                Browse tournaments
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-esports-primary/30 font-sans overflow-x-hidden">
      <SEO
        title={tournament.name}
        description={tournament.description || `Join ${tournament.name} on Esportra`}
        image={tournament.image_url || undefined}
        url={`/tournaments/${slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: tournament.name,
          description: tournament.description || `Join ${tournament.name} on Esportra`,
          startDate: tournament.date,
          endDate: tournament.end_date,
          image: tournament.image_url,
          eventAttendanceMode: !tournament.is_online
            ? 'https://schema.org/OfflineEventAttendanceMode'
            : 'https://schema.org/OnlineEventAttendanceMode',
          organizer: {
            '@type': 'Organization',
            name: tournament.organizer?.username || 'Esportra',
          },
        }}
      />

      <TournamentHeader
        tournament={tournament}
        isOrganizer={isOrganizer}
        isRegistered={isRegistered}
        hasMissedCheckIn={hasMissedCheckIn || false}
        canSelfCheckIn={canSelfCheckIn || false}
        checkInSubmitting={checkInSubmitting}
        isCaptain={isCaptain}
        onRegister={() => setShowEditDialog(true)}
        onWithdraw={() => setShowWithdrawDialog(true)}
        onCheckIn={handleSelfCheckIn}
        showOpenRegistration={showOpenRegistration}
        showInviteRedemption={showInviteRedemption}
        onRedeemInvite={() => setShowInviteDialog(true)}
        isLoading={registrationLoading}
        checkInStartTime={checkInStartTime}
        awaitingApproval={awaitingApproval}
      />

      {tournamentReservedInviteSlots > 0 && tournamentMaxTeams > 0 && !isOrganizer && (
        <div className="container mx-auto px-4 relative z-30 -mt-4 mb-6">
          <p className="mx-auto max-w-3xl text-center text-xs text-gray-500">
            {openRegistrationCapacity !== null && openRegistrationCapacity > 0
              ? `${openRegistrationCapacity} open registration slot${openRegistrationCapacity === 1 ? '' : 's'} available · ${tournamentReservedInviteSlots} reserved for invited teams`
              : `All ${tournamentMaxTeams} slots are reserved for invited teams`}
          </p>
        </div>
      )}

      {/* --- TABS NAVIGATION (Sticky) --- */}
      {/* --- TABS NAVIGATION (Sticky) --- */}
      <div className="relative z-30 -mt-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="container mx-auto px-4">
            <div className="sticky top-4 z-40 bg-[#0a0a0c]/90 border border-white/10 p-2 mb-12 mx-auto max-w-3xl">
              <TabsList className="bg-transparent h-auto p-0 w-full flex justify-between">
                {(() => {
                  const tabs = isBR
                    ? ['Overview', terminology.competitorLabelPlural, 'Leaderboard', 'Rules']
                    : ['Overview', terminology.competitorLabelPlural, 'Brackets', 'Stages', 'Rules'];
                  return tabs;
                })().map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab.toLowerCase()}
                    className="data-[state=active]:bg-white/10 data-[state=active]:text-white flex-1 py-4 text-gray-500 font-mono tracking-widest text-xs md:text-sm uppercase transition-all duration-300 hover:text-white"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview">
            <div className="container mx-auto px-4">
              <OverviewTab tournament={tournament} stages={stages} />
            </div>
          </TabsContent>

          <TabsContent value={competitorTabValue}>
            <div className="container mx-auto px-4">
              <TeamsTab participants={enrichedParticipants} isSolo={terminology.isSolo} />
            </div>
          </TabsContent>

          {isBR ? (
            <>
            <TabsContent value="leaderboard">
              <div className="container mx-auto px-4 space-y-6">
                {brHasGroups ? (
                  <>
                    {/* Multi-group stage selector */}
                    {stages.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {stages.map((stage: any) => (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => setSelectedStageId(stage.id)}
                            className={cn(
                              'px-4 py-2 text-sm font-medium transition-all whitespace-nowrap border',
                              selectedStageId === stage.id
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                            )}
                          >
                            {stage.name || `Stage ${stage.stage_order + 1}`}
                          </button>
                        ))}
                      </div>
                    )}

                    <BRScoringConfig preset={brScoringPreset} killCap={brKillCap} />

                    {selectedStageId && (
                      <BRGroupStageView
                        stageId={selectedStageId}
                        gameName={tournament?.game || ''}
                        qualificationCount={(stages.find((s: any) => s.id === selectedStageId) as any)?.advancement_count}
                        tournamentSlug={slug}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {/* Legacy single-lobby leaderboard */}
                    {brResults.activeGameNumber && (
                  <div className="flex items-center gap-4 p-4 bg-rose-500/10 border border-rose-500/30 animate-pulse-slow">
                    <div className="w-10 h-10 bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                      <Swords className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white">Game {brResults.activeGameNumber} is Live</h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Lobby codes are only available in the Match Room for registered players.
                      </p>
                    </div>
                  </div>
                )}

                {/* Champion Banner */}
                {brResults.winner && (
                  <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-rose-500/[0.06]" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMEwyNSAxMEwzNSAxMEwyNyAxN0wzMCAyN0wyMCAyMkwxMCAyN0wxMyAxN0w1IDEwTDE1IDEwWiIgZmlsbD0icmdiYSgyNTEsMTkxLDM2LDAuMDMpIi8+PC9zdmc+')] opacity-40" />
                    <div className="relative flex items-center gap-5 p-6 sm:p-8 border border-rose-500/30">
                      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-9 h-9 text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500/60 mb-1">Tournament Champion</p>
                        <h3 className="text-xl sm:text-2xl font-bold text-white truncate">{brResults.winner.teamName}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-sm">
                          <span className="text-amber-300 font-bold">{brResults.winner.totalPoints} pts</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">{brResults.winner.wins} win{brResults.winner.wins !== 1 ? 's' : ''}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">{brResults.winner.totalKills} kills</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <BRScoringConfig preset={brScoringPreset} killCap={brKillCap} />
                <BRLeaderboard
                  entries={brResults.leaderboard}
                  totalGames={brGameCount}
                  gamesCompleted={brResults.gamesCompleted}
                />
                  </>
                )}
              </div>
            </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="brackets">
                <div className="w-full px-4 md:px-8">
                  <BracketsTab
                    tournamentId={tournament.id}
                    stages={stages}
                    selectedStageId={selectedStageId}
                    activeVersionsMap={activeVersionsMap}
                    onStageSelect={setSelectedStageId}
                  />
                </div>
              </TabsContent>

              <TabsContent value="stages">
                <div className="container mx-auto px-4">
                  <StagesTab tournamentId={tournament.id} />
                </div>
              </TabsContent>
            </>
          )}

          <TabsContent value="rules">
            <div className="container mx-auto px-4">
              <RulesTab rules={tournament.rules} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Invite Redemption Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0a0c] border border-white/10"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-2xl tracking-wide">
              REDEEM INVITATION
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the code from your invite email. Codes are locked to your account email and can only be redeemed by a team captain.
              {openRegistrationCapacity !== null && tournamentReservedInviteSlots > 0 && (
                <>
                  {' '}This tournament reserves {tournamentReservedInviteSlots} slot{tournamentReservedInviteSlots === 1 ? '' : 's'} for invited teams
                  {openRegistrationCapacity > 0
                    ? ` and has ${openRegistrationCapacity} open registration slot${openRegistrationCapacity === 1 ? '' : 's'} for everyone else.`
                    : '. Open registration is full — only invited teams can join.'}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {tournament && (
            <InviteCodeRedemption
              compact
              showTitle={false}
              initialCode={initialInviteCode}
              returnPath={`/tournaments/${slug}${initialInviteCode ? `?code=${encodeURIComponent(initialInviteCode)}` : ''}`}
              tournament={{
                id: tournament.id,
                slug: tournament.slug ?? slug,
                name: tournament.name,
                game: tournament.game,
                game_mode: tournament.game_mode,
                team_size: tournament.team_size,
                status: tournament.status,
              }}
              onSuccess={async () => {
                setShowInviteDialog(false);
                await checkRegistration(true);
                await fetchTournamentData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Registration Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) {
          // Dialog is closing — just close it. The TournamentRegistration 
          // component's handleCancelReceiptUpload handles withdrawal if needed.
          setShowEditDialog(false);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0a0c] border border-white/10" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-2xl tracking-wide">
              {isRegistered ? 'MODIFY_REGISTRATION' : 'INITIATE_REGISTRATION'}
            </DialogTitle>
          </DialogHeader>

          <TournamentRegistrationForm
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            game={tournament.game}
            gameMode={tournament.game_mode}
            settings={tournament.settings}
            entryFee={tournament.entry_fee}
            currency={tournament.currency}
            paymentInstructions={tournament.payment_instructions}
            onRegisterSuccess={handleRegistrationSuccess}
            onCancel={() => setShowEditDialog(false)}
            initialData={registrationDetails}
            isEdit={!!registrationDetails}
            structure={selectedGameMode?.value || selectedGame?.defaultFormat || ''}
            teamSize={tournament.team_size || selectedGameMode?.teamSize || 1}
          />
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <AlertDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <AlertDialogContent className="bg-[#0a0a0c] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-heading tracking-wide">CONFIRM WITHDRAWAL</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to abort your registration? This action is irreversible.
              {registrationDetails?.registration_type === 'team' && isCaptain && (
                <p className="mt-4 font-bold text-red-500 border border-red-500/30 bg-red-500/10 p-2 text-center rounded">
                  WARNING: TEAM DISBANDMENT IMMINENT
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-white/5">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              className="bg-red-600 hover:bg-red-700 text-white font-mono tracking-widest"
            >
              CONFIRM_ABORT
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Banner Edit Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={(open) => {
        setShowBannerDialog(open);
        if (!open) { setBannerMode('upload'); }
      }}>
        <DialogContent className="max-w-2xl bg-[#0a0a0c] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-2xl tracking-wide">
              EDIT_BANNER
            </DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setBannerMode('upload')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                bannerMode === 'upload'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              Upload Custom
            </button>
            <button
              onClick={() => setBannerMode('artwork')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                bannerMode === 'artwork'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              Use Artwork from Esportra Partners
            </button>
          </div>

          <div className="py-4">
            {bannerMode === 'upload' ? (
              <ImageUploader
                value={tournament?.image_url || null}
                onChange={handleBannerUpdate}
                aspectRatio="banner"
                label="Tournament Banner"
                helperText="Upload a high-quality banner for your tournament (16:9 recommended)"
                bucket="system.assets.website"
                folder={`Tournament-card-banners/${(tournament as any)?.organizer?.username || 'unknown'}`}
                customFileName={slugify(tournament?.name || 'banner', { lower: true, strict: true })}
                useTimestamp={true}
              />
            ) : (
              <ArtworkPicker
                gameName={tournament?.game || ''}
                onSelect={handleBannerUpdate}
                uploadConfig={{
                  bucket: 'system.assets.website',
                  folder: `Tournament-card-banners/${(tournament as any)?.organizer?.username || 'unknown'}`,
                }}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBannerDialog(false)} className="border-white/10 text-white hover:bg-white/5">
              CANCEL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default TournamentDetails;
