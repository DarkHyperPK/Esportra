import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { MapVeto } from '@/components/tournament/MapVeto';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const MapVetoToken: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vetoData, setVetoData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVetoByToken = async () => {
      if (!token) {
        setError('Invalid token');
        setLoading(false);
        return;
      }

      try {
        // Find veto by team1 or team2 token
        const { data, error: fetchError } = await supabase
          .from('match_map_vetos')
          .select(`
            *,
            tournament:tournaments(id, name, game, organizer_id),
            match:tournament_matches(
              id,
              team1:teams!tournament_matches_team1_id_fkey(id, name),
              team2:teams!tournament_matches_team2_id_fkey(id, name)
            )
          `)
          .or(`team1_link_token.eq.${token},team2_link_token.eq.${token}`)
          .single();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Veto session not found');
          setLoading(false);
          return;
        }

        // Determine which team this token belongs to
        const isTeam1 = data.team1_link_token === token;
        const teamId = isTeam1 ? data.team1_id : data.team2_id;

        setVetoData({
          veto: data,
          match: data.match,
          tournament: data.tournament,
          teamId,
          isTeam1,
        });
      } catch (err: any) {
        console.error('Error fetching veto:', err);
        setError(err.message || 'Failed to load veto session');
      } finally {
        setLoading(false);
      }
    };

    fetchVetoByToken();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-white">Loading map veto...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !vetoData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-gray-400 mb-4">{error || 'Veto session not found'}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { veto, match, tournament, teamId, isTeam1 } = vetoData;

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        <MapVeto
          matchId={veto.match_id}
          tournamentId={veto.tournament_id}
          team1Id={match?.team1?.id || null}
          team2Id={match?.team2?.id || null}
          team1Name={match?.team1?.name || 'Team 1'}
          team2Name={match?.team2?.name || 'Team 2'}
          game={tournament?.game}
          bestOf={(match as any)?.best_of || 1}
          forcedTeamId={teamId} // Force which team this token belongs to
          onComplete={() => {
            // Optionally redirect or show completion message
          }}
        />
      </div>
    </div>
  );
};

export default MapVetoToken;

