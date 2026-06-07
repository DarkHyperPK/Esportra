import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { getGameMode } from '@/utils/gameFeatures';

export type CaptainTeamRow = {
  id: string;
  name: string;
  games: Record<string, unknown> | string[] | string | null;
  owner_id: string;
  created_at?: string | null;
  createdAt?: string | null;
};

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

  const getCoreTeamSize = useCallback((gameName: string, modeKey?: string | null): number => {
    const mode = getGameMode(gameName, modeKey);
    return mode?.teamSize || Number(tournament.team_size) || 5;
  }, [tournament.team_size]);

  const rosterMatchesMode = useCallback((roster: RosterApiRow) => {
    if (!tournamentGameMode || !roster.format) return true;
    return normalize(roster.format) === normalize(tournamentGameMode);
  }, [tournamentGameMode]);

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

      try {
        const captainTeamsResponse = await apiClient.get<CaptainTeamRow[]>('/api/teams/my-captain-teams');
        teams = mergeUniqueTeams(teams, captainTeamsResponse || []);
      } catch {
        // optional lookup
      }

      if (teams.length === 0) {
        try {
          const ownedTeams = await apiClient.get<CaptainTeamRow[]>(`/api/teams?owner_id=${userId}&limit=25`);
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

      teams = sortTeamsNewestFirst(teams);
      setCaptainTeams(teams);

      const ids = new Set<string>();
      const reasons: Record<string, string[]> = {};
      const tournamentGameNormalized = normalize(tournament.game || '');
      const eligibilityBatchSize = 12;

      for (let index = 0; index < teams.length; index += eligibilityBatchSize) {
        const batch = teams.slice(index, index + eligibilityBatchSize);
        await Promise.all(batch.map(async (team) => {
          const errs: string[] = [];
          try {
            const rosters = await apiClient.get<RosterApiRow[]>(`/api/teams/${team.id}/rosters`);
            const hasMatchingRoster = (rosters || []).some((r) =>
              normalize(r.game) === tournamentGameNormalized && rosterMatchesMode(r),
            );

            const teamGames = Array.isArray(team.games)
              ? team.games
              : (typeof team.games === 'string' ? [team.games] : []);
            const hasGameInTeam = teamGames.some((g) => normalize(String(g)) === tournamentGameNormalized);

            if (!hasMatchingRoster && !hasGameInTeam) {
              errs.push("Team doesn't include this game. Create a roster for this game first.");
            }

            if (hasMatchingRoster && tournament.game) {
              const matchingRoster = (rosters || []).find((r) =>
                normalize(r.game) === tournamentGameNormalized && rosterMatchesMode(r),
              );
              if (matchingRoster) {
                const rosterMembers = await apiClient.get<any[]>(
                  `/api/teams/${team.id}/rosters/${matchingRoster.id}/members`,
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
        const firstEligible = teams.find((t) => ids.has(t.id))?.id || '';
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
  }, [coreMembers, enabled, rosterMatchesMode, tournament.game, userId]);

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
            const byMode = rosterMatchesMode(r);
            const bySize = !coreMembers || Number(r.team_size) >= coreMembers;
            return byGame && byMode && bySize;
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
  }, [coreMembers, rosterMatchesMode, selectedTeamId, tournament.game]);

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
    requiresExplicitTeamSelection: captainTeams.length > 1,
  };
}
