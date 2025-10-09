
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, X } from "lucide-react";

interface Participant {
  id: string;
  username: string;
  email: string;
  gamertag: string;
  tournament: string;
  registeredAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

const mockParticipants: Participant[] = [
  {
    id: '1',
    username: 'player1',
    email: 'player1@example.com',
    gamertag: 'ProGamer123',
    tournament: 'Summer Valorant Showdown',
    registeredAt: '2025-04-20',
    status: 'confirmed'
  },
  {
    id: '2',
    username: 'player2',
    email: 'player2@example.com',
    gamertag: 'GamerGirl99',
    tournament: 'Summer Valorant Showdown',
    registeredAt: '2025-04-21',
    status: 'confirmed'
  },
  {
    id: '3',
    username: 'player3',
    email: 'player3@example.com',
    gamertag: 'NinjaWarrior',
    tournament: 'League Championship Series',
    registeredAt: '2025-04-18',
    status: 'pending'
  }
];

const ParticipantsList = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // In a real implementation, this would fetch from your API
    setParticipants(mockParticipants);
  }, []);

  const filteredParticipants = participants.filter(
    participant => participant.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 participant.gamertag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="bg-gaming-dark border-gaming-gray/30">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Tournament Participants</h2>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                className="pl-10 bg-gaming-gray/10 border-gaming-gray/30"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gaming-gray/30 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gaming-gray/5 hover:bg-gaming-gray/10">
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Gamer Tag</TableHead>
                <TableHead>Tournament</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length > 0 ? (
                filteredParticipants.map((participant) => (
                  <TableRow key={participant.id} className="hover:bg-gaming-gray/5">
                    <TableCell className="font-medium">{participant.username}</TableCell>
                    <TableCell>{participant.email}</TableCell>
                    <TableCell>{participant.gamertag}</TableCell>
                    <TableCell>{participant.tournament}</TableCell>
                    <TableCell>{new Date(participant.registeredAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(participant.status)}>
                        {participant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                        <Mail size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                        <X size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    No participants found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ParticipantsList;
