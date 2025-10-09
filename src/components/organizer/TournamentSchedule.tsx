
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Clock, Users } from "lucide-react";

interface ScheduledMatch {
  id: string;
  tournament: string;
  game: string;
  round: string;
  teams: string;
  time: string;
  venue: string;
}

const mockMatches: Record<string, ScheduledMatch[]> = {
  "2025-05-01": [
    {
      id: '1',
      tournament: 'Summer Valorant Showdown',
      game: 'Valorant',
      round: 'Quarter Finals',
      teams: 'Team A vs Team B',
      time: '14:00',
      venue: 'GameHub Central'
    },
    {
      id: '2',
      tournament: 'Summer Valorant Showdown',
      game: 'Valorant',
      round: 'Quarter Finals',
      teams: 'Team C vs Team D',
      time: '16:00',
      venue: 'GameHub Central'
    }
  ],
  "2025-05-02": [
    {
      id: '3',
      tournament: 'Summer Valorant Showdown',
      game: 'Valorant',
      round: 'Semi Finals',
      teams: 'TBD vs TBD',
      time: '15:00',
      venue: 'GameHub Central'
    }
  ],
  "2025-05-10": [
    {
      id: '4',
      tournament: 'League Championship Series',
      game: 'League of Legends',
      round: 'Finals',
      teams: 'Champion Esports vs Victory Gaming',
      time: '18:00',
      venue: 'Esports Arena'
    }
  ]
};

const TournamentSchedule = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedMatches, setSelectedMatches] = useState<ScheduledMatch[]>([]);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDate(date);
      const dateString = date.toISOString().split('T')[0];
      setSelectedMatches(mockMatches[dateString] || []);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Tournament Schedule</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="bg-gaming-dark text-white"
                classNames={{
                  day_selected: "bg-gaming-purple text-white hover:bg-gaming-purple hover:text-white",
                  day_today: "border border-gaming-purple/50 text-white",
                  day: "hover:bg-gaming-gray/20"
                }}
              />
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-gaming-purple"></div>
                  <span className="text-sm">Event scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-gaming-purple/50"></div>
                  <span className="text-sm">Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">
                Matches on {date?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              
              {selectedMatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gaming-gray/5 hover:bg-gaming-gray/10">
                      <TableHead>Tournament</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Teams</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMatches.map((match) => (
                      <TableRow key={match.id} className="hover:bg-gaming-gray/5">
                        <TableCell className="font-medium">{match.tournament}</TableCell>
                        <TableCell>{match.round}</TableCell>
                        <TableCell>{match.teams}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock size={14} className="mr-1 text-gray-400" />
                            {match.time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-1 text-gray-400" />
                            {match.venue}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Users size={48} className="mb-2" />
                  <p>No matches scheduled for this date</p>
                  <Button variant="outline" className="mt-4">
                    Schedule a Match
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TournamentSchedule;
