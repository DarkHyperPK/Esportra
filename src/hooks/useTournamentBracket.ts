import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateX, calculateY, S, GAP } from '@/constants/bracketConstants';
import { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];
type TournamentMatch = Database['public']['Tables']['tournament_matches']['Row'];
type MatchResult = Database['public']['Tables']['match_results']['Row'];
type TeamMember = Database['public']['Tables']['team_members']['Row'];
type Team = Database['public']['Tables']['teams']['Row'] & {
  members?: TeamMember[];
};

interface ExtendedMatch extends TournamentMatch {
  team1?: Team;
  team2?: Team;
  winner?: Team;
}

interface BracketData {
  matches: ExtendedMatch[];
  matchResults: MatchResult[];
  stages: TournamentStage[];
  currentStage: TournamentStage | null;
}

export const useTournamentBracket = (tournamentId: string, initialStageId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>(initialStageId);

  // Use TanStack Query for bracket data
  const { data: bracketData, isLoading, error } = useQuery<BracketData>({
    queryKey: ['tournament_bracket', tournamentId, selectedStageId],
    queryFn: async () => {
      if (!tournamentId) return { matches: [], matchResults: [], stages: [], currentStage: null };

      // Fetch stages first
      const { data: stagesData, error: stagesError } = await supabase
        .from('tournament_stages')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('stage_order', { ascending: true });

      if (stagesError) throw stagesError;

      const stages = stagesData || [];
      const currentStage = selectedStageId
        ? stages.find(s => s.id === selectedStageId) || stages[0] || null
        : stages[0] || null;

      // Fetch matches for the current stage
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          team1:teams!tournament_matches_team1_id_fkey(*, members:team_members(*)),
          team2:teams!tournament_matches_team2_id_fkey(*, members:team_members(*)),
          winner:teams!tournament_matches_winner_id_fkey(*, members:team_members(*))
        `)
        .eq('tournament_id', tournamentId)
        .eq('stage_id', currentStage?.id || '')
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError) {
        console.warn('Tournament matches not available:', matchesError);
        return { matches: [], matchResults: [], stages, currentStage };
      }

      // Fetch match results
      let resultsData: MatchResult[] = [];
      if (matchesData && matchesData.length > 0) {
        const { data: results, error: resultsError } = await supabase
          .from('match_results')
          .select('*')
          .in('match_id', matchesData.map(m => m.id));

        if (!resultsError) {
          resultsData = results || [];
        }
      }

      // Cast the matches data to ExtendedMatch[] because Supabase types for joined relations are complex
      const matches = (matchesData || []) as unknown as ExtendedMatch[];

      return {
        matches,
        matchResults: resultsData,
        stages,
        currentStage
      };
    },
    enabled: !!tournamentId,
  });

  // Update selectedStageId when bracketData is loaded if not set
  useEffect(() => {
    if (bracketData?.currentStage && !selectedStageId) {
      setSelectedStageId(bracketData.currentStage.id);
    }
  }, [bracketData?.currentStage, selectedStageId]);

  // Mutations
  const generateBracketMutation = useMutation({
    mutationFn: async (bracketSize?: number) => {
      if (!bracketData?.currentStage) throw new Error('No stage selected');

      const { error } = await supabase.rpc('generate_stage_bracket', {
        p_stage_id: bracketData.currentStage.id
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async (updates: {
      name?: string;
      format?: string;
      capacity?: number;
      advancement_count?: number;
      status?: 'upcoming' | 'live' | 'completed';
      is_locked?: boolean;
    }) => {
      if (!selectedStageId) throw new Error('No stage selected');

      const { error } = await supabase
        .from('tournament_stages')
        .update(updates)
        .eq('id', selectedStageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
    }
  });

  const createStageMutation = useMutation({
    mutationFn: async (stageData: {
      name: string;
      format: string;
      capacity: number;
      advancement_count: number;
      sequence_order: number;
      config?: any;
    }) => {
      const { error } = await supabase
        .from('tournament_stages')
        .insert({
          tournament_id: tournamentId,
          name: stageData.name,
          format: stageData.format,
          capacity: stageData.capacity,
          advancement_count: stageData.advancement_count,
          stage_order: stageData.sequence_order,
          config: stageData.config
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
    }
  });

  const advanceTeamsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStageId) throw new Error('No stage selected');

      const { data, error } = await supabase.rpc('advance_teams_to_next_stage', {
        p_current_stage_id: selectedStageId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
      toast({ title: 'Success', description: 'Teams advanced to the next stage successfully.' });
    }
  });
  const reorderStagesMutation = useMutation({
    mutationFn: async (stageIds: string[]) => {
      const { error } = await supabase.rpc('reorder_tournament_stages', {
        p_stage_ids: stageIds
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
      toast({ title: 'Success', description: 'Stages reordered successfully.' });
    }
  });

  const enrollTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      if (!selectedStageId) throw new Error('No stage selected');

      const { error } = await supabase.rpc('enroll_team_in_stage', {
        p_stage_id: selectedStageId,
        p_team_id: teamId
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
    }
  });

  const reportScoreMutation = useMutation({
    mutationFn: async ({ matchId, team1Score, team2Score, screenshots }: { matchId: string; team1Score: number; team2Score: number; screenshots: File[] }) => {
      // Check if stage is locked
      if (bracketData?.currentStage?.is_locked) {
        throw new Error('This stage is locked and cannot be edited.');
      }

      const screenshotUrls: string[] = [];
      for (const file of screenshots) {
        const fileExt = file.name.split('.').pop();
        const fileName = `match-${matchId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('match-screenshots')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('match-screenshots')
          .getPublicUrl(fileName);

        screenshotUrls.push(data.publicUrl);
      }

      const { error: resultError } = await supabase
        .from('match_results')
        .insert({
          match_id: matchId,
          team1_score: team1Score,
          team2_score: team2Score,
          screenshots: screenshotUrls,
          status: 'pending'
        });

      if (resultError) throw resultError;

      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          status: 'pending'
        })
        .eq('id', matchId);

      if (matchError) throw matchError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
    },
  });

  const verifyResultMutation = useMutation({
    mutationFn: async ({ resultId, status, notes }: { resultId: string; status: 'verified' | 'rejected'; notes?: string }) => {
      // Check if stage is locked
      if (bracketData?.currentStage?.is_locked) {
        throw new Error('This stage is locked and cannot be edited.');
      }

      const { error: resultError } = await supabase
        .from('match_results')
        .update({
          status,
          verification_notes: notes,
          verified_at: new Date().toISOString()
        })
        .eq('id', resultId);

      if (resultError) throw resultError;

      if (status === 'verified') {
        const { data: result, error: fetchError } = await supabase
          .from('match_results')
          .select('*, match:tournament_matches(*)')
          .eq('id', resultId)
          .single();

        if (fetchError) throw fetchError;

        // Type guard or cast for the joined match
        const match = result.match as unknown as TournamentMatch;
        if (!match) throw new Error('Match not found');

        const winner_id = result.team1_score > result.team2_score
          ? match.team1_id
          : match.team2_id;

        const { error: advanceError } = await supabase.rpc('advance_match_v2', {
          p_match_id: result.match_id,
          p_winner_id: winner_id,
          p_team1_score: result.team1_score,
          p_team2_score: result.team2_score
        });

        if (advanceError) throw advanceError;
      } else {
        const { data: result, error: fetchError } = await supabase
          .from('match_results')
          .select('match_id')
          .eq('id', resultId)
          .single();

        if (fetchError) throw fetchError;

        await supabase
          .from('tournament_matches')
          .update({
            status: 'pending',
            team1_score: null,
            team2_score: null
          })
          .eq('id', result.match_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_bracket', tournamentId] });
    },
  });

  return {
    matches: bracketData?.matches || [],
    matchResults: bracketData?.matchResults || [],
    stages: bracketData?.stages || [],
    currentStage: bracketData?.currentStage || null,
    selectedStageId,
    setSelectedStageId,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    generateBracket: generateBracketMutation.mutateAsync,
    reportMatchScore: reportScoreMutation.mutateAsync,
    verifyMatchResult: verifyResultMutation.mutateAsync,
    updateStage: updateStageMutation.mutateAsync,
    advanceTeams: advanceTeamsMutation.mutateAsync,
    enrollTeam: enrollTeamMutation.mutateAsync,
    reorderStages: reorderStagesMutation.mutateAsync,
  };
};

interface VisualizableMatch extends Partial<TournamentMatch> {
  x?: number;
  y?: number;
  next_match_id?: string;
  loser_next_match_id?: string;
  team1_id?: string | null;
  team2_id?: string | null;
}

// Helper function to generate bracket matches with explicit links and fixed layout
export const generateBracketMatches = (teams: Team[], tournamentId: string, bracketSize?: number): VisualizableMatch[] => {
  const numTeams = teams.length;
  // Use provided bracketSize or calculate next power of 2
  const P = bracketSize || Math.pow(2, Math.ceil(Math.log2(numTeams || 2)));
  const numRounds = Math.log2(P);

  const matchMap = new Map<string, VisualizableMatch>(); // key: "round-matchNumber"

  // 1. Create all matches upfront
  for (let r = 0; r < numRounds; r++) {
    const matchesInRound = P / Math.pow(2, r + 1);
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = crypto.randomUUID();
      const match: VisualizableMatch = {
        id: matchId,
        tournament_id: tournamentId,
        round: r + 1, // Store 1-indexed in DB
        match_number: i + 1, // Store 1-indexed in DB
        team1_id: null,
        team2_id: null,
        status: 'pending',
        bracket_side: 'winners',
        // Coordinates calculated once and locked
        x: calculateX(r),
        y: calculateY(r, i)
      };
      matchMap.set(`${r}-${i}`, match);
    }
  }

  // 2. Link matches using advancement formula
  for (let r = 0; r < numRounds - 1; r++) {
    const matchesInRound = P / Math.pow(2, r + 1);
    for (let i = 0; i < matchesInRound; i++) {
      const currentMatch = matchMap.get(`${r}-${i}`);
      const nextRound = r + 1;
      const nextPosition = Math.floor(i / 2);
      const nextMatch = matchMap.get(`${nextRound}-${nextPosition}`);

      if (nextMatch && currentMatch) {
        currentMatch.next_match_id = nextMatch.id;
      }
    }
  }

  // 3. Round 0 Seeding (i vs P - 1 - i)
  // Sort teams by seed if available, otherwise use provided order
  const sortedTeams = [...teams];
  const totalMatchesInRound0 = P / 2;

  for (let i = 0; i < totalMatchesInRound0; i++) {
    const match = matchMap.get(`0-${i}`);
    const topSeedIdx = i;
    const bottomSeedIdx = P - 1 - i;

    if (match) {
      if (topSeedIdx < sortedTeams.length) {
        match.team1_id = sortedTeams[topSeedIdx].id;
      }
      if (bottomSeedIdx < sortedTeams.length) {
        match.team2_id = sortedTeams[bottomSeedIdx].id;
      }
    }
  }

  return Array.from(matchMap.values());
};

// Helper function to generate double elimination matches with fixed layout
export const generateDoubleEliminationMatches = (teams: Team[], tournamentId: string, bracketSize?: number): VisualizableMatch[] => {
  const numTeams = teams.length;
  const P = bracketSize || Math.pow(2, Math.ceil(Math.log2(numTeams || 2)));
  const numUpperRounds = Math.log2(P);
  const numLowerRounds = 2 * numUpperRounds - 2;

  const matchMap = new Map<string, VisualizableMatch>();

  // 1. Upper Bracket (Same as Single Elimination)
  for (let r = 0; r < numUpperRounds; r++) {
    const matchesInRound = P / Math.pow(2, r + 1);
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = crypto.randomUUID();
      const match: VisualizableMatch = {
        id: matchId,
        tournament_id: tournamentId,
        round: r + 1,
        match_number: i + 1,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        bracket_side: 'winners',
        x: calculateX(r),
        y: calculateY(r, i)
      };
      matchMap.set(`winners-${r}-${i}`, match);
    }
  }

  // 2. Lower Bracket
  const LOWER_OFFSET = P * S + GAP;
  for (let r = 0; r < numLowerRounds; r++) {
    // Lower bracket matches count:
    // Round 0, 1: P/4
    // Round 2, 3: P/8
    // ...
    const matchesInRound = Math.pow(2, Math.floor((numLowerRounds - 1 - r) / 2));
    for (let i = 0; i < matchesInRound; i++) {
      const matchId = crypto.randomUUID();
      const match: VisualizableMatch = {
        id: matchId,
        tournament_id: tournamentId,
        round: r + 1,
        match_number: i + 1,
        team1_id: null,
        team2_id: null,
        status: 'pending',
        bracket_side: 'losers',
        x: calculateX(r),
        y: calculateY(Math.floor(r / 2), i) + LOWER_OFFSET
      };
      matchMap.set(`losers-${r}-${i}`, match);
    }
  }

  // 3. Grand Final
  const gfId = crypto.randomUUID();
  const gf: VisualizableMatch = {
    id: gfId,
    tournament_id: tournamentId,
    round: numUpperRounds + 1,
    match_number: 1,
    team1_id: null,
    team2_id: null,
    status: 'pending',
    bracket_side: 'final',
    x: calculateX(numUpperRounds),
    y: calculateY(numUpperRounds - 1, 0) // Centered with Upper Final
  };
  matchMap.set('final-0-0', gf);

  // 4. Link Upper Bracket
  for (let r = 0; r < numUpperRounds - 1; r++) {
    const matchesInRound = P / Math.pow(2, r + 1);
    for (let i = 0; i < matchesInRound; i++) {
      const current = matchMap.get(`winners-${r}-${i}`);
      // Winner advancement
      const nextMatch = matchMap.get(`winners-${r + 1}-${Math.floor(i / 2)}`);
      if (nextMatch && current) current.next_match_id = nextMatch.id;

      // Loser drop: Upper Round r -> Lower Round 2r
      // Round 0 -> Lower Round 0
      // Round 1 -> Lower Round 2
      const lr = 2 * r;
      if (lr < numLowerRounds) {
        const loserMatch = matchMap.get(`losers-${lr}-${i}`);
        if (loserMatch && current) current.loser_next_match_id = loserMatch.id;
      }
    }
  }

  // Upper Final to GF
  const upperFinal = matchMap.get(`winners-${numUpperRounds - 1}-0`);
  if (upperFinal) {
    upperFinal.next_match_id = gf.id;
    // Upper Final loser drops to last Lower Round
    upperFinal.loser_next_match_id = matchMap.get(`losers-${numLowerRounds - 1}-0`)?.id;
  }

  // 5. Link Lower Bracket
  for (let r = 0; r < numLowerRounds - 1; r++) {
    const matchesInRound = Math.pow(2, Math.floor((numLowerRounds - 1 - r) / 2));
    for (let i = 0; i < matchesInRound; i++) {
      const current = matchMap.get(`losers-${r}-${i}`);
      // Advancement: r -> r + 1
      // If r is even (expanding round), next position is i
      // If r is odd (contracting round), next position is floor(i/2)
      const nextPos = (r % 2 === 0) ? i : Math.floor(i / 2);
      const nextMatch = matchMap.get(`losers-${r + 1}-${nextPos}`);
      if (nextMatch && current) current.next_match_id = nextMatch.id;
    }
  }

  // Lower Final to GF
  const lowerFinal = matchMap.get(`losers-${numLowerRounds - 1}-0`);
  if (lowerFinal) lowerFinal.next_match_id = gf.id;

  // 6. Initial Seeding (WB R0)
  const sortedTeams = [...teams];
  const totalMatchesInRound0 = P / 2;
  for (let i = 0; i < totalMatchesInRound0; i++) {
    const match = matchMap.get(`winners-0-${i}`);
    const topSeedIdx = i;
    const bottomSeedIdx = P - 1 - i;
    if (match) {
      if (topSeedIdx < sortedTeams.length) match.team1_id = sortedTeams[topSeedIdx].id;
      if (bottomSeedIdx < sortedTeams.length) match.team2_id = sortedTeams[bottomSeedIdx].id;
    }
  }

  return Array.from(matchMap.values());
};
