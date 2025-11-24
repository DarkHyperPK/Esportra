import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const OrganizerTournamentHistory = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banList, setBanList] = useState<any[]>([]);
  const [banTournament, setBanTournament] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      setLoading(true);
      // Get all completed tournaments the organizer hosted
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, date, status, finished')
        .eq('organizer_id', user.id)
        .or('status.eq.completed,finished.eq.true')
        .order('start_date', { ascending: false });
      setTournaments(error ? [] : (data || []));
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  const openBanList = async (tournament: any) => {
    setBanTournament(tournament);
    setBanModalOpen(true);
    // Fetch banned users for this tournament
    const { data, error } = await (supabase as any)
      .from('tournament_bans')
      .select('user_id, ban_reason, banned_at, profiles:profiles!tournament_bans_user_id_fkey(username, full_name)')
      .eq('tournament_id', tournament.id);
    setBanList(error ? [] : (data || []));
  };

  const handleUnban = async (userId: string) => {
    if (!banTournament) return;
    await (supabase as any)
      .from('tournament_bans')
      .delete()
      .eq('tournament_id', banTournament.id)
      .eq('user_id', userId);
    setBanList(banList.filter(ban => ban.user_id !== userId));
  };

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
                <div className="text-gray-400 text-sm">{new Date(tournament.date).toLocaleDateString()}</div>
                <div className="text-xs text-gaming-green mt-1">Result: <span className="font-semibold">(Coming soon)</span></div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button onClick={() => navigate(`/tournaments/${tournament.id}`)} className="bg-gaming-purple hover:bg-gaming-purple/80">View Details</Button>
                <Button onClick={() => openBanList(tournament)} className="bg-red-700 hover:bg-red-800">Banned Users</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Banned Users for {banTournament?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {banList.length === 0 ? (
              <p className="text-gray-400">No banned users for this tournament.</p>
            ) : (
              <ul>
                {banList.map((ban: any) => (
                  <li key={ban.user_id} className="flex justify-between items-center border-b border-gaming-gray/30 py-2">
                    <span>{ban.profiles?.full_name || ban.profiles?.username || ban.user_id}</span>
                    <span className="text-xs text-gray-400 ml-2">{ban.ban_reason}</span>
                    <Button size="sm" variant="outline" className="ml-2" onClick={() => handleUnban(ban.user_id)}>Unban</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBanModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerTournamentHistory;