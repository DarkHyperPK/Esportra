import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RulesTabProps {
    rules?: string | null;
}

export const RulesTab: React.FC<RulesTabProps> = ({ rules }) => {
    const hasCustomRules = rules && rules.trim().length > 0;

    return (
        <div className="max-w-4xl mx-auto p-12 rounded-2xl bg-[#121214] border border-zinc-800/50">
            <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4">Official Regulations</h3>
            {hasCustomRules ? (
                <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:font-semibold prose-headings:text-white
                    prose-p:text-zinc-400 prose-p:leading-relaxed
                    prose-strong:text-zinc-200
                    prose-li:text-zinc-400
                    prose-hr:border-zinc-700
                    prose-table:w-full
                    prose-th:text-zinc-300 prose-th:font-semibold prose-th:border prose-th:border-zinc-700 prose-th:px-3 prose-th:py-2 prose-th:bg-zinc-800/60
                    prose-td:text-zinc-400 prose-td:border prose-td:border-zinc-700/60 prose-td:px-3 prose-td:py-2
                    prose-tr:even:bg-zinc-800/20
                    prose-code:bg-zinc-800 prose-code:text-zinc-300 prose-code:rounded prose-code:px-1
                ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {rules}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className="text-zinc-500 italic">No rules have been set for this tournament.</p>
            )}
        </div>
    );
};
