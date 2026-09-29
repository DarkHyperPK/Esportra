import type { Dispatch, SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS, InlineNotice } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { StageList } from './StageList';
import { StageFormatFields } from './StageFormatFields';
import { ManualAdvancementFields } from './ManualAdvancementFields';
import {
    DEFAULT_STAGE_CONFIG,
    commitStage,
    formatsTooSmallFor,
    getFormatTransitionWarning,
    validateStageConfig,
    type StageConfig,
} from './stageSetupRules';

interface ManualStageStepProps {
    stages: StageConfig[];
    setStages: (stages: StageConfig[]) => void;
    form: StageConfig;
    setForm: Dispatch<SetStateAction<StageConfig>>;
    editingIndex: number | null;
    setEditingIndex: (index: number | null) => void;
    onRemove: (index: number) => void;
    participantsCount: number;
    tournamentMax: number | null;
    seriesOptions: { label: string; value: number }[];
    onInvalid: (title: string, description?: string) => void;
}

/** Building stages by hand: the list so far, then one form to add or edit. */
export function ManualStageStep({
    stages, setStages, form, setForm, editingIndex, setEditingIndex, onRemove,
    participantsCount, tournamentMax, seriesOptions, onInvalid,
}: ManualStageStepProps) {
    const isEditing = editingIndex !== null;
    const prevStage = isEditing ? stages[editingIndex - 1] : stages[stages.length - 1];
    const transitionWarning = getFormatTransitionWarning(prevStage?.format, form.format);

    const reset = () => {
        setEditingIndex(null);
        setForm({ ...DEFAULT_STAGE_CONFIG });
    };

    const commit = () => {
        if (!form.name.trim()) {
            onInvalid('Give this stage a name', 'Players see it on the bracket, e.g. “Group stage” or “Playoffs”.');
            return;
        }
        const validation = validateStageConfig(form, participantsCount, tournamentMax);
        if (!validation.valid) {
            onInvalid('This stage won’t work yet', validation.error);
            return;
        }
        setStages(commitStage(stages, form, editingIndex));
        reset();
    };

    const heading = isEditing
        ? `Edit stage ${editingIndex + 1}`
        : stages.length === 0 ? 'Add your first stage' : 'Add the next stage';

    return (
        <div className="space-y-8">
            <StageList
                stages={stages}
                editingIndex={editingIndex}
                onEdit={(i) => {
                    setEditingIndex(i);
                    setForm(stages[i]);
                }}
                onRemove={onRemove}
            />

            <section
                aria-label={heading}
                className={cn(
                    'p-5 sm:p-6',
                    isEditing
                        ? 'bg-rose-500/[0.04] shadow-[inset_0_0_0_1px_rgba(244,63,94,0.35)]'
                        : 'bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
                )}
            >
                <p className={cn(EYEBROW_CLASS, 'mb-6', isEditing && 'text-rose-300')}>{heading}</p>
                <StageFormatFields
                    stage={form}
                    onFieldChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
                    seriesOptions={seriesOptions}
                    disabledFormats={formatsTooSmallFor(form.capacity)}
                    advancement={
                        <ManualAdvancementFields
                            stages={stages}
                            form={form}
                            setForm={setForm}
                            editingIndex={editingIndex}
                            tournamentMax={tournamentMax}
                            participantsCount={participantsCount}
                        />
                    }
                />
                {transitionWarning && (
                    <InlineNotice tone="warning" className="mb-5">{transitionWarning} You can still use it.</InlineNotice>
                )}
                <div className="flex justify-end gap-2">
                    {isEditing && <CommandButton variant="ghost" size="sm" onClick={reset}>Cancel</CommandButton>}
                    <CommandButton variant="secondary" size="sm" onClick={commit}>
                        {isEditing ? 'Save stage' : <><Plus className="mr-2 h-4 w-4" aria-hidden /> Add stage</>}
                    </CommandButton>
                </div>
            </section>
        </div>
    );
}
