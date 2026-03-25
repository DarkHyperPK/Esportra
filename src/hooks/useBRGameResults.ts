import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BRTeamResult, BRLeaderboardEntry, BRScoringPreset, BRGameResult, BREvidence } from '@/types/battleRoyale';

interface UseBRGameResultsProps {
  tournamentId: string | undefined;
  gameCount: number;
  scoringPreset: BRScoringPreset;
  killCap: number | null;
  teams: { id: string; name: string; logo?: string }[];
  tiebreaker?: 'most_wins' | 'most_kills' | 'head_to_head';
}

export type BRGameStatus = 'pending' | 'active' | 'completed';

interface BRGameData {
  gameNumber: number;
  results: BRTeamResult[];
  lobbyCode?: string;
  status: BRGameStatus;
  evidence?: BREvidence[];
}

export function useBRGameResults({
  tournamentId,
  gameCount,
  scoringPreset,
  killCap,
  teams,
  tiebreaker = 'most_wins',
}: UseBRGameResultsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved BR game results from API (with settings fallback)
  const { data: savedGames, isLoading } = useQuery({
    queryKey: ['br-game-results', tournamentId],
    queryFn: async () => {
      // Try dedicated endpoint first
      try {
        const data = await apiClient.get<BRGameData[]>(
          `/api/tournaments/${tournamentId}/br-results`
        );
        if (data && data.length > 0) return data;
      } catch {
        // Endpoint may not exist yet
      }
      // Fallback: read from tournament settings.brResults
      try {
        // Add cache-buster to avoid apiClient GET deduplication returning stale data
        const tournament = await apiClient.get<any>(`/api/tournaments/${tournamentId}?_t=${Date.now()}`);
        const settings = tournament?.tournament?.settings || tournament?.settings || {};
        const brResults = settings.brResults;
        if (brResults && typeof brResults === 'object') {
          const games: BRGameData[] = [];
          for (const key of Object.keys(brResults)) {
            const g = brResults[key];
            if (g && g.gameNumber) games.push(g);
          }
          if (games.length > 0) return games;
        }
      } catch {
        // Settings also unavailable
      }
      return [];
    },
    enabled: !!tournamentId,
    staleTime: 1000 * 10, // 10s — lobby codes must propagate quickly
    refetchInterval: 1000 * 15, // Poll every 15s so players see lobby codes promptly
  });

  // Local state for unsaved edits (maps gameNumber → results)
  const [localGames, setLocalGames] = useState<Map<number, BRGameData>>(new Map());

  // Merge saved + local data
  const allGames = useMemo(() => {
    const merged = new Map<number, BRGameData>();
    // Saved first
    if (savedGames) {
      for (const g of savedGames) {
        merged.set(g.gameNumber, { ...g, status: g.status || (g.results.length > 0 ? 'completed' : 'pending') });
      }
    }
    // Local overrides
    for (const [num, data] of localGames) {
      merged.set(num, data);
    }
    return merged;
  }, [savedGames, localGames]);

  // Save game results mutation
  const saveMutation = useMutation({
    mutationFn: async ({ gameNumber, results, lobbyCode, status }: BRGameData) => {
      // Try API first
      try {
        await apiClient.put(
          `/api/tournaments/${tournamentId}/br-results/${gameNumber}`,
          { gameNumber, results, lobbyCode, status }
        );
        return { persisted: true };
      } catch {
        // API may not exist — store in tournament settings as fallback
        try {
          const tournament = await apiClient.get<any>(`/api/tournaments/${tournamentId}?_t=${Date.now()}`);
          const settings = tournament?.tournament?.settings || tournament?.settings || {};
          const brResults = settings.brResults || {};
          brResults[`game_${gameNumber}`] = { gameNumber, results, lobbyCode, status };
          await apiClient.put(`/api/tournaments/${tournamentId}`, {
            settings: { ...settings, brResults },
          });
          return { persisted: true, fallback: true };
        } catch (e2) {
          // Store locally only
          return { persisted: false };
        }
      }
    },
    onSuccess: (result, variables) => {
      // Update local state
      setLocalGames(prev => {
        const next = new Map(prev);
        next.set(variables.gameNumber, variables);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['br-game-results', tournamentId] });
      queryClient.invalidateQueries({ queryKey: ['tournament-details'] });
      const isStart = variables.status === 'active' && variables.results.length === 0;
      toast({
        title: isStart ? `Game ${variables.gameNumber} Started` : `Game ${variables.gameNumber} Results Saved`,
        description: isStart
          ? `Lobby code set. Players can now join.`
          : `Results for ${variables.results.length} teams recorded.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Save Results',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save results for a specific game (marks as completed)
  const saveGameResults = useCallback(
    (gameNumber: number, results: BRTeamResult[], lobbyCode?: string) => {
      saveMutation.mutate({ gameNumber, results, lobbyCode, status: 'completed' });
    },
    [saveMutation]
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
      });
    },
    [saveMutation, allGames]
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

  // Get the current active game number (first non-completed game, or null)
  const activeGameNumber = useMemo((): number | null => {
    for (let i = 1; i <= gameCount; i++) {
      const status = allGames.get(i)?.status;
      if (status === 'active') return i;
    }
    return null;
  }, [allGames, gameCount]);

  // Get the next game that can be started (first pending game where all prior are completed)
  const nextGameNumber = useMemo((): number | null => {
    for (let i = 1; i <= gameCount; i++) {
      const status = allGames.get(i)?.status;
      if (status === 'active') return null; // can't start next while one is active
      if (!status || status === 'pending') return i;
    }
    return null; // all completed
  }, [allGames, gameCount]);

  // Compute leaderboard from all game results
  const leaderboard = useMemo((): BRLeaderboardEntry[] => {
    const teamMap = new Map<string, BRLeaderboardEntry>();

    // Initialize from teams
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

    // Accumulate results from all games
    for (const [, gameData] of allGames) {
      for (const result of gameData.results) {
        const entry = teamMap.get(result.teamId);
        if (!entry) continue;

        entry.gamesPlayed += 1;
        entry.totalPlacementPoints += result.placementPoints;
        entry.totalKillPoints += result.killPoints;
        entry.totalPoints += result.totalPoints;
        entry.totalKills += result.kills;
        if (result.placement === 1) entry.wins += 1;
        if (result.placement < entry.bestPlacement) entry.bestPlacement = result.placement;
        entry.perGameResults.push({
          gameNumber: gameData.gameNumber,
          placement: result.placement,
          kills: result.kills,
          points: result.totalPoints,
        });
      }
    }

    // Sort by total points, then tiebreaker
    const sorted = Array.from(teamMap.values())
      .filter(e => e.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        // Tiebreaker
        if (tiebreaker === 'most_wins') {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.totalKills - a.totalKills;
        }
        if (tiebreaker === 'most_kills') {
          if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
          return b.wins - a.wins;
        }
        // head_to_head — fall back to kills
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
      return allGames.get(gameNumber)?.lobbyCode;
    },
    [allGames]
  );

  // Determine tournament winner (top of leaderboard after all games)
  const winner = useMemo(() => {
    if (gamesCompleted < gameCount) return null;
    return leaderboard.length > 0 ? leaderboard[0] : null;
  }, [leaderboard, gamesCompleted, gameCount]);

  // Submit evidence for a game (player uploads screenshot)
  const submitEvidence = useCallback(
    async (gameNumber: number, evidence: BREvidence) => {
      const game = allGames.get(gameNumber);
      const existing = game?.evidence || [];
      // Replace if same team already submitted for this game
      const filtered = existing.filter(e => e.teamId !== evidence.teamId);
      const updated: BRGameData = {
        gameNumber,
        results: game?.results || [],
        lobbyCode: game?.lobbyCode,
        status: game?.status || 'active',
        evidence: [...filtered, evidence],
      };
      saveMutation.mutate(updated);
    },
    [allGames, saveMutation]
  );

  // Get evidence for a specific game
  const getEvidence = useCallback(
    (gameNumber: number): BREvidence[] => {
      return allGames.get(gameNumber)?.evidence || [];
    },
    [allGames]
  );

  return {
    leaderboard,
    gamesCompleted,
    winner,
    isLoading,
    isSaving: saveMutation.isPending,
    saveGameResults,
    startGame,
    getGameResults,
    getGameStatus,
    getLobbyCode,
    activeGameNumber,
    nextGameNumber,
    allGames,
    submitEvidence,
    getEvidence,
  };
}
