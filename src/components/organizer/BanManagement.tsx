import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ban, Shield, User, Users, Calendar, AlertTriangle, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BanRecord {
  id: string;
  tournament_id: string;
  user_id: string | null;
  team_id: string | null;
  participant_id: string | null;
  ban_reason: string;
  banned_by: string;
  banned_at: string;
  is_active: boolean;
  user_name?: string;
  team_name?: string;
  banned_by_name?: string;
}

interface BanManagementProps {
  tournamentId: string;
}

const BanManagement: React.FC<BanManagementProps> = ({ tournamentId }) => {
  const { toast } = useToast();
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [selectedBan, setSelectedBan] = useState<BanRecord | null>(null);

  useEffect(() => {
    if (tournamentId) {
      fetchBans();
    }
  }, [tournamentId]);

  const fetchBans = async () => {
    try {
      setLoading(true);
      const { data: bansData, error } = await supabase
        .from('tournament_bans')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('banned_at', { ascending: false });

      if (error) throw error;

      // Enrich with user/team names
      const enriched = await Promise.all(
        (bansData || []).map(async (ban: any) => {
          const enrichedBan: BanRecord = { ...ban };
          
          if (ban.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, full_name')
              .eq('id', ban.user_id)
              .maybeSingle();
            enrichedBan.user_name = profile?.username || profile?.full_name || 'Unknown User';
          }
          
          if (ban.team_id) {
            const { data: team } = await supabase
              .from('teams')
              .select('name')
              .eq('id', ban.team_id)
              .maybeSingle();
            enrichedBan.team_name = team?.name || 'Unknown Team';
          }
          
          const { data: bannedBy } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', ban.banned_by)
            .maybeSingle();
          enrichedBan.banned_by_name = bannedBy?.username || bannedBy?.full_name || 'Unknown';

          return enrichedBan;
        })
      );

      setBans(enriched);
    } catch (error: any) {
      console.error('Error fetching bans:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!selectedBan) return;

    try {
      const { error } = await supabase
        .from('tournament_bans')
        .update({ is_active: false })
        .eq('id', selectedBan.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ban has been lifted.',
      });

      setUnbanDialogOpen(false);
      setSelectedBan(null);
      fetchBans();
    } catch (error: any) {
      console.error('Error lifting ban:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to lift ban',
        variant: 'destructive',
      });
    }
  };

  const activeBans = bans.filter(b => b.is_active);
  const inactiveBans = bans.filter(b => !b.is_active);

  return (
    <div className="space-y-6">
      <Card className="bg-gaming-dark border-gaming-gray/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Ban Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-gray-400">Loading bans...</div>
          ) : (
            <div className="space-y-6">
              {/* Active Bans */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-500" />
                  Active Bans ({activeBans.length})
                </h3>
                {activeBans.length === 0 ? (
                  <div className="text-gray-400 p-4 bg-gaming-gray/10 rounded-lg">
                    No active bans for this tournament.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeBans.map((ban) => (
                      <Card key={ban.id} className="bg-gaming-gray/20 border-red-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {ban.team_id ? (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-400" />
                                    <span className="font-semibold">{ban.team_name || 'Unknown Team'}</span>
                                    <Badge variant="outline" className="border-gray-500">Team</Badge>
                                  </div>
                                ) : ban.user_id ? (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="font-semibold">{ban.user_name || 'Unknown User'}</span>
                                    <Badge variant="outline" className="border-gray-500">Player</Badge>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                                    <span className="font-semibold text-gray-400">Unknown Participant</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-400 space-y-1">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span><strong>Reason:</strong> {ban.ban_reason}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>Banned on {new Date(ban.banned_at).toLocaleDateString()} by {ban.banned_by_name}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBan(ban);
                                setUnbanDialogOpen(true);
                              }}
                              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Lift Ban
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive Bans (History) */}
              {inactiveBans.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-400">Ban History ({inactiveBans.length})</h3>
                  <div className="space-y-3">
                    {inactiveBans.map((ban) => (
                      <Card key={ban.id} className="bg-gaming-gray/10 border-gray-700/50 opacity-60">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {ban.team_id ? (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-400">{ban.team_name || 'Unknown Team'}</span>
                                    <Badge variant="outline" className="border-gray-600 text-gray-500">Team</Badge>
                                  </div>
                                ) : ban.user_id ? (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-400">{ban.user_name || 'Unknown User'}</span>
                                    <Badge variant="outline" className="border-gray-600 text-gray-500">Player</Badge>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-400">Unknown Participant</span>
                                  </div>
                                )}
                                <Badge className="bg-green-600/20 text-green-400 border-green-500/30">Lifted</Badge>
                              </div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <div><strong>Reason:</strong> {ban.ban_reason}</div>
                                <div>Banned on {new Date(ban.banned_at).toLocaleDateString()} by {ban.banned_by_name}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unban Dialog */}
      <AlertDialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <AlertDialogContent className="bg-gaming-dark border-gaming-gray/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Lift Ban</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to lift the ban for{' '}
              <strong>{selectedBan?.user_name || selectedBan?.team_name}</strong>? 
              They will be able to register for this tournament again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnban}
              className="bg-green-600 hover:bg-green-700"
            >
              Lift Ban
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BanManagement;

