import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
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

// Persisted row shape in br_game_data table
interface BRGameDataRow {
  tournament_id: string;
  games: Record<string, BRGameData>;
  updated_at: string;
  updated_by: string | null;
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

  // Fetch saved BR game data directly from Supabase
  const { data: savedGames, isLoading } = useQuery({
    queryKey: ['br-game-results', tournamentId],
    queryFn: async (): Promise<BRGameData[]> => {
      if (!tournamentId) return [];

      const { data, error } = await supabase
        .from('br_game_data')
        .select('games')
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      if (error) {
        console.error('BR game data fetch error:', error);
        return [];
      }
      if (!data?.games) return [];

      const games: BRGameData[] = [];
      const gamesObj = data.games as Record<string, BRGameData>;
      for (const key of Object.keys(gamesObj)) {
        const g = gamesObj[key];
        if (g && g.gameNumber) games.push(g);
      }
      return games;
    },
    enabled: !!tournamentId,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
  });

  // Merge saved data into a Map
  const allGames = useMemo(() => {
    const merged = new Map<number, BRGameData>();
    if (savedGames) {
      for (const g of savedGames) {
        merged.set(g.gameNumber, {
          ...g,
          status: g.status || (g.results.length > 0 ? 'completed' : 'pending'),
        });
      }
    }
    return merged;
  }, [savedGames]);

  // Helper: persist a single game update to Supabase
  const persistGame = useCallback(
    async (gameData: BRGameData) => {
      if (!tournamentId) throw new Error('No tournament ID');

      const { data: { user } } = await supabase.auth.getUser();

      // Read current row
      const { data: existing } = await supabase
        .from('br_game_data')
        .select('games')
        .eq('tournament_id', tournamentId)
        .maybeSingle();

      const currentGames = (existing?.games as Record<string, BRGameData>) || {};
      currentGames[`game_${gameData.gameNumber}`] = gameData;

      const { error } = await supabase
        .from('br_game_data')
        .upsert({
          tournament_id: tournamentId,
          games: currentGames,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null,
        }, { onConflict: 'tournament_id' });

      if (error) throw error;
    },
    [tournamentId]
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: persistGame,
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
    onError: (error: Error) => {
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
        lobbyCode: undefined,
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
      if (!existing) return;
      saveMutation.mutate({
        ...existing,
        lobbyCode,
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
      return allGames.get(gameNumber)?.lobbyCode;
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
      const game = allGames.get(gameNumber);
      const existing = game?.evidence || [];
      const filtered = existing.filter(e => e.teamId !== evidence.teamId);
      await persistGame({
        gameNumber,
        results: game?.results || [],
        lobbyCode: game?.lobbyCode,
        status: game?.status || 'active',
        evidence: [...filtered, evidence],
      });
      queryClient.invalidateQueries({ queryKey: ['br-game-results', tournamentId] });
    },
    [allGames, persistGame, queryClient, tournamentId]
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
    resetGame,
    updateLobbyCode,
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
