import React, { useEffect, useState, useCallback } from 'react';
import slugify from 'slugify';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
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

  const [enrichedParticipants, setEnrichedParticipants] = useState<any[]>([]); // For public teams display

  // Fetch robust participant data (Logos, Rosers, etc.) similar to Organizer Dashboard
  const fetchPublicParticipants = useCallback(async () => {
    if (!tournament?.id) return;
    try {
      const { data: participantsData, error } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournament.id);

      if (error) throw error;
      if (!participantsData) return;

      const participants = participantsData as any[];
      const allUserIds = new Set<string>();
      participants.forEach(p => {
        if (p.user_id) allUserIds.add(p.user_id);
      });

      // 1. Resolve Team Logos by ID
      const teamIds = Array.from(new Set(participants.filter(p => p.team_id).map(p => p.team_id)));
      let teamMap: Record<string, { logo_url: string | null, name: string }> = {};

      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('id', teamIds);
        (teams || []).forEach((t: any) => {
          teamMap[t.id] = { logo_url: t.logo_url, name: t.name };
        });
      }

      // 2. Resolve Team Logos by Name (Fallback)
      const participantsWithTeamNameNoId = participants.filter(p => !p.team_id && p.team_name);
      const teamNamesToCheck = Array.from(new Set(participantsWithTeamNameNoId.map(p => p.team_name)));

      if (teamNamesToCheck.length > 0) {
        const { data: teamsByName } = await supabase
          .from('teams')
          .select('id, name, logo_url')
          .in('name', teamNamesToCheck);

        (teamsByName || []).forEach((t: any) => {
          // Create a fake ID or just map by name for now? Logic in Manager was complex.
          // We will just patch the participants directly.
          participants.forEach(p => {
            if (!p.team_id && p.team_name === t.name) {
              p.team_logo = p.team_logo || t.logo_url;
            }
          });
        });
      }

      // 3. Resolve Profiles
      if (allUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, riot_tag, steam_tag')
          .in('id', Array.from(allUserIds));

        const profileMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => profileMap[p.id] = p);

        participants.forEach(p => {
          if (p.user_id && profileMap[p.user_id]) {
            const profile = profileMap[p.user_id];
            p.user = profile;

            // If Valorant, prioritize Riot ID (riot_tag)
            const isValorant = tournament?.game?.toLowerCase() === 'valorant';
            if (isValorant && profile.riot_tag) {
              p.display_name = profile.riot_tag;
            } else {
              p.display_name = profile.username || profile.full_name || 'Anonymous';
            }
          }
        });
      }

      // 4. Attach resolved team info
      participants.forEach(p => {
        if (p.team_id && teamMap[p.team_id]) {
          p.team_logo = p.team_logo || teamMap[p.team_id].logo_url;
          // Prioritize official team name
          p.team_name = teamMap[p.team_id].name || p.team_name;
        }
      });

      setEnrichedParticipants(participants);
    } catch (err) {
      console.error('Error fetching public participants:', err);
    }
  }, [tournament?.id]);

  useEffect(() => {
    if (tournament?.id) {
      fetchPublicParticipants();
    }
  }, [tournament?.id, fetchPublicParticipants]);

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

      // Query from the high-performance view (Data Contract)
      // Use conditional query to avoid UUID type mismatch errors
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || '');

      let query = sb
        .from('v_tournament_details')
        .select('*')
        .is('deleted_at', null);

      if (isUuid) {
        query = query.or(`id.eq.${slug},slug.eq.${slug}`);
      } else {
        query = query.eq('slug', slug || '');
      }

      const { data: viewData, error: viewError } = await query.maybeSingle();

      if (viewError) {
        tournamentError = viewError;
      } else if (!viewData) {
        throw new Error('Tournament not found');
      } else {
        tournamentData = viewData;
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
        date: tournamentData.start_date ? new Date(tournamentData.start_date).toLocaleDateString('en-CA') : '',
        time: tournamentData.start_date ? new Date(tournamentData.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        venue: venueName || '',
        is_online: !tournamentData.venue_id,
        max_participants: tournamentData.max_teams,
        team_size: 1, // Default team size for now
        prize_pool: tournamentData.prize_pool?.toString() || '0',
        entry_fee: tournamentData.entry_fee?.toString() || '0',
        description: tournamentData.description || '',
        user_id: tournamentData.organizer_owner_id || '',
        rewards: tournamentData.rewards,
        created_at: tournamentData.created_at,
        image_url: tournamentData.banner_url || tournamentData.logo_url || null,
        check_in_required: !!tournamentData.check_in_required,
        check_in_deadline: tournamentData.check_in_deadline,
        auto_remove_unchecked: tournamentData.auto_remove_unchecked ?? true,
        end_date: tournamentData.end_date ? new Date(tournamentData.end_date).toLocaleDateString('en-CA') : undefined,
        organization: {
          slug: tournamentData.organization_slug,
          name: tournamentData.organization_name,
          logo_url: tournamentData.organization_logo,
          owner_id: tournamentData.organizer_owner_id
        },
        organization_id: tournamentData.organization_id,
        organizer: {
          username: tournamentData.organizer_username,
          avatar_url: tournamentData.organizer_avatar
        },
        settings: tournamentData.settings,
      };

      const { count, error: countError } = await sb
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentData.id);
      if (countError) throw countError;

      // Fetch check-in count
      const { count: checkedIn, error: checkInError } = await sb
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentData.id)
        .eq('status', 'checked_in');

      if (!checkInError) {
        setCheckInCount(checkedIn || 0);
      }

      // Try RPC for accurate count if RLS limits visibility
      let participantCount = count || 0;
      try {
        const { data: rpcCount } = await (sb as any).rpc('get_tournament_participant_count', { t_id: tournamentData.id });
        if (typeof rpcCount === 'number' && rpcCount >= 0) {
          participantCount = rpcCount;
        }
      } catch { }

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

  const hasCheckedRegistration = React.useRef(false);

  const checkRegistration = useCallback(async (force = false) => {
    if (!force && hasCheckedRegistration.current) return;

    // Only set loading to false if we have both user and tournament, otherwise keep loading
    if (!user?.id || !tournament?.id) {
      // Keep loading state true if we don't have required data yet
      setRegistrationLoading(true);
      setIsRegistered(false);
      setRegistrationDetails(null);
      setIsBanned(false);
      setBanReason(null);
      return;
    }
    setRegistrationLoading(true);
    try {
      // First check if user/team is banned
      // Check for user ban (solo participant)
      const { data: userBan } = await sb
        .from('tournament_bans')
        .select('ban_reason')
        .eq('tournament_id', tournament.id)
        .eq('is_active', true)
        .eq('user_id', user.id)
        .maybeSingle();

      // Check for team ban (if user owns a team or is captain of a team)
      let teamBan = null;

      // Get teams user owns
      const { data: ownedTeams } = await sb
        .from('teams')
        .select('id')
        .eq('owner_id', user.id);

      // Get teams where user is captain (from tournament_participants - might be empty if banned)
      const { data: captainTeams } = await sb
        .from('tournament_participants')
        .select('team_id')
        .eq('tournament_id', tournament.id)
        .eq('team_captain_id', user.id)
        .not('team_id', 'is', null);

      // Also check team_members table for teams where user is captain (in case registration was deleted)
      const { data: captainFromMembers } = await sb
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('role', 'captain');

      const allTeamIds = [
        ...(ownedTeams || []).map(t => t.id),
        ...(captainTeams || []).map(t => t.team_id).filter(Boolean),
        ...(captainFromMembers || []).map(t => t.team_id).filter(Boolean)
      ];

      if (allTeamIds.length > 0) {
        const uniqueTeamIds = Array.from(new Set(allTeamIds));
        const { data: banData } = await sb
          .from('tournament_bans')
          .select('ban_reason, team_id')
          .eq('tournament_id', tournament.id)
          .eq('is_active', true)
          .in('team_id', uniqueTeamIds)
          .maybeSingle();
        teamBan = banData;
      }

      // If banned (either user or team), set ban state and return early
      if ((userBan && !userBan.error) || (teamBan && !teamBan.error)) {
        setIsBanned(true);
        setBanReason((userBan?.ban_reason || teamBan?.ban_reason) || null);
        setIsRegistered(false);
        setRegistrationDetails(null);
        setRegistrationLoading(false);
        return;
      }

      setIsBanned(false);
      setBanReason(null);

      // Check for registration
      let registrationFilter = `user_id.eq.${user.id},team_captain_id.eq.${user.id}`;
      const uniqueTeamIds = Array.from(new Set(allTeamIds)).filter(Boolean);
      if (uniqueTeamIds.length > 0) {
        registrationFilter += `,team_id.in.(${uniqueTeamIds.join(',')})`;
      }

      const { data: regData, error } = await sb
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournament.id)
        .or(registrationFilter)
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
            hasCheckedRegistration.current = true;
            return;
          } else {
            console.log('[TournamentDetails] Team exists, registration is valid');
          }
        }

        setIsRegistered(true);
        console.log('Registration data:', dbRegistration);

        // For team registrations, fetch the actual team name from teams table (priority over roster name)
        let resolvedTeamName = (dbRegistration as any).team_name || null;
        if (teamId && (dbRegistration as any).participant_type === 'team') {
          try {
            const { data: teamData } = await sb
              .from('teams')
              .select('name, logo_url')
              .eq('id', teamId)
              .maybeSingle();

            if (teamData?.name) {
              // Use actual team name from teams table as priority
              resolvedTeamName = teamData.name;
              console.log('[TournamentDetails] Resolved team name from teams table:', resolvedTeamName);
            }
            if (teamData?.logo_url) {
              (dbRegistration as any).team_logo_url = teamData.logo_url;
            }
          } catch (teamNameError) {
            console.error('[TournamentDetails] Error fetching team name:', teamNameError);
            // Fall back to registration.team_name if team lookup fails
          }
        }

        const registration: TournamentRegistration & { team_id?: string; team_captain_id?: string } = {
          id: (dbRegistration as any).id,
          tournament_id: (dbRegistration as any).tournament_id,
          user_id: (dbRegistration as any).user_id,
          registration_type: (dbRegistration as any).participant_type === 'solo' ? 'solo' : 'team',
          riot_tag: (dbRegistration as any).riot_tag || null,
          steam_tag: (dbRegistration as any).steam_tag || null,
          gamer_tag: (dbRegistration as any).gamer_tag || null,
          team_name: resolvedTeamName, // Use resolved team name (from teams table) as priority
          team_logo: (dbRegistration as any).team_logo_url || null,
          team_members: (dbRegistration as any).team_members || null,
          status: (dbRegistration as any).status || 'registered',
          checked_in_at: (dbRegistration as any).checked_in_at || null,
          registered_at: (dbRegistration as any).registration_date || (dbRegistration as any).created_at,
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
      // If solo registration, they are their own captain
      if (registrationDetails.registration_type === 'solo') {
        setIsCaptain(true);
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
      console.log('[TournamentDetails] Team left event detected, refreshing registration status...');
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

    try {
      const { data: existingRegistration, error: checkError } = await sb
        .from('tournament_participants')
        .select('*, teams:team_id(name, logo_url)')
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
          riot_tag: dbData.riot_tag || null,
          steam_tag: dbData.steam_tag || null,
          gamer_tag: dbData.gamer_tag || null,
          team_name: (dbData.teams as any)?.name || dbData.team_name || null,
          team_logo: dbData.team_logo_url || (dbData.teams as any)?.logo_url || null,
          team_members: dbData.team_members || null,
          status: dbData.status as RegistrationStatus || 'registered',
          checked_in_at: dbData.checked_in_at || null,
          registered_at: dbData.registration_date || dbData.registered_at || dbData.created_at,
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

      // First, try to get the registration - check both user_id (solo) and team_captain_id (team)
      const { data: existingRegistration, error: fetchError } = await sb
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournament.id)
        .or(`user_id.eq.${user.id},team_captain_id.eq.${user.id}`)
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

      // Verify the user has permission to withdraw (must be the registered user or team captain)
      const isSoloRegistration = existingRegistration.participant_type === 'solo' && existingRegistration.user_id === user.id;
      const isTeamCaptain = existingRegistration.participant_type === 'team' && existingRegistration.team_captain_id === user.id;

      if (!isSoloRegistration && !isTeamCaptain) {
        console.error('User does not have permission to withdraw this registration');
        toast({
          title: 'Error',
          description: 'You do not have permission to withdraw this registration.',
          variant: 'destructive',
        });
        return;
      }

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

  const handleSelfCheckIn = async () => {
    if (!registrationDetails) return;
    setCheckInSubmitting(true);
    try {
      const { error } = await sb
        .from('tournament_participants')
        .update({
          status: 'checked_in',
          checked_in_at: new Date().toISOString()
        })
        .eq('id', registrationDetails.id);

      if (error) throw error;

      toast({
        title: 'Checked in',
        description: 'Your team is confirmed for this tournament.'
      });

      await checkRegistration();
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
      const { error } = await sb
        .from('tournaments')
        .update({ banner_url: url })
        .eq('id', tournament.id);

      if (error) throw error;

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
        const names = (profiles || []).map(p => {
          const isValorant = tournament?.game?.toLowerCase() === 'valorant';
          return (isValorant && (p as any).riot_tag) || (p as any).username || (p as any).full_name || (p as any).id;
        }).filter(Boolean) as string[];
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
              const isValorant = tournament?.game?.toLowerCase() === 'valorant';
              names = (roster || []).map((row: any) => (isValorant && row.riot_tag) || row.username || row.full_name || `player_${String(row.user_id).substring(0, 8)}`);
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
          } catch { }
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
                {['Overview', 'Teams', 'Brackets', 'Stages', 'Rules'].map((tab) => (
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

          <TabsContent value="teams">
            <div className="container mx-auto px-4">
              <TeamsTab participants={enrichedParticipants} />
            </div>
          </TabsContent>

          <TabsContent value="brackets">
            {/* Full width container for brackets */}
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
