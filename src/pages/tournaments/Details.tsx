import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import slugify from 'slugify';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Calendar, MapPin, DollarSign, Edit, LogOut, CheckCircle, Clock, AlertTriangle, Ban as BanIcon, Swords, ChevronRight, Layers } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Tournament, BaseTournament, TournamentRegistration, RegistrationStatus, RegistrationType } from '@/types/tournament';
import TournamentRegistrationForm from '@/components/TournamentRegistration';
import { formatDistanceToNowStrict } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PremiumBackground from "@/components/ui/PremiumBackground";
import { AnimatePresence, motion } from "framer-motion";
import esportsGamesData from '@/data/esportsGames.json';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import { isBattleRoyale } from '@/utils/gameFeatures';
import { useGameTerminology } from '@/hooks/useGameTerminology';

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
  user_id: string;
  rewards?: string | null;
  created_at: string;
  image_url?: string | null;
  slug: string;
  check_in_required?: boolean;
  check_in_deadline?: string | null;
  auto_remove_unchecked?: boolean;
  settings?: any;
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
  checked_in_at?: string | null;
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
  const [checkInCount, setCheckInCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<TournamentRegistration | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [allRegistrations, setAllRegistrations] = useState<DatabaseRegistration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const terminology = useGameTerminology(tournament?.game);
  const isBR = isBattleRoyale(tournament?.game || '');

  const isOrganizer = currentRole === 'organizer' && !!(user?.id && tournament?.organization?.owner_id && user.id === tournament.organization.owner_id);
  const requiresCheckIn = Boolean(tournament?.check_in_required);
  const checkInDeadlineDate = tournament?.check_in_deadline ? new Date(tournament.check_in_deadline) : null;
  const registrationStatus = (registrationDetails?.status || '').toLowerCase();
  const hasCheckedIn = Boolean(registrationDetails?.checked_in_at) || registrationStatus === 'checked_in';
  const awaitingApproval = registrationStatus === 'pending';
  const isCaptainOrSelf = registrationDetails?.registration_type === 'team' ? isCaptain : true;
  const now = typeof window !== 'undefined' ? new Date() : null;
  const hasMissedCheckIn =
    requiresCheckIn &&
    checkInDeadlineDate instanceof Date &&
    now instanceof Date &&
    now > checkInDeadlineDate &&
    !hasCheckedIn;
  const checkInWindowMinutes = (tournament?.settings as any)?.checkInWindowMinutes || 60; // Default to 60 if not set
  const checkInStartTime = checkInDeadlineDate ? new Date(checkInDeadlineDate.getTime() - (checkInWindowMinutes * 60 * 1000)) : null;

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
  // Live Check-in Countdown
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Global handler for banner edit
  useEffect(() => {
    (window as any).dispatchBannerEdit = () => setShowBannerDialog(true);
    return () => { delete (window as any).dispatchBannerEdit; };
  }, []);

  // Public Bracket View State - Refactored to Hook
  const { stages, activeVersionsMap, loading: bracketLoading } = usePublicBracketData(tournament?.id);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Auto-select first stage when stages load
  useEffect(() => {
    if (stages.length > 0 && !selectedStageId) {
      setSelectedStageId(stages[0].id);
    }
  }, [stages, selectedStageId]);

  // Fetch robust participant data (logos, rosters, profiles) — single request, no N+1
  const { data: enrichedParticipants = [] } = useQuery({
    queryKey: ['tournament-participants', tournament?.id],
    queryFn: async () => {
      const participants = await apiClient.get<any[]>(`/api/tournaments/${tournament!.id}/participants`);
      if (!participants) return [];

      const gameKey = tournament?.game?.toLowerCase();
      const isValorant = gameKey === 'valorant';
      const isCS2 = gameKey === 'cs2' || gameKey === 'counter-strike 2';

      return participants.map(p => {
        const display_name = (isValorant && p.solo_riot_tag)
          ? p.solo_riot_tag
          : (isCS2 && p.solo_faceit_nickname)
          ? p.solo_faceit_nickname
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
            faceit_nickname: p.solo_faceit_nickname,
            avatar_url: p.solo_avatar_url,
          },
        };
      });
    },
    enabled: !!tournament?.id,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!checkInDeadlineDate || !(checkInDeadlineDate instanceof Date)) return;

    const updateTimer = () => {
      const now = new Date();
      if (now >= checkInDeadlineDate) {
        setTimeLeft('Closed');
        return;
      }
      setTimeLeft(formatDistanceToNowStrict(checkInDeadlineDate, { addSuffix: true }));
    };

    // Initial call
    updateTimer();

    // Update every minute (since formatDistanceToNowString usually shows "in 5 minutes", "in 1 hour")
    // If we want seconds, we might need a custom formatter, but date-fns is usually enough for "in X minutes"
    const interval = setInterval(updateTimer, 1000 * 60);
    return () => clearInterval(interval);
  }, [checkInDeadlineDate]);

  const checkInCountdown = timeLeft;

  const fetchTournamentData = useCallback(async () => {
    if (!slug || slug === 'undefined') {
      console.error('Invalid slug provided:', slug);
      setError('Invalid tournament identifier');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.get<any>(`/api/tournaments/${encodeURIComponent(slug)}`);
      if (!data?.tournament) throw new Error('Tournament not found');

      const t = data.tournament;
      setCheckInCount(t.checked_in_count || 0);

      const baseTournament: BaseTournament = {
        id: t.id,
        name: t.name,
        game: t.game,
        date: t.start_date ? new Date(t.start_date).toLocaleDateString('en-CA') : '',
        time: t.start_date ? new Date(t.start_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }) : '',
        venue: t.venue_name || '',
        is_online: !t.venue_id,
        max_participants: t.max_teams,
        team_size: 1,
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
        end_date: t.end_date ? new Date(t.end_date).toLocaleDateString('en-CA') : undefined,
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
        settings: typeof t.settings === 'string' ? (() => { try { return JSON.parse(t.settings); } catch { return t.settings; } })() : (t.settings || {}),
      };

      const newTournament: Tournament = {
        ...baseTournament,
        current_participants: t.current_participants || 0,
        status: t.status === 'draft' ? 'upcoming' : t.status as any,
        winner_team_name: t.winner_team_name || null,
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

  const hasCheckedRegistration = React.useRef(false);

  const checkRegistration = useCallback(async (force = false) => {
    if (!force && hasCheckedRegistration.current) return;

    if (!user?.id || !tournament?.id) {
      setRegistrationLoading(true);
      setIsRegistered(false);
      setRegistrationDetails(null);
      setIsBanned(false);
      setBanReason(null);
      return;
    }
    setRegistrationLoading(true);
    try {
      const status = await apiClient.get<any>(`/api/tournaments/${tournament.id}/my-status`);

      // Handle bans
      if (status.userBan || status.teamBan) {
        setIsBanned(true);
        setBanReason(status.userBan?.banReason || status.teamBan?.banReason || null);
        setIsRegistered(false);
        setRegistrationDetails(null);
        setIsCaptain(false);
        setRegistrationLoading(false);
        hasCheckedRegistration.current = true;
        return;
      }

      setIsBanned(false);
      setBanReason(null);

      if (status.registration) {
        const r = status.registration;
        setIsRegistered(true);

        const registration: TournamentRegistration & { team_id?: string; team_captain_id?: string } = {
          id: r.id,
          tournament_id: r.tournament_id,
          user_id: r.user_id,
          registration_type: r.participant_type === 'solo' ? 'solo' : 'team',
          riot_tag: r.riot_tag || null,
          steam_tag: r.steam_tag || null,
          gamer_tag: r.gamer_tag || null,
          team_name: r.team_name || null,
          team_logo: r.team_logo || null,
          team_members: r.team_members || null,
          status: r.status || 'registered',
          checked_in_at: r.checked_in_at || null,
          registered_at: r.registration_date || r.created_at,
          created_at: r.created_at,
          updated_at: r.updated_at || r.created_at,
          team_id: r.team_id || undefined,
          team_captain_id: r.team_captain_id || undefined
        };
        setRegistrationDetails(registration as TournamentRegistration);
        setShowEditDialog(false);

        // Determine captain status from the consolidated response
        const isCap = r.participant_type === 'solo' ||
          r.team_captain_id === user.id ||
          (status.captainTeams || []).some((t: any) => t.id === r.team_id);
        setIsCaptain(isCap);
      } else {
        setIsRegistered(false);
        setRegistrationDetails(null);
        setIsCaptain(false);
      }
      setError(null);
    } catch (error) {
      setIsRegistered(false);
      setRegistrationDetails(null);
      setIsCaptain(false);
      setError(error instanceof Error ? error.message : 'Error checking registration');
    } finally {
      setRegistrationLoading(false);
      hasCheckedRegistration.current = true;
    }
  }, [user?.id, tournament?.id]);

  // Captain status is set within checkRegistration via my-status response

  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (!slug || !isMounted) return;
      setLoading(true);
      setRegistrationLoading(true); // Ensure loading state is set before fetching
      // Fetch tournament data first, then registration status (which depends on tournament.id)
      await fetchTournamentData();
      // Only check registration if we have tournament data
      if (isMounted) {
        await checkRegistration();
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [slug, checkRegistration, fetchTournamentData]);

  // Check registration when tournament or user becomes available
  useEffect(() => {
    if (tournament?.id && user?.id && !hasCheckedRegistration.current) {
      checkRegistration();
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

  const handleRegister = async () => {
    if (!user?.id || !tournament) return;

    // Already registered — show toast and bail
    if (isRegistered && registrationDetails) {
      toast({
        title: "Already Registered",
        description: "You are already registered for this tournament",
      });
      return;
    }

    setShowEditDialog(true);
  };

  const handleEditRegistration = () => {
    setShowEditDialog(true);
  };

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

  // Resolve team members from registration data or API
  const [resolvedMembers, setResolvedMembers] = useState<string[] | null>(null);
  useEffect(() => {
    const run = async () => {
      if (!registrationDetails || registrationDetails.registration_type !== 'team') return;
      const current = getMembers(registrationDetails.team_members);
      if (current.length > 0) {
        setResolvedMembers(current);
        return;
      }
      // If no members in registration, try to resolve via team API
      const teamId = (registrationDetails as any).team_id;
      if (!teamId) return;
      try {
        const teamData = await apiClient.get<any>(`/api/teams/${teamId}/members/detailed`);
        const members = (teamData || [])
          .filter((m: any) => m.is_active)
          .map((m: any) => {
            const gameKey = tournament?.game?.toLowerCase();
            const isValorant = gameKey === 'valorant';
            const isCS2 = gameKey === 'cs2' || gameKey === 'counter-strike 2';
            return (isValorant && m.riot_tag) || (isCS2 && m.faceit_nickname) || m.username || m.full_name || m.user_id?.substring(0, 8);
          })
          .filter(Boolean) as string[];
        setResolvedMembers(members.length > 0 ? members : null);
      } catch {
        setResolvedMembers(null);
      }
    };
    run();
  }, [registrationDetails, user?.id]);

  // Fetch all registrations if organizer (via dedicated backend endpoint)
  useEffect(() => {
    const fetchAllRegistrations = async () => {
      if (!isOrganizer || !tournament?.id) return;
      setRegistrationsLoading(true);
      try {
        const data = await apiClient.get<any[]>(`/api/tournaments/${tournament.id}/registrations`);
        setAllRegistrations((data || []) as unknown as DatabaseRegistration[]);
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




  if (loading) {
    return <PremiumLoadingScreen text="LOADING TOURNAMENT DATA" />;
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

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-esports-primary/30 font-sans overflow-x-hidden">

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
        isLoading={registrationLoading}
        checkInStartTime={checkInStartTime}
      />

      {/* --- TABS NAVIGATION (Sticky) --- */}
      {/* --- TABS NAVIGATION (Sticky) --- */}
      <div className="relative z-30 -mt-20">
        <Tabs defaultValue="overview" className="w-full">
          <div className="container mx-auto px-4">
            <div className="sticky top-4 z-40 bg-[#050505]/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl mb-12 shadow-2xl shadow-black/50 mx-auto max-w-3xl">
              <TabsList className="bg-transparent h-auto p-0 w-full flex justify-between">
                {(isBR
                  ? ['Overview', terminology.competitorLabelPlural, 'Leaderboard', 'Rules']
                  : ['Overview', terminology.competitorLabelPlural, 'Brackets', 'Stages', 'Rules']
                ).map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab.toLowerCase()}
                    className="data-[state=active]:bg-white/10 data-[state=active]:text-white flex-1 rounded-xl py-4 text-gray-500 font-mono tracking-widest text-xs md:text-sm uppercase transition-all duration-300 hover:text-white"
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

          <TabsContent value={terminology.competitorLabelPlural.toLowerCase()}>
            <div className="container mx-auto px-4">
              <TeamsTab participants={enrichedParticipants} />
            </div>
          </TabsContent>

          {isBR ? (
            <TabsContent value="leaderboard">
              <div className="container mx-auto px-4">
                <div className="text-center py-16">
                  <Trophy className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-xl font-heading text-white mb-2">Leaderboard</h3>
                  <p className="text-gray-400">Points-based standings will appear here once games are played.</p>
                </div>
              </div>
            </TabsContent>
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
              <RulesTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />

      {/* Registration Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0a0c] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-2xl tracking-wide">
              {isRegistered ? 'MODIFY_REGISTRATION' : 'INITIATE_REGISTRATION'}
            </DialogTitle>
          </DialogHeader>

          <TournamentRegistrationForm
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            game={tournament.game}
            settings={tournament.settings}
            onRegisterSuccess={handleRegistrationSuccess}
            onCancel={() => setShowEditDialog(false)}
            initialData={registrationDetails}
            isEdit={!!registrationDetails}
            structure={selectedGame?.defaultFormat || ''}
            teamSize={selectedGame?.formats.find(f => f.value === selectedGame.defaultFormat)?.teamSize || 1}
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
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent className="max-w-xl bg-[#0a0a0c] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-2xl tracking-wide">
              EDIT_BANNER
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
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
