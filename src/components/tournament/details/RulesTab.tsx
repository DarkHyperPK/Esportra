import React from 'react';

export const RulesTab: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto p-12 rounded-2xl bg-[#121214] border border-zinc-800/50">
            <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4">Official Regulations</h3>
            <div className="space-y-6 text-gray-400 leading-relaxed">
                <p>1. All participants must execute check-in procedures within the designated window.</p>
                <p>2. Unauthorized hardware or software manipulation will result in immediate termination.</p>
                <p>3. Match disputes must be filed with evidence (replay/screenshot) within 5 minutes of completion.</p>
                <p>4. Respectful communication is mandatory. Toxicity protocols are active.</p>
            </div>
        </div>
    );
};
