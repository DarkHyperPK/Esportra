import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';
import { HubConnectionState } from '@microsoft/signalr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PlayerDispute {
  id: string;
  title: string;
  status: 'open' | 'resolved' | 'rejected';
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
  resolved: { label: 'Closed', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Closed', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
};

const PlayerDisputeList: React.FC<PlayerDisputeListProps> = ({ tournamentId, userId, onStatsChange }) => {
  const { toast } = useToast();
  const conn = useHub(HubPaths.Match);
  const [disputes, setDisputes] = useState<PlayerDispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async () => {
    if (!tournamentId || !userId) return;
    try {
      setLoading(true);
      const data = await apiClient.get<PlayerDispute[]>(
        `/api/matches/${tournamentId}/dispute?userId=${userId}`
      );
      const rows = (data || []) as PlayerDispute[];
      setDisputes(rows);

      if (onStatsChange) {
        const openCount = rows.filter((d) => d.status === 'open').length;
        onStatsChange({ total: rows.length, open: openCount, awaiting: 0 });
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

  // SignalR subscription for dispute events (replaces Supabase realtime)
  useEffect(() => {
    if (!tournamentId || !userId) return;

    let active = true;

    const handleDisputeResolved = (payload: { matchId?: string; disputeId?: string }) => {
      if (!active) return;
      fetchDisputes();
      toast({ title: 'Dispute updated', description: 'A dispute status has changed.' });
    };

    const handleReportDisputed = (payload: { matchId?: string }) => {
      if (!active) return;
      fetchDisputes();
      toast({ title: 'Dispute submitted', description: 'A new dispute has been filed.' });
    };

    conn.on('DisputeResolved', handleDisputeResolved);
    conn.on('ReportDisputed', handleReportDisputed);

    return () => {
      active = false;
      conn.off('DisputeResolved', handleDisputeResolved);
      conn.off('ReportDisputed', handleReportDisputed);
    };
  }, [tournamentId, userId, conn]); // eslint-disable-line react-hooks/exhaustive-deps

  const statsCard = useMemo(() => {
    if (disputes.length === 0) return null;
    const open = disputes.filter((d) => d.status === 'open').length;
    const closed = disputes.filter((d) => d.status === 'resolved' || d.status === 'rejected').length;
    const statItems = [
      { label: 'Open', value: open, color: 'text-yellow-400' },
      { label: 'Closed', value: closed, color: 'text-gray-300' },
    ];
    return (
      <div className="grid grid-cols-2 gap-2 text-center mb-4">
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

