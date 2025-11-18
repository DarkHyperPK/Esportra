import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Participant {
  id: string;
  registration_type: 'solo' | 'team';
  team_name: string | null;
  profiles: {
    username: string;
  };
}

interface Match {
  id: string;
  round: number;
  position: number;
  participant1_id: string | null;
  participant2_id: string | null;
  winner_id: string | null;
  next_match_id: string | null;
}

const TournamentBrackets = () => {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [bracketType, setBracketType] = useState<'single' | 'double' | 'roundrobin' | 'swiss'>('single');
  const [game, setGame] = useState<string>('');

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
      fetchParticipants();
    }
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('game')
        .eq('id', tournamentId)
        .single();
      if (error) throw error;
      setGame(data.game);
    } catch (error) {
      setGame('');
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('id, registration_type, team_name, profiles(username)')
        .eq('tournament_id', tournamentId)
        .eq('banned', false);
      if (error) throw error;
      // Cast registration_type to 'team'|'solo' and filter out any with missing profiles
      const safeParticipants: Participant[] = (data as any[] ?? []).map((p: any) => ({
        id: p.id,
        registration_type: p.registration_type as 'team' | 'solo',
        team_name: p.team_name,
        profiles: { username: p.profiles?.username || '' },
      }));
      setParticipants(safeParticipants);
    } catch (error) {
      setParticipants([]);
    }
  };

  // Only use teams for 5v5 games
  const isTeamGame = ['valorant', 'cs', 'cs2', 'cs:go', 'counter-strike'].includes(game.toLowerCase());
  const teams = isTeamGame ? participants.filter(p => p.registration_type === 'team') : participants;

  const generateBrackets = async () => {
    if (bracketType !== 'single') {
      toast({
        title: 'Not implemented',
        description: 'Only Single Elimination is implemented for now.',
        variant: 'destructive',
      });
      return;
    }
    const numParticipants = teams.length;
    if (numParticipants < 2) {
      toast({
        title: 'Not enough teams',
        description: 'At least 2 teams are required to generate a bracket.',
        variant: 'destructive',
      });
      return;
    }
    // Single elimination logic
    const numRounds = Math.ceil(Math.log2(numParticipants));
    const newMatches: Match[] = [];
    let matchId = 1;
    const firstRoundMatches = Math.ceil(numParticipants / 2);
    for (let i = 0; i < firstRoundMatches; i++) {
      newMatches.push({
        id: matchId.toString(),
        round: 1,
        position: i + 1,
        participant1_id: teams[i * 2]?.id || null,
        participant2_id: teams[i * 2 + 1]?.id || null,
        winner_id: null,
        next_match_id: null
      });
      matchId++;
    }
    for (let round = 2; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      for (let i = 0; i < matchesInRound; i++) {
        const match: Match = {
          id: matchId.toString(),
          round,
          position: i + 1,
          participant1_id: null,
          participant2_id: null,
          winner_id: null,
          next_match_id: null
        };
        const prevRoundMatches = newMatches.filter(m => m.round === round - 1);
        const childMatch1 = prevRoundMatches[i * 2];
        const childMatch2 = prevRoundMatches[i * 2 + 1];
        if (childMatch1) childMatch1.next_match_id = match.id;
        if (childMatch2) childMatch2.next_match_id = match.id;
        newMatches.push(match);
        matchId++;
      }
    }
    // Save matches to database (use any for custom table)
    const { error } = await (supabase as any)
      .from('tournament_matches')
      .insert(newMatches.map(match => ({
        ...match,
        tournament_id: tournamentId
      })));
    if (error) throw error;
    setMatches(newMatches);
    toast({
      title: 'Success',
      description: 'Tournament brackets have been generated',
    });
  };

  const updateMatchWinner = async (matchId: string, winnerId: string) => {
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;
      // Update current match
      const { error: updateError } = await (supabase as any)
        .from('tournament_matches')
        .update({ winner_id: winnerId })
        .eq('id', matchId);
      if (updateError) throw updateError;
      // If there's a next match, update participants
      if (match.next_match_id) {
        const nextMatch = matches.find(m => m.id === match.next_match_id);
        if (!nextMatch) return;
        const isFirstParticipant = nextMatch.position % 2 === 1;
        const updateData = isFirstParticipant
          ? { participant1_id: winnerId }
          : { participant2_id: winnerId };
        const { error: nextMatchError } = await (supabase as any)
          .from('tournament_matches')
          .update(updateData)
          .eq('id', match.next_match_id);
        if (nextMatchError) throw nextMatchError;
      }
      // Refresh matches
      const { data: updatedMatches, error: fetchError } = await (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId);
      if (fetchError) throw fetchError;
      setMatches(updatedMatches as Match[]);
      toast({
        title: 'Success',
        description: 'Match winner has been updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update match winner',
        variant: 'destructive',
      });
    }
  };

  const renderMatch = (match: Match) => {
    const participant1 = participants.find(p => p.id === match.participant1_id);
    const participant2 = participants.find(p => p.id === match.participant2_id);

    return (
      <Card key={match.id} className="bg-gaming-dark border-gaming-gray/30 mb-4">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className={`flex-1 p-2 rounded ${match.winner_id === match.participant1_id ? 'bg-gaming-green/20' : ''}`}>
                {participant1 ? (
                  <span>{participant1.registration_type === 'team' ? participant1.team_name : participant1.profiles.username}</span>
                ) : (
                  <span className="text-gray-500">TBD</span>
                )}
              </div>
              {participant1 && participant2 && !match.winner_id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mx-2"
                  onClick={() => updateMatchWinner(match.id, participant1.id)}
                >
                  Winner
                </Button>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className={`flex-1 p-2 rounded ${match.winner_id === match.participant2_id ? 'bg-gaming-green/20' : ''}`}>
                {participant2 ? (
                  <span>{participant2.registration_type === 'team' ? participant2.team_name : participant2.profiles.username}</span>
                ) : (
                  <span className="text-gray-500">TBD</span>
                )}
              </div>
              {participant1 && participant2 && !match.winner_id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mx-2"
                  onClick={() => updateMatchWinner(match.id, participant2.id)}
                >
                  Winner
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Tournament Brackets</h1>
          <div className="flex items-center gap-4">
            <Select
              value={bracketType}
              onValueChange={(value: 'single' | 'double' | 'roundrobin' | 'swiss') => setBracketType(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select bracket type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Elimination</SelectItem>
                <SelectItem value="double">Double Elimination (coming soon)</SelectItem>
                <SelectItem value="roundrobin">Round Robin (coming soon)</SelectItem>
                <SelectItem value="swiss">Swiss (coming soon)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateBrackets}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
              disabled={teams.length < 2}
            >
              Generate Brackets
            </Button>
          </div>
        </div>
        {teams.length < 2 ? (
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-gray-400 mb-4">
                Need at least 2 {isTeamGame ? 'teams' : 'participants'} to generate brackets
              </p>
            </CardContent>
          </Card>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from(new Set(matches.map(m => m.round))).map(round => (
              <div key={round} className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Round {round}</h2>
                {matches
                  .filter(match => match.round === round)
                  .map(match => renderMatch(match))}
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-gray-400 mb-4">
                Click 'Generate Brackets' to create the tournament structure
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TournamentBrackets; 