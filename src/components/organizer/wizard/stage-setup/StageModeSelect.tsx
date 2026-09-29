import { LayoutTemplate, SlidersHorizontal } from 'lucide-react';
import { ChoiceCard, HINT_CLASS } from '@/components/ui/kit';

interface StageModeSelectProps {
    onTemplates: () => void;
    onManual: () => void;
}

/** First screen: two clear paths, the faster one first. */
export function StageModeSelect({ onTemplates, onManual }: StageModeSelectProps) {
    return (
        <div className="grid gap-3 py-2 md:grid-cols-2">
            <ChoiceCard
                mode="action"
                layout="stack"
                selected={false}
                onSelect={onTemplates}
                badge="Fastest"
                icon={<LayoutTemplate className="h-6 w-6" aria-hidden />}
                title="Start from a template"
                description="Pick a proven structure such as groups then playoffs. We fill in sizes and who moves on; you adjust anything."
                meta={<span className={HINT_CLASS}>About a minute</span>}
            />
            <ChoiceCard
                mode="action"
                layout="stack"
                selected={false}
                onSelect={onManual}
                icon={<SlidersHorizontal className="h-6 w-6" aria-hidden />}
                title="Build it yourself"
                description="Add stages one at a time and choose each format. Best for unusual events or mixing formats."
                meta={<span className={HINT_CLASS}>Full control</span>}
            />
        </div>
    );
}
