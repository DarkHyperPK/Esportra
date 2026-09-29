import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { InlineNotice } from '@/components/ui/kit';

interface WizardStepFrameProps {
    title: string;
    description: string;
    /** Validation errors for this step, shown once at the top in plain words. */
    errorSummary?: string[];
    children: ReactNode;
}

/** Every wizard step: a title that asks the question, one sentence of context, then sections. */
export function WizardStepFrame({ title, description, errorSummary, children }: WizardStepFrameProps) {
    return (
        <motion.div
            className="mx-auto max-w-4xl"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
        >
            <div className="mb-5">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-white">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-400">{description}</p>
            </div>
            {errorSummary && errorSummary.length > 0 && (
                <InlineNotice tone="critical" title="Fix these to continue" className="mb-5">
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {errorSummary.map((message) => <li key={message}>{message}</li>)}
                    </ul>
                </InlineNotice>
            )}
            {children}
        </motion.div>
    );
}
