import React from 'react';
import PublicBracketView from '@/pages/tournaments/brackets/PublicBracketView';

interface BracketsTabProps {
    tournamentId: string;
    stages: any[];
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
                <div className="aspect-video w-full rounded-2xl bg-[#121214] border border-white/10 flex items-center justify-center overflow-hidden relative group">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
                    <p className="text-gray-500 font-mono text-sm tracking-widest z-10">NO_BRACKETS_PUBLISHED</p>
                </div>
            ) : (
                <div className="min-h-[600px] w-full bg-[#121214] border border-white/10 rounded-2xl overflow-hidden relative">
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
