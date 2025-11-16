import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
  members: any[];
}

interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  team1_id: string;
  team2_id: string;
  team1_score?: number;
  team2_score?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'disputed';
  scheduled_time?: string;
  winner_id?: string;
  created_at: string;
  updated_at: string;
  team1?: Team;
  team2?: Team;
  winner?: Team;
}

interface MatchResult {
  id: string;
  match_id: string;
  reported_by: string;
  team1_score: number;
  team2_score: number;
  screenshots: string[];
  status: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  created_at: string;
  verified_by?: string;
  verified_at?: string;
}

export const useTournamentBracket = (tournamentId: string) => {
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBracketData = useCallback(async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch matches with team data
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          team1:teams!tournament_matches_team1_id_fkey(*),
          team2:teams!tournament_matches_team2_id_fkey(*),
          winner:teams!tournament_matches_winner_id_fkey(*)
        `)
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError) {
        // If tournament_matches table doesn't exist or has issues, just set empty data
        console.warn('Tournament matches not available:', matchesError);
        setMatches([]);
        setMatchResults([]);
        return;
      }

      // Fetch match results (only if there are matches and match_results table exists)
      let resultsData = [];
      if (matchesData && matchesData.length > 0) {
        try {
          const { data: results, error: resultsError } = await supabase
            .from('match_results')
            .select('*')
            .in('match_id', matchesData.map(m => m.id));

          if (resultsError) {
            console.warn('Match results not available:', resultsError);
            resultsData = [];
          } else {
            resultsData = results || [];
          }
        } catch (resultsErr) {
          console.warn('Match results table may not exist:', resultsErr);
          resultsData = [];
        }
      }

      setMatches(matchesData || []);
      setMatchResults(resultsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load bracket data';
      setError(errorMessage);
      console.error('Error fetching bracket data:', err);
      // Set empty data on error to prevent UI crashes
      setMatches([]);
      setMatchResults([]);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const generateBracket = useCallback(async () => {
    try {
      // Get registered teams
      const { data: registrations, error: regError } = await supabase
        .from('tournament_participants')
        .select(`
          *,
          team:teams(*)
        `)
        .eq('tournament_id', tournamentId)
        .eq('registration_type', 'team')
        .in('status', ['approved', 'checked_in']);

      if (regError) throw regError;

      if (!registrations || registrations.length < 2) {
        throw new Error('Need at least 2 teams to generate bracket');
      }

      // Generate bracket structure
      const teams = registrations.map(reg => reg.team).filter(Boolean);
      const bracketMatches = generateBracketMatches(teams, tournamentId);

      // Insert matches into database
      const { error: insertError } = await supabase
        .from('tournament_matches')
        .insert(bracketMatches);

      if (insertError) throw insertError;

      await fetchBracketData();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate bracket';
      console.error('Error generating bracket:', err);
      throw new Error(errorMessage);
    }
  }, [tournamentId, fetchBracketData]);

  const reportMatchScore = useCallback(async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    screenshots: File[]
  ) => {
    try {
      // Upload screenshots
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

      // Create match result
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

      // Update match status
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          status: 'pending'
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      await fetchBracketData();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to report score';
      console.error('Error reporting score:', err);
      throw new Error(errorMessage);
    }
  }, [fetchBracketData]);

  const verifyMatchResult = useCallback(async (
    resultId: string,
    status: 'verified' | 'rejected',
    notes?: string
  ) => {
    try {
      // Update match result
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
        // Get the match result to update the match
        const { data: result, error: fetchError } = await supabase
          .from('match_results')
          .select('*')
          .eq('id', resultId)
          .single();

        if (fetchError) throw fetchError;

        // Update match with verified result
        const { error: matchError } = await supabase
          .from('tournament_matches')
          .update({
            team1_score: result.team1_score,
            team2_score: result.team2_score,
            status: 'completed',
            winner_id: result.team1_score > result.team2_score 
              ? result.match_id // This should be the team ID, need to fix
              : result.match_id // This should be the team ID, need to fix
          })
          .eq('id', result.match_id);

        if (matchError) throw matchError;

        // Advance winner to next round
        await advanceWinner(result.match_id);
      } else {
        // Reject result - reset match status
        const { data: result, error: fetchError } = await supabase
          .from('match_results')
          .select('match_id')
          .eq('id', resultId)
          .single();

        if (fetchError) throw fetchError;

        const { error: matchError } = await supabase
          .from('tournament_matches')
          .update({
            status: 'pending',
            team1_score: null,
            team2_score: null
          })
          .eq('id', result.match_id);

        if (matchError) throw matchError;
      }

      await fetchBracketData();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify result';
      console.error('Error verifying result:', err);
      throw new Error(errorMessage);
    }
  }, [fetchBracketData]);

  const advanceWinner = useCallback(async (matchId: string) => {
    try {
      const { error } = await supabase.rpc('advance_winner', {
        match_uuid: matchId
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error advancing winner:', err);
      // Don't throw here as it's not critical
    }
  }, []);

  useEffect(() => {
    fetchBracketData();
  }, [fetchBracketData]);

  return {
    matches,
    matchResults,
    loading,
    error,
    fetchBracketData,
    generateBracket,
    reportMatchScore,
    verifyMatchResult,
    advanceWinner
  };
};

// Helper function to generate bracket matches
const generateBracketMatches = (teams: Team[], tournamentId: string): any[] => {
  const matches = [];
  let round = 1;
  let currentTeams = [...teams];
  
  // Shuffle teams for random seeding
  currentTeams = currentTeams.sort(() => Math.random() - 0.5);
  
  while (currentTeams.length > 1) {
    const roundMatches = [];
    
    for (let i = 0; i < currentTeams.length; i += 2) {
      if (i + 1 < currentTeams.length) {
        roundMatches.push({
          tournament_id: tournamentId,
          round,
          match_number: Math.floor(i / 2) + 1,
          team1_id: currentTeams[i].id,
          team2_id: currentTeams[i + 1].id,
          status: 'pending'
        });
      } else {
        // Odd number of teams - bye for last team
        roundMatches.push({
          tournament_id: tournamentId,
          round,
          match_number: Math.floor(i / 2) + 1,
          team1_id: currentTeams[i].id,
          team2_id: null,
          status: 'completed',
          winner_id: currentTeams[i].id
        });
      }
    }
    
    matches.push(...roundMatches);
    currentTeams = currentTeams.filter((_, i) => i % 2 === 0); // Winners advance
    round++;
  }
  
  return matches;
};
