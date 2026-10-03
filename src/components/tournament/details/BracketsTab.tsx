import React from 'react';
import type { BracketStageSummary } from '@/hooks/useTournamentBracketSource';
import PublicBracketView from '@/pages/tournaments/brackets/PublicBracketView';
import { BracketEmptyState } from '@/components/bracket/BracketEmptyState';

interface BracketsTabProps {
    tournamentId: string;
    stages: BracketStageSummary[];
    selectedStageId: string | null;
    activeVersionsMap: Record<string, string>;
    onStageSelect: (stageId: string) => void;
}

export const BracketsTab: React.FC<BracketsTabProps> = ({
    tournamentId,
    stages,
    selectedStageId,
    activeVersionsMap,
    onStageSelect
}) => {
    return (
        <>
            {stages.length === 0 ? (
                <div className="border border-white/[0.07] bg-background">
                    <BracketEmptyState message="It appears here when the organizer publishes the first stage." />
                </div>
            ) : (
                <div className="w-full overflow-clip border border-white/[0.07] bg-background">
                    <PublicBracketView
                        versionId={selectedStageId ? activeVersionsMap[selectedStageId] : null}
                        tournamentId={tournamentId}
                        stages={stages}
                        selectedStageId={selectedStageId}
                        onStageSelect={onStageSelect}
                        versionsMap={activeVersionsMap}
                    />
                </div>
            )}
        </>
    );
};
