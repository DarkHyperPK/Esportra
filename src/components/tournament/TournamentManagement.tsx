import React, { useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { toast } from 'react-hot-toast';
import { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Tournament = Database['public']['Tables']['tournaments']['Row'];
type Participant = Database['public']['Tables']['tournament_participants']['Row'];
type TournamentBan = Database['public']['Tables']['tournament_bans']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ParticipantWithProfile extends Participant {
  profiles: Profile;
}

interface Props {
  tournament: Tournament;
}

const PAGE_SIZE = 10;

const TournamentManagement: React.FC<Props> = ({ tournament }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');

  // Use TanStack Query for registrations with pagination
  const { data: registrationsData, isLoading: isLoadingRegistrations } = useQuery({
    queryKey: ['tournament_registrations', tournament.id, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;

      const allData = await apiClient.get<ParticipantWithProfile[]>(
        `/api/tournaments/${tournament.id}/participants?offset=${from}&limit=${PAGE_SIZE}&include=profiles`
      );
      const count = Array.isArray(allData) ? allData.length : 0;

      return { registrations: allData, totalCount: count };
    },
  });

  // Use TanStack Query for bans
  const { data: bans = [] } = useQuery({
    queryKey: ['tournament_bans', tournament.id],
    queryFn: async () => {
      const data = await apiClient.get<TournamentBan[]>(
        `/api/tournaments/${tournament.id}/bans`
      );

      return data;
    },
  });

  // Mutations for Ban/Unban
  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await apiClient.post(`/api/tournaments/${tournament.id}/ban-participant`, {
        user_id: userId,
        ban_reason: reason,
        banned_by: user?.id || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_registrations', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournament_bans', tournament.id] });
      toast.success('User banned and registration removed');
      setShowBanDialog(false);
      setBanReason('');
      setSelectedUserId(null);
    },
    onError: (error: any) => {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(
        `/api/tournaments/${tournament.id}/bans/${userId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament_registrations', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournament_bans', tournament.id] });
      toast.success('User unbanned successfully');
    },
    onError: (error: any) => {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    },
  });

  const handleBan = () => {
    if (!selectedUserId || !banReason.trim()) return;
    banMutation.mutate({ userId: selectedUserId, reason: banReason.trim() });
  };

  const handleUnban = (userId: string) => {
    unbanMutation.mutate(userId);
  };

  const isUserBanned = (userId: string) => {
    return bans.some(ban => ban.user_id === userId);
  };

  const registrations = registrationsData?.registrations || [];
  const totalCount = registrationsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Registered Participants ({totalCount})</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || isLoadingRegistrations}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page + 1} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1 || isLoadingRegistrations}
            >
              Next
            </Button>
          </div>
        </div>

        {isLoadingRegistrations ? (
          <div className="text-center py-8 text-gray-500">Loading participants...</div>
        ) : (
          <div className="grid gap-4">
            {registrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50/50">
                No participants registered yet.
              </div>
            ) : (
              registrations.map((registration) => (
                <div
                  key={registration.id}
                  className={`p-4 rounded-lg border ${isUserBanned(registration.user_id)
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{registration.profiles?.username || 'Unknown User'}</p>
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
                          disabled={unbanMutation.isPending}
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
                          disabled={banMutation.isPending}
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
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
              disabled={!banReason.trim() || banMutation.isPending}
            >
              {banMutation.isPending ? 'Banning...' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentManagement;
