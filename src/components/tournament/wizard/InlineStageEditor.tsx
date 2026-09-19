import React, { useState } from 'react';
import { Plus, Pencil, X, ChevronRight, Layers, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TournamentStage } from '@/types/tournamentWizard';
import { RoundBoConfigSection } from '@/components/organizer/wizard/RoundBoConfigSection';

const FORMAT_OPTIONS = [
    { value: 'single_elimination', label: 'Single Elimination', description: 'Lose once and you\'re out' },
    { value: 'double_elimination', label: 'Double Elimination', description: 'Lose twice to be eliminated' },
    { value: 'round_robin', label: 'Round Robin', description: 'Everyone plays everyone' },
    { value: 'swiss', label: 'Swiss', description: 'Paired by performance each round' },
] as const;

const FORMAT_LABELS: Record<string, string> = {
    single_elimination: 'Single Elim',
    double_elimination: 'Double Elim',
    round_robin: 'Round Robin',
    swiss: 'Swiss',
};

const BO_OPTIONS = [1, 3, 5];
const SERIES_OPTIONS = BO_OPTIONS.map(v => ({ label: `Best of ${v}`, value: v }));

function getAdvancementOptions(capacity: number): number[] {
    const max = capacity > 0 ? capacity : 32;
    const options: number[] = [];
    let n = 2;
    while (n < max) { options.push(n); n *= 2; }
    return options.reverse();
}

type FormStep = 'name' | 'format' | 'best_of' | 'advancement';

interface StageFormState {
    name: string;
    format: string;
    best_of: number;
    bo_mode: 'per_stage' | 'per_round';
    round_bo_overrides: Record<string, number>;
    advancement_count: number | null;
}

const DEFAULT_FORM: StageFormState = {
    name: '',
    format: '',
    best_of: 1,
    bo_mode: 'per_stage',
    round_bo_overrides: {},
    advancement_count: null,
};

interface InlineStageEditorProps {
    stages: TournamentStage[];
    maxTeams: number;
    onChange: (stages: TournamentStage[]) => void;
}

const InlineStageEditor: React.FC<InlineStageEditorProps> = ({ stages, maxTeams, onChange }) => {
    const [form, setForm] = useState<StageFormState>(DEFAULT_FORM);
    const [step, setStep] = useState<FormStep>('name');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [nameError, setNameError] = useState('');

    const isFormOpen = isAdding || editingIndex !== null;

    const effectiveCapacityFor = (index: number): number => {
        if (index === 0) return maxTeams;
        const prev = stages[index - 1];
        return typeof prev?.advancement_count === 'number' ? prev.advancement_count : 0;
    };

    const formCapacity = editingIndex !== null
        ? effectiveCapacityFor(editingIndex)
        : effectiveCapacityFor(stages.length);

    const isElimination = form.format === 'single_elimination' || form.format === 'double_elimination';

    const openAdd = () => {
        setForm(DEFAULT_FORM);
        setStep('name');
        setEditingIndex(null);
        setNameError('');
        setIsAdding(true);
    };

    const openEdit = (index: number) => {
        const s = stages[index];
        setForm({
            name: s.name,
            format: s.format,
            best_of: s.best_of ?? 1,
            bo_mode: s.bo_mode ?? 'per_stage',
            round_bo_overrides: s.round_bo_overrides ?? {},
            advancement_count: s.advancement_count ?? null,
        });
        setStep('name');
        setEditingIndex(index);
        setIsAdding(false);
        setNameError('');
    };

    const cancelForm = () => {
        setIsAdding(false);
        setEditingIndex(null);
        setNameError('');
    };

    const nextStep = () => {
        if (step === 'name') {
            if (!form.name.trim()) { setNameError('Stage name is required'); return; }
            setNameError('');
            setStep('format');
        } else if (step === 'format') {
            setStep('best_of');
        } else if (step === 'best_of') {
            setStep('advancement');
        }
    };

    const commitForm = () => {
        const stage: TournamentStage = {
            name: form.name.trim(),
            format: form.format as TournamentStage['format'],
            stage_order: 0,
            best_of: form.best_of,
            bo_mode: isElimination ? form.bo_mode : 'per_stage',
            round_bo_overrides: (isElimination && form.bo_mode === 'per_round') ? form.round_bo_overrides : {},
            advancement_count: form.advancement_count ?? undefined,
            capacity: formCapacity > 0 ? formCapacity : undefined,
        };

        let updated: TournamentStage[];
        if (editingIndex !== null) {
            updated = stages.map((s, i) => i === editingIndex ? { ...s, ...stage } : s);
        } else {
            updated = [...stages, stage];
        }

        updated = updated.map((s, i) => {
            const cap = i === 0
                ? (maxTeams > 0 ? maxTeams : undefined)
                : (typeof updated[i - 1].advancement_count === 'number' ? updated[i - 1].advancement_count as number : undefined);
            return { ...s, stage_order: i + 1, capacity: cap };
        });

        onChange(updated);
        const didSetAdvancement = editingIndex === null && form.advancement_count !== null;
        if (didSetAdvancement) {
            setForm(DEFAULT_FORM);
            setStep('name');
            setNameError('');
            // isAdding stays true — form reopens for the next stage
        } else {
            setIsAdding(false);
            setEditingIndex(null);
        }
    };

    const deleteStage = (index: number) => {
        const updated = stages
            .filter((_, i) => i !== index)
            .map((s, i) => ({ ...s, stage_order: i + 1 }));
        onChange(updated);
        if (editingIndex === index) cancelForm();
    };

    const advancementOptions = getAdvancementOptions(formCapacity);
    const stageNumber = editingIndex !== null ? editingIndex + 1 : stages.length + 1;

    const STEPS: FormStep[] = ['name', 'format', 'best_of', 'advancement'];
    const stepIndex = STEPS.indexOf(step);

    return (
        <div className="space-y-3">
            {/* Stage list */}
            {stages.length > 0 && (
                <div className="space-y-2">
                    {stages.map((stage, i) => (
                        <div
                            key={i}
                            className={cn(
                                'flex items-center gap-3 rounded-none border px-4 py-3 transition-colors',
                                editingIndex === i
                                    ? 'border-rose-500/40 bg-rose-500/5'
                                    : 'border-white/10 bg-white/[0.02]'
                            )}
                        >
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-gray-300 shrink-0">
                                {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-white">{stage.name || `Stage ${i + 1}`}</span>
                            </div>
                            <span className="text-xs bg-white/10 text-gray-300 rounded px-2 py-0.5 shrink-0">
                                {FORMAT_LABELS[stage.format] ?? stage.format}
                            </span>
                            {stage.bo_mode === 'per_round' ? (
                                <span className="text-xs text-emerald-400 shrink-0">Per-round</span>
                            ) : stage.best_of ? (
                                <span className="text-xs text-gray-500 shrink-0">BO{stage.best_of}</span>
                            ) : null}
                            {stage.advancement_count ? (
                                <span className="flex items-center gap-0.5 text-xs text-emerald-400 shrink-0">
                                    <ChevronRight className="w-3 h-3" />{stage.advancement_count} advance
                                </span>
                            ) : null}
                            <div className="flex items-center gap-1 ml-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => openEdit(i)}
                                    className="p-1 text-gray-500 hover:text-rose-400 transition-colors"
                                    title="Edit stage"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteStage(i)}
                                    className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                                    title="Remove stage"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {stages.length === 0 && !isFormOpen && (
                <div className="rounded-none border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-gray-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-400">No stages configured</p>
                        <p className="text-xs text-gray-600 mt-0.5">A single default stage will be created on submit. Add stages now to configure a multi-stage format.</p>
                    </div>
                </div>
            )}

            {/* Prompt-based add/edit form */}
            {isFormOpen && (
                <div className="rounded-none border border-rose-500/30 bg-rose-500/5">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-rose-500/20">
                        <div className="flex items-center gap-3">
                            {stepIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(STEPS[stepIndex - 1])}
                                    className="text-gray-500 hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                            )}
                            <div>
                                <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                                    {editingIndex !== null ? `Edit Stage ${stageNumber}` : `New Stage ${stageNumber}`}
                                </span>
                                {isAdding && stages.length > 0 && (
                                    <p className="text-xs text-emerald-400 mt-0.5">
                                        {stages[stages.length - 1].advancement_count} teams advancing from{' '}
                                        <span className="font-medium">{stages[stages.length - 1].name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {STEPS.map((s, i) => (
                                <div
                                    key={s}
                                    className={cn(
                                        'h-1 rounded-full transition-all',
                                        i <= stepIndex ? 'bg-rose-400 w-4' : 'bg-white/10 w-2'
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Step content */}
                    <div className="px-4 py-5 space-y-4">

                        {/* Step 1: Name */}
                        {step === 'name' && (
                            <div className="space-y-3">
                                <p className="text-base font-semibold text-white">What's this stage called?</p>
                                <Input
                                    value={form.name}
                                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && nextStep()}
                                    placeholder="e.g. Group Stage, Playoffs, Grand Final"
                                    className={cn('h-10 text-sm', nameError && 'border-red-500')}
                                    autoFocus
                                />
                                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                                {isAdding && stages.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        Capacity: {formCapacity} teams — advancing from <span className="text-gray-400">{stages[stages.length - 1].name}</span>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Step 2: Format */}
                        {step === 'format' && (
                            <div className="space-y-3">
                                <p className="text-base font-semibold text-white">What format will <span className="text-rose-300">{form.name}</span> use?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {FORMAT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                                setForm(f => ({
                                                    ...f,
                                                    format: opt.value,
                                                    // reset per-round config when switching formats
                                                    bo_mode: 'per_stage',
                                                    round_bo_overrides: {},
                                                }));
                                            }}
                                            className={cn(
                                                'rounded-none border p-3 text-left transition-colors',
                                                form.format === opt.value
                                                    ? 'border-rose-500/60 bg-rose-500/15'
                                                    : 'border-white/10 bg-black/20 hover:border-white/20'
                                            )}
                                        >
                                            <div className="text-sm font-medium text-white">{opt.label}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Series format (BO + per-round config for elimination) */}
                        {step === 'best_of' && (
                            <div className="space-y-4">
                                <p className="text-base font-semibold text-white">Series format for <span className="text-rose-300">{form.name}</span>?</p>

                                {/* Global BO — hidden when per_round is active for elimination formats */}
                                {(!isElimination || form.bo_mode !== 'per_round') && (
                                    <div className="flex gap-3">
                                        {BO_OPTIONS.map(bo => (
                                            <button
                                                key={bo}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, best_of: bo }))}
                                                className={cn(
                                                    'flex-1 py-4 rounded-none border text-center transition-colors',
                                                    form.best_of === bo
                                                        ? 'border-rose-500/60 bg-rose-500/20 text-white'
                                                        : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                                                )}
                                            >
                                                <div className="text-lg font-bold">{bo}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">Best of {bo}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Per-round config — elimination formats only */}
                                {isElimination && (
                                    <RoundBoConfigSection
                                        format={form.format}
                                        bracketSize={formCapacity}
                                        boMode={form.bo_mode}
                                        defaultBestOf={form.best_of}
                                        roundBoOverrides={form.round_bo_overrides}
                                        seriesOptions={SERIES_OPTIONS}
                                        onBoModeChange={(mode) => setForm(f => ({ ...f, bo_mode: mode }))}
                                        onOverridesChange={(overrides) => setForm(f => ({ ...f, round_bo_overrides: overrides }))}
                                    />
                                )}
                            </div>
                        )}

                        {/* Step 4: Advancement */}
                        {step === 'advancement' && (
                            <div className="space-y-3">
                                <p className="text-base font-semibold text-white">
                                    How many teams advance from <span className="text-rose-300">{form.name}</span>?
                                </p>
                                <p className="text-xs text-gray-500">
                                    Capacity: {formCapacity > 0 ? `${formCapacity} teams` : 'set by previous stage'}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, advancement_count: null }))}
                                        className={cn(
                                            'rounded-none border p-3 text-center transition-colors',
                                            form.advancement_count === null
                                                ? 'border-rose-500/60 bg-rose-500/20 text-white'
                                                : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                                        )}
                                    >
                                        <div className="text-sm font-medium">None</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Final stage</div>
                                    </button>
                                    {advancementOptions.map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, advancement_count: n }))}
                                            className={cn(
                                                'rounded-none border p-3 text-center transition-colors',
                                                form.advancement_count === n
                                                    ? 'border-rose-500/60 bg-rose-500/20 text-white'
                                                    : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20'
                                            )}
                                        >
                                            <div className="text-sm font-bold">{n}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">teams</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 pb-4">
                        <button
                            type="button"
                            onClick={cancelForm}
                            className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        {step !== 'advancement' ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={step === 'format' && !form.format}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-rose-500/20 text-rose-300 border border-white/10 rounded hover:bg-rose-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Continue <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={commitForm}
                                className="px-4 py-2 text-sm font-medium bg-rose-500/20 text-rose-300 border border-white/10 rounded hover:bg-rose-500/30 transition-colors"
                            >
                                {editingIndex !== null ? 'Save Changes' : 'Add Stage'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Add stage button */}
            {!isFormOpen && (
                <button
                    type="button"
                    onClick={openAdd}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-white/10 hover:border-white/20 rounded-none px-4 py-2 w-full transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Stage
                </button>
            )}
        </div>
    );
};

export default InlineStageEditor;
