import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { evaluateRegistrationEligibility, getRegistrationOpensFromSettings } from '@/utils/tournamentLifecycle';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CancelButton, CtaButton } from '@/components/ui/app-buttons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users,
  Gamepad2,
  Calendar,
  Trophy,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { useGameLogo, useGameLogos } from '@/hooks/useGameLogo';
import TournamentLineupPicker, { isTournamentLineupComplete } from '@/components/tournament/TournamentLineupPicker';
import { getGameMode, getEffectiveGameFeatures, getRosterLimits, isAssistedMatchReportingEnabled } from '@/utils/gameFeatures';
import {
  buildRosterLineupPayload,
  countRosterPlayers,
  resolveMemberRosterRole,
  rosterMatchesTournament,
  type TournamentLineupSelection,
  usesTournamentLineupSelection,
} from '@/utils/rosterEligibility';

interface TeamTournamentRegistrationProps {
  tournament: {
    id: string;
    name: string;
    game: string;
    game_mode?: string | null;
    gameMode?: string | null;
    start_date: string;
    entry_fee?: number;
    prize_pool?: number;
    currency?: string;
    max_teams: number;
    team_size?: number;
    registration_deadline?: string;
    status?: string;
    description?: string;
    settings?: Record<string, unknown>;
  };

  onRegistrationComplete?: () => void;
  onCancel?: () => void;
}

// API response shape from /api/teams — games field is a JSONB column with variable structure
type TeamRow = {
  id: string;
  name: string;
  tag?: string | null;
  team_kind?: string | null;
  is_solo?: boolean | null;
  games: Record<string, unknown> | null;
  owner_id: string;
  created_at?: string | null;
  createdAt?: string | null;
};

const MAX_ELIGIBILITY_TEAMS = 100;
const CAPTAIN_TEAMS_PAGE_LIMIT = 50;

const resolveTeamKind = (team: TeamRow): 'team' | 'solo' | 'mock' => {
  if (team.team_kind === 'team' || team.team_kind === 'solo' || team.team_kind === 'mock') {
    return team.team_kind;
  }
  if (team.is_solo === true) return 'solo';
  if ((team.tag ?? '').toLowerCase().startsWith('mock-')) return 'mock';
  return 'team';
};

const isRealTeamRow = (team: TeamRow) => resolveTeamKind(team) === 'team';

// API response types for roster/member data from .NET endpoints
interface RosterRow { id: string; game?: string; format?: string | null; team_size?: number; name?: string }
interface RosterMember {
  user_id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  is_starter?: boolean;
  roster_role?: 'starter' | 'substitute' | 'coach';
  team_role?: string;
  profiles?: Record<string, unknown>;
}
interface RiotAccount { user_id: string; game_name?: string; tag_line?: string }

const TeamTournamentRegistration: React.FC<TeamTournamentRegistrationProps> = ({
  tournament,
  onRegistrationComplete,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetchingTeams, setFetchingTeams] = useState(true);

  // Team selection flow
  const [captainTeams, setCaptainTeams] = useState<TeamRow[]>([]);
  const [eligibleTeamIds, setEligibleTeamIds] = useState<Set<string>>(new Set());
  const [ineligibleReasons, setIneligibleReasons] = useState<Record<string, string[]>>({});
  const [teamListTruncated, setTeamListTruncated] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamRosters, setTeamRosters] = useState<Array<{ id: string; name: string; game: string; format: string | null; team_size: number }>>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<string>('');
  const [rosterMembersData, setRosterMembersData] = useState<any[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [lineupSelections, setLineupSelections] = useState<TournamentLineupSelection>({});

  // Use global game logo hooks
  const gameLogo = useGameLogo(tournament.game);
  const rosterGameNames = useMemo(() => teamRosters.map((r) => r.game), [teamRosters]);
  const rosterGameLogos = useGameLogos(rosterGameNames);

  const _normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();
  const tournamentGameMode = (tournament.gameMode || tournament.game_mode || '').trim();

  const getCoreTeamSize = (gameName: string, modeKey?: string | null): number => {
    const mode = getGameMode(gameName, modeKey);
    return mode?.teamSize || Number(tournament.team_size) || 5;
  };

  const usesLineupSelection = usesTournamentLineupSelection(tournament.game, tournamentGameMode);

  const rosterMatchesTournamentMode = useCallback((roster: RosterRow) => (
    rosterMatchesTournament(roster, tournament.game, tournamentGameMode)
  ), [tournament.game, tournamentGameMode]);

  const coreMembers = getCoreTeamSize(tournament.game, tournamentGameMode);

  const resolveRosterRole = (member: RosterMember): 'starter' | 'substitute' | 'coach' => (
    resolveMemberRosterRole(member)
  );

  const modeLimits = getRosterLimits(tournament.game, tournamentGameMode, coreMembers);
  const requiredStarters = modeLimits.starters;
  const maxPlayers = modeLimits.maxRoster;
  const maxSubstitutes = modeLimits.maxSubstitutes;
  const maxCoaches = modeLimits.maxCoaches;
  const assistedReportingEnabled = isAssistedMatchReportingEnabled(
    tournament.game,
    tournamentGameMode,
    tournament.settings as { assistedMatchReporting?: boolean } | undefined,
  );
  const preferRiotTagForDisplay = getEffectiveGameFeatures(tournament.game, tournamentGameMode).assistedReporting;

  useEffect(() => {
    const fetchRosters = async () => {
      if (!selectedTeamId) { setTeamRosters([]); setSelectedRosterId(''); return; }
      try {
        const data = await apiClient.get<RosterRow[]>(
          `/api/teams/${selectedTeamId}/rosters`
        );
        const filtered = (data || []).filter((r: RosterRow) => {
        const byGame = !tournament.game || r.game?.toLowerCase() === tournament.game?.toLowerCase();
        const byMode = rosterMatchesTournamentMode(r);
        const bySize = usesLineupSelection || !coreMembers || Number(r.team_size) >= coreMembers;
        return byGame && byMode && bySize;
      });
      setTeamRosters(filtered);
      setSelectedRosterId(filtered[0]?.id || '');
      } catch {
        setTeamRosters([]);
        setSelectedRosterId('');
      }
    };
    fetchRosters();
  }, [coreMembers, rosterMatchesTournamentMode, selectedTeamId, tournament.game, usesLineupSelection]);

  useEffect(() => {
    setLineupSelections({});
  }, [selectedRosterId]);

  // Fetch roster members data when selectedRosterId changes
  useEffect(() => {
    const fetchRosterMembers = async () => {
      if (!selectedRosterId) {
        setRosterMembersData([]);
        return;
      }

      setFetchingMembers(true);
      try {
        const members = await apiClient.get<any[]>(
          `/api/teams/${selectedTeamId}/rosters/${selectedRosterId}/members`
        );

        // Also fetch captain's profile
        const team = captainTeams.find(t => t.id === selectedTeamId);
        const captainId = team?.owner_id;

        const allUserIds = (members || []).map((m: RosterMember) => m.user_id).filter(Boolean);
        let verifiedAccounts: RiotAccount[] = [];
        try {
          verifiedAccounts = await apiClient.get<RiotAccount[]>(
            `/api/profiles/riot-accounts?userIds=${allUserIds.join(',')}`
          ) || [];
        } catch { /* riot accounts optional */ }

        const accountMap = new Map<string, string | true>();
        verifiedAccounts?.forEach(a => {
          const uid = String(a.user_id);
          if (a.game_name && a.tag_line) {
            accountMap.set(uid, `${a.game_name}#${a.tag_line}`);
          } else {
            accountMap.set(uid, true);
          }
        });

        const formattedMembers = (members || []).map((m: RosterMember) => ({
          ...m,
          roster_role: resolveRosterRole(m),
          is_starter: resolveRosterRole(m) === 'starter',
          is_captain: m.user_id === captainId,
          profile: m.profiles || { username: m.username, full_name: m.full_name, avatar_url: m.avatar_url },
          is_verified: accountMap.has(String(m.user_id)),
          riot_tag_fallback: typeof accountMap.get(String(m.user_id)) === 'string' ? accountMap.get(String(m.user_id)) : null
        }));

        setRosterMembersData(formattedMembers);
      } catch (err) {
        console.error('Error fetching roster members:', err);
      } finally {
        setFetchingMembers(false);
      }
    };

    fetchRosterMembers();
  }, [selectedRosterId, selectedTeamId, captainTeams]);

  const fetchCaptainTeams = useCallback(async () => {
    if (!user?.id) {
      setFetchingTeams(true);
      return;
    }
    setFetchingTeams(true);
    try {
      const normalizeOwnerId = (value: unknown) => String(value ?? '').toLowerCase();
      const currentUserId = normalizeOwnerId(user.id);
      const mergeUniqueTeams = (base: TeamRow[], incoming: TeamRow[]) => {
        const seen = new Set(base.map((team) => team.id));
        const merged = [...base];
        for (const team of incoming) {
          if (!seen.has(team.id)) {
            seen.add(team.id);
            merged.push(team);
          }
        }
        return merged;
      };
      const sortTeamsNewestFirst = (items: TeamRow[]) =>
        [...items].sort((left, right) => {
          const leftCreated = Date.parse(String(left.created_at ?? left.createdAt ?? '')) || 0;
          const rightCreated = Date.parse(String(right.created_at ?? right.createdAt ?? '')) || 0;
          if (leftCreated !== rightCreated) return rightCreated - leftCreated;
          return right.name.localeCompare(left.name);
        });

      let teams: TeamRow[] = [];
      const gameQuery = tournament.game
        ? `?game=${encodeURIComponent(tournament.game)}&limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`
        : `?limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`;

      try {
        const captainTeamsResponse = await apiClient.get<TeamRow[]>(`/api/teams/my-captain-teams${gameQuery}`);
        teams = mergeUniqueTeams(teams, captainTeamsResponse || []);
      } catch (captainError) {
        console.warn('Captain team lookup failed:', captainError);
      }

      if (teams.length === 0) {
        try {
          const ownedQuery = tournament.game
            ? `owner_id=${user.id}&game=${encodeURIComponent(tournament.game)}&limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`
            : `owner_id=${user.id}&limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`;
          const ownedTeams = await apiClient.get<TeamRow[]>(`/api/teams?${ownedQuery}`);
          teams = mergeUniqueTeams(
            teams,
            (ownedTeams || []).filter((team) => normalizeOwnerId(team.owner_id) === currentUserId),
          );
        } catch (ownedError) {
          console.warn('Owner team lookup failed:', ownedError);
        }
      }

      if (teams.length === 0) {
        const myTeams = await apiClient.get<TeamRow[]>('/api/teams/me');
        teams = mergeUniqueTeams(
          teams,
          (myTeams || []).filter((team) => normalizeOwnerId(team.owner_id) === currentUserId),
        );
      }

      teams = sortTeamsNewestFirst(teams.filter(isRealTeamRow));
      const tooManyTeams = teams.length > MAX_ELIGIBILITY_TEAMS;
      setTeamListTruncated(tooManyTeams);

      setCaptainTeams(teams);
      setFetchingTeams(false);

      if (tooManyTeams) {
        setEligibleTeamIds(new Set());
        setIneligibleReasons({});
        setSelectedTeamId('');
        return;
      }

      const ids = new Set<string>();
      const reasons: Record<string, string[]> = {};
      const eligibilityBatchSize = 12;
      const teamsForEligibility = teams.filter(isRealTeamRow);

      for (let index = 0; index < teamsForEligibility.length; index += eligibilityBatchSize) {
        const batch = teamsForEligibility.slice(index, index + eligibilityBatchSize);
        await Promise.all(batch.map(async (team) => {
          if (!isRealTeamRow(team)) {
            reasons[team.id] = ['This entry is not a real team roster.'];
            return;
          }

          const errs: string[] = [];

          try {
            const rosters = await apiClient.get<any[]>(`/api/teams/${team.id}/rosters`);

            const normalizeGame = (s: string) => (s || '').toLowerCase().trim();
            const tournamentGameNormalized = normalizeGame(tournament.game || '');

            const gameRosters = (rosters || []).filter((r: RosterRow) =>
              normalizeGame(r.game) === tournamentGameNormalized,
            );
            const hasMatchingRoster = gameRosters.some((r: RosterRow) => rosterMatchesTournamentMode(r));

            if (!hasMatchingRoster) {
              errs.push("Team doesn't include this game. Create a roster for this game first.");
            }

            if (hasMatchingRoster && tournament.game) {
              const matchingRoster = gameRosters.find((r: RosterRow) => rosterMatchesTournamentMode(r));

              if (matchingRoster) {
                const rosterMembers = await apiClient.get<RosterMember[]>(
                  `/api/teams/${team.id}/rosters/${matchingRoster.id}/members`
                );
                const limits = getRosterLimits(tournament.game, tournamentGameMode, coreMembers);

                if (usesLineupSelection) {
                  const playerCount = countRosterPlayers(rosterMembers || []);
                  if (playerCount < limits.maxRoster) {
                    errs.push(`Roster pool needs at least ${limits.maxRoster} players (has ${playerCount}).`);
                  }
                } else {
                  const starters = (rosterMembers || []).filter((m) => resolveRosterRole(m) === 'starter').length;
                  const players = countRosterPlayers(rosterMembers || []);

                  if (starters !== limits.starters) {
                    errs.push(`Roster needs exactly ${limits.starters} starters (has ${starters}).`);
                  }
                  if (players > limits.maxRoster) {
                    errs.push(`Roster exceeds ${limits.maxRoster}-player limit (has ${players}).`);
                  }
                }
              }
            }
          } catch (teamError) {
            console.error(`Eligibility check failed for team ${team.id}:`, teamError);
            errs.push('Unable to verify team eligibility. Try again.');
          }

          if (errs.length === 0) ids.add(team.id);
          reasons[team.id] = errs;
        }));

        setEligibleTeamIds(new Set(ids));
        setIneligibleReasons({ ...reasons });
      }

      setEligibleTeamIds(ids);
      setIneligibleReasons(reasons);
      if (teams.length > 0) {
        const firstEligible = teams.find((team) => ids.has(team.id) && isRealTeamRow(team))?.id || '';
        setSelectedTeamId(firstEligible);
      }
    } catch (error) {
      console.error('Error fetching captain teams:', error);
      setCaptainTeams([]);
    } finally {
      setFetchingTeams(false);
    }
  }, [coreMembers, rosterMatchesTournamentMode, tournament.game, tournamentGameMode, usesLineupSelection, user?.id]);

  useEffect(() => {
    void fetchCaptainTeams();
  }, [fetchCaptainTeams]);

  const formatDate = (raw: string | null | undefined) => {
    try {
      // Prefer ISO datetime
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${dateStr} at ${timeStr}`;
        }
      }
      // Fallback: try date + time fields if provided by upstream
      const tObj = tournament as Record<string, unknown>;
      if (tObj?.date) {
        const combined = tObj.time ? `${tObj.date}T${tObj.time}` : String(tObj.date);
        const d2 = new Date(combined);
        if (!isNaN(d2.getTime())) {
          const dateStr = d2.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = d2.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${dateStr} at ${timeStr}`;
        }
        // If still invalid, show as-is date string
        return String(tObj.date);
      }
      return '—';
    } catch {
      return '—';
    }
  };

  const lineupComplete = !usesLineupSelection
    || isTournamentLineupComplete(lineupSelections, tournament.game, tournamentGameMode);

  const handleRegister = async () => {
    if (!user || !selectedTeamId || !eligibleTeamIds.has(selectedTeamId)) return;
    if (!selectedRosterId) {
      toast({ title: 'Select roster', description: 'Please select a roster for this tournament.', variant: 'destructive' });
      return;
    }
    if (usesLineupSelection && !lineupComplete) {
      toast({ title: 'Complete lineup', description: 'Pick starters and substitutes for this tournament.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const tournamentData = await apiClient.get<any>(`/api/tournaments/${tournament.id}`);
      const liveTournament = tournamentData?.tournament || tournamentData;
      const eligibility = evaluateRegistrationEligibility({
        status: liveTournament?.status ?? tournament.status,
        registrationOpens: getRegistrationOpensFromSettings(
          liveTournament?.settings ?? tournament.settings,
        ),
        registrationDeadline: liveTournament?.registration_deadline ?? tournament.registration_deadline,
        startDate: liveTournament?.start_date ?? tournament.start_date,
      });
      if (!eligibility.allowed) {
        throw new Error(eligibility.reason ?? 'Registration is not available.');
      }

      const team = captainTeams.find(t => t.id === selectedTeamId)!;

      const rosterMembers = await apiClient.get<RosterMember[]>(
        `/api/teams/${selectedTeamId}/rosters/${selectedRosterId}/members`
      );

      let rosterLineup;
      let memberNames: string[];

      if (usesLineupSelection) {
        const memberIds = (rosterMembers || []).map((r) => r.user_id);
        const profileRows = await apiClient.get<any[]>(
          `/api/profiles?ids=${memberIds.join(',')}`
        );
        const memberMap = new Map<string, string>();
        (profileRows || []).forEach((p) => {
          const name = (preferRiotTagForDisplay && (p as any).riot_tag) || (p as any).username || (p as any).full_name || (p as any).id;
          if (name) memberMap.set(p.id, name);
        });

        rosterLineup = buildRosterLineupPayload(rosterMembers || [], lineupSelections, memberMap);
        memberNames = [
          ...rosterLineup.starters.map((entry) => entry.displayName),
          ...rosterLineup.substitutes.map((entry) => entry.displayName),
        ];

        if (assistedReportingEnabled) {
          const selectedIds = new Set([
            ...rosterLineup.starters.map((entry) => entry.userId),
            ...rosterLineup.substitutes.map((entry) => entry.userId),
          ]);
          const captainOnRoster = rosterMembersData.find((m) => m.user_id === user.id && selectedIds.has(m.user_id))
            ?? rosterMembersData.find((m) => m.is_captain && selectedIds.has(m.user_id));
          const captainHasRiot = captainOnRoster?.is_verified || captainOnRoster?.profile?.riot_tag || captainOnRoster?.riot_tag_fallback;
          if (!captainHasRiot) {
            throw new Error('As the team captain, you must link your Riot account via Riot Sign-On to register for this tournament.');
          }
        }
      } else {
        const roleCounts = { starter: 0, substitute: 0, coach: 0 };
        (rosterMembers || []).forEach((member) => {
          const role = resolveRosterRole(member);
          roleCounts[role] += 1;
        });
        const playerCount = roleCounts.starter + roleCounts.substitute;

        if (roleCounts.starter !== requiredStarters) {
          throw new Error(`Your roster needs exactly ${requiredStarters} starters. It currently has ${roleCounts.starter}.`);
        }
        if (roleCounts.substitute > maxSubstitutes) {
          throw new Error(`Your roster has ${roleCounts.substitute} substitutes, exceeding the limit of ${maxSubstitutes}.`);
        }
        if (playerCount > maxPlayers) {
          throw new Error(`Your roster has ${playerCount} players, exceeding the ${maxPlayers}-player limit.`);
        }
        if (roleCounts.coach > maxCoaches) {
          throw new Error(`Your roster has ${roleCounts.coach} coaches, exceeding the limit of ${maxCoaches}.`);
        }
        if ((rosterMembers || []).length === 0) {
          throw new Error('No roster members found');
        }

        if (assistedReportingEnabled) {
          const captainOnRoster = rosterMembersData.find(m => m.user_id === user.id)
            ?? rosterMembersData.find(m => m.is_captain);
          const captainHasRiot = captainOnRoster?.is_verified || captainOnRoster?.profile?.riot_tag || captainOnRoster?.riot_tag_fallback;
          if (!captainHasRiot) {
            throw new Error('As the team captain, you must link your Riot account via Riot Sign-On to register for this tournament.');
          }
        }

        const memberIds = (rosterMembers || []).map((r) => r.user_id);
        const profileRows = await apiClient.get<any[]>(
          `/api/profiles?ids=${memberIds.join(',')}`
        );

        const memberMap = new Map<string, string>();
        (profileRows || []).forEach(p => {
          const name = (preferRiotTagForDisplay && (p as any).riot_tag) || (p as any).username || (p as any).full_name || (p as any).id;
          if (name) memberMap.set(p.id, name);
        });

        const buildNames = (role: 'starter' | 'substitute' | 'coach') =>
          (rosterMembers || [])
            .filter((m) => resolveRosterRole(m) === role)
            .map((m) => memberMap.get(m.user_id))
            .filter(Boolean) as string[];

        const starterNames = buildNames('starter');
        const substituteNames = buildNames('substitute');
        const coachNames = buildNames('coach');
        memberNames = [...starterNames, ...substituteNames, ...coachNames];

        rosterLineup = {
          starters: (rosterMembers || [])
            .filter((m) => resolveRosterRole(m) === 'starter')
            .map((m) => ({ userId: m.user_id, displayName: memberMap.get(m.user_id) || m.user_id })),
          substitutes: (rosterMembers || [])
            .filter((m) => resolveRosterRole(m) === 'substitute')
            .map((m) => ({ userId: m.user_id, displayName: memberMap.get(m.user_id) || m.user_id })),
          coaches: (rosterMembers || [])
            .filter((m) => resolveRosterRole(m) === 'coach')
            .map((m) => ({ userId: m.user_id, displayName: memberMap.get(m.user_id) || m.user_id })),
        };
      }

      const roster = teamRosters.find(r => r.id === selectedRosterId);

      await apiClient.post(`/api/tournaments/${tournament.id}/register`, {
        participantType: 'team',
        teamCaptainId: user.id,
        teamId: selectedTeamId,
        teamName: roster?.name || team.name,
        teamMembers: memberNames.join(','),
        rosterLineup: JSON.stringify(rosterLineup),
        rosterId: selectedRosterId,
        rosterName: roster?.name || null,
        teamContactEmail: user.email || null,
      });

      const isPaid = tournament.entry_fee && tournament.entry_fee > 0;
      toast({
        title: isPaid ? 'Registration Pending' : 'Registered',
        description: isPaid
          ? 'Your registration is pending approval. Upload payment receipt to proceed.'
          : 'Team registered successfully.',
      });

      // Send confirmation email
      if (user.email) {
        const { sendEmail } = await import('@/hooks/useEmail');
        sendEmail({
          type: 'TournamentRegistration',
          email: user.email,
          data: {
            username: user.user_metadata?.username || user.user_metadata?.full_name || '',
            tournamentName: tournament.name,
            teamName: roster?.name || team.name,
            registrationType: 'team',
            game: tournament.game,
            startDate: tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
            endDate: (tournament as Record<string, unknown>).end_date ? new Date(String((tournament as Record<string, unknown>).end_date)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '',
            tournamentUrl: `${window.location.origin}/tournaments/${tournament.id}`,
          },
        }).catch((err) => console.warn('[TeamRegistration] Email send failed:', err));
      }

      onRegistrationComplete?.();
    } catch (e: unknown) {
      toast({
        title: 'Registration Failed',
        description: getApiErrorMessage(e, { context: 'registration' }),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#0a0a0a] border border-[#1a1a1a] shadow-xl overflow-hidden max-h-[calc(90vh-8rem)] flex flex-col">
      <CardHeader className="pb-4 border-b border-[#1a1a1a]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white flex items-center gap-3 text-xl font-semibold mb-1">
              <div className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span>Team Registration</span>
            </CardTitle>
            <p className="text-gray-400 text-sm ml-12">
              Register your team for <span className="text-white font-medium">{tournament.name}</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5 overflow-y-auto overscroll-contain custom-scrollbar flex-1 min-h-0" data-lenis-prevent>
        {/* Tournament Info - Clean Minimal */}
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tournament Details</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 relative">
              {gameLogo ? (
                <>
                  <img
                    src={gameLogo}
                    alt={`${tournament.game} logo`}
                    className="w-[64px] h-[64px] object-contain rounded"
                    onError={(e) => {
                      console.error('Image failed to load:', gameLogo);
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <Gamepad2 className="w-[64px] h-[64px] text-gray-400 absolute hidden game-icon-fallback" />
                </>
              ) : (
                <Gamepad2 className="w-[64px] h-[64px] text-gray-400" />
              )}
              <div>
                <span className="text-xs text-gray-500 block mb-1">Game</span>
                <span className="text-white font-semibold">{tournament.game}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block mb-1">Start Date</span>
                <span className="text-white font-medium text-sm">{formatDate(tournament.start_date)}</span>
              </div>
            </div>
            {tournament.entry_fee && tournament.entry_fee > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Entry Fee</span>
                  <span className="text-white font-medium text-sm">{tournament.currency || 'USD'} {tournament.entry_fee}</span>
                </div>
              </div>
            )}
            {tournament.prize_pool && tournament.prize_pool > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                  <Trophy className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Prize Pool</span>
                  <span className="text-white font-medium text-sm">{tournament.currency || 'USD'} {tournament.prize_pool}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Captain Teams - Clean Minimal */}
        {fetchingTeams ? (
          <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading your teams...</span>
          </div>
        ) : captainTeams.length === 0 ? (
          <Alert className="bg-[#1a0a0a] border border-[#3a1a1a]">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300 text-sm">
              Create a team first, then return to register.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {teamListTruncated && (
              <Alert className="bg-[#1a150a] border border-amber-500/30">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-200 text-sm">
                  Too many teams matched this account. Narrow your teams in Team Management or contact support before registering.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Your Team</span>
            </div>
            {captainTeams.map((team) => {
              const eligibilityKnown = Object.prototype.hasOwnProperty.call(ineligibleReasons, team.id);
              const isEligible = eligibilityKnown && eligibleTeamIds.has(team.id);
              const errs = ineligibleReasons[team.id] || [];
              const isSelected = selectedTeamId === team.id;

              return (
                <div
                  key={team.id}
                  className={`border rounded-lg transition-all ${isEligible
                    ? isSelected
                      ? 'border-[#3a3a3a] bg-[#151515]'
                      : 'border-[#2a2a2a] bg-[#111111] hover:border-[#3a3a3a] cursor-pointer'
                    : 'border-[#2a1a1a] bg-[#0f0a0a] opacity-60'
                    }`}
                  onClick={() => eligibilityKnown && isEligible && setSelectedTeamId(team.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Radio Button */}
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected && isEligible
                          ? 'border-white bg-white'
                          : isEligible
                            ? 'border-[#4a4a4a]'
                            : 'border-[#3a3a3a]'
                          }`}>
                          {isSelected && isEligible && (
                            <div className="w-2 h-2 rounded-full bg-[#0a0a0a]" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-white font-semibold text-base flex items-center gap-2">
                            {team.name}
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          { !eligibilityKnown ? (
                            <Badge variant="outline" className="border-[#3a3a3a] text-gray-400 bg-[#151515] px-2.5 py-0.5 text-xs">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Checking
                            </Badge>
                          ) : isEligible ? (
                            <Badge className="bg-[#1a3a1a] border border-[#2a5a2a] text-green-300 px-2.5 py-0.5 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Eligible
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-[#5a2a2a] text-red-300 bg-[#1a0a0a] px-2.5 py-0.5 text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Not Eligible
                            </Badge>
                          )}
                        </div>

                        {!isEligible && errs.length > 0 && (
                          <div className="mt-2 p-2 bg-[#1a0a0a] border border-[#3a1a1a] rounded">
                            <div className="text-xs text-red-300 flex items-center gap-1.5">
                              <AlertCircle className="w-3 h-3" />
                              {errs[0]}
                            </div>
                          </div>
                        )}

                        {/* Roster Selection */}
                        {isSelected && isEligible && (
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                Select Roster
                              </Label>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="cursor-help">
                                      <Info className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300 transition-colors" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs max-w-xs z-50"
                                  >
                                    <p className="font-semibold mb-1">Required criteria:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                      <li>Game: {tournament.game}</li>
                                      {tournamentGameMode && <li>Mode: {tournamentGameMode}</li>}
                                      <li>Team size: {coreMembers}+ members</li>
                                      <li>Roster must be active</li>
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select value={selectedRosterId || undefined} onValueChange={setSelectedRosterId}>
                              <SelectTrigger className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm hover:border-[#3a3a3a] focus:border-[#4a4a4a] transition-colors">
                                <SelectValue placeholder="Choose a roster">
                                  {selectedRosterId && teamRosters.find(r => r.id === selectedRosterId)
                                    ? `${teamRosters.find(r => r.id === selectedRosterId)?.name} · ${teamRosters.find(r => r.id === selectedRosterId)?.game}${teamRosters.find(r => r.id === selectedRosterId)?.format ? ` · ${teamRosters.find(r => r.id === selectedRosterId)?.format}` : ''}`
                                    : 'Select a roster'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a0a0a] border border-[#2a2a2a]">
                                {(teamRosters || []).length > 0 ? (
                                  (teamRosters || []).map(r => (
                                    <SelectItem
                                      key={r.id}
                                      value={r.id}
                                      className="text-white hover:bg-[#151515] focus:bg-[#151515] cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2">
                                        {rosterGameLogos[r.game] ? (
                                          <div className="w-5 h-5 flex items-center justify-center">
                                            <img
                                              src={rosterGameLogos[r.game]}
                                              alt={`${r.game} logo`}
                                              className="w-full h-full object-contain rounded"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <Shield className="w-4 h-4 text-gray-400" />
                                        )}
                                        <span>{r.name} · {r.game}{r.format ? ` · ${r.format}` : ''}</span>
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                    No matching roster found
                                  </div>
                                )}
                              </SelectContent>
                            </Select>

                            {/* Roster Members Preview */}
                            {selectedRosterId && (
                              <div className="mt-4 border-t border-[#1a1a1a] pt-4 space-y-3">
                                {fetchingMembers ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                  </div>
                                ) : usesLineupSelection ? (
                                  <TournamentLineupPicker
                                    game={tournament.game}
                                    modeKey={tournamentGameMode}
                                    members={rosterMembersData}
                                    selections={lineupSelections}
                                    onChange={setLineupSelections}
                                    assistedReportingEnabled={assistedReportingEnabled}
                                  />
                                ) : (
                                  <>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Roster Lineup</span>
                                      <span className="text-[10px] text-gray-500">
                                        {requiredStarters} starters · {maxSubstitutes} subs · {maxCoaches} coaches max
                                      </span>
                                    </div>
                                    <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                      {([
                                        { key: 'starter', label: 'Starters', badgeClass: 'text-emerald-400 border-emerald-500/20' },
                                        { key: 'substitute', label: 'Substitutes', badgeClass: 'text-yellow-400 border-yellow-500/20' },
                                        { key: 'coach', label: 'Coaches', badgeClass: 'text-cyan-400 border-cyan-500/20' },
                                      ] as const).map(({ key, label, badgeClass }) => {
                                        const group = rosterMembersData.filter((m) => (m.roster_role || resolveRosterRole(m)) === key);
                                        if (group.length === 0) return null;
                                        return (
                                          <div key={key} className="space-y-2">
                                            <div className="text-[10px] uppercase tracking-wider text-gray-500">{label} ({group.length})</div>
                                            {group.map((m, idx) => (
                                              <div key={m.user_id || idx} className="flex items-center justify-between p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-6 h-6 rounded bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {m.profile?.username?.[0] || '?'}
                                                  </div>
                                                  <div className="flex flex-col">
                                                    <span className="text-sm text-white font-medium flex items-center gap-1.5">
                                                      {m.profile?.username}
                                                      {m.is_captain && <Badge className="bg-[#1a1a1a] text-blue-400 border-blue-500/20 text-[8px] h-3.5 px-1 uppercase">Cap</Badge>}
                                                      <Badge variant="outline" className={`text-[8px] h-3.5 px-1 uppercase ${badgeClass}`}>{key}</Badge>
                                                    </span>
                                                    {assistedReportingEnabled && (
                                                      <span className="text-[10px] text-gray-500">
                                                        {m.profile?.riot_tag || m.riot_tag_fallback || 'No Riot ID'}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>

                                                {assistedReportingEnabled && (
                                                  <div className="flex items-center">
                                                    {(m.is_verified || m.profile?.riot_tag || m.riot_tag_fallback) ? (
                                                      <TooltipProvider delayDuration={0}>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <div className="p-1 bg-green-500/10 rounded-full">
                                                              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                            </div>
                                                          </TooltipTrigger>
                                                          <TooltipContent className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-[10px]">
                                                            Verified Riot Account
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    ) : (
                                                      <TooltipProvider delayDuration={0}>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <div className="p-1 bg-red-500/10 rounded-full">
                                                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                            </div>
                                                          </TooltipTrigger>
                                                          <TooltipContent className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-[10px]">
                                                            Riot link required
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {selectedRosterId && (() => {
                              const selectedRoster = teamRosters.find(r => r.id === selectedRosterId);
                              // Only show requirements if roster doesn't meet criteria
                              const rosterMeetsCriteria = selectedRoster &&
                                selectedRoster.game?.toLowerCase() === tournament.game?.toLowerCase() &&
                                rosterMatchesTournamentMode(selectedRoster) &&
                                (usesLineupSelection || Number(selectedRoster.team_size) >= coreMembers);

                              // Don't show message if criteria is met
                              if (rosterMeetsCriteria) return null;

                              return (
                                <div className="mt-2 p-2 bg-[#1a0a0a] border border-[#3a1a1a] rounded">
                                  <div className="text-xs text-red-300 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>
                                      {selectedRoster?.game?.toLowerCase() !== tournament.game?.toLowerCase() && `Game mismatch: ${selectedRoster?.game} ≠ ${tournament.game}`}
                                      {selectedRoster?.game?.toLowerCase() === tournament.game?.toLowerCase() && Number(selectedRoster?.team_size) < coreMembers &&
                                        `Team size ${selectedRoster?.team_size} is too small (needs ${coreMembers}+)`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions - Clean */}
        <div className="flex gap-3 pt-2 border-t border-[#1a1a1a]">
          <CtaButton
            disabled={!selectedTeamId || !eligibleTeamIds.has(selectedTeamId) || !selectedRosterId || !lineupComplete || loading}
            onClick={handleRegister}
            className="flex-1 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                <span>Register Team</span>
              </>
            )}
          </CtaButton>
          <CancelButton
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
              }
            }}
            className="px-6 py-3"
          >
            Cancel
          </CancelButton>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamTournamentRegistration;
