import { useId, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTROL_CLASS, Field, FormSection } from '@/components/ui/kit';
import { RoundBoConfigSection } from '../RoundBoConfigSection';
import { FORMAT_LABELS, type StageConfig, type StageFieldChange } from './stageSetupRules';

interface StageFormatFieldsProps {
    stage: StageConfig;
    onFieldChange: StageFieldChange;
    seriesOptions: { label: string; value: number }[];
    /** Formats that can't be picked right now, with the reason shown beside them. */
    disabledFormats?: Partial<Record<string, string>>;
    /** Capacity and advancement controls; their linking rules live with the caller. */
    advancement: ReactNode;
}

const FORMAT_HINTS: Record<string, string> = {
    single_elimination: 'Lose once and you’re out.',
    double_elimination: 'Everyone gets a second chance in a lower bracket.',
    round_robin: 'Everyone in a group plays everyone else once.',
    swiss: 'Teams on similar records play each other each round.',
};

const optionalNumber = (raw: string) => (raw === '' ? undefined : Number(raw));

/**
 * The stage form in three questions: what is it, who moves on, how long are
 * the series. Shared by template tuning and building by hand.
 */
export function StageFormatFields({ stage, onFieldChange, seriesOptions, disabledFormats = {}, advancement }: StageFormatFieldsProps) {
    const id = useId();
    const setSetting = (key: keyof NonNullable<StageConfig['settings']>, raw: string) =>
        onFieldChange('settings', { ...stage.settings, [key]: optionalNumber(raw) });

    return (
        <div>
            <FormSection title="The basics" className="py-6">
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Stage name" htmlFor={`${id}-name`}>
                        <Input id={`${id}-name`} value={stage.name} placeholder="e.g. Group stage" onChange={(e) => onFieldChange('name', e.target.value)} className={CONTROL_CLASS} />
                    </Field>
                    <Field label="Format" htmlFor={`${id}-format`} hint={FORMAT_HINTS[stage.format]}>
                        <Select value={stage.format} onValueChange={(val) => onFieldChange('format', val)}>
                            <SelectTrigger id={`${id}-format`} className={CONTROL_CLASS}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value} disabled={disabledFormats[value] !== undefined}>
                                        {label}{disabledFormats[value] ? ` (${disabledFormats[value]})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    {stage.format === 'swiss' && (
                        <>
                            <Field label="Groups" htmlFor={`${id}-sg`} optional hint="Split a large field into parallel Swiss groups.">
                                <Input id={`${id}-sg`} type="number" min={1} placeholder="1" value={stage.settings?.swiss_groups || ''} onChange={(e) => setSetting('swiss_groups', e.target.value)} className={CONTROL_CLASS} />
                            </Field>
                            <Field label="Rounds" htmlFor={`${id}-sr`} optional hint="Leave empty and we’ll pick enough rounds to find a clear top group.">
                                <Input id={`${id}-sr`} type="number" min={1} placeholder="Automatic" value={stage.settings?.swiss_rounds || ''} onChange={(e) => setSetting('swiss_rounds', e.target.value)} className={CONTROL_CLASS} />
                            </Field>
                        </>
                    )}
                    {stage.format === 'round_robin' && (
                        <Field label="Groups" htmlFor={`${id}-rg`} optional hint="Split the field into groups that each play a full round robin.">
                            <Input id={`${id}-rg`} type="number" min={1} placeholder="1" value={stage.settings?.group_count || ''} onChange={(e) => setSetting('group_count', e.target.value)} className={CONTROL_CLASS} />
                        </Field>
                    )}
                </div>
            </FormSection>

            <FormSection title="Who moves on" description="How many teams play in this stage, and how many carry on to the next." className="py-6">
                <div className="grid gap-5 md:grid-cols-2">{advancement}</div>
            </FormSection>

            <FormSection title="Series length" className="py-6">
                {stage.bo_mode !== 'per_round' && (
                    <Field label="Every match in this stage" htmlFor={`${id}-bo`}>
                        <Select value={String(stage.best_of)} onValueChange={(val) => onFieldChange('best_of', Number(val))}>
                            <SelectTrigger id={`${id}-bo`} className={`${CONTROL_CLASS} md:max-w-xs`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {seriesOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                )}
                <RoundBoConfigSection
                    format={stage.format}
                    bracketSize={typeof stage.capacity === 'number' && stage.capacity > 0 ? stage.capacity : 8}
                    boMode={stage.bo_mode}
                    defaultBestOf={stage.best_of}
                    roundBoOverrides={stage.round_bo_overrides}
                    seriesOptions={seriesOptions}
                    onBoModeChange={(mode) => onFieldChange('bo_mode', mode)}
                    onOverridesChange={(overrides) => onFieldChange('round_bo_overrides', overrides)}
                />
            </FormSection>
        </div>
    );
}
