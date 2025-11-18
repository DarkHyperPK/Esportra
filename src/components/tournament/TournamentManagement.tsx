import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Registration = Database['public']['Tables']['tournament_participants']['Row'];
type TournamentBan = Database['public']['Tables']['tournament_bans']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface RegistrationWithProfile extends Registration {
  profiles: Profile;
}

interface Props {
  tournament: Tournament;
}

const TournamentManagement: React.FC<Props> = ({ tournament }) => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationWithProfile[]>([]);
  const [bans, setBans] = useState<TournamentBan[]>([]);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');

  const fetchRegistrations = async () => {
    const { data, error } = await supabase
      .from('tournament_participants')
      .select('*, profiles(*)')
      .eq('tournament_id', tournament.id);

    if (error) {
      console.error('Error fetching registrations:', error);
      return;
    }

    setRegistrations(data as unknown as RegistrationWithProfile[]);
  };

  const fetchBans = async () => {
    const { data, error } = await supabase
      .from('tournament_bans' as any)
      .select('*')
      .eq('tournament_id', tournament.id);

    if (error) {
      console.error('Error fetching bans:', error);
      return;
    }

    setBans(data as TournamentBan[]);
  };

  useEffect(() => {
    fetchRegistrations();
    fetchBans();
  }, [tournament.id]);

  const handleBan = async () => {
    if (!selectedUserId || !banReason.trim()) return;

    try {
      // Insert into tournament_bans
      const { error: banError } = await supabase
        .from('tournament_bans' as any)
        .insert({
          tournament_id: tournament.id,
          user_id: selectedUserId,
          ban_reason: banReason.trim(),
          banned_by: user?.id
        });
      if (banError) throw banError;

      // Delete from tournament_participants
      const { error: regError } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', selectedUserId);
      if (regError) throw regError;

      // Refresh data
      await Promise.all([fetchRegistrations(), fetchBans()]);
      toast.success('User banned and registration removed');
      setShowBanDialog(false);
      setBanReason('');
      setSelectedUserId(null);
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_bans' as any)
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh data
      await Promise.all([fetchRegistrations(), fetchBans()]);
      toast.success('User unbanned successfully');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const isUserBanned = (userId: string) => {
    return bans.some(ban => ban.user_id === userId);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Registered Participants</h3>
        <div className="grid gap-4">
          {registrations.map((registration) => (
            <div 
              key={registration.id} 
              className={`p-4 rounded-lg border ${
                isUserBanned(registration.user_id) 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{registration.profiles.username}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Registration Type: {registration.registration_type}</p>
                    {registration.team_name && (
                      <p>Team: {registration.team_name}</p>
                    )}
                    <p>Registered: {new Date(registration.created_at || '').toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  {isUserBanned(registration.user_id) ? (
                    <Button
                      onClick={() => handleUnban(registration.user_id)}
                      variant="outline"
                      className="bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      Unban
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedUserId(registration.user_id);
                        setShowBanDialog(true);
                      }}
                      variant="outline"
                      className="bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Ban
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Enter a reason for banning this user from the tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Ban Reason</Label>
              <Input
                id="reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for ban..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBanDialog(false);
                setBanReason('');
                setSelectedUserId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBan}
              className="bg-red-600 hover:bg-red-700"
              disabled={!banReason.trim()}
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentManagement; 