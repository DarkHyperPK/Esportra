import { useState } from 'react';
import { useEntityHistory } from '@/hooks/useAdminQueries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock, User, Shield, AlertTriangle, CheckCircle,
  XCircle, Pencil, Trash2, Ban, UserCheck, Star,
  ChevronLeft, ChevronRight, Loader2, History,
  type LucideIcon
} from 'lucide-react';

interface Props {
  targetType: string;
  targetId: string;
}

const actionConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  create: { icon: CheckCircle, color: 'text-green-500', label: 'Created' },
  update: { icon: Pencil, color: 'text-blue-400', label: 'Updated' },
  delete: { icon: Trash2, color: 'text-red-500', label: 'Deleted' },
  approve: { icon: CheckCircle, color: 'text-green-500', label: 'Approved' },
  reject: { icon: XCircle, color: 'text-red-500', label: 'Rejected' },
  cancel: { icon: XCircle, color: 'text-amber-500', label: 'Cancelled' },
  suspend: { icon: Ban, color: 'text-red-500', label: 'Suspended' },
  unsuspend: { icon: UserCheck, color: 'text-green-500', label: 'Unsuspended' },
  ban: { icon: Ban, color: 'text-red-600', label: 'Banned' },
  unban: { icon: UserCheck, color: 'text-green-500', label: 'Unbanned' },
  verify: { icon: Shield, color: 'text-blue-500', label: 'Verified' },
  unverify: { icon: Shield, color: 'text-zinc-500', label: 'Unverified' },
  resolve: { icon: CheckCircle, color: 'text-green-500', label: 'Resolved' },
  escalate: { icon: AlertTriangle, color: 'text-amber-500', label: 'Escalated' },
  feature: { icon: Star, color: 'text-amber-400', label: 'Featured' },
  unfeature: { icon: Star, color: 'text-zinc-500', label: 'Unfeatured' },
  rolechange: { icon: Shield, color: 'text-purple-400', label: 'Role Changed' },
};

export default function EntityHistoryTimeline({ targetType, targetId }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useEntityHistory(targetType, targetId, page);

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.limit ?? 15;
  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getConfig = (actionType: string) => {
    return actionConfig[actionType.toLowerCase()] || { icon: Clock, color: 'text-zinc-400', label: actionType };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-zinc-400">Failed to load history</p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2 text-rose-400">
          Retry
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">No changes recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-zinc-800" />

        {entries.map((entry) => {
          const config = getConfig(entry.action_type);
          const Icon = config.icon;
          const details = entry.details && typeof entry.details === 'object' ? entry.details : null;

          return (
            <div key={entry.id} className="relative flex items-start gap-4 py-3 px-1">
              {/* Icon */}
              <div className="relative z-10 w-10 h-10 rounded-full bg-[#121214] border border-zinc-800 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-700 text-zinc-300">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-zinc-500">{formatDate(entry.created_at)}</span>
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  <User className="w-3 h-3 text-zinc-600" />
                  <span className="text-xs text-zinc-400">
                    {entry.admin_name || 'System'}
                  </span>
                </div>

                {/* Details */}
                {details && Object.keys(details).length > 0 && (
                  <div className="mt-2 p-2 bg-[#0a0a0c] border border-zinc-800/50 rounded-lg">
                    {Object.entries(details).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2 text-xs py-0.5">
                        <span className="text-zinc-600 font-mono min-w-[80px]">{key}:</span>
                        <span className="text-zinc-400 break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <span className="text-xs text-zinc-500">
            {total} change{total !== 1 ? 's' : ''} total
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 w-7 p-0 border-zinc-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-zinc-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-7 w-7 p-0 border-zinc-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
