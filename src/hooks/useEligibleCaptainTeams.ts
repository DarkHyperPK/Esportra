import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { getGameMode, getRosterLimits } from '@/utils/gameFeatures';
import {
  countRosterPlayers,
  resolveMemberRosterRole,
  rosterMatchesTournament,
  usesTournamentLineupSelection,
} from '@/utils/rosterEligibility';

export type CaptainTeamRow = {
  id: string;
  name: string;
  tag?: string | null;
  team_kind?: string | null;
  is_solo?: boolean | null;
  games: Record<string, unknown> | string[] | string | null;
  owner_id: string;
  created_at?: string | null;
  createdAt?: string | null;
};

const CAPTAIN_TEAMS_PAGE_LIMIT = 50;
const MAX_ELIGIBILITY_TEAMS = 100;

const resolveTeamKind = (team: CaptainTeamRow): 'team' | 'solo' | 'mock' => {
  if (team.team_kind === 'team' || team.team_kind === 'solo' || team.team_kind === 'mock') {
    return team.team_kind;
  }
  if (team.is_solo === true) return 'solo';
  if ((team.tag ?? '').toLowerCase().startsWith('mock-')) return 'mock';
  return 'team';
};

const isRealTeamRow = (team: CaptainTeamRow) => resolveTeamKind(team) === 'team';

export type TeamRosterRow = {
  id: string;
  name: string;
  game: string;
  format: string | null;
  team_size: number;
};

type RosterApiRow = { id: string; game?: string; format?: string | null; team_size?: number; name?: string };

export interface EligibleCaptainTeamsTournament {
  game: string;
  game_mode?: string | null;
  gameMode?: string | null;
  team_size?: number;
}

interface UseEligibleCaptainTeamsOptions {
  tournament: EligibleCaptainTeamsTournament;
  userId?: string | null;
  enabled?: boolean;
}

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();

export function useEligibleCaptainTeams({
  tournament,
  userId,
  enabled = true,
}: UseEligibleCaptainTeamsOptions) {
  const [captainTeams, setCaptainTeams] = useState<CaptainTeamRow[]>([]);
  const [eligibleTeamIds, setEligibleTeamIds] = useState<Set<string>>(new Set());
  const [ineligibleReasons, setIneligibleReasons] = useState<Record<string, string[]>>({});
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamRosters, setTeamRosters] = useState<TeamRosterRow[]>([]);
  const [selectedRosterId, setSelectedRosterId] = useState('');
  const [fetchingTeams, setFetchingTeams] = useState(false);

  const tournamentGameMode = (tournament.gameMode || tournament.game_mode || '').trim();
  const usesLineupSelection = usesTournamentLineupSelection(tournament.game, tournamentGameMode);
  const modeLimits = getRosterLimits(tournament.game, tournamentGameMode);

  const getCoreTeamSize = useCallback((gameName: string, modeKey?: string | null): number => {
    const mode = getGameMode(gameName, modeKey);
    return mode?.teamSize || Number(tournament.team_size) || 5;
  }, [tournament.team_size]);

  const rosterMatchesTournamentMode = useCallback((roster: RosterApiRow) => (
    rosterMatchesTournament(roster, tournament.game, tournamentGameMode)
  ), [tournament.game, tournamentGameMode]);

  const coreMembers = getCoreTeamSize(tournament.game, tournamentGameMode);

  const fetchCaptainTeams = useCallback(async () => {
    if (!enabled || !userId) {
      setCaptainTeams([]);
      setEligibleTeamIds(new Set());
      setIneligibleReasons({});
      setSelectedTeamId('');
      return;
    }

    setFetchingTeams(true);
    try {
      const normalizeOwnerId = (value: unknown) => String(value ?? '').toLowerCase();
      const currentUserId = normalizeOwnerId(userId);

      const mergeUniqueTeams = (base: CaptainTeamRow[], incoming: CaptainTeamRow[]) => {
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

      const sortTeamsNewestFirst = (items: CaptainTeamRow[]) =>
        [...items].sort((left, right) => {
          const leftCreated = Date.parse(String(left.created_at ?? left.createdAt ?? '')) || 0;
          const rightCreated = Date.parse(String(right.created_at ?? right.createdAt ?? '')) || 0;
          if (leftCreated !== rightCreated) return rightCreated - leftCreated;
          return left.name.localeCompare(right.name);
        });

      let teams: CaptainTeamRow[] = [];
      const gameQuery = tournament.game
        ? `?game=${encodeURIComponent(tournament.game)}&limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`
        : `?limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`;

      try {
        const captainTeamsResponse = await apiClient.get<CaptainTeamRow[]>(`/api/teams/my-captain-teams${gameQuery}`);
        teams = mergeUniqueTeams(teams, captainTeamsResponse || []);
      } catch (err) {
        console.warn('my-captain-teams lookup failed', err);
      }

      if (teams.length === 0) {
        try {
          const ownedQuery = tournament.game
            ? `owner_id=${userId}&game=${encodeURIComponent(tournament.game)}&limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`
            : `owner_id=${userId}&limit=${CAPTAIN_TEAMS_PAGE_LIMIT}`;
          const ownedTeams = await apiClient.get<CaptainTeamRow[]>(`/api/teams?${ownedQuery}`);
          teams = mergeUniqueTeams(
            teams,
            (ownedTeams || []).filter((team) => normalizeOwnerId(team.owner_id) === currentUserId),
          );
        } catch {
          // optional lookup
        }
      }

      if (teams.length === 0) {
        const myTeams = await apiClient.get<CaptainTeamRow[]>('/api/teams/me');
        teams = mergeUniqueTeams(
          teams,
          (myTeams || []).filter((team) => normalizeOwnerId(team.owner_id) === currentUserId),
        );
      }

      teams = sortTeamsNewestFirst(teams.filter(isRealTeamRow));
      if (teams.length > MAX_ELIGIBILITY_TEAMS) {
        setCaptainTeams(teams);
        setEligibleTeamIds(new Set());
        setIneligibleReasons({});
        setSelectedTeamId('');
        return;
      }

      setCaptainTeams(teams);

      const ids = new Set<string>();
      const reasons: Record<string, string[]> = {};
      const tournamentGameNormalized = normalize(tournament.game || '');
      const eligibilityBatchSize = 12;
      const teamsForEligibility = teams.filter(isRealTeamRow);

      for (let index = 0; index < teamsForEligibility.length; index += eligibilityBatchSize) {
        const batch = teamsForEligibility.slice(index, index + eligibilityBatchSize);
        await Promise.all(batch.map(async (team) => {
          if (!isRealTeamRow(team)) return;
          const errs: string[] = [];
          try {
            const rosters = await apiClient.get<RosterApiRow[]>(`/api/teams/${team.id}/rosters`);
            const gameRosters = (rosters || []).filter((r) => normalize(r.game) === tournamentGameNormalized);
            const hasMatchingRoster = gameRosters.some((r) => rosterMatchesTournamentMode(r));

            if (!hasMatchingRoster) {
              errs.push("Team doesn't include this game. Create a roster for this game first.");
            }

            if (hasMatchingRoster && tournament.game) {
              const matchingRoster = gameRosters.find((r) => rosterMatchesTournamentMode(r));
              if (matchingRoster) {
                const rosterMembers = await apiClient.get<Array<{ roster_role?: string; is_starter?: boolean }>>(
                  `/api/teams/${team.id}/rosters/${matchingRoster.id}/members`,
                );

                if (usesLineupSelection) {
                  const playerCount = countRosterPlayers(rosterMembers || []);
                  if (playerCount < modeLimits.maxRoster) {
                    errs.push(`Roster pool needs at least ${modeLimits.maxRoster} players (has ${playerCount}).`);
                  }
                } else {
                  const starters = (rosterMembers || []).filter((m) => resolveMemberRosterRole(m) === 'starter').length;
                  const players = countRosterPlayers(rosterMembers || []);

                  if (starters !== modeLimits.starters) {
                    errs.push(`Roster needs exactly ${modeLimits.starters} starters (has ${starters}).`);
                  }
                  if (players > modeLimits.maxRoster) {
                    errs.push(`Roster exceeds ${modeLimits.maxRoster}-player limit (has ${players}).`);
                  }
                }
              }
            }
          } catch {
            errs.push('Unable to verify team eligibility. Try again.');
          }

          if (errs.length === 0) ids.add(team.id);
          reasons[team.id] = errs;
        }));
      }

      setEligibleTeamIds(ids);
      setIneligibleReasons(reasons);

      if (teams.length > 0) {
        const firstEligible = teams.find((t) => ids.has(t.id) && isRealTeamRow(t))?.id || '';
        setSelectedTeamId(firstEligible);
      } else {
        setSelectedTeamId('');
      }
    } catch {
      setCaptainTeams([]);
      setEligibleTeamIds(new Set());
      setIneligibleReasons({});
      setSelectedTeamId('');
    } finally {
      setFetchingTeams(false);
    }
  }, [modeLimits.maxRoster, modeLimits.starters, rosterMatchesTournamentMode, tournament.game, usesLineupSelection, userId, enabled]);

  useEffect(() => {
    void fetchCaptainTeams();
  }, [fetchCaptainTeams]);

  useEffect(() => {
    const loadRosters = async () => {
      if (!selectedTeamId) {
        setTeamRosters([]);
        setSelectedRosterId('');
        return;
      }

      try {
        const data = await apiClient.get<RosterApiRow[]>(`/api/teams/${selectedTeamId}/rosters`);
        const filtered = (data || [])
          .filter((r) => {
            const byGame = !tournament.game || normalize(r.game) === normalize(tournament.game);
            const byMode = rosterMatchesTournamentMode(r);
            if (!byGame || !byMode) return false;
            if (usesLineupSelection) return true;
            return !coreMembers || Number(r.team_size) >= coreMembers;
          })
          .map((r) => ({
            id: r.id,
            name: r.name || 'Roster',
            game: r.game || tournament.game,
            format: r.format ?? null,
            team_size: Number(r.team_size) || coreMembers,
          }));

        setTeamRosters(filtered);
        setSelectedRosterId(filtered[0]?.id || '');
      } catch {
        setTeamRosters([]);
        setSelectedRosterId('');
      }
    };

    void loadRosters();
  }, [coreMembers, rosterMatchesTournamentMode, selectedTeamId, tournament.game, usesLineupSelection]);

  return {
    captainTeams,
    eligibleTeamIds,
    ineligibleReasons,
    selectedTeamId,
    setSelectedTeamId,
    teamRosters,
    selectedRosterId,
    setSelectedRosterId,
    fetchingTeams,
    refetchTeams: fetchCaptainTeams,
    coreMembers,
    usesLineupSelection,
    requiresExplicitTeamSelection: captainTeams.length > 1,
  };
}
