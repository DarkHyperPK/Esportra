import React from 'react';
import type { VetoHistoryEntry } from '@/hooks/useVetoHistory';
import { VetoSequence } from './VetoSequence';

interface VetoHistoryTimelineProps {
    entries: VetoHistoryEntry[];
    loading?: boolean;
    compact?: boolean;
    columns?: boolean;
    emptyMessage?: string;
}

export const VetoHistoryTimeline: React.FC<VetoHistoryTimelineProps> = ({
    entries,
    loading = false,
    compact = false,
    columns = false,
    emptyMessage = 'No veto actions recorded yet.',
}) => (
    <VetoSequence
        entries={entries}
        loading={loading}
        bestOf={1}
        team1Name="Team 1"
        team2Name="Team 2"
        compact={compact}
        columns={columns}
        doneOnly
        emptyMessage={emptyMessage}
    />
);

export default VetoHistoryTimeline;
