import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { Search, Eye, Edit, Trash2, Trophy, Users, CheckCircle, Clock, Activity, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ParticipantListModal } from "./ParticipantListModal";

interface DbTournamentRow {
  id: string;
  name?: string | null;
  title?: string | null;
  game?: string | null;
  status?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  max_participants?: number | null;
  prize_pool?: string | null;
  organizer?: { full_name?: string | null; username?: string | null } | null;
  registrations?: { count: number }[] | null;
}

interface UITournament {
  id: string;
  name: string;
  game: string;
  organizer: string;
  date: string;
  status: string;
  participants: number;
  maxParticipants: number;
  prizePool: string;
}

const AdminTournamentsList = () => {
  const [tournaments, setTournaments] = useState<UITournament[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('tournaments')
          .select(`
            id, name, title, game, status, start_date, created_at, max_participants, prize_pool,
            organizer:profiles!tournaments_user_id_fkey(full_name, username),
            registrations:tournament_participants(count)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const mapped: UITournament[] = (data as DbTournamentRow[]).map((t) => ({
          id: t.id,
          name: (t.name || t.title || 'Untitled').toString(),
          game: (t.game || 'Unknown').toString(),
          organizer: (t.organizer?.full_name || t.organizer?.username || 'Unknown').toString(),
          date: (t.start_date || t.created_at || '').toString(),
          status: (t.status || 'upcoming').toString(),
          participants: t.registrations?.[0]?.count || 0,
          maxParticipants: t.max_participants || 0,
          prizePool: t.prize_pool ? `$${t.prize_pool}` : '$0',
        }));
        setTournaments(mapped);
      } catch (e: any) {
        setError(e.message || 'Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  const filteredTournaments = tournaments.filter(tournament =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.game.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      active: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <CheckCircle className="w-3 h-3" /> },
      ongoing: { color: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: <Activity className="w-3 h-3" /> },
      live: { color: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: <Activity className="w-3 h-3" /> },
      upcoming: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: <Clock className="w-3 h-3" /> },
      completed: { color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: <AlertCircle className="w-3 h-3" /> },
    };
    const config = statusConfig[status] || statusConfig.upcoming;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Tournaments Management</h2>
            <p className="text-zinc-500 text-sm">Monitor and manage all platform tournaments</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500 w-64"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-rose-500 hover:bg-rose-600 text-white">
            <Trophy className="w-4 h-4 mr-2" />
            Add Tournament
          </Button>
        </div>
      </div>

      {/* Tournaments Table */}
      <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50">
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Tournament</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Game</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Organizer</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Participants</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">Prize Pool</th>
                <th className="px-6 py-3 text-right text-xs font-mono text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      Loading tournaments...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-red-400">{error}</td>
                </tr>
              ) : filteredTournaments.length > 0 ? (
                filteredTournaments.map((tournament, idx) => (
                  <motion.tr
                    key={tournament.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tournament.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{tournament.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs">
                        {tournament.game}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{tournament.organizer}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{new Date(tournament.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{getStatusBadge(tournament.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-white">{tournament.participants}</span>
                        <span className="text-xs text-zinc-500">/ {tournament.maxParticipants}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-emerald-400">{tournament.prizePool}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-400 hover:text-rose-500"
                          onClick={() => { setSelectedTournament({ id: tournament.id, name: tournament.name }); setParticipantsOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-blue-400">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500">
                    No tournaments found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ParticipantListModal
        tournamentId={selectedTournament?.id || ''}
        tournamentName={selectedTournament?.name || ''}
        isOpen={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
      />
    </div>
  );
};

export default AdminTournamentsList;
