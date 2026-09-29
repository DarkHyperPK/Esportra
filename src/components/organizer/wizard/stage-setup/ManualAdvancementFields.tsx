import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTROL_CLASS, Field } from '@/components/ui/kit';
import { FirstStageCapacityNote } from './FirstStageCapacityNote';
import { calculateSwissConfig, getAdvancementOptions, swissRoundsFor, type StageConfig } from './stageSetupRules';

interface ManualAdvancementFieldsProps {
    stages: StageConfig[];
    form: StageConfig;
    setForm: (form: StageConfig) => void;
    editingIndex: number | null;
    tournamentMax: number | null;
    participantsCount: number;
}

/** "Who moves on" for a stage built by hand. */
export function ManualAdvancementFields({ stages, form, setForm, editingIndex, tournamentMax, participantsCount }: ManualAdvancementFieldsProps) {
    const id = useId();
    const isFirstStage = editingIndex === 0 || (editingIndex === null && stages.length === 0);
    const prevIdx = editingIndex !== null ? editingIndex - 1 : stages.length - 1;
    const prev = prevIdx >= 0 ? stages[prevIdx] : null;
    const linkedFrom = !isFirstStage && prev?.advancement_count ? prev : null;
    // A new stage is last until another is added; only an edited final stage locks.
    const lockedAsFinal = editingIndex !== null && editingIndex === stages.length - 1;

    const setCapacity = (raw: string) => {
        const capacity: number | '' = raw === '' ? '' : Number(raw);
        let settings = { ...form.settings };
        if (form.format === 'swiss' && typeof capacity === 'number' && capacity > 0) {
            const groups = calculateSwissConfig(capacity, Number(form.advancement_count) || 0);
            settings = { ...settings, swiss_groups: groups, swiss_rounds: swissRoundsFor(capacity, groups) };
        }
        setForm({ ...form, capacity, settings });
    };

    const optionsFrom = typeof form.capacity === 'number' && form.capacity > 0 ? form.capacity : (tournamentMax ?? participantsCount);

    return (
        <>
            {isFirstStage ? (
                <FirstStageCapacityNote max={tournamentMax} />
            ) : (
                <Field
                    label="Teams in this stage"
                    htmlFor={`${id}-cap`}
                    hint={linkedFrom ? `Set by the top ${linkedFrom.advancement_count} from ${linkedFrom.name}.` : 'Leave empty to take everyone still in.'}
                >
                    <Input
                        id={`${id}-cap`}
                        type="number"
                        min={2}
                        value={linkedFrom ? linkedFrom.advancement_count : form.capacity}
                        placeholder="Everyone still in"
                        disabled={Boolean(linkedFrom)}
                        onChange={(e) => setCapacity(e.target.value)}
                        className={CONTROL_CLASS}
                    />
                </Field>
            )}
            <Field
                label="Teams moving on"
                htmlFor={`${id}-adv`}
                optional={!lockedAsFinal}
                hint={lockedAsFinal
                    ? 'This is the final stage. Add another stage after it to send teams on.'
                    : 'A power of 2 (2, 4, 8…), fewer than the teams in this stage. Leave empty for the final stage.'}
            >
                <Select
                    value={String(form.advancement_count || '')}
                    onValueChange={(val) => setForm({ ...form, advancement_count: Number(val) })}
                    disabled={lockedAsFinal}
                >
                    <SelectTrigger id={`${id}-adv`} className={CONTROL_CLASS}>
                        <SelectValue placeholder={lockedAsFinal ? 'None, final stage' : 'Choose'} />
                    </SelectTrigger>
                    <SelectContent>
                        {getAdvancementOptions(optionsFrom).map((opt) => (
                            <SelectItem key={opt} value={String(opt)}>Top {opt}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
        </>
    );
}
