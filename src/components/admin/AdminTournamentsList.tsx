
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Edit, Trash2, Trophy, Users } from "lucide-react";
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

const mockTournaments: Tournament[] = [
  {
    id: '1',
    name: 'Summer Valorant Championship',
    game: 'Valorant',
    organizer: 'organizer1',
    date: '2023-06-15',
    status: 'upcoming',
    participants: 12,
    maxParticipants: 16,
    prizePool: '$2,000',
  },
  {
    id: '2',
    name: 'League of Legends Weekly',
    game: 'League of Legends',
    organizer: 'organizer2',
    date: '2023-05-10',
    status: 'ongoing',
    participants: 8,
    maxParticipants: 8,
    prizePool: '$1,000',
  },
  {
    id: '3',
    name: 'CS:GO Pro Circuit',
    game: 'Counter-Strike',
    organizer: 'organizer1',
    date: '2023-04-25',
    status: 'completed',
    participants: 16,
    maxParticipants: 16,
    prizePool: '$3,500',
  },
  {
    id: '4',
    name: 'Fortnite Solo Showdown',
    game: 'Fortnite',
    organizer: 'organizer3',
    date: '2023-07-02',
    status: 'upcoming',
    participants: 45,
    maxParticipants: 100,
    prizePool: '$5,000',
  },
  {
    id: '5',
    name: 'Rocket League 2v2',
    game: 'Rocket League',
    organizer: 'organizer2',
    date: '2023-05-20',
    status: 'upcoming',
    participants: 16,
    maxParticipants: 32,
    prizePool: '$1,500',
  },
];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Tournaments Management
          </h2>
          <p className="text-gray-400">Monitor and manage all platform tournaments</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10 bg-gray-700 border-gray-600 text-white"
              placeholder="Search tournaments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
            <Trophy size={18} className="mr-2" />
            Add Tournament
          </Button>
        </div>
      </div>
    
      {/* Tournaments Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Game</TableHead>
                  <TableHead className="text-gray-300">Organizer</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Participants</TableHead>
                  <TableHead className="text-gray-300">Prize Pool</TableHead>
                  <TableHead className="text-right text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">Loading tournaments...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-red-500">{error}</TableCell>
                  </TableRow>
                ) : filteredTournaments.length > 0 ? (
                  filteredTournaments.map(tournament => (
                    <TableRow key={tournament.id} className="border-gray-700 hover:bg-gray-700/30">
                      <TableCell className="font-medium text-white">{tournament.name}</TableCell>
                      <TableCell className="text-gray-300">{tournament.game}</TableCell>
                      <TableCell className="text-gray-300">{tournament.organizer}</TableCell>
                      <TableCell className="text-gray-300">{new Date(tournament.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          tournament.status === 'upcoming' ? 'bg-blue-600 text-white' : 
                          tournament.status === 'ongoing' ? 'bg-green-600 text-white' : 
                          tournament.status === 'completed' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-white'
                        }>
                          {tournament.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white flex items-center gap-1">
                        <Users size={14} className="text-gray-400" />
                        {tournament.participants}/{tournament.maxParticipants}
                      </TableCell>
                      <TableCell className="text-white font-semibold">{tournament.prizePool}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-400 hover:text-white"
                            onClick={() => { setSelectedTournament({ id: tournament.id, name: tournament.name }); setParticipantsOpen(true); }}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-blue-400">
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                      No tournaments found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
