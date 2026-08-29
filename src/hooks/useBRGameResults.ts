/**
 * @deprecated Legacy JSON BR game state. Player and organizer flows now use
 * relational br_rounds/br_round_evidence via BRGroupEndpoints.
 * Kept for rollback; no production imports should remain.
 */
import { useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { BR_CONFIG } from '@/config/brConfig';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BRTeamResult, BRLeaderboardEntry, BRScoringPreset, BREvidence } from '@/types/battleRoyale';
import { calculateBRPoints } from '@/utils/brScoring';

interface UseBRGameResultsProps {
  tournamentId: string | undefined;
  gameCount: number;
  scoringPreset: BRScoringPreset;
  killCap: number | null;
  teams: { id: string; name: string; logo?: string }[];
  tiebreaker?: 'most_wins' | 'most_kills' | 'head_to_head';
  enabled?: boolean;
}

export type BRGameStatus = 'pending' | 'active' | 'completed';

interface BRGameData {
  gameNumber: number;
  results: BRTeamResult[];
  lobbyCode?: string | null;
  status: BRGameStatus;
  evidence?: BREvidence[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toFiniteNumber = (value: unknown): number | null => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

export function useBRGameResults({
  tournamentId,
  gameCount,
  scoringPreset,
  killCap,
  teams,
  tiebreaker = 'most_wins',
  enabled = true,
}: UseBRGameResultsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const normalizeResult = useCallback((raw: unknown): BRTeamResult | null => {
    if (!isRecord(raw)) return null;

    const teamId = raw.teamId ?? raw.team_id ?? raw.id;
    if (typeof teamId !== 'string' || !teamId) return null;

    const placement = Math.max(1, toFiniteNumber(raw.placement ?? raw.rank) ?? 1);
    const kills = Math.max(0, toFiniteNumber(raw.kills ?? raw.eliminations) ?? 0);
    const computed = calculateBRPoints(placement, kills, scoringPreset, killCap);

    return {
      teamId,
      teamName:
        typeof raw.teamName === 'string'
          ? raw.teamName
          : typeof raw.team_name === 'string'
            ? raw.team_name
            : undefined,
      placement,
      kills,
      placementPoints: toFiniteNumber(raw.placementPoints ?? raw.placement_points) ?? computed.placementPoints,
      killPoints: toFiniteNumber(raw.killPoints ?? raw.kill_points) ?? computed.killPoints,
      totalPoints: toFiniteNumber(raw.totalPoints ?? raw.total_points) ?? computed.totalPoints,
    };
  }, [killCap, scoringPreset]);

  const normalizeEvidence = useCallback((raw: unknown): BREvidence | null => {
    if (!isRecord(raw)) return null;

    const teamId = raw.teamId ?? raw.team_id;
    const imageUrl = raw.imageUrl ?? raw.image_url ?? raw.url;
    if (typeof teamId !== 'string' || !teamId || typeof imageUrl !== 'string' || !imageUrl) return null;

    return {
      teamId,
      teamName:
        typeof raw.teamName === 'string'
          ? raw.teamName
          : typeof raw.team_name === 'string'
            ? raw.team_name
            : 'Unknown',
      imageUrl,
      submittedAt:
        typeof raw.submittedAt === 'string'
          ? raw.submittedAt
          : typeof raw.submitted_at === 'string'
            ? raw.submitted_at
            : new Date(0).toISOString(),
      placement: toFiniteNumber(raw.placement) ?? undefined,
      kills: toFiniteNumber(raw.kills) ?? undefined,
      reviewed: raw.reviewed === true,
    };
  }, []);

  const normalizeGameData = useCallback((key: string, raw: unknown): BRGameData | null => {
    if (!isRecord(raw)) return null;

    const gameNumber =
      toFiniteNumber(raw.gameNumber ?? raw.game_number)
      ?? (key.startsWith('game_') ? toFiniteNumber(key.slice(5)) : null);

    if (!gameNumber || gameNumber < 1) return null;

    const rawResults = Array.isArray(raw.results)
      ? raw.results
      : isRecord(raw.results)
        ? Object.values(raw.results)
        : [];
    const results = rawResults
      .map(normalizeResult)
      .filter((result): result is BRTeamResult => result !== null);

    const rawEvidence = Array.isArray(raw.evidence)
      ? raw.evidence
      : isRecord(raw.evidence)
        ? Object.values(raw.evidence)
        : [];
    const evidence = rawEvidence
      .map(normalizeEvidence)
      .filter((item): item is BREvidence => item !== null);

    const lobbyCode =
      typeof raw.lobbyCode === 'string'
        ? raw.lobbyCode
        : typeof raw.lobby_code === 'string'
          ? raw.lobby_code
          : null;

    const rawStatus = typeof raw.status === 'string' ? raw.status : null;
    const status: BRGameStatus =
      rawStatus === 'active' || rawStatus === 'completed' || rawStatus === 'pending'
        ? rawStatus
        : results.length > 0
          ? 'completed'
          : lobbyCode
            ? 'active'
            : 'pending';

    return {
      gameNumber,
      results,
      evidence,
      lobbyCode,
      status,
    };
  }, [normalizeEvidence, normalizeResult]);

  // Fetch saved BR game data from backend API
  const { data: savedGames, isLoading, isError: gamesQueryError, isFetching } = useQuery({
    queryKey: ['br-game-results', tournamentId],
    queryFn: async (): Promise<BRGameData[]> => {
      if (!tournamentId) return [];

      const resp = await apiClient.get<{ games: Record<string, BRGameData> }>(
        `/api/tournaments/${tournamentId}/br-games`
      );

      if (!resp?.games || typeof resp.games !== 'object' || Array.isArray(resp.games)) return [];

      const games: BRGameData[] = [];
      const gamesObj = resp.games as Record<string, unknown>;
      for (const key of Object.keys(gamesObj)) {
        const normalized = normalizeGameData(key, gamesObj[key]);
        if (normalized) games.push(normalized);
      }
      return games;
    },
    enabled: !!tournamentId && enabled,
    staleTime: BR_CONFIG.STALE_TIME_MS,
    // No polling: this legacy endpoint is read-once for finish-tournament logic.
    // Real-time updates go through the new br_rounds / br_group_teams system.
  });

  // Merge saved data into a Map
  const allGames = useMemo(() => {
    const merged = new Map<number, BRGameData>();
    if (savedGames) {
      for (const g of savedGames) {
        merged.set(g.gameNumber, {
          ...g,
          results: Array.isArray(g.results) ? g.results : [],
          evidence: Array.isArray(g.evidence) ? g.evidence : [],
          status: g.status || ((Array.isArray(g.results) ? g.results.length : 0) > 0 ? 'completed' : 'pending'),
        });
      }
    }
    return merged;
  }, [savedGames]);

  // Helper: persist a single game update via backend API
  const persistGame = useCallback(
    async (gameData: BRGameData) => {
      if (!tournamentId) throw new Error('No tournament ID');
      if (gameCount < 1) throw new Error('Tournament has no games configured');

      // Read current games from cache to merge
      const currentSaved = queryClient.getQueryData<BRGameData[]>(['br-game-results', tournamentId]) || [];
      const currentGames: Record<string, BRGameData> = {};
      for (const g of currentSaved) {
        currentGames[`game_${g.gameNumber}`] = g;
      }
      currentGames[`game_${gameData.gameNumber}`] = gameData;

      await apiClient.put(`/api/tournaments/${tournamentId}/br-games`, {
        games: currentGames,
      });
    },
    [tournamentId, queryClient, gameCount]
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: persistGame,
    onMutate: async (variables) => {
      // Optimistic update: immediately reflect the change in cache
      await queryClient.cancelQueries({ queryKey: ['br-game-results', tournamentId] });
      const previous = queryClient.getQueryData<BRGameData[]>(['br-game-results', tournamentId]);
      queryClient.setQueryData<BRGameData[]>(['br-game-results', tournamentId], (old) => {
        const existing = old?.filter(g => g.gameNumber !== variables.gameNumber) || [];
        return [...existing, variables];
      });
      return { previous };
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['br-game-results', tournamentId] });
      const isStart = variables.status === 'active' && variables.results.length === 0;
      toast({
        title: isStart ? `Game ${variables.gameNumber} Started` : `Game ${variables.gameNumber} Results Saved`,
        description: isStart
          ? 'Lobby code set. Players can now join.'
          : `Results for ${variables.results.length} teams recorded.`,
      });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(['br-game-results', tournamentId], context.previous);
      }
      toast({
        title: 'Failed to Save',
        description: error.message || 'Could not persist game data. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Save results for a specific game (marks as completed)
  const saveGameResults = useCallback(
    (gameNumber: number, results: BRTeamResult[], lobbyCode?: string) => {
      const existing = allGames.get(gameNumber);
      saveMutation.mutate({
        gameNumber,
        results,
        lobbyCode: lobbyCode || existing?.lobbyCode,
        status: 'completed',
        evidence: existing?.evidence,
      });
    },
    [saveMutation, allGames]
  );

  // Start a game (set lobby code and mark as active)
  const startGame = useCallback(
    (gameNumber: number, lobbyCode: string) => {
      const existing = allGames.get(gameNumber);
      saveMutation.mutate({
        gameNumber,
        results: existing?.results || [],
        lobbyCode,
        status: 'active',
        evidence: existing?.evidence,
      });
    },
    [saveMutation, allGames]
  );

  // Reset a game back to pending (organizer manual tool)
  const resetGame = useCallback(
    (gameNumber: number) => {
      saveMutation.mutate({
        gameNumber,
        results: [],
        lobbyCode: null,
        status: 'pending',
        evidence: [],
      });
    },
    [saveMutation]
  );

  // Update lobby code for an active game
  const updateLobbyCode = useCallback(
    (gameNumber: number, lobbyCode: string) => {
      const existing = allGames.get(gameNumber);
      if (!existing) {
        toast({ title: 'Game not found', description: `Game ${gameNumber} has not been started yet.`, variant: 'destructive' });
        return;
      }
      saveMutation.mutate({
        ...existing,
        lobbyCode,
      });
    },
    [saveMutation, allGames, toast]
  );

  // Get game status
  const getGameStatus = useCallback(
    (gameNumber: number): BRGameStatus => {
      const game = allGames.get(gameNumber);
      if (!game) return 'pending';
      return game.status;
    },
    [allGames]
  );

  // Get the current active game number
  const activeGameNumber = useMemo((): number | null => {
    for (let i = 1; i <= gameCount; i++) {
      const status = allGames.get(i)?.status;
      if (status === 'active') return i;
    }
    return null;
  }, [allGames, gameCount]);

  // Get the next game that can be started
  const nextGameNumber = useMemo((): number | null => {
    for (let i = 1; i <= gameCount; i++) {
      const status = allGames.get(i)?.status;
      if (status === 'active') return null;
      if (!status || status === 'pending') return i;
    }
    return null;
  }, [allGames, gameCount]);

  // Compute leaderboard from all game results
  const leaderboard = useMemo((): BRLeaderboardEntry[] => {
    const teamMap = new Map<string, BRLeaderboardEntry>();

    for (const team of teams) {
      teamMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo,
        totalPoints: 0,
        totalKills: 0,
        totalPlacementPoints: 0,
        totalKillPoints: 0,
        gamesPlayed: 0,
        wins: 0,
        bestPlacement: 999,
        perGameResults: [],
      });
    }

    for (const [, gameData] of allGames) {
      for (const result of gameData.results) {
        let entry = teamMap.get(result.teamId);
        // If team not in the provided teams list, create entry from saved result data
        if (!entry) {
          entry = {
            teamId: result.teamId,
            teamName: result.teamName || 'Unknown',
            teamLogo: undefined,
            totalPoints: 0,
            totalKills: 0,
            totalPlacementPoints: 0,
            totalKillPoints: 0,
            gamesPlayed: 0,
            wins: 0,
            bestPlacement: 999,
            perGameResults: [],
          };
          teamMap.set(result.teamId, entry);
        }

        entry.gamesPlayed += 1;
        entry.totalPlacementPoints += result.placementPoints;
        entry.totalKillPoints += result.killPoints;
        entry.totalPoints += result.totalPoints;
        entry.totalKills += result.kills;
        if (result.placement === 1) entry.wins += 1;
        if (result.placement < entry.bestPlacement) entry.bestPlacement = result.placement;
        (entry.perGameResults ??= []).push({
          gameNumber: gameData.gameNumber,
          placement: result.placement,
          kills: result.kills,
          points: result.totalPoints,
        });
      }
    }

    const sorted = Array.from(teamMap.values())
      .filter(e => e.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (tiebreaker === 'most_wins') {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.totalKills - a.totalKills;
        }
        if (tiebreaker === 'most_kills') {
          if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
          return b.wins - a.wins;
        }
        return b.totalKills - a.totalKills;
      });

    return sorted;
  }, [allGames, teams, tiebreaker]);

  // How many games have results
  const gamesCompleted = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= gameCount; i++) {
      const game = allGames.get(i);
      if (game && game.results.length > 0) count++;
    }
    return count;
  }, [allGames, gameCount]);

  // Get results for a specific game
  const getGameResults = useCallback(
    (gameNumber: number): BRTeamResult[] | undefined => {
      return allGames.get(gameNumber)?.results;
    },
    [allGames]
  );

  // Get lobby code for a specific game
  const getLobbyCode = useCallback(
    (gameNumber: number): string | undefined => {
      return allGames.get(gameNumber)?.lobbyCode ?? undefined;
    },
    [allGames]
  );

  // Determine tournament winner
  const winner = useMemo(() => {
    if (gamesCompleted < gameCount) return null;
    return leaderboard.length > 0 ? leaderboard[0] : null;
  }, [leaderboard, gamesCompleted, gameCount]);

  // Submit evidence for a game (player uploads screenshot)
  const submitEvidence = useCallback(
    async (gameNumber: number, evidence: BREvidence) => {
      if (!tournamentId) return;
      await apiClient.put(`/api/tournaments/${tournamentId}/br-games/evidence`, {
        gameNumber,
        teamId: evidence.teamId,
        imageUrl: evidence.imageUrl,
        placement: evidence.placement ?? null,
        kills: evidence.kills ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ['br-game-results', tournamentId] });
    },
    [tournamentId, queryClient]
  );

  // Get evidence for a specific game
  const getEvidence = useCallback(
    (gameNumber: number): BREvidence[] => {
      return allGames.get(gameNumber)?.evidence || [];
    },
    [allGames]
  );

  // Mark evidence as reviewed (organizer action)
  const markEvidenceReviewed = useCallback(
    async (gameNumber: number, teamId: string) => {
      const game = allGames.get(gameNumber);
      if (!game) return;
      const updatedEvidence = (game.evidence || []).map(e =>
        e.teamId === teamId ? { ...e, reviewed: true } : e
      );
      await persistGame({
        ...game,
        evidence: updatedEvidence,
      });
      queryClient.invalidateQueries({ queryKey: ['br-game-results', tournamentId] });
    },
    [allGames, persistGame, queryClient, tournamentId]
  );

  // Reset ALL games back to empty
  const resetAllGamesMutation = useMutation({
    mutationFn: async () => {
      if (!tournamentId) throw new Error('No tournament ID');
      await apiClient.put(`/api/tournaments/${tournamentId}/br-games`, { games: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['br-game-results', tournamentId] });
      toast({ title: 'All Games Reset', description: 'All game data has been cleared.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Reset Failed', description: error.message || 'Could not reset games.', variant: 'destructive' });
    },
  });

  const resetAllGames = useCallback(() => {
    resetAllGamesMutation.mutate();
  }, [resetAllGamesMutation]);

  return {
    leaderboard,
    gamesCompleted,
    winner,
    isLoading,
    isError: gamesQueryError,
    isFetching,
    isSaving: saveMutation.isPending,
    isResettingAll: resetAllGamesMutation.isPending,
    saveGameResults,
    startGame,
    resetGame,
    resetAllGames,
    updateLobbyCode,
    getGameResults,
    getGameStatus,
    getLobbyCode,
    activeGameNumber,
    nextGameNumber,
    allGames,
    submitEvidence,
    getEvidence,
    markEvidenceReviewed,
  };
}
