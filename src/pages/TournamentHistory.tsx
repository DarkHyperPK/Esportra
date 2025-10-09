// Dedicated Tournament History page for all roles
// Shows: Organizers - all hosted; Users - only participated; Venue owners - (expandable)
// Route: /tournament-history
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import Footer from '@/components/Footer';

const TournamentHistoryPage = () => {
  const { user, profile } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banList, setBanList] = useState<any[]>([]);
  const [banTournament, setBanTournament] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user || !profile) return;
      setLoading(true);
      let data = [];
      let error = null;
      if (profile.role === 'organizer') {
        // Organizers: all tournaments they hosted
        const res = await (supabase as any)
          .from('tournaments')
          .select('id, name, date, status, finished, slug')
          .eq('organizer_id', user.id)
          .order('date', { ascending: false });
        data = res.data || [];
        error = res.error;
      } else if (profile.role === 'venue_owner') {
        // Venue owners: all tournaments at their venues (expand as needed)
        // For now, show nothing or add logic to fetch by venue
        data = [];
        error = null;
      } else {
        // Users: only tournaments they participated in
        const res = await (supabase as any)
          .from('tournament_registrations')
          .select('tournament_id, tournaments!inner(id, name, date, status, finished, slug)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        data = (res.data || []).map((reg: any) => reg.tournaments);
        error = res.error;
      }
      setTournaments(error ? [] : data);
      setLoading(false);
    };
    fetchHistory();
  }, [user, profile]);

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

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Tournament History</h1>
        {loading ? (
          <div>Loading tournament history...</div>
        ) : tournaments.length === 0 ? (
          <p className="text-gray-400">No tournaments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gaming-dark border border-gaming-gray/30 rounded-lg">
              <thead>
                <tr className="text-left text-gaming-purple border-b border-gaming-gray/30">
                  <th className="py-3 px-4">Tournament Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((tournament: any) => (
                  <tr key={tournament.id} className="border-b border-gaming-gray/20 hover:bg-gaming-gray/10 transition">
                    <td className="py-3 px-4 font-semibold">{tournament.name}</td>
                    <td className="py-3 px-4">{new Date(tournament.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gaming-green">(Coming soon)</td>
                    <td className="py-3 px-4 flex gap-2">
                      <Button size="sm" onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}`)} className="bg-gaming-purple hover:bg-gaming-purple/80">View Details</Button>
                      {profile.role === 'organizer' && (
                        <Button size="sm" onClick={() => openBanList(tournament)} className="bg-red-700 hover:bg-red-800">Banned Users</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Ban Modal for organizers */}
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
      </main>
      <Footer />
    </div>
  );
};

export default TournamentHistoryPage;
// This export is correct for React Router or Next.js. Ensure the route is registered in your router. 