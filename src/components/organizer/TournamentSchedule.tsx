import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTimezoneAbbr } from '@/lib/timeUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Clock, Users, Loader2, Calendar as CalendarIcon, Filter } from "lucide-react";
import { format } from 'date-fns';

interface ScheduledMatch {
  id: string;
  scheduled_time: string | null;
  round_index: number;
  match_number: number;
  status: string;
  team1_name: string | null;
  team2_name: string | null;
  tournament_id: string;
  tournament_name: string;
  tournament_game: string;
  tournament_slug: string;
  stage_name: string;
}

const TournamentSchedule = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Fetch all scheduled match dates for highlighting in calendar
  const { data: scheduledDates } = useQuery({
    queryKey: ['scheduled-dates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Helper to get dates where matches exist for this organizer
      // Complex query, might be expensive if many matches. 
      // For now, let's just fetch matches for potential range or all?
      // Let's fetch next 3 months? Or just current month?
      // Simplification: Not highlighting dots on calendar to avoid fetching ALL matches at once.
      return [];
    },
    enabled: !!user?.id
  });

  const { data: matches, isLoading } = useQuery({
    queryKey: ['schedule-matches', user?.id, date?.toISOString()],
    queryFn: async () => {
      if (!user?.id || !date) return [];

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // We need to find matches for tournaments OWNED by this user.
      // Join: brkt_matches -> tournament_versions -> tournaments (filter owner_id)

      const data = await apiClient.get<any[]>(
        `/api/organizer/schedule?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`
      ).catch(() => []);

      return data as unknown as ScheduledMatch[];
    },
    enabled: !!user?.id && !!date,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-esports-purple" />
          Tournament Schedule
        </h2>
        {/* Could add filters here */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="bg-gaming-dark text-white rounded-md border border-white/5"
                classNames={{
                  day_selected: "bg-esports-purple text-white hover:bg-esports-purple hover:text-white focus:bg-esports-purple",
                  day_today: "bg-white/10 text-white font-bold",
                  day: "hover:bg-white/5 data-[selected]:bg-esports-purple"
                }}
              />
              <div className="mt-4 flex flex-col gap-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-esports-purple"></div>
                  <span>Selected Date</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-white/10"></div>
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-gaming-dark border-gaming-gray/30 h-full">
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                Matches on <span className="text-esports-purple">{date ? format(date, 'MMMM do, yyyy') : 'Selected Date'}</span>
              </h3>

              {isLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="w-8 h-8 animate-spin text-esports-purple" />
                </div>
              ) : matches && matches.length > 0 ? (
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="hover:bg-white/5 border-white/10">
                        <TableHead className="text-gray-400">Time <span className="text-gray-500 text-xs">({getTimezoneAbbr()})</span></TableHead>
                        <TableHead className="text-gray-400">Tournament</TableHead>
                        <TableHead className="text-gray-400">Matchup</TableHead>
                        <TableHead className="text-gray-400">Round</TableHead>
                        <TableHead className="text-right text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matches.map((match) => (
                        <TableRow key={match.id} className="hover:bg-white/5 border-white/10">
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-gray-500" />
                              {match.scheduled_time ? format(new Date(match.scheduled_time), 'HH:mm') : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-white">{match.tournament_name || 'Unknown Tournament'}</span>
                              <span className="text-xs text-gray-500">{match.tournament_game || ''}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={match.team1_name ? "text-white" : "text-gray-500 italic"}>
                                {match.team1_name || 'TBD'}
                              </span>
                              <span className="text-gray-600 text-xs">VS</span>
                              <span className={match.team2_name ? "text-white" : "text-gray-500 italic"}>
                                {match.team2_name || 'TBD'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-400">
                            R{(match.round_index ?? 0) + 1} M{match.match_number ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={`
                               ${match.status === 'completed' ? 'border-green-500 text-green-500' :
                                match.status === 'ongoing' ? 'border-amber-500 text-amber-500 animate-pulse' :
                                  'border-gray-600 text-gray-400'}
                             `}>
                              {match.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                  <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-lg">No matches scheduled</p>
                  <p className="text-sm">Select another date or schedule matches in your tournament brackets.</p>
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
