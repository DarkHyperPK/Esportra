import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';
import { HubConnectionState } from '@microsoft/signalr';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PlayerDispute {
  id: string;
  title: string;
  status: string;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface PlayerDisputeListProps {
  tournamentId: string;
  userId: string;
  onStatsChange?: (stats: { total: number; open: number; awaiting: number }) => void;
}

const defaultMeta = { label: 'Unknown', className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40', icon: Clock, borderColor: 'border-l-zinc-500' };
const statusMeta: Record<string, { label: string; className: string; icon: React.ElementType; borderColor: string }> = {
  open: { label: 'Open', className: 'bg-amber-500/15 text-amber-300 border-amber-500/40', icon: Clock, borderColor: 'border-l-amber-500' },
  in_review: { label: 'In Review', className: 'bg-blue-500/15 text-blue-300 border-blue-500/40', icon: Clock, borderColor: 'border-l-blue-500' },
  resolved: { label: 'Closed', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', icon: CheckCircle, borderColor: 'border-l-emerald-500' },
  rejected: { label: 'Closed', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle, borderColor: 'border-l-red-500' },
  closed: { label: 'Closed', className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40', icon: CheckCircle, borderColor: 'border-l-zinc-500' },
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
      { label: 'Open', value: open, color: 'text-amber-400', dot: 'bg-amber-400' },
      { label: 'Closed', value: closed, color: 'text-zinc-300', dot: 'bg-zinc-500' },
    ];
    return (
      <div className="flex items-center gap-3 mb-4">
        {statItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm">
            <span className={`w-2 h-2 rounded-full ${item.dot}`} />
            <span className="text-zinc-400 text-xs">{item.label}</span>
            <span className={`${item.color} font-semibold font-mono`}>{item.value}</span>
          </div>
        ))}
      </div>
    );
  }, [disputes]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
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
          const meta = statusMeta[dispute.status] || defaultMeta;
          const Icon = meta.icon;
          return (
            <div
              key={dispute.id}
              className={`border border-white/[0.06] rounded-xl p-4 bg-white/[0.02] border-l-[3px] ${meta.borderColor}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold">{dispute.title}</p>
                    <p className="text-xs text-zinc-500">
                      Raised {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge className={`${meta.className} flex items-center gap-1 border`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Last updated {formatDistanceToNow(new Date(dispute.updated_at), { addSuffix: true })}
                </div>
              </div>
              {dispute.resolution_notes && dispute.status !== 'open' && (
                <div className="mt-3 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-zinc-300">
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
    <div className="bg-[#0a0a0c] border border-white/[0.06] rounded-2xl">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-base font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rose-400" />
            Your disputes
          </h3>
          {disputes.length > 0 && (
            <span className="text-xs text-zinc-500">
              Updated {formatDistanceToNow(new Date(disputes[0].updated_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <div className="p-5">
        {statsCard}
        {content}
      </div>
    </div>
  );
};

export default PlayerDisputeList;

