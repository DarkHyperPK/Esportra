import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Participant {
  id: string;
  user_id: string;
  tournament_id: string;
  registered_at: string;
  profile: {
    username: string;
    full_name: string | null;
    email: string | null;
  };
  registration_details?: {
    id: string;
    registration_type: string;
    team_name: string | null;
    team_captain: string | null;
    team_members: string | null;
    team_contact_email: string | null;
    team_contact_phone: string | null;
  };
}

interface ParticipantListModalProps {
  tournamentId: string;
  tournamentName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ParticipantListModal({ 
  tournamentId, 
  tournamentName,
  isOpen, 
  onClose
}: ParticipantListModalProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen, tournamentId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      
      // Fetch tournament participants with profile information
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          user_id,
          tournament_id,
          registered_at,
          profile:profiles(username, full_name, email),
          registration:tournament_participants!inner(id, participant_type, team_name, team_members, team_contact_email, team_contact_phone)
        `)
        .eq('tournament_id', tournamentId);

      if (participantsError) {
        throw participantsError;
      }

      // Combine the data
      type Row = Participant & { registration?: Participant['registration_details'] };
      const combinedData: Participant[] = (participantsData as Row[]).map((participant) => ({
        ...participant,
        registration_details: participant.registration || undefined,
      }));

      setParticipants(combinedData);
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Error fetching participants:', e);
      toast({
        title: 'Error',
        description: e.message || 'Failed to load participants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string, userId: string) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      try {
        // Delete from tournament_participants
        const { error: participantError } = await supabase
          .from('tournament_participants')
          .delete()
          .eq('id', participantId);

        if (participantError) throw participantError;

        // Delete from tournament_participants
        const { error: registrationError } = await supabase
          .from('tournament_participants')
          .delete()
          .eq('user_id', userId)
          .eq('tournament_id', tournamentId);

        if (registrationError) throw registrationError;

        toast({
          title: 'Participant removed',
          description: 'The participant has been removed from the tournament',
        });
        
        // Refresh participants list
        fetchParticipants();
      } catch (error: unknown) {
        const e = error as { message?: string };
        console.error('Error removing participant:', e);
        toast({
          title: 'Error',
          description: e.message || 'Failed to remove participant',
          variant: 'destructive',
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-esports-dark text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Participants - {tournamentName}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
              </span>
            </div>
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No participants have registered for this tournament yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gaming-gray/30">
            <table className="min-w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="py-2 px-4 text-left text-white">Team</th>
                  <th className="py-2 px-4 text-left text-white">Gamertag</th>
                  <th className="py-2 px-4 text-left text-white">Team Members</th>
                  <th className="py-2 px-4 text-left text-white">Registered</th>
                  <th className="py-2 px-4 text-left text-white">Type</th>
                  <th className="py-2 px-4 text-right text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-400 bg-gray-900">
                      No participants found.
                    </td>
                  </tr>
                ) : (
                  participants.map((participant) => (
                    <tr
                      key={participant.id}
                      className="bg-gray-900 border-t border-gray-700 hover:bg-gray-800"
                    >
                      <td className="py-2 px-4 font-semibold text-white">{participant.registration_details?.team_name || '-'}</td>
                      <td className="py-2 px-4 text-white">{participant.profile?.username || '-'}</td>
                      <td className="py-2 px-4 text-sm text-gray-300">
                        {participant.registration_details?.team_members
                          ? participant.registration_details.team_members.split(',').map((m, i) => <span key={i}>{m.trim()}<br/></span>)
                          : '-'}
                      </td>
                      <td className="py-2 px-4 text-sm text-gray-300">
                        {participant.registered_at ? formatDate(participant.registered_at) : '-'}
                      </td>
                      <td className="py-2 px-4">
                        {participant.registration_details?.registration_type === 'team'
                          ? <Badge className="bg-blue-600 text-white">Team</Badge>
                          : <Badge className="bg-purple-600 text-white">Individual</Badge>
                        }
                      </td>
                      <td className="py-2 px-4 text-right text-white">
                        <Button size="sm" variant="destructive" className="mr-2" onClick={() => handleRemoveParticipant(participant.id, participant.user_id)}>Ban</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="border-gaming-gray/30"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
