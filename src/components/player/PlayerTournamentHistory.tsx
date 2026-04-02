import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/utils/dateFormat';

const PlayerTournamentHistory = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await apiClient.get<any[]>('/api/tournaments/me/history');
        const completed = (data || []).filter((t: any) =>
          t.status === 'completed' || t.finished === true
        );
        setTournaments(completed);
      } catch {
        setTournaments([]);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  if (loading) return <div>Loading tournament history...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tournament History</h2>
      {tournaments.length === 0 ? (
        <p className="text-gray-400">No completed tournaments found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament: any) => (
            <Card key={tournament.id} className="bg-gaming-dark border-gaming-gray/30">
              <CardHeader>
                <CardTitle>{tournament.name}</CardTitle>
                <div className="text-gray-400 text-sm">{formatDate(tournament.date)}</div>
                <div className="text-xs text-gaming-green mt-1">Result: <span className="font-semibold">(Coming soon)</span></div>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate(`/tournaments/${tournament.id}`)} className="bg-gaming-purple hover:bg-gaming-purple/80">View Details</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerTournamentHistory; 
