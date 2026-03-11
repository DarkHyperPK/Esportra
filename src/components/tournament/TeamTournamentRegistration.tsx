import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import esportsGames from '@/data/esportsGames.json';

interface TeamTournamentRegistrationProps {
  tournament: {
    id: string;
    name: string;
    game: string;
    start_date: string;
    entry_fee?: number;
    prize_pool?: number;
    max_teams: number;
    team_size?: number;
    registration_deadline?: string;
    description?: string;
  };

  onRegistrationComplete?: () => void;
  onCancel?: () => void;
}

type TeamRow = { id: string; name: string; games: any; owner_id: string };

const TeamTournamentRegistration: React.FC<TeamTournamentRegistrationProps> = ({
  tournament,
  onRegistrationComplete,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);

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

  // Derive core team size from game format (e.g., 5 for 5v5), fallback to 5
  const getCoreTeamSize = (gameName: string): number => {
    const game = esportsGames.games.find(
      g => g.name.toLowerCase() === gameName.toLowerCase()
    );
    if (game?.formats && game.formats.length > 0) {
      // Use the default format's team size, or the first format
      const defaultFormat = game.formats.find(f => f.value === game.defaultFormat);
      return defaultFormat?.teamSize || game.formats[0]?.teamSize || 5;
    }
    return 5; // Default to 5v5 if game not found
  };

  const coreMembers = getCoreTeamSize(tournament.game);
  // Default max to tournament's team_size, or industry standard (core + 2 subs)
  const maxMembers = tournament.team_size ? Number(tournament.team_size) : coreMembers + 2;



  useEffect(() => {
    checkExistingRegistration();
  }, [user?.id, tournament.id]);

  useEffect(() => {
    fetchCaptainTeams();
  }, [user?.id]);


  useEffect(() => {
    const fetchRosters = async () => {
      if (!selectedTeamId) { setTeamRosters([]); setSelectedRosterId(''); return; }
      try {
        const data = await apiClient.get<any[]>(
          `/api/teams/${selectedTeamId}/rosters`
        );
        const filtered = (data || []).filter((r: any) => {
        const byGame = !tournament.game || r.game === tournament.game;
        // Roster team_size should be >= coreMembers (filter is lenient, actual validation at registration)
        const bySize = !coreMembers || Number(r.team_size) >= coreMembers;
        return byGame && bySize;
      });
      setTeamRosters(filtered);
      setSelectedRosterId(filtered[0]?.id || '');
      } catch {
        setTeamRosters([]);
        setSelectedRosterId('');
      }
    };
    fetchRosters();
  }, [selectedTeamId, tournament.game, coreMembers]);

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

        const captainProfile = await apiClient.get<any>(
          `/api/profiles/${captainId}`
        );

        // Fetch riot accounts for verification status AND IDs
        const allUserIds = [captainId, ...(members || []).map((m: any) => m.user_id)].filter(Boolean);
        const verifiedAccounts = await apiClient.get<any[]>(
          `/api/profiles/riot-accounts?userIds=${allUserIds.join(',')}`
        );

        const accountMap = new Map();
        verifiedAccounts?.forEach(a => {
          if (a.game_name && a.tag_line) {
            accountMap.set(a.user_id, `${a.game_name}#${a.tag_line}`);
          } else {
            accountMap.set(a.user_id, true); // Just verified but no tag data?
          }
        });

        const formattedMembers = [
          {
            user_id: captainId,
            is_starter: true,
            is_captain: true,
            profile: captainProfile,
            is_verified: accountMap.has(captainId),
            riot_tag_fallback: typeof accountMap.get(captainId) === 'string' ? accountMap.get(captainId) : null
          },
          ...(members || []).map((m: any) => ({
            ...m,
            profile: m.profiles,
            is_verified: accountMap.has(m.user_id),
            riot_tag_fallback: typeof accountMap.get(m.user_id) === 'string' ? accountMap.get(m.user_id) : null
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

  const checkExistingRegistration = async () => {
    if (!user) return;
    try {
      let data: any = null;
      try {
        data = await apiClient.get<any>(
          `/api/tournaments/me/registration-status?tournamentId=${tournament.id}`
        );
      } catch { /* no existing registration */ }
      if (data) {
        // Already registered; simply notify parent so the dialog can close
        onRegistrationComplete?.();
      }
    } catch { }
  };

  const fetchCaptainTeams = async () => {
    if (!user?.id) return;
    try {
      // Get teams user owns
      const ownedTeams = await apiClient.get<TeamRow[]>(
        `/api/teams?owner=${user.id}`
      );

      // Get teams where user is captain (role = 'captain')
      const memberTeams = await apiClient.get<{ team_id: string }[]>(
        `/api/teams/me?role=captain`
      );

      const captainTeamIds = (memberTeams || []).map(m => m.team_id).filter(Boolean);
      let teams = [...(ownedTeams || [])];

      if (captainTeamIds.length > 0) {
        const extraTeams = await apiClient.get<TeamRow[]>(
          `/api/teams?ids=${captainTeamIds.join(',')}`
        );

        // Merge and avoid duplicates
        const ownedIds = new Set(teams.map(t => t.id));
        (extraTeams || []).forEach(t => {
          if (!ownedIds.has(t.id)) {
            teams.push(t);
          }
        });
      }

      const ids = new Set<string>();
      const reasons: Record<string, string[]> = {};

      for (const team of (teams || [])) {
        const errs: string[] = [];

        // Check if team has a roster for this tournament's game
        // This is the primary check with the new roster system
        const rosters = await apiClient.get<any[]>(
          `/api/teams/${team.id}/rosters`
        );

        const normalize = (s: string) => (s || '').toLowerCase().trim();
        const tournamentGameNormalized = normalize(tournament.game || '');

        // Check if team has a roster matching the tournament's game
        const hasMatchingRoster = (rosters || []).some((r: any) =>
          normalize(r.game) === tournamentGameNormalized
        );

        // Fallback: also check team.games for backwards compatibility
        const teamGames = Array.isArray(team.games) ? team.games : (typeof team.games === 'string' ? [team.games] : []);
        const hasGameInTeam = teamGames.some((g: string) => normalize(g) === tournamentGameNormalized);

        if (!hasMatchingRoster && !hasGameInTeam) {
          errs.push("Team doesn't include this game. Create a roster for this game first.");
        }

        // Check if matching roster has enough members
        if (hasMatchingRoster && tournament.game) {
          const matchingRoster = (rosters || []).find((r: any) =>
            normalize(r.game) === tournamentGameNormalized
          );

          if (matchingRoster) {
            // Check roster member count
            const rosterMembers = await apiClient.get<any[]>(
              `/api/teams/${team.id}/rosters/${matchingRoster.id}/members`
            );
            const rosterMemberCount = (rosterMembers || []).length + 1; // +1 for captain/owner

            if (rosterMemberCount < coreMembers) {
              errs.push(`Roster needs at least ${coreMembers} members (has ${rosterMemberCount}).`);
            }
          }
        } else {
          // Fallback: check team_members if no roster system
          const members = await apiClient.get<any[]>(
            `/api/teams/${team.id}/members?active=true`
          );
          let activeCount = (members || []).length + 1; // include captain

          if (activeCount < coreMembers) {
            errs.push(`Need at least ${coreMembers} members (have ${activeCount}).`);
          }
        }

        if (errs.length === 0) ids.add(team.id);
        reasons[team.id] = errs;
      }

      setCaptainTeams(teams || []);
      setEligibleTeamIds(ids);
      setIneligibleReasons(reasons);
      if (teams && teams.length > 0) {
        const firstEligible = (teams.find(t => ids.has(t.id)) || {}).id || '';
        setSelectedTeamId(firstEligible);
      }
    } catch (error) {
      console.error('Error fetching captain teams:', error);
      setCaptainTeams([]);
    }
  };

  const formatDate = (raw: any) => {
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
      const anyT = tournament as any;
      if (anyT?.date) {
        const combined = anyT.time ? `${anyT.date}T${anyT.time}` : anyT.date;
        const d2 = new Date(combined);
        if (!isNaN(d2.getTime())) {
          const dateStr = d2.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = d2.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${dateStr} at ${timeStr}`;
        }
        // If still invalid, show as-is date string
        return String(anyT.date);
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
      (rosterMembers || []).forEach((r: any) => memberStatusMap.set(r.user_id, r.is_starter ?? true));

      // distinct IDs
      let memberIds = Array.from(new Set(((rosterMembers || []).map((r: any) => r.user_id))));

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

      // ── VALORANT SPECIFIC VALIDATION ──
      const isValorant = tournament?.game?.toLowerCase() === 'valorant';
      if (isValorant) {
        // Only check if the captain (user) is verified
        const captainData = rosterMembersData.find(m => m.is_captain);
        if (captainData && !captainData.is_verified) {
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

      const data = await apiClient.post<any>(`/api/tournaments/${tournament.id}/register`, {
        participant_type: 'team',
        team_captain_id: user.id,
        team_id: selectedTeamId,
        team_name: roster?.name || team.name,
        team_members: memberNames.join(','),
        roster_id: selectedRosterId,
        roster_name: roster?.name || null,
        team_contact_email: user.email || null,
        status: tournament.entry_fee && tournament.entry_fee > 0 ? 'pending' : 'approved',
        entry_fee_amount: tournament.entry_fee || 0,
        entry_fee_paid: !tournament.entry_fee || tournament.entry_fee === 0
      });

      toast({ title: 'Registered', description: 'Team registered successfully.' });

      // Send confirmation email
      if (user.email) {
        const { sendEmail } = await import('@/hooks/useEmail');
        sendEmail({
          type: 'TOURNAMENT_REGISTRATION',
          email: user.email,
          data: {
            tournamentName: tournament.name,
            teamName: roster?.name || team.name,
            registrationType: 'team',
            tournamentUrl: `${window.location.origin}/tournaments/${tournament.id}`,
          },
        }).catch((err) => console.warn('[TeamRegistration] Email send failed:', err));
      }

      onRegistrationComplete?.();
    } catch (e: any) {
      toast({ title: 'Registration Failed', description: e.message || 'Please try again.', variant: 'destructive' });
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
                  <span className="text-white font-medium text-sm">PKR {tournament.entry_fee}</span>
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
                  <span className="text-white font-medium text-sm">PKR {tournament.prize_pool}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Captain Teams - Clean Minimal */}
        {captainTeams.length === 0 ? (
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
                                            {tournament?.game?.toLowerCase() === 'valorant' && (
                                              <span className="text-[10px] text-gray-500">
                                                {m.profile?.riot_tag || m.riot_tag_fallback || 'No Riot ID'}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {tournament?.game?.toLowerCase() === 'valorant' && (
                                          <div className="flex items-center">
                                            {m.is_verified ? (
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
                                selectedRoster.game === tournament.game &&
                                Number(selectedRoster.team_size) >= coreMembers;

                              // Don't show message if criteria is met
                              if (rosterMeetsCriteria) return null;

                              return (
                                <div className="mt-2 p-2 bg-[#1a0a0a] border border-[#3a1a1a] rounded">
                                  <div className="text-xs text-red-300 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>
                                      {selectedRoster?.game !== tournament.game && `Game mismatch: ${selectedRoster?.game} ≠ ${tournament.game}`}
                                      {selectedRoster?.game === tournament.game && Number(selectedRoster?.team_size) < coreMembers &&
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
