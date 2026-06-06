import React from 'react';
import { Ban, CheckCircle2, Shield as ShieldIcon, Sword } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';
import { Skeleton } from '@/components/ui/skeleton';

interface VetoHistoryTimelineProps {
    entries: VetoHistoryEntry[];
    loading?: boolean;
    compact?: boolean;
    emptyMessage?: string;
}

const actionLabel = (entry: VetoHistoryEntry) => {
    switch (entry.action) {
        case 'ban':
            return 'banned';
        case 'pick':
            return 'picked';
        case 'pick_side':
            return entry.side ? `chose ${entry.side}` : 'chose side';
        case 'auto_decider':
            return 'decider';
        default:
            return entry.action;
    }
};

const actionIcon = (entry: VetoHistoryEntry) => {
    if (entry.action === 'ban') return <Ban className="h-3.5 w-3.5" />;
    if (entry.action === 'pick_side' && entry.side === 'attack') return <Sword className="h-3.5 w-3.5" />;
    if (entry.action === 'pick_side' && entry.side === 'defend') return <ShieldIcon className="h-3.5 w-3.5" />;
    return <CheckCircle2 className="h-3.5 w-3.5" />;
};

export const VetoHistoryTimeline: React.FC<VetoHistoryTimelineProps> = ({
    entries,
    loading = false,
    compact = false,
    emptyMessage = 'No veto actions recorded yet.',
}) => {
    if (loading) {
        return (
            <div className="space-y-3" data-testid="veto-history-timeline-loading">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full bg-white/10" />
                ))}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <p className="text-sm text-gray-500 py-4 text-center" data-testid="veto-history-empty">
                {emptyMessage}
            </p>
        );
    }

    return (
        <div className={cn('relative', compact ? 'space-y-2' : 'space-y-3')} data-testid="veto-history-timeline">
            <div className="absolute left-[1.15rem] top-2 bottom-2 w-px bg-white/10" aria-hidden />
            {entries.map((entry) => {
                const imageUrl = entry.mapImageUrl || undefined;
                return (
                    <div
                        key={`${entry.actionNumber}-${entry.mapId}-${entry.action}`}
                        className={cn(
                            'relative flex items-start gap-3 rounded-lg border border-white/10 bg-black/30',
                            compact ? 'p-2' : 'p-3',
                        )}
                    >
                        <div
                            className={cn(
                                'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-white',
                                entry.action === 'ban'
                                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                                    : entry.action === 'pick_side'
                                        ? entry.side === 'attack'
                                            ? 'border-orange-500/50 bg-orange-500/20 text-orange-300'
                                            : 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                                        : 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300',
                            )}
                        >
                            {actionIcon(entry)}
                        </div>

                        {imageUrl && (
                            <div
                                className={cn(
                                    'shrink-0 rounded-md border border-white/10 bg-cover bg-center',
                                    compact ? 'h-10 w-16' : 'h-12 w-20',
                                )}
                                style={{ backgroundImage: `url(${imageUrl})` }}
                                role="img"
                                aria-label={entry.mapName}
                            />
                        )}

                        <div className="min-w-0 flex-1">
                            <p className={cn('font-semibold text-white', compact ? 'text-xs' : 'text-sm')}>
                                <span className="text-white/70">#{entry.actionNumber}</span>{' '}
                                {entry.teamName}{' '}
                                <span className="text-white/60">{actionLabel(entry)}</span>{' '}
                                <span className="text-rose-300">{entry.mapName}</span>
                            </p>
                            {!compact && (
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    {new Date(entry.createdAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VetoHistoryTimeline;
