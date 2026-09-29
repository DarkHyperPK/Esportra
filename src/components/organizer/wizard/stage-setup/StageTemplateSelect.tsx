import { Fragment } from 'react';
import { ChoiceCard } from '@/components/ui/kit';
import type { StageTemplate } from '@/data/recommended_templates';
import { formatLabel } from './stageSetupRules';

interface StageTemplateSelectProps {
    templates: StageTemplate[];
    selectedId: string | null;
    onSelect: (templateId: string) => void;
}

/** Templates as cards; the stage chain shows what you'll get before you pick. */
export function StageTemplateSelect({ templates, selectedId, onSelect }: StageTemplateSelectProps) {
    return (
        <div className="grid gap-3 py-2 md:grid-cols-2">
            {templates.map((template) => (
                <ChoiceCard
                    key={template.id}
                    mode="action"
                    selected={selectedId === template.id}
                    onSelect={() => onSelect(template.id)}
                    title={template.name}
                    description={template.description}
                    meta={
                        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-400">
                            {template.stages.map((s, i) => (
                                <Fragment key={`${s.name}-${i}`}>
                                    {i > 0 && <span aria-hidden className="text-zinc-600">→</span>}
                                    <span>
                                        {s.name} <span className="text-zinc-600">· {formatLabel(s.format)}</span>
                                    </span>
                                </Fragment>
                            ))}
                        </span>
                    }
                />
            ))}
        </div>
    );
}
