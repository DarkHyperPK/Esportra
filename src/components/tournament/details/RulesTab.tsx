import React from 'react';

interface RulesTabProps {
    rules?: string | null;
}

export const RulesTab: React.FC<RulesTabProps> = ({ rules }) => {
    const hasCustomRules = rules && rules.trim().length > 0;

    return (
        <div className="max-w-4xl mx-auto p-12 rounded-2xl bg-[#121214] border border-zinc-800/50">
            <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4">Official Regulations</h3>
            <div className="space-y-4 text-gray-400 leading-relaxed whitespace-pre-wrap">
                {hasCustomRules ? (
                    <p>{rules}</p>
                ) : (
                    <p className="text-zinc-500 italic">No rules have been set for this tournament.</p>
                )}
            </div>
        </div>
    );
};
