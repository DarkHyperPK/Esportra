import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { getGameMode } from '@/utils/gameFeatures';

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
    description?: string;
    settings?: Record<string, unknown>;
  };

  onRegistrationComplete?: () => void;
  onCancel?: () => void;
}

// API response shape from /api/teams — games field is a JSONB column with variable structure
type TeamRow = { id: string; name: string; games: Record<string, unknown> | null; owner_id: string };

// API response types for roster/member data from .NET endpoints
interface RosterRow { id: string; game?: string; format?: string | null; team_size?: number; name?: string }
interface RosterMember { user_id: string; username?: string; full_name?: string; avatar_url?: string; is_starter?: boolean; profiles?: Record<string, unknown> }
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
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [teamRosters, setTeamRosters] = useState<Array<{ id: string; name: string; game: string; format: string | null; team_size: number }>>([]);
  const [selectedRosterId, setSelectedRosterId] = useState<string>('');
  const [rosterMembersData, setRosterMembersData] = useState<any[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  // Use global game logo hooks
  const gameLogo = useGameLogo(tournament.game);
  const rosterGameLogos = useGameLogos(teamRosters.map(r => r.game));

  const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();
  const tournamentGameMode = (tournament.gameMode || tournament.game_mode || '').trim();

  const getCoreTeamSize = (gameName: string, modeKey?: string | null): number => {
    const mode = getGameMode(gameName, modeKey);
    return mode?.teamSize || Number(tournament.team_size) || 5;
  };

  const rosterMatchesMode = useCallback((roster: RosterRow) => {
    if (!tournamentGameMode || !roster.format) return true;
    return normalize(roster.format) === normalize(tournamentGameMode);
  }, [tournamentGameMode]);

  const coreMembers = getCoreTeamSize(tournament.game, tournamentGameMode);
  // Default max to tournament's team_size, or industry standard (core + 2 subs)
  const maxMembers = tournament.team_size ? Number(tournament.team_size) : coreMembers + 2;

  useEffect(() => {
    const fetchRosters = async () => {
      if (!selectedTeamId) { setTeamRosters([]); setSelectedRosterId(''); return; }
      try {
        const data = await apiClient.get<RosterRow[]>(
          `/api/teams/${selectedTeamId}/rosters`
        );
        const filtered = (data || []).filter((r: RosterRow) => {
        const byGame = !tournament.game || r.game?.toLowerCase() === tournament.game?.toLowerCase();
        const byMode = rosterMatchesMode(r);
        // Roster team_size should be >= coreMembers (filter is lenient, actual validation at registration)
        const bySize = !coreMembers || Number(r.team_size) >= coreMembers;
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
  }, [coreMembers, rosterMatchesMode, selectedTeamId, tournament.game]);

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

        const captainProfile = await apiClient.get<Record<string, unknown>>(
          `/api/profiles/${captainId}`
        );

        // Fetch riot accounts for verification status AND IDs
        const allUserIds = [captainId, ...(members || []).map((m: RosterMember) => m.user_id)].filter(Boolean);
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

        const formattedMembers = [
          {
            user_id: captainId,
            is_starter: true,
            is_captain: true,
            profile: captainProfile,
            is_verified: accountMap.has(String(captainId)),
            riot_tag_fallback: typeof accountMap.get(String(captainId)) === 'string' ? accountMap.get(String(captainId)) : null
          },
          ...(members || []).filter((m: RosterMember) => m.user_id !== captainId).map((m: RosterMember) => ({
            ...m,
            profile: m.profiles || { username: m.username, full_name: m.full_name, avatar_url: m.avatar_url },
            is_verified: accountMap.has(String(m.user_id)),
            riot_tag_fallback: typeof accountMap.get(String(m.user_id)) === 'string' ? accountMap.get(String(m.user_id)) : null
          }))
        ];

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

      let teams: TeamRow[] = [];

      try {
        const captainTeamsResponse = await apiClient.get<TeamRow[]>('/api/teams/my-captain-teams');
        teams = mergeUniqueTeams(teams, captainTeamsResponse || []);
      } catch (captainError) {
        console.warn('Captain team lookup failed:', captainError);
      }

      if (teams.length === 0) {
        try {
          const ownedTeams = await apiClient.get<TeamRow[]>(`/api/teams?owner_id=${user.id}&limit=25`);
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

      setCaptainTeams(teams);
      setFetchingTeams(false);

      const ids = new Set<string>();
      const reasons: Record<string, string[]> = {};

      await Promise.all(teams.map(async (team) => {
        const errs: string[] = [];

        try {
          const rosters = await apiClient.get<any[]>(`/api/teams/${team.id}/rosters`);

          const normalizeGame = (s: string) => (s || '').toLowerCase().trim();
          const tournamentGameNormalized = normalizeGame(tournament.game || '');

          const hasMatchingRoster = (rosters || []).some((r: RosterRow) =>
            normalizeGame(r.game) === tournamentGameNormalized && rosterMatchesMode(r)
          );

          const teamGames = Array.isArray(team.games) ? team.games : (typeof team.games === 'string' ? [team.games] : []);
          const hasGameInTeam = teamGames.some((g: string) => normalizeGame(g) === tournamentGameNormalized);

          if (!hasMatchingRoster && !hasGameInTeam) {
            errs.push("Team doesn't include this game. Create a roster for this game first.");
          }

          if (hasMatchingRoster && tournament.game) {
            const matchingRoster = (rosters || []).find((r: RosterRow) =>
              normalizeGame(r.game) === tournamentGameNormalized && rosterMatchesMode(r)
            );

            if (matchingRoster) {
              const rosterMembers = await apiClient.get<any[]>(
                `/api/teams/${team.id}/rosters/${matchingRoster.id}/members`
              );
              const rosterMemberCount = (rosterMembers || []).length + 1;

              if (rosterMemberCount < coreMembers) {
                errs.push(`Roster needs at least ${coreMembers} members (has ${rosterMemberCount}).`);
              }
            }
          } else if (!hasMatchingRoster) {
            const members = await apiClient.get<any[]>(`/api/teams/${team.id}/members/detailed`);
            const activeCount = (members || []).length + 1;

            if (activeCount < coreMembers) {
              errs.push(`Need at least ${coreMembers} members (have ${activeCount}).`);
            }
          }
        } catch (teamError) {
          console.error(`Eligibility check failed for team ${team.id}:`, teamError);
          errs.push('Unable to verify team eligibility. Try again.');
        }

        if (errs.length === 0) ids.add(team.id);
        reasons[team.id] = errs;
      }));

      setEligibleTeamIds(ids);
      setIneligibleReasons(reasons);
      if (teams.length > 0) {
        const firstEligible = (teams.find(t => ids.has(t.id)) || {}).id || '';
        setSelectedTeamId(firstEligible);
      }
    } catch (error) {
      console.error('Error fetching captain teams:', error);
      setCaptainTeams([]);
    } finally {
      setFetchingTeams(false);
    }
  }, [coreMembers, rosterMatchesMode, tournament.game, user?.id]);

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

  const handleRegister = async () => {
    if (!user || !selectedTeamId || !eligibleTeamIds.has(selectedTeamId)) return;
    if (!selectedRosterId) {
      toast({ title: 'Select roster', description: 'Please select a roster for this tournament.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const team = captainTeams.find(t => t.id === selectedTeamId)!;

      // Fetch roster members with status (include captain in count)
      const rosterMembers = await apiClient.get<any[]>(
        `/api/teams/${selectedTeamId}/rosters/${selectedRosterId}/members`
      );

      const memberStatusMap = new Map<string, boolean>();
      (rosterMembers || []).forEach((r: RosterMember) => memberStatusMap.set(r.user_id, r.is_starter ?? true));

      // distinct IDs
      const memberIds = Array.from(new Set(((rosterMembers || []).map((r: RosterMember) => r.user_id))));

      // Sort: Starters first, then Bench
      memberIds.sort((a, b) => {
        if (a === team.owner_id) return -1; // Captain handled separately but good to sort
        if (b === team.owner_id) return 1;
        const aStart = memberStatusMap.get(a) ? 1 : 0;
        const bStart = memberStatusMap.get(b) ? 1 : 0;
        return bStart - aStart; // Descending: 1 before 0
      });

      const distinctMembers = new Set([...memberIds, team.owner_id]);
      const totalCount = distinctMembers.size;

      // Calculate distinct active members
      let activeCount = 0;
      distinctMembers.forEach(id => {
        // If in roster, check map. If captain not in roster, assume active.
        const isActive = memberStatusMap.has(id) ? memberStatusMap.get(id) : true;
        if (isActive) activeCount++;
      });

      // DEBUG: Log values to verify flexible validation is being used
      console.log('[TeamTournamentRegistration] DEBUG:', {
        game: tournament.game,
        coreMembers,
        maxMembers,
        totalCount,
        activeCount,
        memberIds: memberIds.length,
        tournamentTeamSize: (tournament as any).team_size
      });

      // Validate member count is within range [coreMembers, infinity]
      if (totalCount < coreMembers) {
        throw new Error(`Selected roster needs at least ${coreMembers} members (currently has ${totalCount})`);
      }

      // Validate ACTIVE members count
      if (activeCount < coreMembers) {
        throw new Error(`Your team needs at least ${coreMembers} ACTIVE (Starter) players to register. You currently have ${activeCount} active players. Please update player statuses in Team Management.`);
      }

      // ── VALORANT SPECIFIC VALIDATION (only when assisted match reporting is enabled) ──
      const isValorant = tournament?.game?.toLowerCase() === 'valorant';
      if (isValorant && tournament?.settings?.assistedMatchReporting) {
        // Only check if the captain (user) has a linked Riot account
        const captainData = rosterMembersData.find(m => m.is_captain);
        const captainHasRiot = captainData?.is_verified || captainData?.profile?.riot_tag || captainData?.riot_tag_fallback;
        if (captainData && !captainHasRiot) {
          throw new Error(`As the team captain, you must link your Riot account via Riot Sign-On to register for a Valorant tournament.`);
        }
      }
      // Max limit removed per user request to allow larger rosters
      // if (totalCount > maxMembers) {
      //   throw new Error(`Selected roster exceeds max ${maxMembers} members (currently has ${totalCount})`);
      // }


      // Resolve member display names from profiles (include captain)
      const allMemberIds = [...memberIds];
      if (!allMemberIds.includes(team.owner_id)) {
        allMemberIds.push(team.owner_id); // Add captain if not already in roster
      }

      if (allMemberIds.length === 0) {
        throw new Error('No team members found');
      }

      const profileRows = await apiClient.get<any[]>(
        `/api/profiles?ids=${allMemberIds.join(',')}`
      );

      // Map to names, ensuring captain is included
      const memberMap = new Map<string, string>();
      (profileRows || []).forEach(p => {
        const isValorant = tournament?.game?.toLowerCase() === 'valorant';
        const name = (isValorant && (p as any).riot_tag) || (p as any).username || (p as any).full_name || (p as any).id;
        if (name) memberMap.set(p.id, name);
      });

      // Build member names array, captain first
      const memberNames: string[] = [];
      const captainName = memberMap.get(team.owner_id);
      if (captainName) memberNames.push(captainName);
      memberIds.forEach(id => {
        if (id !== team.owner_id) {
          const name = memberMap.get(id);
          if (name) memberNames.push(name);
        }
      });

      const roster = teamRosters.find(r => r.id === selectedRosterId);

      await apiClient.post(`/api/tournaments/${tournament.id}/register`, {
        participantType: 'team',
        teamCaptainId: user.id,
        teamId: selectedTeamId,
        teamName: roster?.name || team.name,
        teamMembers: memberNames.join(','),
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
      const err = e as Error;
      toast({ title: 'Registration Failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#0a0a0a] border border-[#1a1a1a] shadow-xl overflow-hidden">
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
      <CardContent className="space-y-5 pt-5">
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
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Your Team</span>
            </div>
            {captainTeams.map((team) => {
              const isEligible = eligibleTeamIds.has(team.id);
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
                  onClick={() => isEligible && setSelectedTeamId(team.id)}
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
                          {isEligible ? (
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
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Roster Members</span>
                                  <span className="text-[10px] text-gray-500">{rosterMembersData.length} Total</span>
                                </div>

                                {fetchingMembers ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {rosterMembersData.map((m, idx) => (
                                      <div key={m.user_id || idx} className="flex items-center justify-between p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-gray-400">
                                            {m.profile?.username?.[0] || '?'}
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-sm text-white font-medium flex items-center gap-1.5">
                                              {m.profile?.username}
                                              {m.is_captain && <Badge className="bg-[#1a1a1a] text-blue-400 border-blue-500/20 text-[8px] h-3.5 px-1 uppercase">Cap</Badge>}
                                              {!m.is_starter && <Badge variant="outline" className="text-gray-500 border-gray-800 text-[8px] h-3.5 px-1 uppercase">Sub</Badge>}
                                            </span>
                                            {tournament?.game?.toLowerCase() === 'valorant' && tournament?.settings?.assistedMatchReporting && (
                                              <span className="text-[10px] text-gray-500">
                                                {m.profile?.riot_tag || m.riot_tag_fallback || 'No Riot ID'}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {tournament?.game?.toLowerCase() === 'valorant' && tournament?.settings?.assistedMatchReporting && (
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
                                )}
                              </div>
                            )}

                            {selectedRosterId && (() => {
                              const selectedRoster = teamRosters.find(r => r.id === selectedRosterId);
                              // Only show requirements if roster doesn't meet criteria
                              const rosterMeetsCriteria = selectedRoster &&
                                selectedRoster.game?.toLowerCase() === tournament.game?.toLowerCase() &&
                                rosterMatchesMode(selectedRoster) &&
                                Number(selectedRoster.team_size) >= coreMembers;

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
          <Button
            disabled={!selectedTeamId || !eligibleTeamIds.has(selectedTeamId) || !selectedRosterId || loading}
            onClick={handleRegister}
            className="flex-1 bg-white text-[#0a0a0a] hover:bg-gray-100 font-semibold py-3 text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
              }
            }}
            variant="outline"
            className="border-[#2a2a2a] text-gray-300 hover:bg-[#151515] hover:border-[#3a3a3a] hover:text-white px-6 py-3 transition-colors"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamTournamentRegistration;
