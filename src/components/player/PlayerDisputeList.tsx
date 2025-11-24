import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PlayerDispute {
  id: string;
  title: string;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface PlayerDisputeListProps {
  tournamentId: string;
  userId: string;
  onStatsChange?: (stats: { total: number; open: number; awaiting: number }) => void;
}

const statusMeta: Record<PlayerDispute['status'], { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40', icon: Clock },
  in_review: { label: 'In review', className: 'bg-blue-500/15 text-blue-300 border-blue-500/40', icon: MessageSquare },
  resolved: { label: 'Resolved', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
};

const PlayerDisputeList: React.FC<PlayerDisputeListProps> = ({ tournamentId, userId, onStatsChange }) => {
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<PlayerDispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async () => {
    if (!tournamentId || !userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournament_disputes')
        .select('id, title, status, resolution_notes, created_at, updated_at')
        .eq('tournament_id', tournamentId)
        .eq('raised_by_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as PlayerDispute[];
      setDisputes(rows);

      if (onStatsChange) {
        const openCount = rows.filter((d) => d.status === 'open').length;
        const awaitingCount = rows.filter((d) => d.status === 'in_review').length;
        onStatsChange({ total: rows.length, open: openCount, awaiting: awaitingCount });
      }
    } catch (error: any) {
      console.error('Error loading disputes', error);
      toast({
        title: 'Unable to load disputes',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [tournamentId, userId]);

  useEffect(() => {
    if (!tournamentId || !userId) return;
    const channel = supabase
      .channel(`player-disputes-${tournamentId}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_disputes',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          const newRow: any = payload.new;
          if (!newRow || newRow.raised_by_user_id !== userId) return;
          fetchDisputes();
          if (payload.eventType === 'UPDATE') {
            toast({
              title: 'Dispute updated',
              description: `Your dispute "${newRow.title}" is now ${newRow.status.replace('_', ' ')}.`,
            });
          } else if (payload.eventType === 'INSERT') {
            toast({
              title: 'Dispute submitted',
              description: `We received your dispute "${newRow.title}".`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tournamentId, userId]);

  const statsCard = useMemo(() => {
    if (disputes.length === 0) return null;
    const open = disputes.filter((d) => d.status === 'open').length;
    const inReview = disputes.filter((d) => d.status === 'in_review').length;
    const resolved = disputes.filter((d) => d.status === 'resolved' || d.status === 'rejected').length;
    const statItems = [
      { label: 'Open', value: open, color: 'text-yellow-400' },
      { label: 'In review', value: inReview, color: 'text-blue-300' },
      { label: 'Closed', value: resolved, color: 'text-gray-300' },
    ];
    return (
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        {statItems.map((item) => (
          <div key={item.label} className="bg-gray-800/60 rounded-lg py-2 border border-gray-800">
            <p className={`${item.color} text-lg font-semibold`}>{item.value}</p>
            <p className="text-xs text-gray-400">{item.label}</p>
          </div>
        ))}
      </div>
    );
  }, [disputes]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading disputes…
        </div>
      );
    }
    if (disputes.length === 0) {
      return <p className="text-gray-400 text-sm">You haven’t opened any disputes yet.</p>;
    }
    return (
      <div className="space-y-3">
        {disputes.map((dispute) => {
          const meta = statusMeta[dispute.status];
          const Icon = meta.icon;
          return (
            <div
              key={dispute.id}
              className="border border-gray-800 rounded-xl p-4 bg-gray-900/40"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold">{dispute.title}</p>
                    <p className="text-xs text-gray-400">
                      Raised {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge className={`${meta.className} flex items-center gap-1 border`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Last updated {formatDistanceToNow(new Date(dispute.updated_at), { addSuffix: true })}
                </div>
              </div>
              {dispute.resolution_notes && dispute.status !== 'open' && (
                <div className="mt-3 rounded-lg bg-gray-800/60 border border-gray-800 p-3 text-xs text-gray-300">
                  Organizer notes: {dispute.resolution_notes}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [disputes, loading]);

  return (
    <Card className="bg-gray-900 border border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            Your disputes
          </CardTitle>
          {disputes.length > 0 && (
            <span className="text-xs text-gray-400">
              Updated {formatDistanceToNow(new Date(disputes[0].updated_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {statsCard}
        {content}
      </CardContent>
    </Card>
  );
};

export default PlayerDisputeList;

