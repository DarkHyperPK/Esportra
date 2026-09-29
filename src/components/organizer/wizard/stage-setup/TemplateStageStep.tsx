import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTROL_CLASS, Field } from '@/components/ui/kit';
import { FirstStageCapacityNote } from './FirstStageCapacityNote';
import { StageFormatFields } from './StageFormatFields';
import { getAdvancementOptions, type StageConfig, type StageFieldChange } from './stageSetupRules';

interface TemplateStageStepProps {
    stages: StageConfig[];
    index: number;
    tournamentMax: number | null;
    seriesOptions: { label: string; value: number }[];
    onFieldChange: StageFieldChange;
}

const numberOrEmpty = (raw: string): number | '' => (raw === '' ? '' : Number(raw));
const PICKS_POWER_OF_TWO = ['swiss', 'single_elimination', 'double_elimination'];

/** Tuning one stage of a template. Capacity follows the previous stage's places. */
export function TemplateStageStep({ stages, index, tournamentMax, seriesOptions, onFieldChange }: TemplateStageStepProps) {
    const id = useId();
    const stage = stages[index];
    const prev = index > 0 ? stages[index - 1] : null;
    const isLinked = Boolean(prev && prev.advancement_count !== '' && prev.advancement_count !== null);
    const isLast = index === stages.length - 1;
    const advHint = isLast
        ? 'This is the final stage, so nobody moves on.'
        : PICKS_POWER_OF_TWO.includes(stage.format)
            ? 'A power of 2 (2, 4, 8…), fewer than the teams in this stage.'
            : 'Fewer than the teams in this stage.';

    const capacity = index === 0 ? (
        <FirstStageCapacityNote max={tournamentMax} />
    ) : (
        <Field
            label="Teams in this stage"
            htmlFor={`${id}-cap`}
            hint={isLinked && prev ? `Set by the top ${prev.advancement_count} from ${prev.name}.` : 'Leave empty to take everyone still in.'}
        >
            <Input
                id={`${id}-cap`}
                type="number"
                min={2}
                value={isLinked && prev ? prev.advancement_count : stage.capacity}
                placeholder="Everyone still in"
                disabled={isLinked}
                onChange={(e) => onFieldChange('capacity', numberOrEmpty(e.target.value))}
                className={CONTROL_CLASS}
            />
        </Field>
    );

    const advancement = (
        <Field label="Teams moving on" htmlFor={`${id}-adv`} hint={advHint}>
            {PICKS_POWER_OF_TWO.includes(stage.format) ? (
                <Select value={String(stage.advancement_count || '')} onValueChange={(val) => onFieldChange('advancement_count', Number(val))} disabled={isLast}>
                    <SelectTrigger id={`${id}-adv`} className={CONTROL_CLASS}><SelectValue placeholder={isLast ? 'None, final stage' : 'Choose'} /></SelectTrigger>
                    <SelectContent>
                        {getAdvancementOptions(typeof stage.capacity === 'number' ? stage.capacity : (tournamentMax || 256)).map((opt) => (
                            <SelectItem key={opt} value={String(opt)}>Top {opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : (
                <Input
                    id={`${id}-adv`}
                    type="number"
                    min={1}
                    value={stage.advancement_count}
                    placeholder="None"
                    disabled={isLast}
                    onChange={(e) => onFieldChange('advancement_count', numberOrEmpty(e.target.value))}
                    className={CONTROL_CLASS}
                />
            )}
        </Field>
    );

    return (
        <StageFormatFields
            stage={stage}
            onFieldChange={onFieldChange}
            seriesOptions={seriesOptions}
            advancement={<>{capacity}{advancement}</>}
        />
    );
}
