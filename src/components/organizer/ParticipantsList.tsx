
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
import { Search, Mail, X, Loader2 } from "lucide-react";
import { apiClient } from '@/lib/apiClient';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendEmail } from "@/hooks/useEmail";

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Participant {
  id: string;
  username: string;
  email: string;
  tournament: string;
  registeredAt: string;
  status: string;
  isTeamFormat: boolean;
  tournamentSlug?: string;
}

// Virtualized Row Component
const VirtualTableRows = ({ rows, getStatusColor }: { rows: Participant[], getStatusColor: (s: string) => string }) => {
  const parentRef = useRef<HTMLTableRowElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current?.parentElement || null,
    estimateSize: () => 53, // approximated row height
    overscan: 10,
  });

  return (
    <>
      <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }} />
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const participant = rows[virtualRow.index];
        return (
          <TableRow
            key={participant.id}
            className="hover:bg-gaming-gray/5 absolute w-full flex items-center"
            style={{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              display: 'table', // reset display for table-row behavior inside table
            }}
          >
            <TableCell className="font-medium w-[15%]">{participant.username}</TableCell>
            <TableCell className="w-[20%]">{participant.email}</TableCell>
            <TableCell className="w-[20%]">{participant.tournament}</TableCell>
            <TableCell className="w-[15%]">{new Date(participant.registeredAt).toLocaleDateString()}</TableCell>
            <TableCell className="w-[10%]">
              <Badge className={getStatusColor(participant.status)}>
                {participant.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right w-[5%]">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Mail size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                <X size={16} />
              </Button>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
};

const ParticipantsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('[ParticipantsList] Fetching for user:', user.id);

        // First get the organizer's tournaments with format info
        const tournaments = await apiClient.get<any[]>(`/api/tournaments?organizer_id=${user.id}`);

        if (!tournaments || tournaments.length === 0) {
          console.log('[ParticipantsList] No tournaments found for this organizer');
          setParticipants([]);
          setLoading(false);
          return;
        }

        // Create maps for tournament info
        const tournamentMap = Object.fromEntries(tournaments.map(t => [t.id, t.name]));
        const tournamentSlugMap = Object.fromEntries(tournaments.map(t => [t.id, t.slug]));
        const tournamentFormatMap = Object.fromEntries(tournaments.map(t => [t.id, (t.team_size || 1) > 1]));
        const allRegistrations: any[] = [];

        // First collect all registrations with team_id
        for (const tournament of tournaments) {
          console.log('[ParticipantsList] Fetching participants for tournament:', tournament.name, tournament.id);

          const registrations = await apiClient.get<any[]>(`/api/tournaments/${tournament.id}/participants`).catch(() => null);

          console.log('[ParticipantsList] Registrations for', tournament.name, ':', registrations?.length);

          if (!registrations) {
            console.error('[ParticipantsList] Error for', tournament.name);
            continue;
          }

          allRegistrations.push(...(registrations || []));
        }

        // Collect team_ids and user_ids separately
        const teamIds = [...new Set(allRegistrations.map(r => r.team_id).filter(Boolean))];
        const userIds = [...new Set(allRegistrations.map(r => r.user_id).filter(Boolean))];

        console.log('[ParticipantsList] Fetching', teamIds.length, 'teams and', userIds.length, 'users');

        // Fetch teams with owner info
        let teamsMap: Record<string, any> = {};
        if (teamIds.length > 0) {
          const { data: teams, error: teamError } = { data: await apiClient.get<any[]>(`/api/teams?ids=${teamIds.join(',')}`).catch(() => []), error: null } as any;

          if (teams) {
            // Get owner profiles for teams
            const ownerIds = [...new Set(teams.map(t => t.owner_id).filter(Boolean))];
            let ownerProfiles: Record<string, any> = {};

            if (ownerIds.length > 0) {
              const profiles = await apiClient.get<any[]>(`/api/profiles/search?ids=${ownerIds.join(',')}`).catch(() => []);

              ownerProfiles = Object.fromEntries((profiles || []).map(p => [p.id, p]));
            }

            // Map teams with owner info
            teamsMap = Object.fromEntries(teams.map(t => [t.id, {
              ...t,
              owner: ownerProfiles[t.owner_id] || {}
            }]));
            console.log('[ParticipantsList] Fetched teams:', teams.length);
          }
        }

        // Fetch individual user profiles (for solo participants)
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const profiles = await apiClient.get<any[]>(`/api/profiles/search?ids=${userIds.join(',')}`).catch(() => []);

          profilesMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        }

        // Map registrations with team/profile data
        const allParticipants: Participant[] = allRegistrations.map((reg: any) => {
          const team = teamsMap[reg.team_id] || {};
          const profile = profilesMap[reg.user_id] || {};
          const isTeamFormat = tournamentFormatMap[reg.tournament_id] || false;

          // For team registrations, use team info; for solo, use profile
          const isTeamReg = !!reg.team_id;

          return {
            id: reg.id,
            username: isTeamReg ? (team.name || reg.team_name || 'Unknown Team') : (profile.username || profile.full_name || 'Unknown'),
            email: isTeamReg ? (team.owner?.email || '') : (profile.email || ''),
            tournament: tournamentMap[reg.tournament_id] || 'Unknown',
            registeredAt: reg.created_at,
            status: reg.status === 'registered' ? 'confirmed' : (reg.status || 'pending'),
            isTeamFormat,
            tournamentSlug: tournamentSlugMap[reg.tournament_id]
          };
        });

        console.log('[ParticipantsList] Total participants found:', allParticipants.length);
        setParticipants(allParticipants);
      } catch (err) {
        console.error('[ParticipantsList] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [user]);

  const filteredParticipants = participants.filter(
    participant => participant.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.tournament.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSendReminder = async (participant: Participant) => {
    if (!participant.email) {
      toast({
        title: "No Email found",
        description: "Cannot send reminder to this participant.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { success, error } = await sendEmail({
        type: 'CheckinReminder',
        email: participant.email,
        data: {
          tournamentName: participant.tournament,
          username: participant.username,
          tournamentUrl: `${window.location.origin}/tournaments/${participant.tournamentSlug || ''}`
        }
      });

      if (success) {
        toast({
          title: "Reminder Sent",
          description: `Email sent to ${participant.username}.`,
        });
      } else {
        throw new Error(error);
      }
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err.message || "Error sending email reminder.",
        variant: "destructive"
      });
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
                <TableHead>{participants.some(p => p.isTeamFormat) ? 'Team' : 'Username'}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tournament</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gaming-purple" />
                    <p className="text-gray-400 mt-2">Loading participants...</p>
                  </TableCell>
                </TableRow>
              ) : filteredParticipants.length > 0 ? (
                filteredParticipants.map((participant) => (
                  <TableRow key={participant.id} className="hover:bg-gaming-gray/5">
                    <TableCell className="font-medium">{participant.username}</TableCell>
                    <TableCell>{participant.email || '-'}</TableCell>
                    <TableCell>{participant.tournament}</TableCell>
                    <TableCell>{new Date(participant.registeredAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(participant.status)}>
                        {participant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white"
                        onClick={() => handleSendReminder(participant)}
                      >
                        <Mail size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                        <X size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : participants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    No participants registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
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
